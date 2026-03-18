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
    // Set timestamp IMMEDIATELY to start the grace period before Firestore write
    localStorage.setItem('jkssb_login_time', Date.now().toString());

    const token = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2);
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { sessionToken: token }, { merge: true });

    return token;
  } catch (error) {
    console.error('Failed to setup session token:', error);
    return null;
  }
};

let sessionUnsubscribe: any = null;

export const initSessionVerifier = (uid: string) => {
  if (sessionUnsubscribe) sessionUnsubscribe();

  const userRef = doc(db, 'users', uid);
  sessionUnsubscribe = onSnapshot(userRef, async (snap) => {
    try {
      if (!snap.exists()) return;

      const localToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (!localToken) return;

      const firestoreToken = snap.data()?.sessionToken;

      // If tokens mismatch, immediate force logout
      if (firestoreToken && firestoreToken !== localToken) {
        // Skip check if we have local writes pending or if we're in the 5s grace period
        if (snap.metadata.hasPendingWrites) return;

        const loginTimeStr = localStorage.getItem('jkssb_login_time');
        const loginTime = parseInt(loginTimeStr || '0');
        const diff = Date.now() - loginTime;

        if (diff < 8000) {
          console.log('Session mismatch ignored (Grace period):', diff, 'ms');
          return;
        }

        console.warn('Session mismatch detected! Another device logged in.');
        if (sessionUnsubscribe) {
          sessionUnsubscribe();
          sessionUnsubscribe = null;
        }
        localStorage.removeItem(SESSION_TOKEN_KEY);

        await firebaseSignOut(auth);

        // Redirect with message flag
        window.location.href = './login.html?error=session_conflict';
      }
    } catch (error) {
      console.warn('Session verifier check failed:', error);
    }
  });
};

export const stopSessionVerifier = () => {
  if (sessionUnsubscribe) {
    sessionUnsubscribe();
    sessionUnsubscribe = null;
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
    // 1. Whitelist / Admin check
    const user = auth.currentUser;
    const WHITELIST = ['darajaz033@gmail.com', 'jkssbdriversacademy@gmail.com', 'admin@example.com'];
    if (user && user.email && WHITELIST.includes(user.email.toLowerCase())) {
      return true;
    }

    // 2. Check "users" collection for isPremium or role: admin
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.isPremium === true || userData.role === 'admin' || userData.isAdmin === true) {
        return true;
      }
    }

    // 3. Check subcollection (App's enrollment method)
    const subColRef = collection(db, 'purchases', userId, 'courses');
    const subColSnap = await getDocs(subColRef);
    const now = new Date();
    let hasActiveInSub = false;
    subColSnap.forEach(d => {
      const data = d.data();
      if (data.isPurchased === true) {
        if (!data.expiresAt) hasActiveInSub = true;
        else {
          const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
          if (now <= expiry) hasActiveInSub = true;
        }
      }
    });
    if (hasActiveInSub) return true;

    // 4. Check Top-level Purchases in Firestore (Legacy/Website method)
    const q = query(
      collection(db, 'purchases'),
      where('userId', '==', userId),
      where('status', '==', 'completed')
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return false;

    let hasActiveInLegacy = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.expiresAt) {
        hasActiveInLegacy = true;
      } else {
        const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (now <= expiryDate) {
          hasActiveInLegacy = true;
        }
      }
    });

    return hasActiveInLegacy;
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
