import { onAuthChange, getCurrentUser, signOut, clearSessionToken, isPremiumUser } from './auth-service';
import { db } from './firebase-config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

class ProfilePage {
  constructor() {
    this.setupSignOut();
    this.checkAuth();
    this.exposeGlobalFunctions();
  }

  private exposeGlobalFunctions(): void {
    (window as any).handleProfilePicUpload = this.handleProfilePicUpload.bind(this);
  }

  private checkAuth(): void {
    let resolved = false;

    // Listen for Firebase Auth state — this fires reliably because
    // firebase-config sets browserLocalPersistence
    const unsubscribe = onAuthChange(async (user) => {
      if (resolved) return;
      resolved = true;
      if (typeof unsubscribe === 'function') unsubscribe();

      if (user) {
        await this.loadProfile(user);
      } else {
        this.showGuest();
      }
      this.refreshIcons();
    }, true);

    // Fallback timeout: if onAuthChange never fires, check synchronously
    // (can happen in some offline / cached scenarios)
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const user = getCurrentUser();
        if (user) {
          this.loadProfile(user).then(() => this.refreshIcons());
        } else {
          this.showGuest();
          this.refreshIcons();
        }
      }
    }, 2000);
  }

  private showGuest(): void {
    this.show('guest-section');
    this.hide('profile-header');
    this.hide('account-section');
    this.hide('signout-section');
  }

  private async loadProfile(user: any): Promise<void> {

    this.hide('guest-section');
    this.show('profile-header');
    this.show('account-section');
    this.show('signout-section');

    const email = user.email || user.phoneNumber || '';

    // Immediate render from Firebase Auth object
    this.setText('profile-name', user.displayName || 'User');
    this.setText('profile-email', email);

    if (user.photoURL) {
      this.setPhoto(user.photoURL);
    } else {
      this.setInitial(user.displayName || email || 'U');
    }

    // Load richer data from Firestore (name, provider, createdAt)
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const data = snap.exists() ? (snap.data() as any) : {};

      const name = data.name || user.displayName || 'User';
      const photo = data.photoURL || user.photoURL || '';
      const provider = data.provider || user.providerData?.[0]?.providerId || 'email';
      const isGoogle = provider === 'google.com';
      const since = data.createdAt?.toDate?.()
        ? data.createdAt.toDate().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
        : 'Recently joined';

      this.setText('profile-name', name);
      this.setText('profile-email', email);
      this.setText('ic-name', name || '—');
      this.setText('ic-email', email || '—');
      this.setText('ic-since', since);
      this.setText('ic-provider', isGoogle ? '🌐 Google' : '✉️ Email & Password');

      // Avatar
      if (photo) {
        this.setPhoto(photo);
      } else {
        this.setInitial(name || email || 'U');
      }

      // Login badge
      const badge = document.getElementById('login-badge');
      if (badge) {
        badge.className = `login-badge ${isGoogle ? 'google' : 'email'}`;
        badge.innerHTML = isGoogle
          ? `<svg width="11" height="11" viewBox="0 0 24 24">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg> Google`
          : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
             </svg> Email`;
      }

      // Premium Status logic
      const premium = await isPremiumUser(user.uid);
      
      const premiumPoints = document.querySelectorAll('.premium-point');
      const unlockCta = document.getElementById('unlock-cta');
      
      if (premium) {
        this.showInline('p-premium-badge');
        this.showInline('p-star-badge');
        this.showInline('p-edit-avatar');
        this.hide('ic-premium-row');
        this.hide('not-premium-badge');
        
        // Unlock all premium points
        premiumPoints.forEach(pt => pt.classList.add('unlocked'));
        if (unlockCta) unlockCta.style.display = 'none';
      } else {
        this.hide('p-premium-badge');
        this.hide('p-star-badge');
        this.hide('p-edit-avatar');
        this.show('not-premium-badge');
        this.show('ic-premium-row');
        
        // Lock all premium points
        premiumPoints.forEach(pt => pt.classList.remove('unlocked'));
        if (unlockCta) unlockCta.style.display = 'block';
      }

    } catch (err) {
      console.warn('[Profile] Firestore load failed, using Auth data:', err);
    }
  }

  private async handleProfilePicUpload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;

    const user = getCurrentUser();
    if (!user) return;

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${user.uid}`);

      // Disable button during upload
      const btn = document.getElementById('p-edit-avatar') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Uploading...';
      }

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL
      });

      // Update UI
      this.setPhoto(downloadURL);

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="camera" width="12" height="12" style="margin-right:2px;"></i> Edit';
        this.refreshIcons();
      }

      // Show toast (assuming showToast is available or we use alert)
      // Since we are in profile-page.ts, we might need a local toast or just use alert
      alert('Profile picture updated successfully!');

    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload image: ' + error.message);
      const btn = document.getElementById('p-edit-avatar') as HTMLButtonElement;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="camera" width="12" height="12" style="margin-right:2px;"></i> Edit';
        this.refreshIcons();
      }
    }
  }

  private showInline(id: string): void {
    const el = document.getElementById(id);
    if (el) el.style.display = 'inline-flex';
  }

  private setPhoto(url: string): void {
    const inner = document.getElementById('avatar-inner');
    if (!inner) return;
    inner.innerHTML = `<img src="${url}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'" loading="lazy">`;
  }

  private setInitial(name: string): void {
    const inner = document.getElementById('avatar-inner');
    if (!inner) return;
    inner.innerHTML = `<span>${name.trim().charAt(0).toUpperCase()}</span>`;
  }

  private show(id: string): void {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  }
  private hide(id: string): void {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  private setText(id: string, val: string): void {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
  }
  private refreshIcons(): void {
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 60);
  }

  private setupSignOut(): void {
    const btn = document.getElementById('sign-out-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      (btn as HTMLButtonElement).disabled = true;
      btn.textContent = 'Signing out...';

      const user = getCurrentUser();
      if (user) {
        try { await clearSessionToken(user.uid); } catch { }
      }

      // Clear Firebase Auth session
      await signOut();
      localStorage.removeItem('jkssb_session_token');
      sessionStorage.setItem('app_toast_msg', 'Logged out successfully! See you soon 👋');
      sessionStorage.setItem('app_toast_type', 'success');
      window.location.href = './login.html';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ProfilePage());
} else {
  new ProfilePage();
}

export { ProfilePage };
