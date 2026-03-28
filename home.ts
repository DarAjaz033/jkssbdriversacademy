import { getCurrentUser, onAuthChange, isPremiumUser } from './auth-service';
import { escapeHtml } from './utils/escape-html';
import { getCourses, Course as AdminCourse } from './admin-service';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase-config';


interface Course {
  id: string;
  title: string;
  description: string;
  syllabus?: string;
  price: number;
  oldPrice?: number;
  duration: string;
  paymentLink?: string;
  thumbCssClass?: string;
  thumbBadge?: string;
  thumbBadgeStyle?: string;
  thumbTopLabel?: string;
  thumbMainHeading?: string;
  thumbSubHeading?: string;
  thumbPartTags?: string;
  thumbBottomCaption?: string;
  thumbnailUrl?: string;
  emoji?: string;
}

// ─── Per-user enrolment key ──────────────────────────────────────────────────
function enrolledKey(userId: string): string {
  return `jkssb_enrolled_${userId}`;
}

// ─── Payment Success Handler ───────────────────────────────────────────────
// 🔁 Replace this body with a real payment gateway call later.
// The function signature (courseId, userId) must remain the same.
export function handlePaymentSuccess(courseId: string, userId: string): void {
  const key = enrolledKey(userId);
  const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
  if (!existing.includes(courseId)) {
    existing.push(courseId);
    localStorage.setItem(key, JSON.stringify(existing));
  }
  window.location.href = './my-courses.html';
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function openCourseModal(course: Course): void {
  // Remove existing modal
  document.getElementById('course-detail-modal')?.remove();

  const syllabusLines = (course.syllabus ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const descLines: string[] = [];
  const rawDesc = course.description?.trim() ?? '';
  const descSegments = rawDesc.split(/\s*\d+\.\s+/).map(s => s.trim()).filter(Boolean);
  let descHeading = '';
  if (descSegments.length > 1) {
    descHeading = descSegments[0];
    descLines.push(...descSegments.slice(1));
  } else if (rawDesc) {
    descLines.push(rawDesc);
  }

  const syllabusHtml = syllabusLines.length
    ? `<ul class="cdm-list">${syllabusLines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
    : '<p style="color:#888;font-style:italic;">No syllabus added yet.</p>';

  const descHtml = descLines.length
    ? `${descHeading ? `<p class="cdm-desc-heading">${escapeHtml(descHeading)}</p>` : ''}<ul class="cdm-list">${descLines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
    : rawDesc
      ? `<p style="color:#ccc;line-height:1.7;">${escapeHtml(rawDesc)}</p>`
      : '<p style="color:#888;font-style:italic;">No description added yet.</p>';

  const overlay = document.createElement('div');
  overlay.id = 'course-detail-modal';
  overlay.className = 'cdm-overlay';
  overlay.innerHTML = `
    <div class="cdm-panel" role="dialog" aria-modal="true">
      <div class="cdm-header">
        <button class="cdm-close" aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 class="cdm-title">${escapeHtml(course.title)}</h2>
        <div class="cdm-price">
          ${course.oldPrice ? `<del style="color:#DC2626; font-size:0.85em; margin-right:8px; text-decoration-thickness: 2px;">₹${course.oldPrice.toLocaleString()}</del>` : ''}
          ₹${course.price.toLocaleString()}
        </div>
      </div>

      <div class="cdm-body">
        <!-- Syllabus toggle -->
        <div class="cdm-toggle-bar watery-tab" data-target="cdm-syllabus">
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Syllabus</span>
          <svg class="cdm-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="cdm-section" id="cdm-syllabus" style="display:none;">
          ${syllabusHtml}
        </div>

        <!-- Description toggle -->
        <div class="cdm-toggle-bar watery-tab" data-target="cdm-description">
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Description</span>
          <svg class="cdm-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="cdm-section" id="cdm-description" style="display:none;">
          ${descHtml}
        </div>
      </div>

      <div class="cdm-footer">
        <div class="cdm-price-box">
          <span style="font-size:22px; font-weight:800; color:var(--text-primary); line-height: 1;">₹${course.price.toLocaleString()}</span>
        </div>
        <button class="${getCurrentUser() ? 'cdm-buy-btn' : 'cdm-buy-btn signin-mode'}" id="cdm-buy-btn-trigger" style="flex: 1; justify-content: center;">
          <span>${getCurrentUser() ? 'Buy Now' : 'Sign In to Enroll'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  `;

  // Toggle logic — only one open at a time
  overlay.querySelectorAll<HTMLElement>('.cdm-toggle-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      const targetId = bar.dataset.target!;
      const section = document.getElementById(targetId)!;
      const arrow = bar.querySelector<SVGElement>('.cdm-arrow')!;
      const isOpen = section.style.display !== 'none';

      // Close all
      overlay.querySelectorAll<HTMLElement>('.cdm-section').forEach(s => (s.style.display = 'none'));
      overlay.querySelectorAll<SVGElement>('.cdm-arrow').forEach(a => a.style.transform = '');

      // Open this one if it was closed
      if (!isOpen) {
        section.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
      }
    });
  });

  // Close on overlay click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#cdm-buy-btn-trigger')?.addEventListener('click', async (e) => {
    const btn = e.target as HTMLButtonElement;
    const user = getCurrentUser();
    if (!user) {
      window.location.href = `./login.html?redirect=${encodeURIComponent(`index.html?buyCourse=${course.id}`)}`;
      return;
    }

    try {
      const { getUserData } = await import('./auth-service');
      const { createSecureOrder, launchCheckout, verifyPaymentStatus } = await import('./payment-service');
      
      const userData = await getUserData(user.uid);
      const email = userData?.email || user.email || '';
      const phone = userData?.phoneNumber || user.phoneNumber || '';
      const name = userData?.name || userData?.displayName || user.displayName || '';

      if (!email || !phone || !name) {
        let missing = [];
        if (!name) missing.push('name');
        if (!email) missing.push('email');
        if (!phone) missing.push('phone number');
        
        alert("Complete your profile to continue\nPlease add your " + missing.join(', ') + " to purchase.");
        window.location.href = './profile.html';
        return;
      }
      
      btn.textContent = "Processing...";
      
      const order = await createSecureOrder(course as unknown as import('./admin-service').Course, phone);
      if (order.error || !order.paymentSessionId) {
        alert("Payment Error: " + (order.error || "Failed to initialize"));
        btn.textContent = "Buy Now";
        return;
      }
      
      const checkoutResult = await launchCheckout(order.paymentSessionId);
      if (checkoutResult && checkoutResult.error) {
         alert("Payment cancelled: " + checkoutResult.error.message);
         btn.textContent = "Buy Now";
         return;
      }
      
      btn.textContent = "Verifying...";
      const verify = await verifyPaymentStatus(order.orderId!);
      if (verify.success) {
        alert("🎉 Course Unlocked! Enjoy your course.");
        window.location.href = "./my-courses.html";
      } else {
        alert("Payment not verified. Please contact support.");
        btn.textContent = "Buy Now";
      }
    } catch (e: any) {
      console.error(e);
      alert('Error: ' + e.message);
      btn.textContent = "Buy Now";
    }
  });

  overlay.querySelector('.cdm-close')?.addEventListener('click', () => overlay.remove());

  document.body.appendChild(overlay);
}

// ─── HomePage ────────────────────────────────────────────────────────────────

class HomePage {
  private coursesContainer: HTMLElement | null;
  private currentUser: any = null;

  constructor() {
    this.coursesContainer = document.querySelector('.course-cards');
    this.init();
    this.setupExpandTopicsDelegation();
    this.updateProfileBadge();
    this.initLiveListener();
  }

  private setupExpandTopicsDelegation(): void {
    document.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.expand-more-topics-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const button = btn as HTMLButtonElement;
      const card = button.closest('.course-description-card');
      const extra = card?.querySelector('.course-topics-extra');
      if (!extra) return;
      const isHidden = getComputedStyle(extra as HTMLElement).display === 'none';
      (extra as HTMLElement).style.display = isHidden ? 'block' : 'none';
      button.textContent = isHidden
        ? (button.dataset.lessText || 'Show less')
        : (button.dataset.moreText || '+ more topics');
      (window as any).lucide?.createIcons();
    });
  }

  private async init(): Promise<void> {
    onAuthChange(async (user) => {
      this.currentUser = user;
      await this.loadCourses();
      await this.updateProfileBadge();
    });
  }

  private async loadCourses(): Promise<void> {
    if (!this.coursesContainer) return;

    this.coursesContainer.innerHTML = `
      <div class="glass-card skeleton-glass"></div>
      <div class="glass-card skeleton-glass"></div>
      <div class="glass-card skeleton-glass"></div>
    `;

    try {
      const coursesResult = await getCourses();
      const allCourses = coursesResult.success && 'courses' in coursesResult && coursesResult.courses ? coursesResult.courses : [];

      if (allCourses.length === 0) {
        this.coursesContainer.innerHTML = `
          <div class="alert-card info" style="grid-column:1/-1;">
            <div class="alert-icon"><i data-lucide="info"></i></div>
            <div class="alert-content">
              <h3>No Courses Available</h3>
              <p>Courses are being prepared. Check back soon!</p>
            </div>
          </div>
        `;
        (window as any).lucide.createIcons();
        return;
      }

      const enrolledIds: string[] = this.currentUser
        ? ((): string[] => {
          try { return JSON.parse(localStorage.getItem(`jkssb_enrolled_${this.currentUser.uid}`) ?? '[]'); }
          catch { return []; }
        })()
        : [];

      const courses: Course[] = allCourses.map(c => ({
        id: c.id!,
        title: c.title,
        description: c.description,
        syllabus: c.syllabus,
        price: c.price,
        oldPrice: c.oldPrice,
        duration: c.duration,
        paymentLink: c.paymentLink,
        thumbnailUrl: c.thumbnailUrl ?? (c as any).thumbnailUrl, // Support both names
        emoji: (c as any).emoji
      } as Course)).sort((a, b) => {
        const aEnrolled = enrolledIds.includes(a.id);
        const bEnrolled = enrolledIds.includes(b.id);
        if (aEnrolled && !bEnrolled) return -1;
        if (!aEnrolled && bEnrolled) return 1;
        return 0;
      });

      this.coursesContainer.innerHTML = courses.map(course =>
        this.renderCourseCard(course, enrolledIds.includes(course.id))
      ).join('');

      // Enrolled cards → redirect directly to My Courses
      this.coursesContainer.querySelectorAll<HTMLButtonElement>('.btn-enrolled').forEach(btn => {
        btn.addEventListener('click', () => {
          window.location.href = './my-courses.html';
        });
      });

      this.coursesContainer.querySelectorAll<HTMLButtonElement>('.btn-enroll').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.courseId!;
          const course = courses.find(c => c.id === id);
          if (course) openCourseModal(course);
        });
      });

      // Handle auto-buy redirect flag
      const urlParams = new URLSearchParams(window.location.search);
      const buyCourseId = urlParams.get('buyCourse');
      if (buyCourseId && this.currentUser) {
        const courseToBuy = courses.find(c => c.id === buyCourseId);
        if (courseToBuy && !enrolledIds.includes(courseToBuy.id)) {
          openCourseModal(courseToBuy);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      (window as any).lucide?.createIcons();
    } catch (error) {
      console.error('Error loading courses:', error);
      if (this.coursesContainer) {
        this.coursesContainer.innerHTML = `
          <div class="alert-card error" style="grid-column:1/-1;">
            <div class="alert-icon"><i data-lucide="alert-circle"></i></div>
            <div class="alert-content">
              <h3>Error Loading Courses</h3>
              <p>Unable to load courses. Please refresh the page.</p>
            </div>
          </div>
        `;
        (window as any).lucide?.createIcons();
      }
    }
  }

  private getThumbInfo(course: Course) {
    if (course.thumbnailUrl || course.emoji) {
      // Dynamic thumbnail from the app/database
      const badgeStyle = course.thumbBadgeStyle || 'badge-pop';
      let badgeHtml = '';
      if (course.thumbBadge) {
        badgeHtml = `<span class="thumb-badge ${badgeStyle}">${escapeHtml(course.thumbBadge)}</span>`;
      }

      let innerContent = '';
      if (course.thumbnailUrl) {
        innerContent = `<img src="${course.thumbnailUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
      }
      innerContent += `<div class="thumb-emoji-fallback" style="width:100%; height:100%; display:none; align-items:center; justify-content:center; font-size:40px;">${course.emoji || '📚'}</div>`;

      if (!course.thumbnailUrl && course.emoji) {
        innerContent = `<div class="thumb-emoji-fallback" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:40px;">${course.emoji}</div>`;
      }

      return {
        class: course.thumbCssClass || 'thumb-default',
        label: course.thumbTopLabel ? escapeHtml(course.thumbTopLabel) : escapeHtml(course.title),
        badge: badgeHtml,
        content: innerContent
      };
    }

    if (course.thumbCssClass) {
      // New dynamic admin-editable thumbnail
      const badgeStyle = course.thumbBadgeStyle || 'badge-pop';
      let badgeHtml = '';
      if (course.thumbBadge) {
        badgeHtml = `<span class="thumb-badge ${badgeStyle}">${escapeHtml(course.thumbBadge)}</span>`;
      }

      let partTagsHtml = '';
      if (course.thumbPartTags) {
        const parts = course.thumbPartTags.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          partTagsHtml = `<div class="fc-parts">${parts.map(p => `<span class="part-pill">${escapeHtml(p)}</span>`).join('')}</div>`;
        }
      }

      return {
        class: course.thumbCssClass,
        label: course.thumbTopLabel ? escapeHtml(course.thumbTopLabel) : '',
        badge: badgeHtml,
        content: `
          ${course.thumbMainHeading ? `<div class="fc-title">${course.thumbMainHeading}</div>` : ''}
          ${course.thumbSubHeading ? `<div class="fc-sub">${course.thumbSubHeading}</div>` : ''}
          ${partTagsHtml}
          ${course.thumbBottomCaption ? `<div class="fc-includes">${course.thumbBottomCaption}</div>` : ''}
        `
      };
    }

    // Fallback legacy system
    const title = course.title;
    const t = title.toLowerCase();
    if (t.includes('full course')) return {
      class: 'thumb-fullcourse',
      label: 'JKSSB Driver Full Course',
      badge: '<span class="thumb-badge badge-pop">Popular</span>',
      content: `
        <div class="fc-title">FULL<br>COURSE</div>
        <div class="fc-sub">All 3 Parts Included</div>
        <div class="fc-parts">
          <span class="part-pill">Part I</span>
          <span class="part-pill">Part II</span>
          <span class="part-pill">Part III</span>
        </div>
        <div class="fc-includes">
          Notes, Videos + 2500+ MCQ Book + <span class="blink-free">FREE</span> MV Act MCQ Book
        </div>
      `
    };
    if (t.includes('part i') && !t.includes('part ii') && !t.includes('part iii')) return {
      class: 'thumb-part1',
      label: 'JKSSB Driver Part I',
      badge: '<span class="thumb-badge badge-val">Best Value</span>',
      content: `
        <div class="p1-main">TRAFFIC<br>RULES &<br>SIGNALLING</div>
        <div class="p1-icons">🚦 🛑 ⚠️</div>
        <div class="p1-sub">Road Safety & Signals</div>
      `
    };
    if (t.includes('part ii') && !t.includes('part iii')) return {
      class: 'thumb-part2',
      label: 'JKSSB Driver Part II',
      badge: '<span class="thumb-badge badge-val">Best Value</span>',
      content: `
        <div class="mv-italic">Objective Questions Answers</div>
        <div class="mv-title">MOTOR<br>VEHICLE<br>ACT</div>
        <div class="mv-sub">1988 & CMV Rules 1989</div>
        <div class="mv-line"></div>
        <div class="mv-by">By Drivers Academy</div>
      `
    };
    if (t.includes('part iii')) return {
      class: 'thumb-part3',
      label: 'JKSSB Driver Part III',
      badge: '<span class="thumb-badge badge-val">Best Value</span>',
      content: `
        <div class="p3-title">MOTOR<br>PARTS &<br>REPAIR</div>
        <div class="p3-icons">🔧 ⚙️ 🔩 🛞</div>
        <div class="p3-sub">Mechanical Knowledge</div>
      `
    };
    if (t.includes('mv act') && t.includes('mcq')) return {
      class: 'thumb-mvact',
      label: 'JKSSB Driver MV Act MCQ Book',
      badge: '',
      content: `
        <div class="mvb-italic">Objective Questions Answers</div>
        <div class="mvb-main">MOTOR<br>VEHICLE<br>ACT</div>
        <div class="mvb-mcq">MCQs book</div>
        <div class="mvb-line"></div>
        <div class="mvb-by">By Drivers Academy</div>
      `
    };
    if (t.includes('old driver papers') || t.includes('old papers')) return {
      class: 'thumb-oldpapers',
      label: 'JKSSB Driver Old Papers',
      badge: '<span class="thumb-badge badge-new">New</span>',
      content: `
        <div class="op-title">OLD<br>DRIVER<br>PAPERS</div>
        <div class="op-sub">JKSSB & Other Boards</div>
        <div class="op-line"></div>
        <div class="op-detail">Previous Year Papers</div>
        <div class="op-by">By Drivers Academy</div>
      `
    };
    // Default fallback (e.g. for Full Syllabus MCQ Book)
    return {
      class: 'thumb-mcqbook',
      label: 'JKSSB Driver MCQ Book',
      badge: '<span class="thumb-badge badge-new">New</span>',
      content: `
        <div class="mcq-count">2500+<br>MCQs</div>
        <div class="mcq-sub">Full Syllabus Covered</div>
        <div class="mcq-line"></div>
        <div class="mcq-detail">Topic Wise · With Answers</div>
        <div class="mcq-by">By Drivers Academy</div>
      `
    };
  }

  private renderCourseCard(course: Course, isEnrolled = false): string {
    const thumb = this.getThumbInfo(course);

    // Calculate discount tag for unenrolled presentation
    let discountStr = '';
    if (course.oldPrice && course.oldPrice > course.price) {
      const off = Math.round(((course.oldPrice - course.price) / course.oldPrice) * 100);
      discountStr = `<span class="discount-tag">${off}% OFF</span>`;
    }

    if (isEnrolled) {
      const isFullCourse = course.title.toLowerCase().includes('full course') || course.id === 'full_course' || course.id === 'FullCourse';
      
      let actionButtons = `
        <button class="btn-enrolled enroll-btn" data-course-id="${course.id}" style="background: linear-gradient(90deg, #16A34A, #22C55E);">
          🎉 Enrolled - Go to Course
        </button>
      `;

      if (isFullCourse) {
        actionButtons = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
              <button class="btn-enrolled enroll-btn part-btn" onclick="window.location.href='./my-courses.html#part1'" style="background: #1e293b; padding: 10px 5px; font-size: 11px;">Part I</button>
              <button class="btn-enrolled enroll-btn part-btn" onclick="window.location.href='./my-courses.html#part2'" style="background: #1e293b; padding: 10px 5px; font-size: 11px;">Part II</button>
              <button class="btn-enrolled enroll-btn part-btn" onclick="window.location.href='./my-courses.html#part3'" style="background: #1e293b; padding: 10px 5px; font-size: 11px;">Part III</button>
            </div>
            <button class="btn-enrolled enroll-btn" data-course-id="${course.id}" style="background: linear-gradient(90deg, #16A34A, #22C55E); margin-top: 4px;">
              View Full Dashboard
            </button>
          </div>
        `;
      }

      return `
        <div class="card" style="box-shadow: 0 4px 20px rgba(22, 163, 74, 0.15); border: 2px solid rgba(22, 163, 74, 0.3);">
          <div class="card-thumb ${thumb.class}">
            <div class="thumb-toplabel">${thumb.label}</div>
            ${thumb.badge}
            ${thumb.content}
          </div>
          <div class="card-body">
            <div class="card-title">${escapeHtml(course.title)}</div>
            ${actionButtons}
          </div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="card-thumb ${thumb.class}">
          <div class="thumb-toplabel">${thumb.label}</div>
          ${thumb.badge}
          ${thumb.content}
        </div>
        <div class="card-body">
          <div class="card-title">${escapeHtml(course.title)}</div>
          <div class="price-row">
            ${course.oldPrice ? `<span class="old-price">₹${course.oldPrice.toLocaleString()}</span>` : ''}
            <span class="new-price">₹${course.price.toLocaleString()}</span>
            ${discountStr}
          </div>
          <button class="btn-enroll enroll-btn" data-course-id="${course.id}">
            View Details &amp; Enroll
          </button>
        </div>
      </div>
    `;
  }

  private async updateProfileBadge(): Promise<void> {
    const badge = document.getElementById('home-profile-badge');
    if (!badge) return;

    if (!this.currentUser) {
      badge.className = 'home-profile-badge guest';
      badge.innerHTML = '👤';
      badge.style.display = 'flex';
      return;
    }

    const premium = await isPremiumUser(this.currentUser.uid);
    if (premium) {
      badge.className = 'home-profile-badge premium';
      badge.innerHTML = '⭐';
      badge.style.display = 'flex';
    } else {
      badge.className = 'home-profile-badge guest';
      badge.innerHTML = '👤';
      badge.style.display = 'flex';
    }
  }

  // ─── Live Class Real-time Sync ─────────────────────────────────────────────
  
  private initLiveListener(): void {
    const bannerPlaceholder = document.getElementById('live-banner-placeholder');
    if (!bannerPlaceholder) return;

    onSnapshot(doc(db, 'live_classes', 'current'), (snapshot) => {
      const data = snapshot.data();
      const appBarTitle = document.getElementById('page-title');
      if (data && data.isLive) {
        this.renderLiveBanner(data);
        if (appBarTitle) {
           appBarTitle.innerHTML = `JKSSB Drivers Academy <span class="app-bar-live-badge"><span class="pulse-dot-small"></span>LIVE</span>`;
        }
        
        // Auto-open modal if requested via URL (parity with mobile app)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('open_live') === 'true') {
          this.openLiveJoinModal(data.roomId || '000 000 0000');
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        if (bannerPlaceholder) bannerPlaceholder.innerHTML = '';
        if (appBarTitle) {
           appBarTitle.innerHTML = `JKSSB Drivers Academy`;
        }
      }
    });

    // Modal Close Logic
    const modal = document.getElementById('live-join-modal');
    const closeBtn = document.getElementById('close-live-modal');
    if (modal && closeBtn) {
      closeBtn.onclick = () => modal.classList.remove('active');
      modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
    }
  }

  private renderLiveBanner(data: any): void {
    const placeholder = document.getElementById('live-banner-placeholder');
    if (!placeholder) return;

    placeholder.innerHTML = `
      <div class="live-banner animate-bottom" id="live-banner-trigger">
        <div class="live-content">
          <div class="live-indicator">
            <span class="pulse-dot"></span>
            LIVE
          </div>
          <div class="live-text">${escapeHtml(data.title || 'Live Class Started')}</div>
        </div>
        <button class="join-icon-btn">
          <span>JOIN NOW</span>
          <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `;

    document.getElementById('live-banner-trigger')?.addEventListener('click', () => {
      this.openLiveJoinModal(data.roomId || '000 000 0000');
    });

    (window as any).lucide?.createIcons();
  }

  private openLiveJoinModal(roomId: string): void {
    const modal = document.getElementById('live-join-modal');
    const idDisplay = document.getElementById('classroom-id-display');
    const copyBtn = document.getElementById('copy-id-btn');
    const openAppBtn = document.getElementById('open-app-direct-btn');

    if (!modal || !idDisplay) return;

    idDisplay.textContent = roomId;
    modal.classList.add('active');

    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(roomId).then(() => {
          if ((window as any).showToast) (window as any).showToast('Classroom ID Copied!', 'success');
        });
      };
    }

    if (openAppBtn) {
      openAppBtn.onclick = () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.open('https://apps.apple.com/us/app/educate-online-teaching-app/id1643531047', '_blank');
        } else {
          // Launch the app directly using the package name "com.educate.theteachingapp"
          window.open('intent://#Intent;package=com.educate.theteachingapp;scheme=educate;end;', '_blank');
        }
      };
    }
  }
}

// Initialize only if we're on a page with course-cards
if (document.querySelector('.course-cards')) {
  new HomePage();
}
