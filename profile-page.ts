import { auth, db, functions, storage } from './firebase-config';
import { onAuthStateChanged, updateProfile, RecaptchaVerifier, linkWithCredential, PhoneAuthProvider, User, linkWithPhoneNumber, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveUserProfile, getUserData } from './auth-service';

declare const lucide: any;

// State
let currentUser: User | null = null;
let isPremium = false;
let isAdmin = false;
let userData: any = null;

// DOM Elements
const pageLoader = document.getElementById('page-loader')!;
const profileContent = document.getElementById('profile-content')!;
const heroGuest = document.getElementById('hero-guest')!;
const heroUser = document.getElementById('hero-user')!;
const userInfoCard = document.getElementById('user-info-card')!;

// Menus
const menuAccount = document.getElementById('menu-account')!;
const menuPreferences = document.getElementById('menu-preferences')!;
const menuAdmin = document.getElementById('menu-admin')!;
const menuConnect = document.getElementById('menu-connect')!;
const dangerZone = document.getElementById('danger-zone')!;

// User Info fields
const avatarContainer = document.getElementById('avatar-container')!;
const userNameDisplay = document.getElementById('user-name-display')!;
const userEmailDisplay = document.getElementById('user-email-display')!;
const badgeContainer = document.getElementById('badge-container')!;
const premiumCrown = document.getElementById('premium-crown')!;

const infoName = document.getElementById('info-name')!;
const infoPhone = document.getElementById('info-phone')!;
const infoSince = document.getElementById('info-since')!;
const infoProvider = document.getElementById('info-provider')!;
const phoneActionContainer = document.getElementById('phone-action-container')!;

// Init
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    heroGuest.style.display = 'none';
    heroUser.style.display = 'block';
    userInfoCard.style.display = 'block';
    menuAccount.style.display = 'block';
    menuPreferences.style.display = 'block';
    menuConnect.style.display = 'block';
    dangerZone.style.display = 'block';
    await fetchUserProfile(user);
    renderUserUI();
  } else {
    heroGuest.style.display = 'block';
    heroUser.style.display = 'none';
    userInfoCard.style.display = 'none';
    menuAccount.style.display = 'none';
    menuPreferences.style.display = 'none';
    menuConnect.style.display = 'none';
    dangerZone.style.display = 'none';
    menuAdmin.style.display = 'none';
    
    // Hide loader, show content
    pageLoader.style.display = 'none';
    profileContent.style.display = 'block';
  }
});

async function fetchUserProfile(user: User) {
  try {
    // 1. Fetch User Doc
    userData = await getUserData(user.uid) || {};
    
    // Auto-sync email if missing (crucial for Buy Now checks)
    if (!userData.email && user.email) {
      await saveUserProfile(user.uid, { email: user.email });
      userData.email = user.email;
    }

    // 2. Determine admin
    if (userData.role === 'admin' || userData.isAdmin === true) {
      isAdmin = true;
    } else {
      // Permanent Official Admin Overrides (matching app)
      const officialAdmins = ['jkssbdriversacademy@gmail.com', 'darajaz033@gmail.com'];
      if (user.email && officialAdmins.includes(user.email)) {
        isAdmin = true;
      }
    }

    // 3. Determine Premium (Full course, or any of Part 1, 2, 3)
    if (isAdmin) {
      isPremium = true; 
    } else {
      // Check specific premium courses in subcollection
      const premiumIds = ['full_course', 'part1', 'part2', 'part3'];
      const subq = collection(db, 'purchases', user.uid, 'courses');
      const subSnaps = await getDocs(subq);
      
      const hasPremiumItem = subSnaps.docs.some(d => {
        const data = d.data();
        return premiumIds.includes(d.id) && data.isPurchased === true;
      });

      isPremium = hasPremiumItem;
      
      // Also check adminGrantedAccess
      if (!isPremium && user.email) {
        const agSnap = await getDocs(query(collection(db, 'adminGrantedAccess'), 
          where('email', '==', user.email),
          where('status', '==', 'active')
        ));
        if (!agSnap.empty) isPremium = true;
      }
    }

  } catch(e) {
    console.warn("Failed fetching profile logic", e);
  }

  // Done loader
  pageLoader.style.display = 'none';
  profileContent.style.display = 'block';
}

function renderUserUI() {
  if (!currentUser) return;
  
  if (userData?.studyReminderEnabled) {
    const h = userData.studyReminderHour || 8;
    const ampmText = h <= 12 ? h+':00 AM' : (h-12)+':00 PM';
    document.getElementById('reminder-status-text')!.textContent = ampmText;
  }

  // Hero
  const dName = currentUser.displayName || userData.name || userData.displayName || 'User';
  userNameDisplay.textContent = dName;
  userEmailDisplay.textContent = currentUser.email || userData.email || 'No email linked';

  // Avatar
  if (currentUser.photoURL) {
    avatarContainer.innerHTML = `<img src="${currentUser.photoURL}" alt="Profile">`;
  } else {
    avatarContainer.innerHTML = `<span id="avatar-initials">${dName.charAt(0).toUpperCase()}</span>`;
  }

  // Badges
  badgeContainer.innerHTML = '';
  if (isPremium) {
    premiumCrown.style.display = 'flex';
    badgeContainer.innerHTML = `<div class="plan-badge plan-premium">✓ ${isAdmin ? 'ADMIN USER' : 'PREMIUM USER'}</div>`;
  } else {
    premiumCrown.style.display = 'none';
    badgeContainer.innerHTML = `<div class="plan-badge plan-free">FREE PLAN</div>`;
  }

  // Admin Tools
  menuAdmin.style.display = isAdmin ? 'block' : 'none';

  // Info Card
  infoName.textContent = dName;
  
  let pNum = userData.phoneNumber || currentUser.phoneNumber || userData.phone;
  if (pNum) {
    infoPhone.textContent = pNum;
    infoPhone.style.color = 'var(--text-primary)';
    phoneActionContainer.innerHTML = `<i class="fa-solid fa-shield-halved" style="color:#22c55e; font-size:16px;"></i>`;
  } else {
    infoPhone.textContent = 'Not Added';
    infoPhone.style.color = 'var(--text-secondary)';
    phoneActionContainer.innerHTML = `<button class="info-action" onclick="openPhoneModal()">Add</button>`;
  }

  const creation = currentUser.metadata.creationTime;
  if (creation) {
    const d = new Date(creation);
    infoSince.textContent = `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`;
  } else {
    infoSince.textContent = '—';
  }

  const pId = currentUser.providerData.length > 0 ? currentUser.providerData[0].providerId : 'email';
  infoProvider.textContent = pId === 'google.com' ? '🌐 Google' : (pId === 'phone' ? '📱 Phone' : '✉️ Email');

  lucide.createIcons();
}

// ── NAME EDIT ──────────────────────────────────────────────
document.getElementById('btn-edit-name')?.addEventListener('click', () => {
  const input = document.getElementById('input-name') as HTMLInputElement;
  input.value = currentUser?.displayName || userData?.name || '';
  document.getElementById('modal-name')!.classList.add('active');
});

document.getElementById('btn-save-name')?.addEventListener('click', async () => {
  if (!currentUser) return;
  const val = (document.getElementById('input-name') as HTMLInputElement).value.trim();
  if (!val) return;
  
  try {
    document.getElementById('btn-save-name')!.textContent = 'Saving...';
    // Update Auth Profile
    await updateProfile(currentUser, { displayName: val });
    // Update Firestore using Unified app logic
    await saveUserProfile(currentUser.uid, { name: val, email: currentUser.email || undefined });
    
    userData.name = val;
    userData.displayName = val;
    renderUserUI();
    document.getElementById('modal-name')!.classList.remove('active');
  } catch(e: any) {
    alert("Error saving name: " + e.message);
  } finally {
    document.getElementById('btn-save-name')!.textContent = 'Save';
  }
});

// ── AVATAR UPLOAD ──────────────────────────────────────────
document.getElementById('avatar-input')?.addEventListener('change', async (e: any) => {
  if (!currentUser) return;
  if (!isPremium) {
    alert("Please buy a course to upload your own profile picture 🔥");
    e.target.value = '';
    return;
  }
  
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const wrapper = document.querySelector('.avatar-wrapper') as HTMLElement;
    wrapper.style.opacity = '0.5';
    
    const storageRef = ref(storage, `profile_pics/${currentUser.uid}.jpg`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    await updateProfile(currentUser, { photoURL: url });
    await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: url });
    
    renderUserUI();
    alert("Profile picture updated successfully! 🎉");
  } catch(err:any) {
    alert("Upload failed: " + err.message);
  } finally {
    const wrapper = document.querySelector('.avatar-wrapper') as HTMLElement;
    wrapper.style.opacity = '1';
  }
  e.target.value = '';
});

// ── PHONE LINKING ──────────────────────────────────────────
let phoneConfirmationResult: any = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

(window as any).openPhoneModal = () => {
  document.getElementById('modal-phone')!.classList.add('active');
  document.getElementById('otp-section')!.style.display = 'none';
  document.getElementById('phone-actions-1')!.style.display = 'flex';
  document.getElementById('input-phone')!.focus();
  
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'normal' });
    recaptchaVerifier.render();
  }
};

document.getElementById('btn-send-otp')?.addEventListener('click', async () => {
  if (!currentUser) return;
  const inputPhone = (document.getElementById('input-phone') as HTMLInputElement).value.trim();
  if (!inputPhone) return alert("Enter valid phone.");
  
  const formattedPhone = inputPhone.startsWith('+') ? inputPhone : '+91' + inputPhone;
  
  try {
    document.getElementById('btn-send-otp')!.textContent = 'Sending...';
    phoneConfirmationResult = await linkWithPhoneNumber(currentUser, formattedPhone, recaptchaVerifier!);
    document.getElementById('phone-actions-1')!.style.display = 'none';
    document.getElementById('otp-section')!.style.display = 'block';
    document.getElementById('input-otp')!.focus();
  } catch(e:any) {
    alert("Failed to send OTP: " + e.message);
  } finally {
    document.getElementById('btn-send-otp')!.textContent = 'Send OTP';
  }
});

document.getElementById('btn-verify-otp')?.addEventListener('click', async () => {
  if (!phoneConfirmationResult || !currentUser) return;
  const otp = (document.getElementById('input-otp') as HTMLInputElement).value.trim();
  if (!otp) return;

  try {
    document.getElementById('btn-verify-otp')!.textContent = 'Verifying...';
    const cred = PhoneAuthProvider.credential(phoneConfirmationResult.verificationId, otp);
    await linkWithCredential(currentUser, cred);
    
    const formattedPhone = (document.getElementById('input-phone') as HTMLInputElement).value.trim();
    const finalPhone = formattedPhone.startsWith('+') ? formattedPhone : '+91' + formattedPhone;
    
    // Use Unified App Logic to sync identifiers
    await saveUserProfile(currentUser.uid, { phoneNumber: finalPhone });
    userData.phoneNumber = finalPhone;
    
    document.getElementById('modal-phone')!.classList.remove('active');
    renderUserUI();
    alert("Phone linked successfully!");
    
  } catch(e:any) {
    alert("OTP Verification Failed: " + e.message);
  } finally {
    document.getElementById('btn-verify-otp')!.textContent = 'Verify & Link';
  }
});

// ── STUDY REMINDER ─────────────────────────────────────────
let reminderEnabled = false;
let reminderHour = 8;

document.getElementById('btn-study-reminder')?.addEventListener('click', () => {
  reminderEnabled = userData?.studyReminderEnabled || false;
  reminderHour = userData?.studyReminderHour ?? 8;
  
  (document.getElementById('reminder-toggle') as HTMLInputElement).checked = reminderEnabled;
  document.getElementById('reminder-options')!.style.display = reminderEnabled ? 'block' : 'none';
  renderReminderGrid();
  document.getElementById('modal-reminder')!.classList.add('active');
});

document.getElementById('reminder-toggle')?.addEventListener('change', (e: any) => {
  reminderEnabled = e.target.checked;
  document.getElementById('reminder-options')!.style.display = reminderEnabled ? 'block' : 'none';
});

function renderReminderGrid() {
  const grid = document.getElementById('reminder-grid')!;
  grid.innerHTML = '';
  [6,7,8,9,10,17,18,19,20,21].forEach(h => {
    const d = document.createElement('div');
    d.className = 'time-slot' + (h === reminderHour ? ' selected' : '');
    d.textContent = h <= 12 ? h+':00 AM' : (h-12)+':00 PM';
    d.onclick = () => { reminderHour = h; renderReminderGrid(); };
    grid.appendChild(d);
  });
}

document.getElementById('btn-save-reminder')?.addEventListener('click', async () => {
  try {
    document.getElementById('btn-save-reminder')!.textContent = 'Saving...';
    const callable = httpsCallable(functions, 'saveStudyReminderPreference');
    await callable({ studyReminderEnabled: reminderEnabled, studyReminderHour: reminderHour });
    
    userData.studyReminderEnabled = reminderEnabled;
    userData.studyReminderHour = reminderHour;
    
    const h = reminderHour;
    const label = reminderEnabled ? (h <= 12 ? h+':00 AM' : (h-12)+':00 PM') : 'Off';
    document.getElementById('reminder-status-text')!.textContent = label;
    document.getElementById('modal-reminder')!.classList.remove('active');
    
    alert(`✅ Reminder preference saved.`);
  } catch(e:any) {
    alert("Error saving reminder: " + e.message);
  } finally {
    document.getElementById('btn-save-reminder')!.textContent = 'Save';
  }
});

// ── SOCIAL / SHARE ─────────────────────────────────────────
document.getElementById('btn-share')?.addEventListener('click', async () => {
  const text = 'Check out the Drivers Academy App for the best exam preparation! Download now: https://jkssbdriversacademy.co.in';
  if (navigator.share) {
    try { await navigator.share({ title: 'Drivers Academy', text: text, url: 'https://jkssbdriversacademy.co.in' }); } catch(err){}
  } else {
    // Custom popup logic for non-share browsers
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-title">Share Academy</div>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">Share with your friends on WhatsApp or copy the link.</p>
        <div style="display:flex; gap:12px; margin-bottom:20px;">
          <a href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" style="flex:1; background:#25D366; color:white; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:12px; font-weight:700;">
            <i class="fab fa-whatsapp"></i> WhatsApp
          </a>
          <button id="copy-share-link" style="flex:1; background:var(--primary); color:white; border:none; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
            <i class="fas fa-link"></i> Copy Link
          </button>
        </div>
        <button class="btn-cancel" style="width:100%;" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('copy-share-link')?.addEventListener('click', () => {
      navigator.clipboard.writeText('https://jkssbdriversacademy.co.in');
      alert('Link copied to clipboard! 📋');
    });
  }
});

document.getElementById('btn-yt')?.addEventListener('click', () => {
  window.open('https://youtube.com/@jkssbdriversacademy?si=upN8pVEFsljPtUGr', '_blank');
});
document.getElementById('btn-wa')?.addEventListener('click', () => {
  window.open('https://chat.whatsapp.com/CaICTu1D78yJF6f2QnCI7l', '_blank');
});
document.getElementById('btn-tg')?.addEventListener('click', () => {
  window.open('https://t.me/+geryGyrT9gZiNzVl', '_blank');
});

// ── ACCOUNT MANAGEMENT ─────────────────────────────────────
document.getElementById('btn-signout')?.addEventListener('click', async() => {
  await signOut(auth);
  window.location.href = './index.html';
});

document.getElementById('btn-delete-account')?.addEventListener('click', () => {
  document.getElementById('modal-delete')!.classList.add('active');
});

document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
  document.getElementById('btn-confirm-delete')!.textContent = 'Deleting...';
  try {
    const callable = httpsCallable(functions, 'deleteUserAccount');
    await callable();
    await signOut(auth);
    window.location.href = './index.html';
  } catch(e:any) {
    alert("Failed to delete account: " + e.message);
    document.getElementById('btn-confirm-delete')!.textContent = 'Delete Permanently';
  }
});
