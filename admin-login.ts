import { signInWithEmail, signInWithGoogle, resetPassword, signOut, checkEmailRegistered } from './auth-service';
import { isAdmin } from './admin-service';

class AdminLoginPage {
  private form: HTMLFormElement;
  private submitBtn: HTMLButtonElement;
  private errorMessage: HTMLElement;
  private googleLoginBtn: HTMLButtonElement;
  private forgotPasswordLink: HTMLElement;
  private forgotModal: HTMLElement;
  private closeModalBtn: HTMLElement;
  private forgotForm: HTMLFormElement;
  private resetEmailInput: HTMLInputElement;
  private resetBtn: HTMLButtonElement;
  private resetStatus: HTMLElement;

  constructor() {
    this.form = document.getElementById('admin-login-form') as HTMLFormElement;
    this.submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    this.errorMessage = document.getElementById('error-message') as HTMLElement;
    this.googleLoginBtn = document.getElementById('google-login-btn') as HTMLButtonElement;
    this.forgotPasswordLink = document.getElementById('forgot-password') as HTMLElement;
    this.forgotModal = document.getElementById('forgot-modal') as HTMLElement;
    this.closeModalBtn = document.getElementById('close-modal') as HTMLElement;
    this.forgotForm = document.getElementById('forgot-form') as HTMLFormElement;
    this.resetEmailInput = document.getElementById('reset-email') as HTMLInputElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.resetStatus = document.getElementById('reset-status') as HTMLElement;
    this.init();
  }

  private init(): void {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
    this.forgotPasswordLink.addEventListener('click', () => this.showForgotModal());
    this.closeModalBtn.addEventListener('click', () => this.hideForgotModal());
    this.forgotForm.addEventListener('submit', (e) => this.handleResetPassword(e));
    this.forgotModal.addEventListener('click', (e) => {
      if (e.target === this.forgotModal) this.hideForgotModal();
    });
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Signing in...';
    this.hideError();

    const result = await signInWithEmail(email, password);

    if (!result.success) {
      this.showError(result.error || 'Failed to sign in');
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Sign In';
      return;
    }

    const hasAccess = result.user && (await isAdmin(result.user));
    if (!hasAccess) {
      await signOut();
      this.showError('You do not have admin access');
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Sign In';
      return;
    }

    sessionStorage.setItem('app_toast_msg', 'Admin access granted. Welcome back! 👋');
    sessionStorage.setItem('app_toast_type', 'success');
    window.location.href = './admin-dashboard.html';
  }

  private async handleGoogleLogin(): Promise<void> {
    this.googleLoginBtn.disabled = true;
    const originalText = this.googleLoginBtn.innerHTML;
    this.googleLoginBtn.innerHTML = 'Signing in...';
    this.hideError();

    const result = await signInWithGoogle();

    if (!result.success) {
      this.showError(result.error || 'Failed to sign in with Google');
      this.googleLoginBtn.disabled = false;
      this.googleLoginBtn.innerHTML = originalText;
      return;
    }

    const hasAccess = result.user && (await isAdmin(result.user));
    if (!hasAccess) {
      await signOut();
      this.showError('You do not have admin access');
      this.googleLoginBtn.disabled = false;
      this.googleLoginBtn.innerHTML = originalText;
      return;
    }

    sessionStorage.setItem('app_toast_msg', 'Admin access granted. Welcome back! 👋');
    sessionStorage.setItem('app_toast_type', 'success');
    window.location.href = './admin-dashboard.html';
  }

  private showForgotModal(): void {
    this.forgotModal.classList.add('show');
    this.resetEmailInput.focus();
    this.resetStatus.style.display = 'none';
  }

  private hideForgotModal(): void {
    this.forgotModal.classList.remove('show');
    this.forgotForm.reset();
  }

  private async handleResetPassword(e: Event): Promise<void> {
    e.preventDefault();
    const email = this.resetEmailInput.value;

    this.resetBtn.disabled = true;
    this.resetBtn.textContent = 'Sending...';
    this.resetStatus.style.display = 'none';

    const isRegistered = await checkEmailRegistered(email);
    if (!isRegistered) {
      this.resetStatus.textContent = 'This email is not registered. Please sign up or use Google Login.';
      this.resetStatus.style.background = '#FEF2F2';
      this.resetStatus.style.color = '#B91C1C';
      this.resetStatus.style.display = 'block';
      this.resetBtn.disabled = false;
      this.resetBtn.textContent = 'Send Reset Link';
      return;
    }

    const result = await resetPassword(email);
    this.resetBtn.disabled = false;
    this.resetBtn.textContent = 'Send Reset Link';

    if (result.success) {
      this.resetStatus.textContent = 'Reset link sent! Please check your Inbox and Spam folders.';
      this.resetStatus.style.background = '#ECFDF5';
      this.resetStatus.style.color = '#059669';
      this.resetStatus.style.display = 'block';
    } else {
      this.resetStatus.textContent = result.error || 'Failed to send reset link';
      this.resetStatus.style.background = '#FEF2F2';
      this.resetStatus.style.color = '#B91C1C';
      this.resetStatus.style.display = 'block';
    }
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.add('show');
  }

  private hideError(): void {
    this.errorMessage.classList.remove('show');
  }
}

new AdminLoginPage();
