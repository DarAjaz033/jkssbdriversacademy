import { auth, db } from './firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { isPremiumUser, getUserData, ADMIN_WHITELIST } from './auth-service';

// --- Selectors ---
const userNameEl = document.getElementById('user-name') as HTMLElement;
const userEmailEl = document.getElementById('user-email') as HTMLElement;
const heroActionBtn = document.getElementById('hero-action-btn') as HTMLAnchorElement;
const liveIndicator = document.getElementById('live-indicator') as HTMLElement;
const adminSection = document.getElementById('admin-section') as HTMLElement;
const btnTheme = document.getElementById('btn-theme') as HTMLElement;
const btnNotifications = document.getElementById('btn-notifications') as HTMLElement;
const btnShareApp = document.getElementById('btn-share-app') as HTMLElement;

// Modal Elements
const notifModal = document.getElementById('notif-modal') as HTMLElement;
const closeNotifModal = document.getElementById('close-notif-modal') as HTMLElement;
const muteNotif = document.getElementById('mute-notif') as HTMLInputElement;
const contentNotif = document.getElementById('content-notif') as HTMLInputElement;
const studyNotif = document.getElementById('study-notif') as HTMLInputElement;
const newsNotif = document.getElementById('news-notif') as HTMLInputElement;

// Live Classes Modal (Student)
const btnLiveClasses = document.getElementById('btn-live-classes') as HTMLElement;
const liveClassesModal = document.getElementById('live-classes-modal') as HTMLElement;
const closeLiveModal = document.getElementById('close-live-modal') as HTMLElement;
const enrollNowBtn = document.getElementById('enroll-now-btn') as HTMLButtonElement;
const liveHighlights = document.getElementById('live-highlights') as HTMLElement;
const liveSteps = document.getElementById('live-steps') as HTMLElement;

// Manage Live Modal (Admin)
const btnManageLive = document.getElementById('btn-manage-live') as HTMLElement;
const manageLiveModal = document.getElementById('manage-live-modal') as HTMLElement;
const closeManageModal = document.getElementById('close-manage-modal') as HTMLElement;
const adminLiveToggle = document.getElementById('admin-live-toggle') as HTMLInputElement;
const adminLiveStatus = document.getElementById('admin-live-status') as HTMLElement;
const adminToggleBtn = document.getElementById('admin-toggle-btn') as HTMLButtonElement;
const editConfigBtn = document.getElementById('edit-config-btn') as HTMLElement;
const saveConfigBtn = document.getElementById('save-config-btn') as HTMLElement;
const cancelConfigBtn = document.getElementById('cancel-config-btn') as HTMLElement;
const configView = document.getElementById('config-view') as HTMLElement;
const configEdit = document.getElementById('config-edit') as HTMLElement;
const editRoomId = document.getElementById('edit-room-id') as HTMLInputElement;
const editLiveTitle = document.getElementById('edit-live-title') as HTMLInputElement;
const viewRoomId = document.getElementById('view-room-id') as HTMLElement;
const viewLiveTitle = document.getElementById('view-live-title') as HTMLElement;

// const ADMIN_WHITELIST = ['darajaz033@gmail.com', 'jkssbdriversacademy@gmail.com'];

async function init() {
  // 1. Auth State Listener
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Fetch fresh data from Firestore for profile fields
      const userData = await getUserData(user.uid);
      const name = userData?.name || userData?.displayName || user.displayName || 'Student';
      const email = user.email || 'Email not linked';

      userNameEl.textContent = name;
      userEmailEl.textContent = email;
      heroActionBtn.textContent = 'Edit Profile';
      heroActionBtn.href = './profile.html';

      // Admin Check
      const isSystemAdmin = userData?.role === 'admin' || userData?.isAdmin === true;
      const isWhitelisted = user.email ? ADMIN_WHITELIST.includes(user.email.toLowerCase()) : false;
      
      if (isSystemAdmin || isWhitelisted) {
        adminSection.style.display = 'block';
      } else {
        adminSection.style.display = 'none';
      }
    } else {
      userNameEl.textContent = 'Guest User';
      userEmailEl.textContent = 'Sign in to sync progress';
      heroActionBtn.textContent = 'Sign In';
      heroActionBtn.href = './login.html';
      adminSection.style.display = 'none';
    }
  });

  // 2. Live Status Listener
  const liveRef = doc(db, 'live_classes', 'current');
  onSnapshot(liveRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.isLive === true) {
        liveIndicator.style.display = 'inline-block';
      } else {
        liveIndicator.style.display = 'none';
      }
    } else {
      liveIndicator.style.display = 'none';
    }
  });

  // 3. Theme Toggle (re-using index logic)
  btnTheme?.addEventListener('click', () => {
    const themes = ['default', 'minimal', 'green', 'blue', 'golden', 'black', 'frost'];
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'default';
    const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    if (nextTheme === 'default') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('siteTheme', 'default');
    } else {
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('siteTheme', nextTheme);
    }
    
    // Trigger nav.js logic if it's watching (it usually runs on init)
    // But we manually trigger icon updates if needed
    if ((window as any).lucide) (window as any).lucide.createIcons();
  });

  // 4. Notifications Modal
  btnNotifications?.addEventListener('click', () => {
    // Load current prefs
    loadNotificationPrefs();
    notifModal.style.display = 'flex';
  });

  closeNotifModal?.addEventListener('click', () => {
    notifModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === notifModal) notifModal.style.display = 'none';
  });

  // Save on Change
  [muteNotif, contentNotif, studyNotif, newsNotif].forEach(input => {
    input.addEventListener('change', saveNotificationPrefs);
  });

  // 5. Share Handler
  btnShareApp?.addEventListener('click', async () => {
    const shareData = {
      title: 'JKSSB Drivers Academy',
      text: 'Download the JKSSB Drivers Academy app for best exam preparation!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        if ((window as any).showToast) (window as any).showToast('Link copied to clipboard!', 'success');
      }
    } catch (err) {
      console.log('Share failed', err);
    }
  });

  // 6. Live Classes Modal (Student)
  btnLiveClasses?.addEventListener('click', openLiveClassesModal);
  closeLiveModal?.addEventListener('click', () => liveClassesModal.style.display = 'none');
  
  enrollNowBtn?.addEventListener('click', () => {
    // Redirect to JKSSB Drivers Academy app on stores (EducateApp Wrapper)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // Educate App on App Store
      window.open('https://apps.apple.com/us/app/educate-online-teaching-app/id1643531047', '_blank');
    } else {
      // Reliable deep link for Android using the package name provided in the app
      window.open('intent://#Intent;package=com.educate.theteachingapp;scheme=educate;end;', '_blank');
    }
  });

  // 7. Manage Live Modal (Admin)
  btnManageLive?.addEventListener('click', openManageLiveModal);
  closeManageModal?.addEventListener('click', () => manageLiveModal.style.display = 'none');

  adminLiveToggle?.addEventListener('change', async () => {
    const isLive = adminLiveToggle.checked;
    const roomId = viewRoomId.textContent?.trim() || '9241953371';
    const title = viewLiveTitle.textContent?.trim() || '🔴 Live Class';
    
    await updateDoc(doc(db, 'live_classes', 'current'), { 
      isLive,
      roomId,
      title,
      topic: title, // Exactly as in mobile app LiveClassService
      updatedAt: new Date() // Firestore updates this accurately
    });
    updateAdminUI(isLive);
  });

  adminToggleBtn?.addEventListener('click', async () => {
    const isLive = !adminLiveToggle.checked;
    const roomId = viewRoomId.textContent?.trim() || '9241953371';
    const title = viewLiveTitle.textContent?.trim() || '🔴 Live Class';

    await updateDoc(doc(db, 'live_classes', 'current'), { 
      isLive,
      roomId,
      title,
      topic: title,
      updatedAt: new Date()
    });

    adminLiveToggle.checked = isLive;
    updateAdminUI(isLive);
    if ((window as any).showToast) (window as any).showToast(isLive ? '🔴 LIVE ACTIVATED — Users notified!' : '⚪ Live DEACTIVATED.', isLive ? 'success' : 'info');
  });

  editConfigBtn?.addEventListener('click', () => {
    configView.classList.add('hidden');
    configEdit.classList.remove('hidden');
    editConfigBtn.style.display = 'none';
  });

  cancelConfigBtn?.addEventListener('click', () => {
    configView.classList.remove('hidden');
    configEdit.classList.add('hidden');
    editConfigBtn.style.display = 'flex';
  });

  saveConfigBtn?.addEventListener('click', async () => {
    const roomId = editRoomId.value.trim();
    const title = editLiveTitle.value.trim();
    if (!roomId) return alert('Room ID is required');

    await updateDoc(doc(db, 'live_classes', 'current'), { 
      roomId, 
      title: title || '🔴 Live Class',
      topic: title || '🔴 Live Class',
      updatedAt: new Date()
    });

    viewRoomId.textContent = roomId;
    viewLiveTitle.textContent = title || '🔴 Live Class';
    
    configView.classList.remove('hidden');
    configEdit.classList.add('hidden');
    editConfigBtn.style.display = 'flex';
    if ((window as any).showToast) (window as any).showToast('Configuration Saved!', 'success');
  });

  // Global window click to close modals
  window.addEventListener('click', (e) => {
    if (e.target === liveClassesModal) liveClassesModal.style.display = 'none';
    if (e.target === manageLiveModal) manageLiveModal.style.display = 'none';
  });
}

async function openLiveClassesModal() {
  // Show base modal
  liveClassesModal.style.display = 'flex';
  
  try {
    const infoSnap = await getDoc(doc(db, 'settings', 'live_batch_info'));
    if (infoSnap.exists()) {
      const data = infoSnap.data();
      
      // Update basic info
      (document.getElementById('live-heading') as HTMLElement).textContent = data.heading || 'JKSSB Fresh Live Batch';
      (document.getElementById('live-subheading') as HTMLElement).textContent = data.subheading || 'Batch 2026 - Comprehensive Coverage';
      (document.getElementById('live-price') as HTMLElement).textContent = `₹${data.currentPrice || 299}`;
      (document.getElementById('live-original-price') as HTMLElement).textContent = `₹${data.originalPrice || 599}`;
      
      // Highlights
      if (data.highlights) {
        liveHighlights.innerHTML = data.highlights.map((h: string) => `
          <div class="highlight-item">
            <i data-lucide="check-circle" class="highlight-icon" style="width:18px; height:18px"></i>
            <span class="highlight-text">${h}</span>
          </div>
        `).join('');
      }

      // Steps / Classroom ID
      const roomId = data.roomId || '9241953371';
      liveSteps.innerHTML = `
        <div class="step-item">
          <div class="step-number">1</div>
          <p class="step-text">Download & Open <b>JKSSB Drivers Academy</b> app from stores.</p>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-text" style="flex:1">
            Go to Live Classes tab & join using <b>Classroom ID</b>:
            <div class="classroom-id-box">
              <span class="id-text">${roomId}</span>
              <button class="copy-btn" onclick="copyToClipboard('${roomId}')">
                <i data-lucide="copy" width="12" height="12"></i>
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
      `;
      
      if ((window as any).lucide) (window as any).lucide.createIcons();
    }
  } catch (err) {
    console.error('Error fetching live info:', err);
  }
}

async function openManageLiveModal() {
  manageLiveModal.style.display = 'flex';
  
  try {
    const liveSnap = await getDoc(doc(db, 'live_classes', 'current'));
    if (liveSnap.exists()) {
      const data = liveSnap.data();
      adminLiveToggle.checked = data.isLive || false;
      viewRoomId.textContent = data.roomId || '---';
      viewLiveTitle.textContent = data.title || '---';
      editRoomId.value = data.roomId || '';
      editLiveTitle.value = data.title || '';
      updateAdminUI(data.isLive);
    }
  } catch (err) {
    console.error('Error fetching live admin info:', err);
  }
}

function updateAdminUI(isLive: boolean) {
  adminLiveStatus.textContent = isLive ? '🟢 Online' : '⚪ Offline';
  adminLiveStatus.style.color = isLive ? '#059669' : '#64748b';
  
  if (isLive) {
    adminToggleBtn.classList.remove('start-session');
    adminToggleBtn.classList.add('stop-session');
    adminToggleBtn.innerHTML = '<i data-lucide="stop-circle" width="20" height="20"></i><span>STOP SESSION</span>';
  } else {
    adminToggleBtn.classList.remove('stop-session');
    adminToggleBtn.classList.add('start-session');
    adminToggleBtn.innerHTML = '<i data-lucide="play-circle" width="20" height="20"></i><span>START LIVE & NOTIFY USERS</span>';
  }
  
  if ((window as any).lucide) (window as any).lucide.createIcons();
}

(window as any).copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  if ((window as any).showToast) (window as any).showToast('Classroom ID Copied!', 'success');
};

(window as any).closeModal = (id: string) => {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
};

function loadNotificationPrefs() {
  const prefs = JSON.parse(localStorage.getItem('jkssb_notif_prefs') || '{}');
  muteNotif.checked = prefs.mute || false;
  contentNotif.checked = prefs.content !== false; // default true
  studyNotif.checked = prefs.study !== false; // default true
  newsNotif.checked = prefs.news !== false; // default true
}

function saveNotificationPrefs() {
  const prefs = {
    mute: muteNotif.checked,
    content: contentNotif.checked,
    study: studyNotif.checked,
    news: newsNotif.checked
  };
  localStorage.setItem('jkssb_notif_prefs', JSON.stringify(prefs));
  if ((window as any).showToast) (window as any).showToast('Preferences saved!', 'success');
}

// Initial Run
init();
