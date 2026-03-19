import { createPurchase, Course } from './admin-service';

declare global {
  interface Window {
    Cashfree: any;
  }
}

export interface PaymentConfig {
  appId: string;
  secretKey: string;
}

export const initiateCashfreePayment = async (
  course: Course,
  userId: string,
  userEmail: string,
  userName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const orderAmount = course.price;
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const paymentSessionData = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_email: userEmail,
        customer_name: userName,
        customer_phone: '9999999999'
      },
      order_meta: {
        return_url: `${window.location.origin}/payment-success.html?order_id=${orderId}&course_id=${course.id}`
      }
    };

    if (typeof window.Cashfree === 'undefined') {
      return {
        success: false,
        error: 'Cashfree SDK not loaded. Please refresh and try again.'
      };
    }

    await createPurchase({
      userId,
      courseId: course.id!,
      amount: orderAmount,
      paymentId: orderId,
      status: 'pending'
    });

    const checkoutOptions = {
      paymentSessionId: paymentSessionData.order_id,
      returnUrl: paymentSessionData.order_meta.return_url
    };

    const cashfree = new window.Cashfree(checkoutOptions);
    cashfree.redirect();

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Payment initiation failed'
    };
  }
};

export const simulatePayment = async (
  course: Course,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const orderId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await createPurchase({
      userId,
      courseId: course.id!,
      amount: course.price,
      paymentId: orderId,
      status: 'completed'
    });

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Payment simulation failed'
    };
  }
};

export const openDirectPaymentModal = (course: Course, userId: string): void => {
  const overlay = document.createElement('div');
  overlay.className = 'cdm-overlay';
  overlay.style.zIndex = '999999';

  overlay.innerHTML = `
    <div class="checkout-panel">
      <div class="cdm-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px;">
        <h2 class="cdm-title" style="margin: 0; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Secure Checkout
        </h2>
        <button class="cdm-close" style="position: static;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <div class="checkout-iframe-container">
        <iframe src="${course.paymentLink}"></iframe>
      </div>
      
      <div class="cdm-footer" style="padding: 12px 20px; text-align: center; background: rgba(16, 185, 129, 0.05); border-top: 1px solid var(--border);">
        <p style="color: #10b981; font-size: 13px; font-weight: 500; margin: 0;">
          Do not close this window. You will be automatically redirected upon success.
        </p>
        <button id="verify-payment-btn" style="background: none; border: none; color: var(--text-tertiary); font-size: 12px; text-decoration: underline; margin-top: 6px; cursor: pointer; padding: 4px;">
          Click here if not redirected automatically
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // LOG PENDING ORDER for Custom Links tracking
  if (course.paymentLink) {
    const tempOrderId = `FORM_${course.id?.substring(0, 4)}_${Date.now()}`;
    createPurchase({
      userId,
      courseId: course.id!,
      amount: course.price,
      paymentId: tempOrderId,
      status: 'pending'
    }).catch(err => console.warn('Failed to log pending custom form order:', err));
  }

  const closeBtn = overlay.querySelector('.cdm-close');
  closeBtn?.addEventListener('click', () => overlay.remove());

  const executeSuccessFlow = async () => {
    overlay.remove();

    // Webhook dummy registration locally
    await simulatePayment(course, userId);

    // Sync LocalStorage for Home Page immediate update
    try {
      const key = `jkssb_enrolled_${userId}`;
      const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (course.id && !existing.includes(course.id)) {
        existing.push(course.id);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch (e) {
      console.error('Error syncing local storage:', e);
    }

    const showToast = (window as any).showToast;
    if (showToast) {
      showToast('Payment successful! 🎉', 'success');

      setTimeout(() => {
        showToast('You are now enrolled.', 'success');
      }, 1500);

      setTimeout(() => {
        showToast('Learn and enjoy! 🚀', 'success');
      }, 3000);
    }

    // Redirect to My Courses after toasts sequence starts
    setTimeout(() => {
      window.location.href = './my-courses.html';
    }, 4500);
  };

  // 1. Auto-detect via iframe postMessage (if Cashfree returnUrl is set to our /payment-success.html)
  const messageListener = (event: MessageEvent) => {
    if (event.data?.type === 'CASHFREE_PAYMENT_SUCCESS') {
      window.removeEventListener('message', messageListener);
      executeSuccessFlow();
    }
  };
  window.addEventListener('message', messageListener);

  // 2. Fallback manual verify button (tiny text link)
  const verifyBtn = overlay.querySelector('#verify-payment-btn') as HTMLButtonElement;
  verifyBtn?.addEventListener('click', async () => {
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    window.removeEventListener('message', messageListener);

    const result = await simulatePayment(course, userId);

    if (result.success) {
      executeSuccessFlow();
    } else {
      alert('Verification failed. If you paid, please contact support.');
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Click here if not redirected automatically';
      window.addEventListener('message', messageListener);
    }
  });
};
