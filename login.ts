import {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    saveUserToFirestore,
    generateAndSaveSessionToken,
    checkEmailRegistered,
    resetPassword,
    onAuthChange,
    signInWithPhone,
    verifyPhoneCode
} from './auth-service';

// ─── Flag: login is in progress (prevent onAuthChange race) ──────────────────
let loginInProgress = false;

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const container = document.getElementById('toast-container')!;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ─── Tab Switching ────────────────────────────────────────────────────────────

function switchTab(tab: 'signin' | 'signup' | 'phone') {
    document.getElementById('panel-signin')!.classList.toggle('active', tab === 'signin');
    document.getElementById('panel-signup')!.classList.toggle('active', tab === 'signup');
    document.getElementById('panel-phone')!.classList.toggle('active', tab === 'phone');

    document.getElementById('tab-signin')!.classList.toggle('active', tab === 'signin');
    document.getElementById('tab-signup')!.classList.toggle('active', tab === 'signup');
    document.getElementById('tab-phone')!.classList.toggle('active', tab === 'phone');

    document.getElementById('auth-tabs')!.style.display = 'flex';
    document.getElementById('forgot-section')!.classList.remove('active');
    clearErrors();
}

function showForgot() {
    document.getElementById('panel-signin')!.classList.remove('active');
    document.getElementById('auth-tabs')!.style.display = 'none';
    document.getElementById('forgot-section')!.classList.add('active');
    (document.getElementById('fp-email') as HTMLInputElement).focus();
}

function hideForgot() {
    document.getElementById('forgot-section')!.classList.remove('active');
    document.getElementById('auth-tabs')!.style.display = 'flex';
    document.getElementById('panel-signin')!.classList.add('active');
    const cta = document.getElementById('fp-signup-cta');
    if (cta) cta.style.display = 'none';
    clearErrors();
}

function clearErrors() {
    document.querySelectorAll<HTMLElement>('.field-error').forEach(el => {
        el.textContent = '';
        el.classList.remove('show');
    });
}

function showFieldError(id: string, message: string) {
    const el = document.getElementById(id);
    if (el) { el.textContent = message; el.classList.add('show'); }
}

// ─── After-login: save data then redirect ────────────────────────────────────

async function afterAuth(user: any, name?: string) {
    loginInProgress = true;
    try {
        await saveUserToFirestore(user, name ? { name } : undefined);
        await generateAndSaveSessionToken(user.uid);
    } catch (e) {
        console.warn('[Auth] Post-login Firestore save failed:', e);
    }
    // Set success toast for home page to display
    try {
        sessionStorage.setItem('app_toast_msg', 'Welcome back! You are successfully signed in 👋');
        sessionStorage.setItem('app_toast_type', 'success');
    } catch { }
    // Redirect to requested page or HOME page
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    const redirectUrl = redirectParam ? redirectParam : './index.html';
    window.location.href = redirectUrl;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

async function handleSignIn() {
    clearErrors();
    const email = (document.getElementById('si-email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('si-password') as HTMLInputElement).value;

    if (!email) return showFieldError('si-email-error', 'Please enter your email');
    if (!password) return showFieldError('si-pass-error', 'Please enter your password');

    const btn = document.getElementById('si-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    const result = await signInWithEmail(email, password);

    if (!result.success || !result.user) {
        btn.disabled = false;
        btn.textContent = 'Sign In';
        const msg = result.error?.includes('invalid-credential') || result.error?.includes('wrong-password')
            ? 'Incorrect email or password.'
            : result.error?.includes('user-not-found')
                ? 'No account found with this email.'
                : result.error || 'Sign in failed.';
        return showFieldError('si-pass-error', msg);
    }

    btn.textContent = 'Redirecting...';
    await afterAuth(result.user);
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

async function handleSignUp() {
    clearErrors();
    const name = (document.getElementById('su-name') as HTMLInputElement).value.trim();
    const email = (document.getElementById('su-email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('su-password') as HTMLInputElement).value;
    const confirm = (document.getElementById('su-confirm') as HTMLInputElement).value;

    let valid = true;
    if (!name) { showFieldError('su-name-error', 'Please enter your full name'); valid = false; }
    if (!email) { showFieldError('su-email-error', 'Please enter your email'); valid = false; }
    if (!password) { showFieldError('su-pass-error', 'Please enter a password'); valid = false; }
    else if (password.length < 6) { showFieldError('su-pass-error', 'Password must be at least 6 characters'); valid = false; }
    if (password !== confirm) { showFieldError('su-confirm-error', 'Passwords do not match'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('su-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    const result = await signUpWithEmail(email, password);

    if (!result.success || !result.user) {
        btn.disabled = false;
        btn.textContent = 'Create Account';
        const msg = result.error?.includes('email-already-in-use')
            ? 'An account with this email already exists.'
            : result.error || 'Sign up failed.';
        return showFieldError('su-email-error', msg);
    }

    btn.textContent = 'Setting up...';
    await afterAuth(result.user, name);
}

// ─── Google Auth ──────────────────────────────────────────────────────────────

async function handleGoogle() {
    const siBtn = document.getElementById('si-google-btn') as HTMLButtonElement;
    const suBtn = document.getElementById('su-google-btn') as HTMLButtonElement;
    [siBtn, suBtn].forEach(b => { if (b) b.disabled = true; });

    const result = await signInWithGoogle();

    if (!result.success || !result.user) {
        [siBtn, suBtn].forEach(b => { if (b) b.disabled = false; });
        const msg = result.error?.includes('popup-closed-by-user')
            ? 'Sign-in cancelled.'
            : result.error || 'Google sign-in failed.';
        return showToast(msg, 'error');
    }

    showToast('Signed in! Setting up...', 'info');
    await afterAuth(result.user);
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

async function handleForgotPassword() {
    clearErrors();
    const email = (document.getElementById('fp-email') as HTMLInputElement).value.trim();
    if (!email) return showFieldError('fp-error', 'Please enter your email address');

    const btn = document.getElementById('fp-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Checking...';

    const isRegistered = await checkEmailRegistered(email);

    if (!isRegistered) {
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
        showFieldError('fp-error', 'No account found with this email. Please sign up first.');
        const cta = document.getElementById('fp-signup-cta');
        if (cta) cta.style.display = 'block';
        return;
    }

    btn.textContent = 'Sending...';
    const result = await resetPassword(email);
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';

    if (result.success) {
        showToast('Reset link sent! Check your inbox.', 'success');
        setTimeout(() => hideForgot(), 1600);
    } else {
        showFieldError('fp-error', result.error || 'Failed to send reset link.');
    }
}

// ─── Phone Auth ───────────────────────────────────────────────────────────────

async function handlePhoneSignIn() {
    clearErrors();
    const phone = (document.getElementById('ph-number') as HTMLInputElement).value.trim();
    if (!phone) return showFieldError('ph-error', 'Please enter your phone number');
    if (!phone.startsWith('+')) return showFieldError('ph-error', 'Include country code (e.g., +91)');

    const btn = document.getElementById('ph-send-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Sending OTP...';

    const result = await signInWithPhone(phone, 'recaptcha-container');

    if (result.success) {
        document.getElementById('phone-input-phase')!.style.display = 'none';
        document.getElementById('phone-otp-phase')!.style.display = 'block';
        showToast('OTP sent successfully!', 'success');
    } else {
        btn.disabled = false;
        btn.textContent = 'Send OTP';
        showFieldError('ph-error', result.error || 'Failed to send OTP.');
    }
}

async function handleVerifyOTP() {
    clearErrors();
    const code = (document.getElementById('ph-otp') as HTMLInputElement).value.trim();
    if (!code) return showFieldError('ph-otp-error', 'Please enter the 6-digit code');

    const btn = document.getElementById('ph-verify-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    const result = await verifyPhoneCode(code);

    if (result.success && result.user) {
        btn.textContent = 'Success! Redirecting...';
        await afterAuth(result.user);
    } else {
        btn.disabled = false;
        btn.textContent = 'Verify & login';
        showFieldError('ph-otp-error', result.error || 'Invalid OTP code.');
    }
}

// ─── Expose to window ─────────────────────────────────────────────────────────

(window as any).switchTab = switchTab;
(window as any).showForgot = showForgot;
(window as any).hideForgot = hideForgot;
(window as any).handleSignIn = handleSignIn;
(window as any).handleSignUp = handleSignUp;
(window as any).handleGoogle = handleGoogle;
(window as any).handleForgotPassword = handleForgotPassword;
(window as any).handlePhoneSignIn = handlePhoneSignIn;
(window as any).handleVerifyOTP = handleVerifyOTP;

// ─── Redirect already-logged-in users ────────────────────────────────────────
// ─── Redirect already-logged-in users ────────────────────────────────────────
// Only redirect if we are NOT in the middle of a new login (prevents race condition)

onAuthChange((user) => {
    if (user && !loginInProgress) {
        // User is already logged in from a previous session
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');
        const redirectUrl = redirectParam ? redirectParam : './index.html';
        window.location.href = redirectUrl;
    }
});

// ─── Boot Logic ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'session_conflict') {
        showToast('You have been logged in on another device. Please login again.', 'error');
        // Clean URL to prevent repeated toasts on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check for pending toasts from sessionStorage
    const msg = sessionStorage.getItem('app_toast_msg');
    const type = sessionStorage.getItem('app_toast_type') as any || 'success';
    if (msg) {
        setTimeout(() => showToast(msg, type), 500);
        sessionStorage.removeItem('app_toast_msg');
        sessionStorage.removeItem('app_toast_type');
    }
});
