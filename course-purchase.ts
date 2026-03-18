import { getCurrentUser, onAuthChange } from './auth-service';
import { getCourse, hasUserPurchasedCourse, Course } from './admin-service';

declare global {
  interface Window {
    Cashfree: any;
  }
}

class CoursePurchasePage {
  private courseContent: HTMLElement;
  private course: Course | null = null;
  private userId: string | null = null;
  private userEmail: string | null = null;
  private userName: string | null = null;

  constructor() {
    this.courseContent = document.getElementById('course-content') as HTMLElement;
    this.init();
  }

  private async init(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');

    if (!courseId) {
      this.courseContent.innerHTML = '<div style="text-align: center; padding: var(--spacing-xl);">Course not found</div>';
      return;
    }

    onAuthChange(async (user) => {
      if (user) {
        this.userId = user.uid;
        this.userEmail = user.email || '';
        this.userName = user.displayName || 'Student';
        await this.loadCourse(courseId);
      } else {
        this.courseContent.innerHTML = `
          <div style="text-align: center; padding: var(--spacing-xl);">
            <p style="margin-bottom: var(--spacing-md);">Please sign in to purchase this course</p>
            <a href="./index.html" class="btn btn-primary">Go to Home</a>
          </div>
        `;
      }
    });
  }

  private async loadCourse(courseId: string): Promise<void> {
    const result = await getCourse(courseId);

    if (result.success && result.course) {
      this.course = result.course;

      const hasPurchased = await hasUserPurchasedCourse(this.userId!, courseId);

      this.courseContent.innerHTML = `
        <div class="course-header">
          <div class="course-title">${this.course.title}</div>
          <div class="course-meta">
            <span>${this.course.duration}</span>
            <span>•</span>
            <span>${(this.course.category || '').replace('-', ' ').toUpperCase()}</span>
          </div>
        </div>

        ${hasPurchased.hasPurchased ? `
          <div class="already-purchased">
            You already own this course! Go to My Courses to access it.
          </div>
          <a href="./my-courses.html" class="btn btn-primary" style="width: 100%; text-align: center; display: block; text-decoration: none;">
            Go to My Courses
          </a>
        ` : `
          <div class="course-body">
            <div class="section-title">About This Course</div>
            <div class="course-description">${this.course.description}</div>
          </div>

          <div class="price-card">
            <div class="price-label">Course Price</div>
            <div class="price-amount">₹${this.course.price}</div>
          </div>

          <button class="purchase-btn" id="purchase-btn">
            Purchase Course
          </button>
          <p style="text-align: center; font-size: 12px; color: var(--text-tertiary); margin-top: var(--spacing-sm);">
            Secure payment powered by Cashfree
          </p>
        `}
      `;

      if (!hasPurchased.hasPurchased) {
        const purchaseBtn = document.getElementById('purchase-btn');
        if (purchaseBtn) {
          purchaseBtn.addEventListener('click', () => this.handlePurchase());
        }
      }

      (window as any).lucide.createIcons();
    } else {
      this.courseContent.innerHTML = '<div style="text-align: center; padding: var(--spacing-xl);">Course not found</div>';
    }
  }

  private async handlePurchase(): Promise<void> {
    if (!this.course || !this.userId) return;

    const purchaseBtn = document.getElementById('purchase-btn') as HTMLButtonElement;
    purchaseBtn.disabled = true;
    purchaseBtn.textContent = 'Creating Secure Order...';

    try {
      // Call production backend to create a Cashfree order
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: this.course.id,
          courseName: this.course.title,
          amount: this.course.price,
          userId: this.userId,
          userEmail: this.userEmail,
          userName: this.userName,
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create payment order');
      }

      const { paymentSessionId } = await response.json();

      if (!paymentSessionId) {
        throw new Error('No payment session returned from server');
      }

      // Launch Cashfree in-page checkout (keeps user on website)
      if (typeof window.Cashfree === 'undefined') {
        throw new Error('Cashfree SDK not loaded. Please refresh the page and try again.');
      }

      const cashfree = await window.Cashfree({ mode: 'production' });
      cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_self' // Redirect in the same tab
      });
    } catch (error: any) {
      alert('Payment error: ' + (error.message || 'Unknown error'));
      purchaseBtn.disabled = false;
      purchaseBtn.textContent = 'Purchase Course';
    }
  }
}

new CoursePurchasePage();
