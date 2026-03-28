// Drivers Academy - App Logic
// Modern TypeScript Implementation

import {
  signUpWithEmail,
  signInWithEmail,
  signInWithPhone,
  verifyPhoneCode,
  signOut,
  onAuthChange,
  getCurrentUser,
  initSessionVerifier,
  stopSessionVerifier
} from './auth-service';
import { purgeExpiredDownloads } from './offline-manager';
import './public/global-pdf-viewer'; // Global PDF Click Interceptor & Canvas Renderer

// ─── Global Toast Notification System ───────────────────────────────────
(window as any).showToast = function (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: '999999',
      pointerEvents: 'none',
      width: 'max-content',
      maxWidth: '90vw'
    });
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');

  // Base styles for the toast
  Object.assign(toast.style, {
    padding: '12px 24px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: "'Poppins', sans-serif",
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  });

  // Color theming based on type
  if (type === 'success') {
    toast.style.background = '#10b981'; // Green
    toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>${message}</span>`;
  } else if (type === 'error') {
    toast.style.background = '#ef4444'; // Red
    toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> <span>${message}</span>`;
  } else if (type === 'warning') {
    toast.style.background = '#f59e0b'; // Orange
    toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <span>${message}</span>`;
  } else {
    toast.style.background = '#3b82f6'; // Blue
    toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> <span>${message}</span>`;
  }

  container.appendChild(toast);

  // Trigger Entrance Animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Trigger Exit Animation and Removal after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

interface PageState {
  currentPage: string;
  previousPage: string | null;
}

class App {
  private state: PageState = {
    currentPage: 'home',
    previousPage: null
  };

  private carouselInterval: number | null = null;
  private currentSlide: number = 0;
  private totalSlides: number = 5;

  private testimonialInterval: number | null = null;
  private currentTestimonial: number = 0;
  private totalTestimonials: number = 3;

  private isSignUpMode: boolean = false;
  private currentAuthMethod: string = 'email';

  constructor() {
    this.init();

    // Purge any offline PDF's that have passed their 30-day secure timebomb.
    // Done here so it executes on every app launch.
    setTimeout(() => purgeExpiredDownloads(), 1000); // slight delay to prioritize core paint
    this.checkToasts();
  }

  private init(): void {
    this.setupNavigation();
    this.setupPageTitle();
    this.addEventListeners();
    this.initCarousel();
    this.initTestimonialCarousel();
    this.setupFAQ();
    this.updateCopyrightYear();
    this.setupAuth();
    this.registerServiceWorker();
  }

  private checkToasts(): void {
    const msg = sessionStorage.getItem('app_toast_msg');
    const type = sessionStorage.getItem('app_toast_type') as any || 'info';
    if (msg) {
      setTimeout(() => {
        if ((window as any).showToast) {
          (window as any).showToast(msg, type);
        }
      }, 500); // small delay to ensure UI is ready
      sessionStorage.removeItem('app_toast_msg');
      sessionStorage.removeItem('app_toast_type');
    }
  }

  private registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
          console.log('[Service Worker] Registered with scope:', registration.scope);
        }).catch((error) => {
          console.warn('[Service Worker] Registration failed:', error);
        });
      });
    }
  }


  private updateCopyrightYear(): void {
    const yearElement = document.getElementById('copyright-year');
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear().toString();
    }
  }

  private initCarousel(): void {
    const track = document.getElementById('ajazTrack');
    if (track) {
      this.positionAjazCards();
      window.addEventListener('resize', () => this.positionAjazCards());
      this.startCarousel();

      // Touch swipe support
      let tx0 = 0;
      track.addEventListener('touchstart', (e: TouchEvent) => { tx0 = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', (e: TouchEvent) => {
        const d = tx0 - e.changedTouches[0].clientX;
        if (Math.abs(d) > 40) d > 0 ? this.nextSlide() : this.prevSlide();
      });
    } else {
      this.startCarousel();
      this.setupCarouselIndicators();
    }
  }

  private positionAjazCards(): void {
    const track = document.getElementById('ajazTrack');
    const cards = document.querySelectorAll<HTMLElement>('.ajaz-card');
    if (!track || cards.length === 0) return;

    const N = cards.length;
    const w = window.innerWidth;
    const SPREAD = w < 480 ? 32 : w < 768 ? 38 : 42;
    const DEPTH = w < 480 ? 140 : w < 768 ? 180 : 220;
    const XSHIFT = w < 480 ? 110 : w < 768 ? 140 : 170;

    cards.forEach((card, i) => {
      let off = i - this.currentSlide;
      if (off > N / 2) off -= N;
      if (off < -N / 2) off += N;

      const rotY = off * SPREAD;
      const tx = off * XSHIFT;
      const tz = -Math.abs(off) * DEPTH;
      const sc = off === 0 ? 1.06 : Math.max(0.62, 0.86 - Math.abs(off) * 0.12);
      const op = off === 0 ? 1 : Math.max(0.22, 0.6 - Math.abs(off) * 0.17);

      card.style.transform = `translateX(${tx}px) translateZ(${tz}px) rotateY(${rotY}deg) scale(${sc})`;
      card.style.opacity = op.toString();
      card.style.zIndex = (off === 0 ? 20 : Math.max(1, 10 - Math.abs(off) * 3)).toString();

      card.classList.toggle('active', off === 0);
      card.classList.toggle('behind', Math.abs(off) >= 2);
      card.style.pointerEvents = off === 0 ? 'auto' : 'none';
    });
  }

  private startCarousel(): void {
    if (this.carouselInterval) return;
    this.carouselInterval = window.setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  private stopCarousel(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.carouselInterval = null;
    }
  }

  private nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
    this.updateSlides();
    this.resetCarouselTimer();
  }

  private prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
    this.updateSlides();
    this.resetCarouselTimer();
  }

  private resetCarouselTimer(): void {
    this.stopCarousel();
    this.startCarousel();
  }

  private goToSlide(index: number): void {
    this.currentSlide = index;
    this.updateSlides();
    this.resetCarouselTimer();
  }

  private updateSlides(): void {
    this.positionAjazCards();

    const slides = document.querySelectorAll<HTMLElement>('.hero-slide');
    const indicators = document.querySelectorAll<HTMLElement>('.indicator');

    slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === this.currentSlide);
    });

    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === this.currentSlide);
    });
  }

  private setupCarouselIndicators(): void {
    const indicators = document.querySelectorAll<HTMLElement>('.hero-carousel .indicator');

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        this.goToSlide(index);
      });
    });
  }

  private initTestimonialCarousel(): void {
    this.startTestimonialCarousel();
    this.setupTestimonialIndicators();
  }

  private startTestimonialCarousel(): void {
    this.testimonialInterval = window.setInterval(() => {
      this.nextTestimonial();
    }, 4000);
  }

  private stopTestimonialCarousel(): void {
    if (this.testimonialInterval) {
      clearInterval(this.testimonialInterval);
      this.testimonialInterval = null;
    }
  }

  private nextTestimonial(): void {
    this.currentTestimonial = (this.currentTestimonial + 1) % this.totalTestimonials;
    this.updateTestimonials();
  }

  private goToTestimonial(index: number): void {
    this.currentTestimonial = index;
    this.updateTestimonials();
    this.stopTestimonialCarousel();
    this.startTestimonialCarousel();
  }

  private updateTestimonials(): void {
    const testimonials = document.querySelectorAll<HTMLElement>('.testimonial-card');
    const indicators = document.querySelectorAll<HTMLElement>('.testimonial-carousel .indicator');

    testimonials.forEach((testimonial, index) => {
      testimonial.classList.toggle('active', index === this.currentTestimonial);
    });

    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === this.currentTestimonial);
    });
  }

  private setupTestimonialIndicators(): void {
    const indicators = document.querySelectorAll<HTMLElement>('.testimonial-carousel .indicator');

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        this.goToTestimonial(index);
      });
    });
  }

  private setupFAQ(): void {
    const faqItems = document.querySelectorAll<HTMLElement>('.faq-item');

    faqItems.forEach(item => {
      const question = item.querySelector<HTMLElement>('.faq-question');

      if (question) {
        question.addEventListener('click', () => {
          const isActive = item.classList.contains('active');

          if (isActive) {
            item.classList.remove('active');
          } else {
            item.classList.add('active');
          }
        });
      }
    });
  }

  private setupNavigation(): void {
    const navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-btn');

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) {
          this.navigateToPage(page);
        }
      });
    });
  }

  private navigateToPage(pageName: string): void {
    if (pageName === this.state.currentPage) return;

    const currentPage = document.querySelector<HTMLElement>('.page.active');
    const nextPage = document.querySelector<HTMLElement>(`.page[data-page="${pageName}"]`);
    const navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-btn');

    if (!nextPage) return;

    // Update state
    this.state.previousPage = this.state.currentPage;
    this.state.currentPage = pageName;

    // Update pages
    if (currentPage) {
      currentPage.classList.remove('active');
    }
    nextPage.classList.add('active');

    // Update navigation
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageName);
    });

    // Update page title
    this.updatePageTitle(pageName);

    // Scroll to top
    nextPage.scrollTo(0, 0);
  }

  private updatePageTitle(pageName: string): void {
    const titleElement = document.getElementById('page-title');
    if (!titleElement) return;

    const titles: Record<string, string> = {
      home: 'Drivers Academy',
      courses: 'Courses',
      learning: 'My Learning',
      more: 'More'
    };

    titleElement.textContent = titles[pageName] || 'Drivers Academy';
  }

  private setupPageTitle(): void {
    this.updatePageTitle(this.state.currentPage);
  }

  private addEventListeners(): void {
    const navigateButtons = document.querySelectorAll<HTMLButtonElement>('[data-navigate]');

    navigateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.navigate;
        if (target) {
          this.navigateToPage(target);
        }
      });
    });

    // Handle profile button
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        this.showProfileMenu();
      });
    }

    // Add smooth scroll behavior
    this.setupSmoothScroll();
  }

  private showProfileMenu(): void {
    // Always go to profile.html — the profile page handles the not-logged-in state internally
    window.location.href = './profile.html';
  }

  private setupSmoothScroll(): void {
    const pages = document.querySelectorAll<HTMLElement>('.page');
    pages.forEach(page => {
      page.style.scrollBehavior = 'smooth';
    });
  }

  private setupAuth(): void {
    onAuthChange((user) => {
      const profileBtn = document.getElementById('profile-btn');
      if (!profileBtn) return;
      if (user) {
        // Start watching for single-device session overlaps globally
        initSessionVerifier(user.uid);

        if (user.photoURL) {
          // Show mini circular photo in header
          const existing = profileBtn.querySelector('img');
          if (!existing) {
            profileBtn.innerHTML = `<img src="${user.photoURL}" alt="Profile" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid #B45309;" loading="lazy">`;
          }
        }
      } else {
        stopSessionVerifier();
      }
    });
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new App();
  });
} else {
  new App();
}

// Export for potential reuse
export { App };
