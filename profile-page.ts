import { onAuthChange, getCurrentUser, signOut, clearSessionToken, isPremiumUser } from './auth-service';
import { db } from './firebase-config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

class ProfilePage {
  constructor() {
    this.setupSignOut();
    this.setupShare();
    this.checkAuth();
    this.exposeGlobalFunctions();
  }

  private exposeGlobalFunctions(): void {
    (window as any).handleProfilePicUpload = this.handleProfilePicUpload.bind(this);
  }

  private checkAuth(): void {
    let resolved = false;

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
    this.hide('btn-logout-item');
  }

  private async loadProfile(user: any): Promise<void> {
    this.hide('guest-section');
    this.show('profile-header');
    this.show('account-section');
    this.showInline('btn-logout-item');

    const email = user.email || user.phoneNumber || '';
    this.setText('profile-name', user.displayName || 'User');
    this.setText('profile-email', email);

    if (user.photoURL) {
      this.setPhoto(user.photoURL);
    } else {
      this.setInitial(user.displayName || email || 'U');
    }

    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const data = snap.exists() ? (snap.data() as any) : {};

      const name = data.name || user.displayName || 'User';
      const photo = data.photoURL || user.photoURL || '';

      this.setText('profile-name', name);
      this.setText('profile-email', email);

      if (photo) {
        this.setPhoto(photo);
      } else {
        this.setInitial(name || email || 'U');
      }

      const premium = await isPremiumUser(user.uid);
      if (premium) {
        this.showInline('p-premium-badge');
        this.hide('not-premium-badge');
        this.showInline('p-edit-avatar');
      } else {
        this.hide('p-premium-badge');
        this.showInline('not-premium-badge');
        this.hide('p-edit-avatar');
      }

    } catch (err) {
      console.warn('[Profile] Firestore load failed:', err);
    }
  }

  private setupShare(): void {
    const shareBtn = document.getElementById('btn-share-app');
    if (shareBtn) {
      shareBtn.onclick = () => {
        if (navigator.share) {
          navigator.share({
            title: 'JKSSB Drivers Academy',
            text: 'Master the Driver Exam with JKSSB Drivers Academy! Join our community for expert guidance, PDFs, and tests.',
            url: window.location.origin
          }).catch(console.error);
        } else {
          // Fallback: Copy to clipboard
          navigator.clipboard.writeText(window.location.origin);
          alert('App link copied to clipboard!');
        }
      };
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

      const btn = document.getElementById('p-edit-avatar') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
      }

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL
      });

      this.setPhoto(downloadURL);

      if (btn) {
        btn.disabled = false;
        this.refreshIcons();
      }

      alert('Profile picture updated successfully!');

    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload image: ' + error.message);
      const btn = document.getElementById('p-edit-avatar') as HTMLButtonElement;
      if (btn) {
        btn.disabled = false;
        this.refreshIcons();
      }
    }
  }

  private showInline(id: string): void {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
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
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 100);
  }

  private setupSignOut(): void {
    const btn = document.getElementById('btn-logout-item');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to sign out?')) return;
      
      const user = getCurrentUser();
      if (user) {
        try { await clearSessionToken(user.uid); } catch { }
      }

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
