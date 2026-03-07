import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail as fetchSignInMethods
} from 'firebase/auth';
import { auth, db } from './firebase-config';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

export const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch { }
    recaptchaVerifier = null;
  }
  // Also clear the DOM container so reCAPTCHA can re-render
  const container = document.getElementById('recaptcha-container');
  if (container) container.innerHTML = '';
};

export const initRecaptcha = (containerId: string) => {
  // Always clear stale verifier first to avoid invalid-app-credential
  clearRecaptcha();
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => { }
  });
  return recaptchaVerifier;
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await setupSingleDeviceLogin(userCredential.user.uid);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await setupSingleDeviceLogin(result.user.uid);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signInWithPhone = async (phoneNumber: string, containerId: string = 'recaptcha-container') => {
  try {
    const appVerifier = initRecaptcha(containerId);
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return { success: true };
  } catch (error: any) {
    let errorMessage = error.message;

    if (error.code === 'auth/captcha-check-failed' || error.message.includes('Hostname match not found')) {
      errorMessage = 'Phone authentication is not configured. Please add your domain to Firebase Console > Authentication > Settings > Authorized domains';
    } else if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format. Please use format: +91 1234567890';
    }

    return { success: false, error: errorMessage };
  }
};

export const verifyPhoneCode = async (code: string) => {
  try {
    if (!confirmationResult) {
      return { success: false, error: 'No confirmation result available' };
    }
    const userCredential = await confirmationResult.confirm(code);
    await setupSingleDeviceLogin(userCredential.user.uid);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

let publicUserCache: typeof auth.currentUser | null = null;
let hasCheckedAuth = false;

export const onAuthChange = (callback: (user: User | null) => void, isProtected = false) => {
  // 1. Memory Cache for Public Pages (instant load)
  if (!isProtected && hasCheckedAuth) {
    callback(publicUserCache);
  }

  return onAuthStateChanged(auth, (user) => {
    publicUserCache = user;
    hasCheckedAuth = true;
    callback(user);
  });
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

// ── Firestore user save ──────────────────────────────────────────────────────

export const saveUserToFirestore = async (user: User, extraData?: { name?: string }) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);
    const provider = user.providerData[0]?.providerId || 'email';
    const data: any = {
      email: user.email,
      photoURL: user.photoURL || null,
      provider,
      lastLogin: serverTimestamp(),
    };
    if (!existing.exists()) {
      data.name = extraData?.name || user.displayName || '';
      data.createdAt = serverTimestamp();
    } else {
      if (extraData?.name) data.name = extraData.name;
      else if (user.displayName) data.name = user.displayName;
    }
    await setDoc(userRef, data, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ── Single-session watcher (30s Polling) ──────────────────────────────────────

const SESSION_TOKEN_KEY = 'jkssb_session_token';

// Generates a session token, writes to Firestore & LocalStorage
export const setupSingleDeviceLogin = async (uid: string) => {
  try {
    const token = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2);
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { sessionToken: token }, { merge: true });

    // Explicitly write login time to trigger logout logic universally
    localStorage.setItem('jkssb_login_time', Date.now().toString());

    return token;
  } catch (error) {
    console.error('Failed to setup session token:', error);
    return null;
  }
};

let sessionInterval: any = null;

export const initSessionVerifier = (uid: string) => {
  if (sessionInterval) clearInterval(sessionInterval);

  const verifyToken = async () => {
    try {
      const localToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (!localToken) return; // If logged out locally, do nothing

      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return; // User deleted?

      const firestoreToken = snap.data()?.sessionToken;

      // If tokens mismatch, immediate force logout
      if (firestoreToken && firestoreToken !== localToken) {
        console.warn('Session mismatch detected! Another device logged in.');
        clearInterval(sessionInterval);
        localStorage.removeItem(SESSION_TOKEN_KEY);

        await firebaseSignOut(auth);

        // Redirect with message flag
        window.location.href = './login.html?error=session_conflict';
      }
    } catch (error) {
      console.warn('Session verifier check failed (network issue?):', error);
    }
  };

  // Poll every 15 seconds exactly as requested for aggressive logout
  sessionInterval = setInterval(verifyToken, 15 * 1000);
};

export const stopSessionVerifier = () => {
  if (sessionInterval) {
    clearInterval(sessionInterval);
    sessionInterval = null;
  }
};

export const clearSessionToken = async (uid: string) => {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    await setDoc(doc(db, 'users', uid), { sessionToken: null }, { merge: true });
  } catch { }
};

// ── Premium User Check ──────────────────────────────────────────────────────
export const isPremiumUser = async (userId: string): Promise<boolean> => {
  try {
    // 1. Whitelist for demo/testing
    const user = auth.currentUser;
    const WHITELIST = ['darjazz033@gmail.com', 'admin@example.com'];
    if (user && user.email && WHITELIST.includes(user.email.toLowerCase())) {
      return true;
    }

    // 2. Check Purchases in Firestore
    const q = query(
      collection(db, 'purchases'),
      where('userId', '==', userId),
      where('status', '==', 'completed')
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return false;

    // Check expiry
    const now = new Date();
    let hasActive = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.expiresAt) {
        hasActive = true;
      } else {
        const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (now <= expiryDate) {
          hasActive = true;
        }
      }
    });

    return hasActive;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

// ── Check if email is registered (for password reset) ──────────────────────
export const checkEmailRegistered = async (email: string): Promise<boolean> => {
  try {
    const methods = await fetchSignInMethods(auth, email);
    return methods.length > 0;
  } catch {
    return false;
  }
};

// Alias to maintain compatibility with login.ts
export const generateAndSaveSessionToken = setupSingleDeviceLogin;
