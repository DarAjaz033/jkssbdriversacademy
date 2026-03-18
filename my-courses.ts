import './public/global-pdf-viewer';
import { VideoPlayer } from './utils/video-player';
import { onAuthChange } from './auth-service';
import {
  getPDFs,
  getCourseQuizzes,
  getCourses,
  getCourseVideos,
  Course,
  PDF,
  Video,
  PracticeTest,
  fetchUserEnrollments
} from './admin-service';

let _uid = 0;
function uid() { return ++_uid; }

class MyCoursesPage {
  private coursesContainer: HTMLElement;

  constructor() {
    this.coursesContainer = document.querySelector('#courses-content') as HTMLElement;
    this.injectStyles();
    this.init();
  }

  /* ─── Styles ──────────────────────────────────────────────────────────── */
  private injectStyles(): void {
    if (document.getElementById('mc-styles')) return;
    const s = document.createElement('style');
    s.id = 'mc-styles';
    s.textContent = `
      #courses-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 14px 13px 30px;
        background: transparent;
      }
      .mc-wrapper {
        position: relative;
        width: 100%;
        overflow-x: hidden;
      }
      .mc-courses-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .mc-courses-list.hidden {
        transform: translateX(-50%);
        opacity: 0;
        pointer-events: none;
        position: absolute;
        width: 100%;
      }
      .mc-card {
        border-radius: 20px;
        overflow: hidden;
        box-shadow: var(--shadow-lg);
        animation: mcUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        background: var(--bg-card);
        border: 1px solid var(--border);
      }
      @keyframes mcUp {
        from { opacity:0; transform:translateY(20px) scale(0.96); }
        to   { opacity:1; transform:translateY(0)    scale(1); }
      }
      .mc-face {
        position: relative;
        min-height: 175px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 16px 13px 14px;
        overflow: hidden;
        background: var(--gradient-hero, linear-gradient(135deg, #B45309 0%, #D97706 50%, #EA580C 100%));
      }
      .mc-face::before {
        content:''; position:absolute; width:120px; height:120px; border-radius:50%;
        background:rgba(255,255,255,0.07); top:-40px; right:-30px; pointer-events:none;
      }
      .mc-face::after {
        content:''; position:absolute; width:75px; height:75px; border-radius:50%;
        background:rgba(255,255,255,0.08); bottom:-18px; left:-18px; pointer-events:none;
      }
      .mc-enrolled {
        position: absolute; top: 10px; right: 10px; z-index: 2; font-size: 9px; font-weight: 700;
        letter-spacing: 0.4px; color: #fff; background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.35); border-radius: 99px; padding: 2px 8px; backdrop-filter: blur(6px);
      }
      .mc-icon {
        width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.18);
        border: 1.5px solid rgba(255,255,255,0.28); display: flex; align-items: center; justify-content: center;
        color: #fff; flex-shrink: 0; position: relative; z-index: 1; margin-bottom: 8px; backdrop-filter: blur(4px);
      }
      .mc-title {
        font-size: 13.5px; font-weight: 700; color: #fff; line-height: 1.38;
        text-shadow: 0 1px 4px rgba(0,0,0,0.2); margin: 0 0 13px; position: relative; z-index: 1;
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
      }
      .mc-btns {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px; position: relative; z-index: 1; margin-top: auto;
      }
      .mc-btn {
        display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1.5px solid rgba(255,255,255,0.25);
        border-radius: 12px; background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); color: #fff;
        font-family: 'Poppins', system-ui, sans-serif; font-size: 11.5px; font-weight: 600; cursor: pointer;
        transition: background .18s, border-color .18s, transform .13s; -webkit-tap-highlight-color: transparent;
        user-select: none; width: 100%;
      }
      .mc-btn:hover  { background:rgba(255,255,255,0.22); border-color:rgba(255,255,255,0.5); }
      .mc-btn:active { transform:scale(0.95); }
      .mc-btn-icon-pdf { width: 22px; height: 22px; background: #ef4444; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 5px rgba(239,68,68,0.3); }
      .mc-btn-icon-quiz { width: 22px; height: 22px; background: #22c55e; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 5px rgba(34,197,94,0.3); }
      .mc-btn-icon-video { width: 22px; height: 22px; background: #f97316; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 5px rgba(249,115,22,0.3); }
      .mc-btn-lbl { flex:1; text-align: left; }
      .mc-chev { margin-left:auto; flex-shrink:0; transition:transform .24s; }
      .mc-content-view {
        position: absolute; top: 0; left: 0; right: 0; background: transparent; transform: translateX(100%);
        opacity: 0; visibility: hidden; transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s;
        z-index: 10; min-height: 400px;
      }
      .mc-content-view.active { transform: translateX(0); opacity: 1; visibility: visible; position: relative; }
      .mc-view-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
      .mc-btn-back {
        width: 36px; height: 36px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border);
        display: flex; align-items: center; justify-content: center; color: var(--text-primary);
        box-shadow: var(--shadow-sm); cursor: pointer; padding: 0; transition: transform 0.2s, background 0.2s;
      }
      .mc-btn-back:active { transform: scale(0.9); opacity: 0.8; }
      .mc-view-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
      .mc-item {
        display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: var(--bg-card);
        border: 1px solid var(--border); text-decoration: none; color: var(--text-primary); font-size: 12px;
        font-weight: 500; transition: background .14s, border-color .14s, transform .14s; box-shadow: var(--shadow-sm);
        line-height: 1.4; margin-bottom: 10px;
      }
      .mc-item:hover { background: var(--bg-app); border-color: var(--primary); transform: translateX(2px); }
      .mc-ico-pdf { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; background: linear-gradient(135deg, #fee2e2, #ef4444); display: flex; align-items: center; justify-content: center; color: #fff; }
      .mc-ico-quiz { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; background: linear-gradient(135deg, #dcfce7, #22c55e); display: flex; align-items: center; justify-content: center; color: #fff; }
      .mc-ico-video { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; background: linear-gradient(135deg, #ffedd5, #f97316); display: flex; align-items: center; justify-content: center; color: #fff; }
      .mc-item-txt { flex: 1; word-break: break-word; }
      .mc-item-badge { font-size: 10px; color: #fff; background: var(--primary); padding: 2px 8px; border-radius: 99px; font-weight: 600; flex-shrink: 0; white-space: nowrap; }
      .mc-none { text-align: center; color: var(--text-tertiary); font-size: 13px; padding: 24px 0; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border); }
      .mc-full { width: 100%; }
      .mc-tabs { display: flex; gap: 8px; margin-bottom: 16px; background: var(--bg-app); padding: 5px; border-radius: 12px; border: 1px solid var(--border); }
      .mc-tab { flex: 1; padding: 8px; border: none; background: transparent; color: var(--text-secondary); font-size: 11px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
      .mc-tab.active { background: var(--bg-card); color: var(--primary); box-shadow: var(--shadow-sm); }
      .mc-tab-content { display: none; }
      .mc-tab-content.active { display: block; }

      /* Full Course specific - Part indicator */
      .mc-part-badge {
        font-size: 10px; font-weight: 800; text-transform: uppercase; color: rgba(255,255,255,0.9);
        background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; margin-right: 6px;
      }
    `;
    document.head.appendChild(s);
  }

  /* ─── Auth ────────────────────────────────────────────────────────────── */
  private async init(): Promise<void> {
    onAuthChange(async (user) => {
      if (user) {
        await this.loadEnrolledCourses(user.uid);
      } else {
        this.showEmptyState('Sign In Required', 'Please sign in to view your enrolled courses.', 'Go to Home', './index.html');
      }
    }, true);
  }

  private async loadEnrolledCourses(userId: string): Promise<void> {
    this.coursesContainer.innerHTML = `
      <div class="skeleton-card" style="margin-bottom: var(--spacing-md);"><div class="skeleton skeleton-img"></div><div style="padding-top:12px;"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div></div>
    `;

    const enrollmentsRes = await fetchUserEnrollments(userId);
    const enrolledIds = enrollmentsRes.success ? (enrollmentsRes.enrolledIds as string[]) : [];

    if (enrolledIds.length === 0) {
      this.showEmptyState('No Enrolled Courses','You have no active enrolled courses.', 'Browse Courses', './course-details.html');
      return;
    }

    const coursesRes = await getCourses();
    const allCourses: Course[] = (coursesRes.success && 'courses' in coursesRes && coursesRes.courses) ? coursesRes.courses : [];
    const hasFullCourse = enrolledIds.includes('full_course');
    const partIds = ['part1', 'part2', 'part3'];

    const enrolledCourses = allCourses.filter(c => {
      if (!c.id || !enrolledIds.includes(c.id)) return false;
      // If user has full_course, don't show individual parts (Part 1, 2, 3) 
      // as separate cards because they are accessible inside the Full Course card.
      if (hasFullCourse && partIds.includes(c.id)) return false;
      return true;
    });

    if (enrolledCourses.length === 0) {
      this.showEmptyState('No Enrolled Courses','No enrolled courses found.', 'Browse Courses', './course-details.html');
      return;
    }

    const pdfsRes = await getPDFs();
    const allPDFs: PDF[] = (pdfsRes.success && pdfsRes.pdfs) ? pdfsRes.pdfs : [];

    const cards: string[] = [];
    const views: string[] = [];
    for (const course of enrolledCourses) {
      const isFullCourse = course.id === 'full_course' || course.id === 'FullCourse' || course.title.toLowerCase().includes('full course');
      
      if (isFullCourse) {
        const fullData = await this.buildFullCourseCard(course, allPDFs);
        cards.push(fullData.card);
        views.push(fullData.views);
      } else {
        const coursePDFs = allPDFs.filter(p => (course.pdfIds && course.pdfIds.includes(p.id!)) || (p.courseId === course.id));
        const quizzesRes = await getCourseQuizzes(course.id!);
        const courseQuizzes: PracticeTest[] = (quizzesRes.success && quizzesRes.tests) ? quizzesRes.tests.filter(q => q.courseId === course.id || q.partId === course.id) : [];
        const videosRes = await getCourseVideos(course.id!);
        const courseVideos: Video[] = (videosRes.success && videosRes.videos) ? videosRes.videos.filter(v => v.courseId === course.id || v.partId === course.id) : [];

        const cardData = this.buildCardWithViews(course, coursePDFs, courseQuizzes, courseVideos);
        cards.push(cardData.card);
        views.push(cardData.views);
      }
    }

    this.coursesContainer.innerHTML = `
      <div class="mc-wrapper">
        <div class="mc-courses-list" id="mc-courses-list">
          ${cards.join('')}
        </div>
        ${views.join('')}
      </div>
    `;
    this.attachListeners();
  }

  private async buildFullCourseCard(course: Course, allPDFs: PDF[]): Promise<{ card: string, views: string }> {
    const cardId = uid();
    const parts = [
      { id: 'part1', title: 'Part I: Traffic Rules', label: 'Part 1' },
      { id: 'part2', title: 'Part II: MV Act', label: 'Part 2' },
      { id: 'part3', title: 'Part III: Mechanical', label: 'Part 3' }
    ];

    let subViews = '';
    const partBttons = parts.map(p => {
      const viewId = `mc-view-full-${p.id}-${cardId}`;
      return `
        <button class="mc-btn" data-target="${viewId}">
          <span class="mc-part-badge">${p.label}</span>
          <span class="mc-btn-lbl">Explore</span>
          <svg class="mc-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      `;
    }).join('');

    for (const p of parts) {
      const viewId = `mc-view-full-${p.id}-${cardId}`;
      const partPDFs = allPDFs.filter(pdf => pdf.courseId === p.id || pdf.partId === p.id);
      const quizzesRes = await getCourseQuizzes(p.id);
      const partQuizzes = (quizzesRes.success && quizzesRes.tests) ? quizzesRes.tests.filter(q => q.courseId === p.id || q.partId === p.id) : [];
      const videosRes = await getCourseVideos(p.id);
      const partVideos = (videosRes.success && videosRes.videos) ? videosRes.videos.filter(v => v.courseId === p.id || v.partId === p.id) : [];

      subViews += this.renderContentView(viewId, `${p.title}`, partPDFs, partQuizzes, partVideos);
    }

    const card = `
      <div class="mc-card" id="${course.id}">
        <div class="mc-face">
          <span class="mc-enrolled">✓ Enrolled</span>
          <div>
            <div class="mc-icon">${this.categoryIcon('Complete Package')}</div>
            <div class="mc-title">${course.title}</div>
          </div>
          <div class="mc-btns">
            ${partBttons}
          </div>
        </div>
      </div>
    `;

    return { card, views: subViews };
  }

  private buildCardWithViews(course: Course, pdfs: PDF[], quizzes: PracticeTest[], videos: Video[]): { card: string, views: string } {
    const id = uid();
    const contentId = `mc-view-course-${id}`;
    
    const card = `
      <div class="mc-card" id="${course.id}">
        <div class="mc-face">
          <span class="mc-enrolled">✓ Enrolled</span>
          <div>
            <div class="mc-icon">${this.categoryIcon(course.category ?? '')}</div>
            <div class="mc-title">${course.title}</div>
          </div>
          <div class="mc-btns">
            <button class="mc-btn" data-target="${contentId}" style="grid-column: span 2;">
              <span class="mc-btn-lbl">View Content</span>
              <svg class="mc-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`;

    const views = this.renderContentView(contentId, course.title, pdfs, quizzes, videos);
    return { card, views };
  }

  private renderContentView(viewId: string, title: string, pdfs: PDF[], quizzes: PracticeTest[], videos: Video[]): string {
    const tabId = uid();
    
    const pdfItems = pdfs.length > 0 ? pdfs.map(p => `
      <a href="./pdf-viewer.html?name=${encodeURIComponent(p.name)}&url=${encodeURIComponent(p.url)}" class="mc-item">
        <span class="mc-ico-pdf"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></span>
        <span class="mc-item-txt">${p.name}</span>
      </a>`).join('') : '<p class="mc-none">No PDFs.</p>';

    const videoItems = videos.length > 0 ? videos.map(v => `
      <div class="mc-item mc-video-link" data-url="${btoa(v.url)}" data-title="${v.title}" style="cursor: pointer;">
        <span class="mc-ico-video"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
        <span class="mc-item-txt">${v.title}</span>
        <span class="mc-item-badge">Watch</span>
      </div>`).join('') : '<p class="mc-none">No videos.</p>';

    const renderQuiz = (q: PracticeTest) => `
      <a href="./practice-test.html?id=${q.id}" class="mc-item">
        <span class="mc-ico-quiz"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <span class="mc-item-txt">${q.title}</span>
        <span class="mc-item-badge">${q.questions?.length ?? 0}Q</span>
      </a>`;

    const prc = quizzes.filter(q => q.category === 'Practice Test');
    const chp = quizzes.filter(q => q.category === 'Chapter Test');
    const mck = quizzes.filter(q => q.category === 'Full Mock Test');

    const quizContent = `
      <div class="mc-tabs">
        <button class="mc-tab active" data-tab-id="vid-${tabId}">Videos</button>
        <button class="mc-tab" data-tab-id="pdf-${tabId}">PDFs</button>
        <button class="mc-tab" data-tab-id="qz-${tabId}">Quizzes</button>
      </div>
      <div id="vid-${tabId}" class="mc-tab-content active">${videoItems}</div>
      <div id="pdf-${tabId}" class="mc-tab-content">${pdfItems}</div>
      <div id="qz-${tabId}" class="mc-tab-content">
        <p style="font-size:10px; font-weight:700; color:var(--text-tertiary); margin:10px 0 5px;">PRACTICE TESTS</p>
        ${prc.length > 0 ? prc.map(renderQuiz).join('') : '<p class="mc-none">None.</p>'}
        <p style="font-size:10px; font-weight:700; color:var(--text-tertiary); margin:15px 0 5px;">CHAPTER TESTS</p>
        ${chp.length > 0 ? chp.map(renderQuiz).join('') : '<p class="mc-none">None.</p>'}
        <p style="font-size:10px; font-weight:700; color:var(--text-tertiary); margin:15px 0 5px;">MOCK TESTS</p>
        ${mck.length > 0 ? mck.map(renderQuiz).join('') : '<p class="mc-none">None.</p>'}
      </div>
    `;

    return `
      <div class="mc-content-view" id="${viewId}">
        <div class="mc-view-header">
          <button class="mc-btn-back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
          <h3 class="mc-view-title">${title}</h3>
        </div>
        ${quizContent}
      </div>
    `;
  }

  private attachListeners(): void {
    const listContainer = this.coursesContainer.querySelector('.mc-courses-list') as HTMLElement;
    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.mc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = document.getElementById(btn.getAttribute('data-target')!);
        if (targetView) {
          listContainer.classList.add('hidden');
          targetView.classList.add('active');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.mc-btn-back').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = (e.currentTarget as HTMLElement).closest('.mc-content-view') as HTMLElement;
        view.classList.remove('active');
        listContainer.classList.remove('hidden');
      });
    });
    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.mc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const container = tab.closest('.mc-content-view')!;
        container.querySelectorAll('.mc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        container.querySelectorAll('.mc-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tab.getAttribute('data-tab-id')!)?.classList.add('active');
      });
    });

    // Integrated Video Player Listeners using Event Delegation
    this.coursesContainer.addEventListener('click', (e) => {
      const videoLink = (e.target as HTMLElement).closest('.mc-video-link');
      if (videoLink) {
        const encodedUrl = videoLink.getAttribute('data-url') || '';
        const title = videoLink.getAttribute('data-title') || '';
        try {
            const url = atob(encodedUrl);
            VideoPlayer.getInstance().open(url, title);
        } catch (err) {
            console.error('Failed to decode video URL');
        }
      }
    });
  }

  private categoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Complete Package': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
      'Traffic Rules': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      'MV Act': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    };
    return icons[category] ?? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
  }

  private showEmptyState(title: string, message: string, btnText: string, btnLink: string): void {
    this.coursesContainer.innerHTML = `
      <div class="mc-full info-card" style="text-align:center;margin:8px 0;">
        <h2 style="font-size:21px;font-weight:700;margin-bottom:12px;">${title}</h2>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px;">${message}</p>
        <a href="${btnLink}" class="btn-primary" style="display:inline-flex;padding:12px 24px;text-decoration:none;">${btnText}</a>
      </div>`;
  }
}

new MyCoursesPage();
