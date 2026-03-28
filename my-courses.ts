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
    if (document.getElementById('mc-new-styles')) return;
    const s = document.createElement('style');
    s.id = 'mc-new-styles';
    s.textContent = `
      #courses-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 14px 13px 30px;
        background: transparent;
      }
      .mc-wrapper { position: relative; width: 100%; overflow-x: hidden; }
      .mc-courses-list {
        display: flex; flex-direction: column; gap: 24px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .mc-courses-list.hidden {
        transform: translateX(-50%); opacity: 0; pointer-events: none;
        position: absolute; width: 100%; top: 0;
      }

      /* Section Labels */
      .mc-section-label {
        padding: 8px 14px; margin-bottom: 0px;
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 12px; color: #f59e0b;
        font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700;
        align-self: flex-start; display: inline-block;
      }

      /* ENROLLED COURSE CARD */
      .mc-card {
        border-radius: 30px;
        background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
        border: 1.5px solid rgba(255,255,255,0.15);
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        backdrop-filter: blur(15px);
        overflow: hidden; position: relative;
        animation: mcFadeUp 0.4s ease both;
      }
      .mc-card-inner {
        padding: 24px; position: relative; z-index: 2;
      }
      .mc-card.expired .mc-card-inner { opacity: 0.5; pointer-events: none; }
      
      .mc-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .mc-card-title {
        font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 700;
        color: var(--text-primary); letter-spacing: -0.5px; margin: 0; line-height: 1.3;
      }
      .mc-card-badge {
        padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; white-space: nowrap;
      }

      /* ACTIONS */
      .mc-actions { margin-top: 22px; display: flex; flex-direction: column; gap: 12px; }
      .mc-action-row { display: flex; gap: 8px; }
      .mc-action-btn {
        flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 12px 6px; border-radius: 20px; border: none; cursor: pointer;
        color: #fff; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.1s; -webkit-tap-highlight-color: transparent;
      }
      .mc-action-btn:active { transform: scale(0.95); }
      .mc-action-btn-full { flex-direction: row; gap: 10px; padding: 14px; font-size: 13px; }
      
      .mc-action-icon { font-size: 20px; margin-bottom: 4px; }
      .mc-action-btn-full .mc-action-icon { margin-bottom: 0; }

      /* BONUS CARD (Amber/Orange Tinted) */
      .mc-card-bonus {
        border-radius: 24px; padding: 20px; margin-bottom: -8px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 88, 12, 0.05));
        border: 1.5px solid rgba(245, 158, 11, 0.3);
        box-shadow: 0 8px 15px rgba(245, 158, 11, 0.1);
        backdrop-filter: blur(12px); position: relative;
        animation: mcFadeUp 0.4s ease both;
      }
      .mc-card-bonus.expired { opacity: 0.5; pointer-events: none; }
      .mc-bonus-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
      .mc-bonus-title {
        font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.3; flex: 1;
      }
      .mc-bonus-expiry { font-size: 12px; font-weight: 600; margin-bottom: 16px; }

      /* OVERLAYS FOR EXPIRED */
      .mc-expired-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,0.4); z-index: 10;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      }
      .mc-renew-btn {
        background: #ef4444; color: #fff; border: none; padding: 8px 24px; border-radius: 20px;
        font-weight: 700; font-family: 'Poppins', sans-serif; margin-top: 12px; cursor: pointer; font-size: 14px;
      }

      /* CONTENT VIEW SLIDER */
      .mc-content-view {
        position: absolute; top: 0; left: 0; right: 0; background: transparent; transform: translateX(100%);
        opacity: 0; visibility: hidden; transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s;
        z-index: 10; min-height: 400px; padding-bottom: 40px;
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
      
      .mc-tabs { display: flex; gap: 8px; margin-bottom: 16px; background: var(--bg-app); padding: 5px; border-radius: 12px; border: 1px solid var(--border); }
      .mc-tab { flex: 1; padding: 8px; border: none; background: transparent; color: var(--text-secondary); font-size: 11px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
      .mc-tab.active { background: var(--bg-card); color: var(--primary); box-shadow: var(--shadow-sm); }
      .mc-tab-content { display: none; }
      .mc-tab-content.active { display: block; animation: mcFadeUp 0.3s ease; }

      /* CONTENT ITEMS (Flutter _ContentTile style) */
      .mc-item {
        display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 18px; 
        background: linear-gradient(135deg, rgba(var(--primary-rgb, 180, 83, 9), 0.13), rgba(255, 255, 255, 0.07));
        border: 1px solid rgba(var(--primary-rgb, 180, 83, 9), 0.18);
        text-decoration: none; color: var(--text-primary);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        margin-bottom: 14px; transition: all 0.2s;
        box-shadow: 0 5px 12px rgba(var(--primary-rgb, 180, 83, 9), 0.08);
      }
      .mc-item:active { transform: scale(0.97); background: rgba(var(--primary-rgb, 180, 83, 9), 0.1); }
      
      .mc-ico-box {
        width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0; 
        display: flex; align-items: center; justify-content: center;
        background: rgba(var(--primary-rgb, 180, 83, 9), 0.1);
        border: 1px solid rgba(var(--primary-rgb, 180, 83, 9), 0.2);
        color: var(--primary);
      }
      .mc-item-txt { flex: 1; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: var(--text-primary); }
      .mc-item-badge { font-size: 11px; padding: 3px 10px; border-radius: 99px; font-weight: 700; background: var(--primary); color: #fff; }
      
      /* Folder Tile Specifics */
      .mc-folder-tile .mc-ico-box { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-color: rgba(59, 130, 246, 0.2); }
      .mc-folder-tile.handwritten .mc-ico-box { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }

      /* Sub Tabs (Quiz Category) */
      .mc-sub-tabs { display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
      .mc-sub-tab { 
        padding: 6px 12px; border-radius: 10px; border: none; background: transparent; 
        font-size: 12px; font-weight: 700; color: var(--text-secondary); cursor: pointer;
        transition: all 0.2s;
      }
      .mc-sub-tab.active { background: rgba(var(--primary-rgb, 180, 83, 9), 0.1); color: var(--primary); }

      .mc-back-link {
        display: flex; align-items: center; gap: 4px; color: var(--primary); 
        font-size: 13px; font-weight: 700; margin-bottom: 15px; cursor: pointer;
      }

      .mc-none { text-align: center; color: var(--text-tertiary); font-size: 13px; padding: 24px 0; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border); }
      
      @keyframes mcFadeUp {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
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

  /* ─── Fetching & Layout ───────────────────────────────────────────────── */
  private async loadEnrolledCourses(userId: string): Promise<void> {
    this.coursesContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-secondary);">Loading your courses...</div>`;

    const enrollmentsRes = await fetchUserEnrollments(userId);
    const enrolledIds: string[] = enrollmentsRes.success ? enrollmentsRes.enrolledIds : [];
    const expiries: Record<string, any> = enrollmentsRes.success ? enrollmentsRes.expiries : {};

    const coursesRes = await getCourses();
    const allCourses: Course[] = (coursesRes.success && 'courses' in coursesRes && coursesRes.courses) ? coursesRes.courses : [];
    
    if (enrolledIds.length === 0) {
      this.showEmptyState('No Courses Found','You have no active enrolled courses at the moment.', 'Browse Courses', './course-details.html');
      return;
    }

    const hasFullCourse = enrolledIds.includes('full_course') || enrolledIds.includes('FullCourse');
    const partIds = ['part1', 'part2', 'part3'];

    // Separate into Main and Bonus logic matching flutter's _EnrolledStateState.build
    let mainCourses: Course[] = [];
    let bonusCourses: Course[] = [];

    // Filter enrolled courses
    allCourses.forEach(c => {
      if (!c.id || !enrolledIds.includes(c.id)) return;
      if (hasFullCourse && partIds.includes(c.id)) return; // Parts are bundled

      const isBonus = c.category?.toLowerCase().includes('bonus') || c.title.toLowerCase().includes('bonus');
      if (isBonus) {
        bonusCourses.push(c);
      } else {
        mainCourses.push(c);
      }
    });

    // If mainCourses includes full_course, add live_classes and mock_test explicitly to mainCourses
    // ONLY if they exist in allCourses but aren't in mainCourses (to match Flutter auto-injection)
    if (hasFullCourse) {
      const liveCourse = allCourses.find(c => c.id === 'live_classes');
      if (liveCourse && !mainCourses.some(m => m.id === 'live_classes')) {
        mainCourses.push(liveCourse);
        expiries['live_classes'] = expiries['full_course']; // Inherit expiry
      }
      const mockCourse = allCourses.find(c => c.id === 'mock_test');
      if (mockCourse && !mainCourses.some(m => m.id === 'mock_test')) {
        mainCourses.push(mockCourse);
        expiries['mock_test'] = expiries['full_course']; // Inherit expiry
      }
    }

    if (mainCourses.length === 0 && bonusCourses.length === 0) {
      this.showEmptyState('No Courses Found','No courses found in your account.', 'Browse Courses', './course-details.html');
      return;
    }

    const pdfsRes = await getPDFs();
    const allPDFs: PDF[] = (pdfsRes.success && pdfsRes.pdfs) ? pdfsRes.pdfs : [];

    let listHtml = '';
    let viewsHtml = '';

    // Render MAIN Courses
    if (mainCourses.length > 0) {
      listHtml += `<div class="mc-section-label">Enrolled Courses</div>`;
      for (const course of mainCourses) {
        const { card, subviews } = await this.buildMainCard(course, expiries[course.id!], allPDFs);
        listHtml += card;
        viewsHtml += subviews;
      }
    }

    // Render BONUS Courses
    if (bonusCourses.length > 0) {
      listHtml += `<div class="mc-section-label" style="margin-top: 10px;">Bonus Courses</div>`;
      for (const course of bonusCourses) {
        const { card, subviews } = await this.buildBonusCard(course, expiries[course.id!], allPDFs);
        listHtml += card;
        viewsHtml += subviews;
      }
    }

    this.coursesContainer.innerHTML = `
      <div class="mc-wrapper">
        <div class="mc-courses-list" id="mc-courses-list">
          ${listHtml}
        </div>
        ${viewsHtml}
      </div>
    `;
    this.attachListeners();
  }

  /* ─── Card Builders ───────────────────────────────────────────────────── */
  private async buildMainCard(course: Course, expiryData: any, allPDFs: PDF[]): Promise<{ card: string, subviews: string }> {
    const isFullCourse = course.id === 'full_course' || course.id === 'FullCourse';
    const isLive = course.id === 'live_classes';
    const isMock = course.id === 'mock_test';
    
    const expiry = this.calcExpiry(expiryData);
    let cardHtml = '';
    let subviewsHtml = '';

    cardHtml += `
      <div class="mc-card ${expiry.isExpired ? 'expired' : ''}">
        ${expiry.isExpired ? `
        <div class="mc-expired-overlay">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <button class="mc-renew-btn">Renew Now</button>
        </div>` : ''}
        <div class="mc-card-inner">
          <div class="mc-card-header">
            <h3 class="mc-card-title">${course.title}</h3>
            <div class="mc-card-badge" style="${expiry.badgeStyle}">${expiry.badgeText}</div>
          </div>
          <div class="mc-actions">
    `;

    if (isFullCourse) {
      cardHtml += `
        <div class="mc-action-row">
          <button class="mc-action-btn" data-target="mc-view-part1" data-tab="pdf" style="background: linear-gradient(135deg, #1E40AF, #3B82F6);">
            <span class="mc-action-icon">1️⃣</span> Part 1
          </button>
          <button class="mc-action-btn" data-target="mc-view-part2" data-tab="pdf" style="background: linear-gradient(135deg, #166534, #22C55E);">
            <span class="mc-action-icon">2️⃣</span> Part 2
          </button>
          <button class="mc-action-btn" data-target="mc-view-part3" data-tab="pdf" style="background: linear-gradient(135deg, #6B21A8, #B855F7);">
            <span class="mc-action-icon">3️⃣</span> Part 3
          </button>
        </div>
      `;

      // Subviews for parts
      const partLabels: Record<string, string> = {
        'part1': 'Part 1 — Traffic Rules & Road Safety',
        'part2': 'Part 2 — Motor Vehicle Act',
        'part3': 'Part 3 — Mechanical Knowledge'
      };

      ['part1', 'part2', 'part3'].forEach(partId => {
        const pTitle = partLabels[partId] || partId;
        subviewsHtml += this.buildSliderViewAsync(`mc-view-${partId}`, pTitle, partId, allPDFs);
      });

    } else if (isMock) {
      cardHtml += `
        <button class="mc-action-btn mc-action-btn-full" data-target="mc-view-${course.id}" data-tab="qz" style="background: linear-gradient(135deg, #EF4444, #991B1B);">
          <span class="mc-action-icon">⏳</span> Start Mock Test
        </button>
      `;
      subviewsHtml += this.buildSliderViewAsync(`mc-view-${course.id}`, course.title, course.id!, allPDFs);

    } else if (isLive) {
      cardHtml += `
        <button class="mc-action-btn mc-action-btn-full" data-target="mc-view-live-${course.id}" data-tab="vid" style="background: linear-gradient(135deg, #7C3AED, #5B21B6);">
          <span class="mc-action-icon">🎬</span> Watch Video Lectures
        </button>
        <button class="mc-action-btn mc-action-btn-full" onclick="window.location.href='./index.html'" style="background: linear-gradient(135deg, #1E40AF, #3B82F6);">
          <span class="mc-action-icon">🔴</span> Join Current Live
        </button>
      `;
      subviewsHtml += this.buildSliderViewAsync(`mc-view-live-${course.id}`, course.title, course.id!, allPDFs);

    } else {
      // Standalone Part or Other Course
      cardHtml += `
        <div class="mc-action-row">
          <button class="mc-action-btn" data-target="mc-view-${course.id}" data-tab="pdf" style="background: linear-gradient(135deg, #00C6FF, #0072FF);">
            <span class="mc-action-icon">📄</span> PDFs
          </button>
          <button class="mc-action-btn" data-target="mc-view-${course.id}" data-tab="vid" style="background: linear-gradient(135deg, #F53844, #42378F);">
            <span class="mc-action-icon">▶️</span> Videos
          </button>
          <button class="mc-action-btn" data-target="mc-view-${course.id}" data-tab="qz" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
            <span class="mc-action-icon">🧠</span> Quiz
          </button>
        </div>
      `;
      subviewsHtml += this.buildSliderViewAsync(`mc-view-${course.id}`, course.title, course.id!, allPDFs);
    }

    cardHtml += `</div></div></div>`;
    return { card: cardHtml, subviews: subviewsHtml };
  }

  private async buildBonusCard(course: Course, expiryData: any, allPDFs: PDF[]): Promise<{ card: string, subviews: string }> {
    const expiry = this.calcExpiry(expiryData);
    let cardHtml = '';
    
    cardHtml += `
      <div class="mc-card-bonus ${expiry.isExpired ? 'expired' : ''}">
        ${expiry.isExpired ? `
        <div class="mc-expired-overlay" style="border-radius: 24px;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>` : ''}
        
        <div class="mc-bonus-header">
          <span style="font-size: 20px;">🎁</span>
          <h3 class="mc-bonus-title">${course.title}</h3>
          <div class="mc-card-badge" style="${expiry.badgeStyle}">${expiry.isExpired ? 'EXPIRED' : 'FREE'}</div>
        </div>
        
        <div class="mc-bonus-expiry" style="color: var(${expiry.statusVar})">
          ${expiry.badgeText}
        </div>
        
        <div class="mc-action-row">
          <button class="mc-action-btn" data-target="mc-view-${course.id}" data-tab="pdf" style="background: linear-gradient(135deg, #4FACFE, #00F2FE);">
            <span class="mc-action-icon">📄</span> PDFs
          </button>
          <button class="mc-action-btn" data-target="mc-view-${course.id}" data-tab="vid" style="background: linear-gradient(135deg, #FF4D4D, #FF0000);">
            <span class="action-icon">▶️</span> Videos
          </button>
        </div>
      </div>
    `;

    const subviewsHtml = this.buildSliderViewAsync(`mc-view-${course.id}`, course.title, course.id!, allPDFs);
    return { card: cardHtml, subviews: subviewsHtml };
  }

  /* ─── Content Slider View Generation ────────────────────────────────────── */
  
  // This just returns placeholder HTML. The actual content is generated directly below.
  private buildSliderViewAsync(viewId: string, title: string, courseOrPartId: string, allPDFs: PDF[]): string {
    // Generate synchronously since we cached PDFs, but Quizzes/Videos need fetches.
    // Instead of doing it inside innerHTML, I'll return a placeholder and inject after.
    const containerId = `mc-content-${viewId}`;
    
    // Fire off async fetch & inject
    this.injectSliderData(containerId, courseOrPartId, allPDFs);

    return `
      <div class="mc-content-view" id="${viewId}">
        <div class="mc-view-header">
          <button class="mc-btn-back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
          <h3 class="mc-view-title">${title}</h3>
        </div>
        <div class="mc-tabs">
          <button class="mc-tab" data-tab-id="vid-${containerId}">Videos</button>
          <button class="mc-tab" data-tab-id="pdf-${containerId}">PDFs</button>
          <button class="mc-tab" data-tab-id="qz-${containerId}">Quizzes</button>
        </div>
        <div id="${containerId}">
          <div style="text-align: center; padding: 40px; color: var(--text-tertiary); font-size: 13px;">Loading Content...</div>
        </div>
      </div>
    `;
  }

  private async injectSliderData(containerId: string, refId: string, allPDFs: PDF[]) {
    const isPart = ['part1', 'part2', 'part3'].includes(refId);
    
    const [qRes, vRes] = await Promise.all([getCourseQuizzes(refId), getCourseVideos(refId)]);
    const quizzes = (qRes.success && qRes.tests) ? qRes.tests.filter(q => q.courseId === refId || q.partId === refId) : [];
    const videos = (vRes.success && vRes.videos) ? vRes.videos.filter(v => v.courseId === refId || v.partId === refId) : [];
    const partPDFs = allPDFs.filter(p => p.courseId === refId || p.partId === refId);

    const renderVideos = (vids: Video[]) => vids.length > 0 ? vids.map(v => `
      <div class="mc-item mc-video-link" data-url="${btoa(v.url)}" data-title="${v.title}" style="cursor: pointer;">
        <div class="mc-ico-box" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <span class="mc-item-txt">${v.title}</span>
        <span class="mc-item-badge">Watch</span>
      </div>`).join('') : '<p class="mc-none">No videos available yet.</p>';

    const renderQuizzes = (qz: PracticeTest[]) => qz.length > 0 ? qz.map(q => `
      <a href="./practice-test.html?id=${q.id}" class="mc-item">
        <div class="mc-ico-box" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border-color: rgba(139, 92, 246, 0.2);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <span class="mc-item-txt">${q.title}</span>
        <span class="mc-item-badge">${q.questions?.length ?? 0}Q</span>
      </a>`).join('') : '<p class="mc-none">No tests available in this category.</p>';

    const renderPDFs = (plist: PDF[]) => plist.length > 0 ? plist.map(p => `
      <a href="./pdf-viewer.html?name=${encodeURIComponent(p.name)}&url=${encodeURIComponent(p.url)}" class="mc-item">
        <div class="mc-ico-box" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <span class="mc-item-txt">${p.name}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary);"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`).join('') : '<p class="mc-none">No PDFs available yet.</p>';

    // PDF Folder Logic
    let pdfTabContent = '';
    if (isPart) {
      const comp = partPDFs.filter(p => p.category === 'computerised');
      const hand = partPDFs.filter(p => p.category === 'handwritten');
      pdfTabContent = `
        <div class="mc-pdf-folders" id="folders-${containerId}">
          <div class="mc-item mc-folder-tile" data-cat="computerised" style="cursor: pointer;">
            <div class="mc-ico-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
            <span class="mc-item-txt">Computerised Pdfs</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary);"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div class="mc-item mc-folder-tile handwritten" data-cat="handwritten" style="cursor: pointer;">
            <div class="mc-ico-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
            <span class="mc-item-txt">Handwritten Notes</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary);"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
        <div id="pdf-list-comp-${containerId}" style="display: none;">
          <div class="mc-back-link" data-back="folders-${containerId}">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg> Back to Folders
          </div>
          ${renderPDFs(comp)}
        </div>
        <div id="pdf-list-hand-${containerId}" style="display: none;">
          <div class="mc-back-link" data-back="folders-${containerId}">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg> Back to Folders
          </div>
          ${renderPDFs(hand)}
        </div>
      `;
    } else {
      pdfTabContent = renderPDFs(partPDFs);
    }

    // Quiz Sub-tabs
    const prc = quizzes.filter(q => q.category === 'Practice Test');
    const chp = quizzes.filter(q => q.category === 'Chapter Test');
    const mck = quizzes.filter(q => q.category === 'Full Mock Test');

    const quizTabContent = `
      <div class="mc-sub-tabs">
        <button class="mc-sub-tab active" data-sub="prc-${containerId}">Practice</button>
        <button class="mc-sub-tab" data-sub="chp-${containerId}">Chapter</button>
        <button class="mc-sub-tab" data-sub="mck-${containerId}">Mocks</button>
      </div>
      <div class="mc-sub-content active" id="prc-${containerId}">${renderQuizzes(prc)}</div>
      <div class="mc-sub-content" id="chp-${containerId}" style="display: none;">${renderQuizzes(chp)}</div>
      <div class="mc-sub-content" id="mck-${containerId}" style="display: none;">${renderQuizzes(mck)}</div>
    `;

    const html = `
      <div id="vid-${containerId}" class="mc-tab-content">${renderVideos(videos)}</div>
      <div id="pdf-${containerId}" class="mc-tab-content">${pdfTabContent}</div>
      <div id="qz-${containerId}" class="mc-tab-content">${quizTabContent}</div>
    `;

    const el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = html;
      this.attachContentListeners(el);
    }
  }

  private attachContentListeners(container: HTMLElement) {
    // PDF Folder Switching
    container.querySelectorAll('.mc-folder-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const cat = tile.getAttribute('data-cat');
        const parent = tile.parentElement!;
        parent.style.display = 'none';
        const targetId = cat === 'computerised' ? parent.id.replace('folders-', 'pdf-list-comp-') : parent.id.replace('folders-', 'pdf-list-hand-');
        const target = document.getElementById(targetId);
        if (target) target.style.display = 'block';
      });
    });

    container.querySelectorAll('.mc-back-link').forEach(link => {
      link.addEventListener('click', () => {
        const backId = link.getAttribute('data-back')!;
        link.parentElement!.style.display = 'none';
        const backEl = document.getElementById(backId);
        if (backEl) backEl.style.display = 'block';
      });
    });

    // Quiz Sub-tab Switching
    container.querySelectorAll('.mc-sub-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.mc-sub-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        container.querySelectorAll('.mc-sub-content').forEach(c => (c as HTMLElement).style.display = 'none');
        const target = document.getElementById(tab.getAttribute('data-sub')!);
        if (target) target.style.display = 'block';
      });
    });
  }

  /* ─── Helpers & Interactions ──────────────────────────────────────────── */
  private calcExpiry(expiresAtData: any) {
    let daysLeft = -1;
    let text = 'N/A';
    if (expiresAtData) {
      const now = new Date();
      const expiry = expiresAtData.toDate ? expiresAtData.toDate() : new Date(expiresAtData);
      const diffTime = expiry.getTime() - now.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
      text = `Valid till ${expiry.toLocaleDateString('en-GB', options)}`;
    }

    let statusVar = '--status-success';
    if (daysLeft < 0 && daysLeft > -100) {
      statusVar = '--status-danger';
      text = 'Expired';
    } else if (daysLeft === 0) {
      statusVar = '--status-danger'; 
      text = '🔴 Expires today!';
    } else if (daysLeft > 0 && daysLeft <= 7) {
      statusVar = '--status-danger'; 
      text = `🔴 Expires in ${daysLeft} days!`;
    } else if (daysLeft > 7 && daysLeft <= 30) {
      statusVar = '--status-warning'; 
      text = `⚠️ Expires in ${daysLeft} days`;
    }

    const badgeStyle = `color: var(${statusVar}); background: var(${statusVar}-bg); border: 1px solid var(${statusVar});`;
    return { daysLeft, badgeText: text, isExpired: daysLeft < 0, badgeStyle, statusVar };
  }

  private attachListeners(): void {
    const listContainer = this.coursesContainer.querySelector('.mc-courses-list') as HTMLElement;
    
    // Action button opens the Slider View & Active Tab
    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.mc-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = document.getElementById(btn.getAttribute('data-target')!);
        const tabKey = btn.getAttribute('data-tab'); // 'pdf', 'vid', 'qz'

        if (targetView && tabKey) {
          listContainer.classList.add('hidden');
          targetView.classList.add('active');
          window.scrollTo({ top: 0, behavior: 'smooth' });

          // Trigger the correct tab
          const viewContainerId = `mc-content-${targetView.id}`;
          const targetTabBtn = targetView.querySelector(`.mc-tab[data-tab-id="${tabKey}-${viewContainerId}"]`) as HTMLButtonElement;
          if (targetTabBtn) targetTabBtn.click();
        }
      });
    });

    // Back Buttons
    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.mc-btn-back').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = (e.currentTarget as HTMLElement).closest('.mc-content-view') as HTMLElement;
        view.classList.remove('active');
        listContainer.classList.remove('hidden');
      });
    });

    // Tab Switching
    this.coursesContainer.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).closest('.mc-tab') as HTMLButtonElement;
      if (tab) {
        const container = tab.closest('.mc-content-view')!;
        container.querySelectorAll('.mc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        container.querySelectorAll('.mc-tab-content').forEach(c => c.classList.remove('active'));
        const targetContent = document.getElementById(tab.getAttribute('data-tab-id')!);
        if (targetContent) targetContent.classList.add('active');
      }
    });

    // Video Player
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

  private showEmptyState(title: string, message: string, btnText: string, btnLink: string): void {
    const isSignIn = title.toLowerCase().includes('sign in');
    this.coursesContainer.innerHTML = `
      <div class="mc-empty-container" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 60px 20px; text-align:center; animation: mcFadeUp 0.5s ease-out;">
        <div class="mc-empty-icon" style="width:100px; height:100px; border-radius:30px; background:var(--bg-card); display:flex; align-items:center; justify-content:center; margin-bottom:24px; box-shadow:0 15px 35px rgba(0,0,0,0.1); border:1px solid var(--border);">
          ${isSignIn 
            ? '<svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>'
            : '<svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
          }
        </div>
        <h2 style="font-size:24px; font-weight:800; color:var(--text-primary); margin-bottom:12px; letter-spacing:-0.5px;">${title}</h2>
        <p style="font-size:15px; color:var(--text-secondary); margin-bottom:32px; max-width:280px; line-height:1.6;">${message}</p>
        <a href="${btnLink}" class="mc-cta-btn" style="display:inline-flex; align-items:center; gap:10px; background:var(--primary); color:#fff; padding:14px 32px; border-radius:16px; font-weight:700; text-decoration:none; box-shadow:0 10px 20px rgba(180, 83, 9, 0.2); transition: transform 0.2s;">
          ${btnText}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </div>
    `;
  }
}

new MyCoursesPage();
