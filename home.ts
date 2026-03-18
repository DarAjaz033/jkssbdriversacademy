import { getCurrentUser, onAuthChange, isPremiumUser } from './auth-service';
import { escapeHtml } from './utils/escape-html';
import { getCourses, Course as AdminCourse } from './admin-service';
import { openDirectPaymentModal } from './payment-service';

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

      <div class="cdm-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
        <div class="cdm-footer-price" style="display: flex; flex-direction: column;">
          ${course.oldPrice ? `<del style="color:var(--text-secondary); font-size:13px; text-decoration-thickness: 1.5px;">₹${course.oldPrice.toLocaleString()}</del>` : ''}
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

  // Buy Now: Dummy payment flow no longer used — route everything through course purchase page
  overlay.querySelector('#cdm-buy-btn-trigger')?.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = `./login.html?redirect=${encodeURIComponent(`index.html?buyCourse=${course.id}`)}`;
      return;
    }

    if (course.paymentLink) {
      const btn = overlay.querySelector('#cdm-buy-btn-trigger');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Opening...';
        window.open(course.paymentLink, '_blank');
        setTimeout(() => btn.innerHTML = originalText, 2000);
      }
    } else {
      window.location.href = `./course-purchase.html?id=${course.id}`;
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
        paymentLink: c.paymentLink
      })).sort((a, b) => {
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
          if (courseToBuy.paymentLink) {
            openDirectPaymentModal(courseToBuy as AdminCourse, this.currentUser.uid);
          } else {
            window.location.href = `./course-purchase.html?id=${courseToBuy.id}`;
          }
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
        <div class="mv-by">By JKSSB Drivers Academy</div>
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
        <div class="mvb-by">By JKSSB Drivers Academy</div>
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
        <div class="op-by">By JKSSB Drivers Academy</div>
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
        <div class="mcq-by">By JKSSB Drivers Academy</div>
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
}

// Initialize only if we're on a page with course-cards
if (document.querySelector('.course-cards')) {
  new HomePage();
}