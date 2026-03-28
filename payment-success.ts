import { getCurrentUser, onAuthChange } from './auth-service';
import { getCourse, createPurchase, Course } from './admin-service';
import { verifyPaymentStatus, generatePurchaseReceipt } from './payment-service';

class PaymentSuccessPage {
  private container: HTMLElement;
  private userId: string | null = null;

  constructor() {
    this.container = document.getElementById('status-container') as HTMLElement;
    this.init();
  }

  private async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');

    if (!orderId) {
      this.renderError('Invalid Request', 'Missing order reference. Please check your email or contact support.');
      return;
    }

    onAuthChange(async (user) => {
      if (user) {
        this.userId = user.uid;
        await this.verifyAndFinalize(orderId);
      } else {
        this.renderError('Authentication Required', 'Please sign in to verify your purchase.');
      }
    });
  }

  private async verifyAndFinalize(orderId: string) {
    try {
      // 1. Verify with backend
      const result = await verifyPaymentStatus(orderId);

      if (result.success) {
        // 2. We can't rely ONLY on webhooks for immediate UI feedback.
        // We'll trust the verification result and show success.
        // The backend Cloud Function verifyPayment should have already updated Firestore.
        
        // Let's get the course details for the receipt (mocking metadata lookup here)
        // In a real flow, verifyPayment would return courseId.
        // For now, we'll try to find the 'pending' order in Firestore to get metadata.
        const courseId = await this.getCourseIdFromOrder(orderId);
        let course: Course | null = null;
        if (courseId) {
           const res = await getCourse(courseId);
           if (res.success) course = res.course!;
        }

        this.renderSuccess(orderId, course);

        if (course && this.userId) {
          await generatePurchaseReceipt(this.userId, course, orderId);
        }

      } else {
        this.renderError('Payment Not Confirmed', result.error || 'Payment might be pending. If money was deducted, please wait 5-10 minutes and check My Courses.');
      }
    } catch (error: any) {
      this.renderError('Verification Error', error.message || 'Something went wrong.');
    }
  }

  private async getCourseIdFromOrder(orderId: string): Promise<string | null> {
     // This is a simplified lookup. In production, result.status from verifyPaymentStatus
     // should include the metadata if the backend is configured that way.
     // For this walkthrough, we'll assume the URL also had course_id as a fallback.
     return new URLSearchParams(window.location.search).get('course_id');
  }

  private renderSuccess(orderId: string, course: Course | null) {
    this.container.innerHTML = `
      <div class="check-icon" style="background: #10B981; animation: none;"><i class="fa-solid fa-check"></i></div>
      <h1>Enrollment Successful! 🎉</h1>
      <p>Welcome to the Academy! You have been successfully enrolled in ${course?.title || 'the course'}.</p>
      
      <div class="receipt-box">
        <div class="receipt-item">
            <span class="receipt-label">Order ID:</span>
            <span class="receipt-value">#${orderId.substring(orderId.length - 8).toUpperCase()}</span>
        </div>
        <div class="receipt-item">
            <span class="receipt-label">Date:</span>
            <span class="receipt-value">${new Date().toLocaleDateString()}</span>
        </div>
        <div class="receipt-item">
            <span class="receipt-label">Status:</span>
            <span class="status-badge success" style="background: #D1FAE5; color: #065F46; padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: 700;">PAID</span>
        </div>
      </div>

      <div class="actions">
        <a href="./my-courses.html" class="btn btn-primary" style="text-decoration: none; padding: 16px; border-radius: 12px; font-weight: 700;">
          Start Learning Now <i class="fa-solid fa-arrow-right"></i>
        </a>
        <button id="download-receipt" class="btn btn-secondary" style="background: #F1F5F9; border: none; padding: 12px; border-radius: 12px; color: #475569; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-file-invoice"></i> Download Receipt
        </button>
      </div>
    `;

    document.getElementById('download-receipt')?.addEventListener('click', () => {
      alert('Your official receipt is being generated and will be sent to your email.');
    });
  }

  private renderError(title: string, msg: string) {
    this.container.innerHTML = `
      <div class="check-icon" style="background: #EF4444; animation: none;"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h1>${title}</h1>
      <p>${msg}</p>
      <div class="actions">
        <a href="./index.html" class="btn btn-secondary" style="text-decoration: none; text-align: center; display: block; background: #F1F5F9; padding: 12px; border-radius: 12px; color: #475569; font-weight: 600;">
          Go to Home
        </a>
      </div>
    `;
  }
}

new PaymentSuccessPage();
