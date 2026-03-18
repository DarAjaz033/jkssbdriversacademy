import { db } from './firebase-config';
import { escapeHtml } from './utils/escape-html';
import { doc, getDoc } from 'firebase/firestore';
import { getCurrentUser } from './auth-service';
import { openDirectPaymentModal } from './payment-service';
import { Course as AdminCourse, hasUserPurchasedCourse } from './admin-service';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  duration: string;
  category: string;
  thumbCssClass?: string;
  thumbBadge?: string;
  thumbBadgeStyle?: string;
  thumbTopLabel?: string;
  thumbMainHeading?: string;
  thumbSubHeading?: string;
  thumbPartTags?: string;
  thumbBottomCaption?: string;
  paymentLink?: string;
}

class CourseDetailsPage {
  private mainContent: HTMLElement | null;
  private courseId: string | null;
  private isEnrolled: boolean = false;

  constructor() {
    this.mainContent = document.querySelector('.page-content');
    this.courseId = this.getCourseIdFromURL();
    this.init();
  }

  private getCourseIdFromURL(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  private async init(): Promise<void> {
    if (!this.courseId) {
      this.showError('Course not found');
      return;
    }

    await this.checkEnrollment();
    await this.loadCourseDetails();
  }

  private async checkEnrollment(): Promise<void> {
    const user = getCurrentUser();
    if (user && this.courseId) {
      const result = await hasUserPurchasedCourse(user.uid, this.courseId);
      this.isEnrolled = !!(result.success && result.hasPurchased);
    }
  }

  private async loadCourseDetails(): Promise<void> {
    if (!this.mainContent || !this.courseId) return;

    this.mainContent.innerHTML = '';

    try {
      const courseDoc = await getDoc(doc(db, 'courses', this.courseId));

      if (!courseDoc.exists()) {
        this.showError('Course not found');
        return;
      }

      const course = { id: courseDoc.id, ...courseDoc.data() } as Course;
      this.renderCourseDetails(course);
    } catch (error) {
      console.error('Error loading course:', error);
      this.showError('Error loading course details');
    }
  }

  private formatCourseDescription(description: string): { title?: string; points: string[]; isList: boolean } {
    const trimmed = description.trim();
    const segments = trimmed.split(/\s*\d+\.\s+/).map((s) => s.trim()).filter(Boolean);
    if (segments.length > 1) {
      return {
        title: segments[0],
        points: segments.slice(1),
        isList: true,
      };
    }
    return { title: undefined, points: [trimmed], isList: false };
  }

  private renderDescriptionSection(description: string): string {
    const { title, points, isList } = this.formatCourseDescription(description);
    if (isList && points.length > 0) {
      return `
        <div style="margin-bottom: 0;">
          ${title ? `
            <h3 style="font-size: 17px; font-weight: 600; color: var(--primary); margin-bottom: var(--spacing-md); display: flex; align-items: center; gap: 8px;">
              <i data-lucide="list" style="width: 18px; height: 18px;"></i>
              ${escapeHtml(title)}
            </h3>
          ` : ''}
          <div style="display: grid; gap: var(--spacing-sm);">
            ${points
          .map(
            (point) => `
              <div style="display: flex; align-items: start; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); background: rgba(255, 255, 255, 0.5); border-radius: var(--radius-md); border-left: 4px solid var(--primary); backdrop-filter: blur(5px);">
                <div style="flex-shrink: 0; width: 24px; height: 24px; border-radius: var(--radius-sm); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; margin-top: 2px;">
                  <i data-lucide="check" style="width: 14px; height: 14px; color: white; stroke-width: 3;"></i>
                </div>
                <span style="color: var(--text-secondary); font-size: 15px; line-height: 1.7;">${escapeHtml(point)}</span>
              </div>
            `
          )
          .join('')}
          </div>
        </div>
      `;
    }
    return `
      <p style="font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin: 0;">
        ${escapeHtml(description)}
      </p>
    `;
  }

  private getThumbInfo(course: Course) {
    if (course.thumbCssClass) {
      // New dynamic admin-editable thumbnail
      const badgeStyle = course.thumbBadgeStyle || 'badge-pop';
      let badgeHtml = '';
      if (course.thumbBadge) {
        badgeHtml = `< span class="thumb-badge ${badgeStyle}" > ${escapeHtml(course.thumbBadge)} </span>`;
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
                                                            <div class="mcq-count">2500 + <br>MCQs</div>
                                                              <div class="mcq-sub">Full Syllabus Covered</div>
                                                                <div class="mcq-line"></div>
                                                                  <div class="mcq-detail">Topic Wise · With Answers</div>
                                                                    <div class="mcq-by">By JKSSB Drivers Academy</div>
                                                                      `
    };
  }

  private renderCourseDetails(course: Course): void {
    if (!this.mainContent) return;

    this.mainContent.innerHTML = `
                                                                      < div style = "max-width: 1200px; margin: 0 auto;" >
                                                                        <!--Back Button-- >
                                                                          <button
          onclick="window.history.back()"
class="icon-btn"
style = "display: flex; align-items: center; gap: 8px; margin-bottom: var(--spacing-lg); padding: 10px 18px; width: auto;"
  >
  <i data - lucide="arrow-left" style = "width: 18px; height: 18px;" > </i>
    < span style = "font-size: 15px; font-weight: 500;" > Back </span>
      </button>

      < !--Course Header Card-- >
        <div class="info-card" style = "animation-delay: 0.1s; padding: 0; overflow: hidden;" >
          <div class="card-thumb ${this.getThumbInfo(course).class}" style = "height: 220px; border-radius: 0;" >
            <div class="thumb-toplabel" > ${this.getThumbInfo(course).label} </div>
            ${this.getThumbInfo(course).badge}
            ${this.getThumbInfo(course).content}
</div>
  < div style = "display: flex; flex-direction: column; gap: var(--spacing-md); text-align: left; padding: var(--spacing-xl);" >

    <div class="course-description-styled" style = "margin: 0;" >
      ${this.renderDescriptionSection(course.description)}
</div>

  < !--Price and Meta Info-- >
    <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-md); align-items: center; margin-top: var(--spacing-sm);" >
      <div style="background: var(--gradient-primary); padding: 12px 20px; border-radius: var(--radius-lg); box-shadow: 0 4px 15px rgba(180, 83, 9, 0.3); display: flex; align-items: baseline; gap: 8px;" >
        ${course.oldPrice ? `<del style="color: rgba(255,255,255,0.7); font-size: 16px; font-weight: 500;">₹${course.oldPrice.toLocaleString()}</del>` : ''}
<div style="font-size: 28px; font-weight: 700; color: white;" >₹${course.price.toLocaleString()} </div>
  </div>

  < div style = "display: flex; flex-wrap: wrap; gap: var(--spacing-md); color: var(--text-secondary); font-size: 14px;" >
    <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.6); padding: 8px 14px; border-radius: var(--radius-md); backdrop-filter: blur(10px);" >
      <i data - lucide="clock" style = "width: 16px; height: 16px;" > </i>
        < span > ${escapeHtml(course.duration)} </span>
          </div>
          < div style = "display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.6); padding: 8px 14px; border-radius: var(--radius-md); backdrop-filter: blur(10px);" >
            <i data - lucide="tag" style = "width: 16px; height: 16px;" > </i>
              < span > ${escapeHtml(course.category)} </span>
                </div>
                </div>
                </div>

                <!--Enroll Button-->
                <button
                  id="course-enroll-btn"
                  class="${this.isEnrolled ? 'btn-secondary' : 'btn-primary'}"
                  style="width: 100%; margin-top: var(--spacing-md); padding: 16px; font-size: 16px; font-weight: 600; cursor: ${this.isEnrolled ? 'default' : 'pointer'};"
                >
                  <span>${this.isEnrolled ? 'Already Enrolled' : 'Enroll Now'}</span>
                  <i data-lucide="${this.isEnrolled ? 'check' : 'arrow-right'}" style="width: 20px; height: 20px;"></i>
                </button>
      </div>
      </div>

      < !--What You'll Learn Card -->
        < div class="info-card" style = "animation-delay: 0.2s;" >
          <div style="text-align: left;" >
            <h2 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-sm);" >
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white;" >
                <i data - lucide="star" style = "width: 20px; height: 20px;" > </i>
                  </div>
                  < span > What You'll Learn</span>
                    </h2>

                    < div style = "display: grid; gap: var(--spacing-sm);" >
                      ${this.getFeaturesList(course.category).map(feature => `
                <div style="display: flex; align-items: start; gap: var(--spacing-sm); padding: var(--spacing-sm); background: rgba(255, 255, 255, 0.4); border-radius: var(--radius-md); backdrop-filter: blur(5px);">
                  <div style="flex-shrink: 0; width: 24px; height: 24px; border-radius: var(--radius-sm); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; margin-top: 2px;">
                    <i data-lucide="check" style="width: 14px; height: 14px; color: white; stroke-width: 3;"></i>
                  </div>
                  <span style="color: var(--text-secondary); font-size: 15px; line-height: 1.6;">${feature}</span>
                </div>
              `).join('')
      }
</div>
  </div>
  </div>

  <!--Course Content Card-->
    ${this.getCategorySpecificContent(course.category)}
  </div>
  `;

    const enrollBtn = document.getElementById('course-enroll-btn');
    if (enrollBtn) {
      enrollBtn.addEventListener('click', () => {
        if (this.isEnrolled) {
          window.location.href = './my-courses.html';
          return;
        }
        const user = getCurrentUser();
        if (!user) {
          window.location.href = `./login.html?redirect=${encodeURIComponent(`course-details.html?id=${course.id}&buy=true`)}`;
          return;
        }
        if (course.paymentLink) {
          const originalText = enrollBtn.innerHTML;
          enrollBtn.innerHTML = 'Opening Secure Checkout...';
          window.open(course.paymentLink, '_blank');
          setTimeout(() => enrollBtn.innerHTML = originalText, 2000);
        } else {
          window.location.href = `./course-purchase.html?id=${course.id}`;
        }
      });
    }

    // Auto-open logic if returning from login
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('buy') === 'true' && getCurrentUser()) {
      if (course.paymentLink) {
        window.open(course.paymentLink, '_blank');
      } else {
        window.location.href = `./course-purchase.html?id=${course.id}`;
      }
      window.history.replaceState({}, document.title, window.location.pathname + `?id=${course.id}`);
    }

    (window as any).lucide?.createIcons();
  }

  private getFeaturesList(category: string): string[] {
    return [
      `Comprehensive coverage of ${category} `,
      'Practice tests and quizzes',
      'Study materials and PDFs',
      'Expert guidance and support',
      'Lifetime access to content',
      'Mobile-friendly learning experience'
    ];
  }

  private getCategorySpecificContent(category: string): string {
    const contentMap: { [key: string]: string } = {
      'Complete Package': `
  < div class="info-card" style = "animation-delay: 0.3s;" >
    <div style="text-align: left;" >
      <h2 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-sm);" >
        <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white;" >
          <i data - lucide="package" style = "width: 20px; height: 20px;" > </i>
            </div>
            < span > Complete Package Includes </span>
              </h2>

              < div style = "display: grid; gap: var(--spacing-md);" >
                <div style="padding: var(--spacing-md); background: rgba(255, 255, 255, 0.4); border-radius: var(--radius-lg); backdrop-filter: blur(5px); border-left: 4px solid var(--primary);" >
                  <h4 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-xs); display: flex; align-items: center; gap: 8px;" >
                    <i data - lucide="traffic-cone" style = "width: 18px; height: 18px; color: var(--primary);" > </i>
                  Part I - Traffic Rules
  </h4>
  < p style = "font-size: 14px; color: var(--text-secondary); line-height: 1.5;" > Traffic signals, road safety, and regulations </p>
    </div>

    < div style = "padding: var(--spacing-md); background: rgba(255, 255, 255, 0.4); border-radius: var(--radius-lg); backdrop-filter: blur(5px); border-left: 4px solid var(--primary);" >
      <h4 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-xs); display: flex; align-items: center; gap: 8px;" >
        <i data - lucide="file-text" style = "width: 18px; height: 18px; color: var(--primary);" > </i>
                  Part II - MV Act
  </h4>
  < p style = "font-size: 14px; color: var(--text-secondary); line-height: 1.5;" > Motor Vehicle Act and CMV Rules </p>
    </div>

    < div style = "padding: var(--spacing-md); background: rgba(255, 255, 255, 0.4); border-radius: var(--radius-lg); backdrop-filter: blur(5px); border-left: 4px solid var(--primary);" >
      <h4 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-xs); display: flex; align-items: center; gap: 8px;" >
        <i data - lucide="settings" style = "width: 18px; height: 18px; color: var(--primary);" > </i>
                  Part III - Mechanical
  </h4>
  < p style = "font-size: 14px; color: var(--text-secondary); line-height: 1.5;" > Vehicle parts and maintenance </p>
    </div>
    </div>
    </div>
    </div>
      `,
      'Traffic Rules': `
    < div class="info-card" style = "animation-delay: 0.3s;" >
      <div style="text-align: left;" >
        <h2 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-sm);" >
          <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white;" >
            <i data - lucide="book-open" style = "width: 20px; height: 20px;" > </i>
              </div>
              < span > Topics Covered </span>
                </h2>

                < div style = "display: grid; gap: var(--spacing-sm);" >
                  ${['Traffic Police hand signals', 'Basic Road Rules and speed limits', 'Traffic light signals', 'Road safety knowledge', 'First aid basics'].map(topic => `
                <div style="display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm); background: rgba(255, 255, 255, 0.4); border-radius: var(--radius-md); backdrop-filter: blur(5px);">
                  <i data-lucide="circle-dot" style="width: 16px; height: 16px; color: var(--primary); flex-shrink: 0;"></i>
                  <span style="color: var(--text-secondary); font-size: 14px;">${topic}</span>
                </div>
              `).join('')
        }
</div>
  </div>
  </div>
    `,
      'MV Act': `
  < div class="info-card" style = "animation-delay: 0.3s;" >
    <div style="text-align: left;" >
      <h2 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-sm);" >
        <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white;" >
          <i data - lucide="book-open" style = "width: 20px; height: 20px;" > </i>
            </div>
            < span > Topics Covered </span>
              </h2>

              < div style = "display: grid; gap: var(--spacing-sm);" >
                ${['Motor Vehicle Act, 1988', 'CMV Rules, 1989', 'Registration procedures', 'Licensing requirements', 'Insurance essentials'].map(topic => `
                <div style="display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm); background: rgba(255, 255, 255, 0.4); border-radius: var(--radius-md); backdrop-filter: blur(5px);">
                  <i data-lucide="circle-dot" style="width: 16px; height: 16px; color: var(--primary); flex-shrink: 0;"></i>
                  <span style="color: var(--text-secondary); font-size: 14px;">${topic}</span>
                </div>
              `).join('')
        }
</div>
  </div>
  </div>
    `,
      'Mechanical': `
  < div class="info-card" style = "animation-delay: 0.3s;" >
    <div style="text-align: left;" >
      <h2 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-sm);" >
        <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white;" >
          <i data - lucide="book-open" style = "width: 20px; height: 20px;" > </i>
            </div>
            < span > Topics Covered </span>
              </h2>

              < div style = "display: grid; gap: var(--spacing-sm);" >
                ${['Vehicle major assemblies', 'Daily and periodic inspection', 'Fault diagnosis and repair', 'Lubrication and servicing', 'Dashboard symbols'].map(topic => `
                <div style="display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm); background: rgba(255, 255, 255, 0.4); border-radius: var(--radius-md); backdrop-filter: blur(5px);">
                  <i data-lucide="circle-dot" style="width: 16px; height: 16px; color: var(--primary); flex-shrink: 0;"></i>
                  <span style="color: var(--text-secondary); font-size: 14px;">${topic}</span>
                </div>
              `).join('')
        }
</div>
  </div>
  </div>
    `
    };

    return contentMap[category] || '';
  }

  private showError(message: string): void {
    if (!this.mainContent) return;

    this.mainContent.innerHTML = `
  < div style = "max-width: 1200px; margin: 0 auto;" >
    <button
          onclick="window.history.back()"
class="icon-btn"
style = "display: flex; align-items: center; gap: 8px; margin-bottom: var(--spacing-lg); padding: 10px 18px; width: auto;"
  >
  <i data - lucide="arrow-left" style = "width: 18px; height: 18px;" > </i>
    < span style = "font-size: 15px; font-weight: 500;" > Back </span>
      </button>

      < div class="info-card" style = "text-align: center;" >
        <div class="info-icon" style = "margin: 0 auto var(--spacing-lg);" >
          <i data - lucide="alert-circle" style = "width: 48px; height: 48px;" > </i>
            </div>

            < h2 style = "font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-md);" >
              ${message}
</h2>

  < p style = "font-size: 15px; color: var(--text-secondary); margin-bottom: var(--spacing-lg);" >
    The course you're looking for could not be found or may have been removed.
      </p>

      < button
onclick = "window.location.href='./index.html'"
class="btn-primary"
style = "width: 100%; max-width: 300px; padding: 16px; font-size: 16px; font-weight: 600;"
  >
  <i data - lucide="home" style = "width: 20px; height: 20px;" > </i>
    < span > Back to Home </span>
      </button>
      </div>
      </div>
        `;

    (window as any).lucide?.createIcons();
  }
}

// Initialize only if we're on the course details page
if (document.querySelector('.page-content') && window.location.pathname.includes('course-details')) {
  new CourseDetailsPage();
}
