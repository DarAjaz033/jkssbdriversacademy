/**
 * nav.js — Universal Bottom Nav + Footer Injector
 * No blink: uses inline SVGs + CSS View Transitions
 * Excluded: admin pages, login.html, pdf-viewer.html
 */
(function () {
  'use strict';

  var page = window.location.pathname.split('/').pop() || 'index.html';
  var SKIP = ['login.html', 'admin-login.html', 'admin-dashboard.html',
    'admin-courses.html', 'admin-pdfs.html', 'admin-tests.html',
    'admin-purchases.html', 'pdf-viewer.html', 'video-viewer.html'];

  if (SKIP.indexOf(page) !== -1) return;

  /* ── Active tab detection ─────────────────────────────────────── */
  var isMore = ['privacy-policy.html', 'terms-and-conditions.html', 'refund-policy.html',
    'contact.html', 'feedback.html', 'copyright-warning.html',
    'jkssb-updates.html', 'profile.html'].indexOf(page) !== -1;
  var isLearning = ['mock-tests.html', 'practice-test.html', 'gk-pdfs.html',
    'demo-pdfs.html'].indexOf(page) !== -1;
  var isCourseDetails = ['course-details.html'].indexOf(page) !== -1;
  var isCourses = ['my-courses.html', 'full-course.html',
    'course-purchase.html', 'part-1.html', 'part-2.html',
    'part-3.html'].indexOf(page) !== -1;
  var isHome = !isMore && !isLearning && !isCourses && !isCourseDetails;

  /* ── Inline SVGs (no Lucide = no flash) ──────────────────────── */
  var SVG = {
    home: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    book: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    grad: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    more: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    // Favicon-inspired shield/graduation icon for footer brand
    brand: '<img src="./favicon.svg" width="22" height="22" style="object-fit: contain;" alt="Logo" loading="eager" onerror="this.onerror=null; this.outerHTML=\'🛡️\'">',
    fb: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    ig: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    tw: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>',
    yt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>',
    tg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    wa: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>',
    mail: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    shield: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    file: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
    refund: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>'
  };

  /* ── CSS ────────────────────────────────────────────────────────── */
  if (!document.getElementById('navjs-style')) {
    var style = document.createElement('style');
    style.id = 'navjs-style';
    style.textContent =
      /* View Transitions — page content fades, nav+footer stay fixed */
      '@supports (view-transition-name: x) {' +
      '@media (prefers-reduced-motion: no-preference) {' +
      '::view-transition-old(root) { animation: nj-out 0.13s ease; }' +
      '::view-transition-new(root) { animation: nj-in  0.13s ease; }' +
      '@keyframes nj-out { from{opacity:1} to{opacity:0} }' +
      '@keyframes nj-in  { from{opacity:0} to{opacity:1} }' +
      '}' +
      '#unav-root   { view-transition-name: bottom-nav; }' +
      '#unav-footer, .unav-footer-clone { view-transition-name: app-footer; }' +
      '}' +

      /* ── Bottom Nav ── */
      '#unav-root {' +
      'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
      'display:flex;align-items:stretch;height:62px;' +
      'background:var(--app-bar-bg, #B45309);' +
      'border-top:1px solid var(--border, rgba(0,0,0,0.09));' +
      'color:var(--app-bar-text, #ffffff);' +
      'box-shadow:0 -2px 10px var(--shadow, rgba(0,0,0,0.06));' +
      'padding-bottom:env(safe-area-inset-bottom,0);' +
      'transition: background 0.3s, border-color 0.3s, color 0.3s;' +
      '}' +
      '#unav-root a {' +
      'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;' +
      'text-decoration:none;color:var(--text-tertiary, #9CA3AF);font-size:10.5px;font-weight:600;' +
      'font-family:"Poppins",system-ui,sans-serif; border-radius:12px; margin:4px 2px; padding:4px 0;' +
      '-webkit-tap-highlight-color:transparent;transition:background 0.2s, color 0.18s;' +
      '}' +
      '#unav-root a.active { color:var(--app-bar-text, #ffffff); background:rgba(255,255,255,0.18); box-shadow:0 2px 8px rgba(0,0,0,0.1); }' +
      '#unav-root a:hover:not(.active) { color:var(--app-bar-text, #ffffff); opacity:0.8; }' +
      '#unav-root a svg { flex-shrink:0; }' +

      /* ── Footer ── */
      '#unav-footer, .unav-footer-clone {' +
      'background:var(--app-bar-bg, linear-gradient(135deg, #B45309 0%, #D97706 50%, #EA580C 100%));' +
      'color:var(--app-bar-text, #fff);' +
      'padding:12px 16px 10px;' +
      'text-align:center;' +
      'font-family:"Poppins",system-ui,sans-serif;' +
      'transition: background 0.3s, color 0.3s;' +
      '}' +
      '.unav-footer-clone {' +
      'display: block !important;' +
      'width: 100%;' +
      'position: relative;' +
      'z-index: 10;' +
      'margin-top: auto;' +
      '}' +
      '.njf-brand { display:flex;align-items:center;justify-content:center;gap:7px;margin-bottom:3px; }' +
      '.njf-brand svg { flex-shrink:0; }' +
      '.njf-brand-name { font-size:14px;font-weight:700;color:var(--app-bar-text, #fff);letter-spacing:0.2px; }' +
      '.njf-tagline { font-size:10.5px;color:var(--app-bar-text, #fff);opacity:0.8;margin:0 0 8px; }' +
      '.njf-social { display:flex;justify-content:center;gap:8px;margin-bottom:8px; }' +
      '.njf-social a {' +
      'display:flex;align-items:center;justify-content:center;' +
      'width:30px;height:30px;border-radius:50%;' +
      'border:1px solid var(--app-bar-text, #fff);color:var(--app-bar-text, #fff);opacity:0.7;' +
      'text-decoration:none;transition:opacity 0.2s;' +
      '-webkit-tap-highlight-color:transparent;' +
      '}' +
      '.njf-social a:hover { opacity:1; }' +
      '.njf-links { display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;margin-bottom:8px; }' +
      '.njf-links a {' +
      'display:flex;align-items:center;gap:3px;' +
      'font-size:11.5px;color:var(--app-bar-text, #fff);opacity:0.85;text-decoration:none;' +
      'transition:opacity 0.18s;' +
      '}' +
      '.njf-links a:hover { opacity:1; }' +
      '.njf-sep { opacity:0.3;font-size:11px; }' +
      '.njf-bottom { border-top:1px solid var(--app-bar-text, #fff);padding-top:6px;opacity:0.8;' +
      'display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center; }' +
      '.njf-copy,.njf-designed { font-size:10.5px;color:var(--app-bar-text, #fff);opacity:0.8;margin:0; }' +
      '.njf-designer { font-weight:600;color:inherit;opacity:1;text-decoration:none;pointer-events:auto; }' +

      /* Push body content above fixed bottom nav */
      'body { padding-bottom:calc(62px + env(safe-area-inset-bottom,0px)) !important; }' +

      /* Force theme updates on cloned footers due to deep DOM placement */
      '[data-theme="green"] .unav-footer-clone { background: linear-gradient(135deg, #047857 0%, #059669 50%, #10B981 100%) !important; color: #FFFFFF !important; }' +
      '[data-theme="golden"] .unav-footer-clone { background: linear-gradient(135deg, #AA8A2E 0%, #D4AF37 50%, #FFD700 100%) !important; color: #333333 !important; }' +
      '[data-theme="black"] .unav-footer-clone { background: linear-gradient(135deg, #0A0A0A 0%, #171717 50%, #404040 100%) !important; color: #FFFFFF !important; }' +
      '[data-theme="blue"] .unav-footer-clone { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #60A5FA 100%) !important; color: #FFFFFF !important; }' +
      '[data-theme="frost"] .unav-footer-clone { background: linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 50%, #FFFFFF 100%) !important; color: #1C1917 !important; }' +
      '[data-theme="minimal"] .unav-footer-clone { background: #FFFFFF !important; color: #000000 !important; border-top: 1px solid #e2e8f0 !important; }';

    document.head.appendChild(style);
  }

  /* ── Build bottom nav ─────────────────────────────────────────── */
  function buildNav() {
    if (document.getElementById('unav-root')) return;
    var nav = document.createElement('nav');
    nav.id = 'unav-root';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML =
      '<a href="./index.html"' + (isHome ? ' class="active"' : '') + '>' + SVG.home + '<span>Home</span></a>' +
      '<a href="./my-courses.html"' + (isCourses ? ' class="active"' : '') + '>' + SVG.book + '<span>My Course</span></a>' +
      '<a href="./course-details.html"' + (isCourseDetails ? ' class="active"' : '') + '>' + SVG.grad + '<span>Course Details</span></a>' +
      '<a href="./profile.html"' + (isMore ? ' class="active"' : '') + '>' + SVG.more + '<span>More</span></a>';

    /* Use View Transition navigate when supported */
    setTimeout(function () {
      nav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function (e) {
          if (a.classList.contains('active') || !a.getAttribute('href')) { e.preventDefault(); return; }
          if (!document.startViewTransition) return;
          e.preventDefault();
          document.startViewTransition(function () { window.location.href = a.getAttribute('href'); });
        });
      });
    }, 0);
    document.body.appendChild(nav);
  }

  /* ── Build footer ─────────────────────────────────────────────── */
  function buildFooter() {
    if (document.getElementById('unav-footer')) return;
    var yr = new Date().getFullYear();
    var footer = document.createElement('footer');
    footer.id = 'unav-footer';
    footer.innerHTML =
      '<div class="njf-brand">' +
      SVG.brand +
      '<span class="njf-brand-name">JKSSB Drivers Academy</span>' +
      '</div>' +
      '<p class="njf-tagline">Excellence in Exam Preparation</p>' +
      '<div class="njf-social">' +
      '<a href="https://www.facebook.com/profile.php?id=61588192991712" target="_blank" aria-label="Facebook">' + SVG.fb + '</a>' +
      '<a href="https://t.me/+geryGyrT9gZiNzVl" target="_blank" aria-label="Telegram">' + SVG.tg + '</a>' +
      '<a href="https://youtube.com/@jkssbdriversacademy" target="_blank" aria-label="YouTube">' + SVG.yt + '</a>' +
      '<a href="https://chat.whatsapp.com/CaICTu1D78yJF6f2QnCI7l" target="_blank" aria-label="WhatsApp">' + SVG.wa + '</a>' +
      '</div>' +
      '<div class="njf-links">' +
      '<a href="./contact.html">' + SVG.mail + 'Contact Us</a>' +
      '<span class="njf-sep">|</span>' +
      '<a href="./privacy-policy.html">' + SVG.shield + 'Privacy Policy</a>' +
      '<span class="njf-sep">|</span>' +
      '<a href="./terms-and-conditions.html">' + SVG.file + 'Terms &amp; Conditions</a>' +
      '<span class="njf-sep">|</span>' +
      '<a href="./refund-policy.html">' + SVG.refund + 'Refund Policy</a>' +
      '</div>' +
      '<div class="njf-bottom">' +
      '<p class="njf-copy">&copy; ' + yr + ' JKSSB Drivers Academy. All rights reserved.</p>' +
      '<p class="njf-designed">Designed by <a href="https://www.facebook.com/darajaz033" target="_blank" class="njf-designer">Dar Ajaz</a></p>' +
      '</div>';

    /* Insert footer BEFORE the bottom nav so it appears above it */
    var nav = document.getElementById('unav-root');
    if (nav) {
      document.body.insertBefore(footer, nav);
    } else {
      document.body.appendChild(footer);
    }
  }


  // Deprecated downloadPdfSafely removed in favor of FirebaseCacheManager
  /* ── Toasts ─────────────────────────────────────────────────── */
  function checkToasts() {
    try {
      var msg = sessionStorage.getItem('app_toast_msg');
      var type = sessionStorage.getItem('app_toast_type') || 'info';
      if (msg) {
        if (window.showToast) {
          window.showToast(msg, type);
        } else {
          // Fallback if app.ts system isn't ready
          var container = document.getElementById('toast-container');
          if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            Object.assign(container.style, { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: '999999', display: 'flex', flexDirection: 'column', gap: '8px' });
            document.body.appendChild(container);
          }
          var t = document.createElement('div');
          t.textContent = msg;
          Object.assign(t.style, { padding: '12px 24px', borderRadius: '8px', background: type === 'success' ? '#10b981' : '#3b82f6', color: '#fff', fontSize: '14px' });
          container.appendChild(t);
          setTimeout(function () { t.remove(); }, 3000);
        }
        sessionStorage.removeItem('app_toast_msg');
        sessionStorage.removeItem('app_toast_type');
      }
    } catch (e) { }
  }

  /* ── Universal Theme Switcher ────────────────────────────────── */
  function initThemeSwitcher() {
    var themes = ['default', 'minimal', 'green', 'blue', 'golden', 'black', 'frost'];
    var themeBtn = document.getElementById('theme-toggle-nav');
    var themeIcon = themeBtn ? themeBtn.querySelector('i') : null;

    function updateThemeMeta(theme) {
      const themeColors = {
        'default': '#B45309',
        'green': '#047857',
        'blue': '#1E40AF',
        'golden': '#AA8A2E',
        'black': '#000000',
        'frost': '#E0F2FE',
        'minimal': '#000000'
      };

      const color = themeColors[theme] || '#B45309';
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = color;

      if (themeBtn) {
        if (theme === 'default') {
          themeBtn.style.background = 'transparent';
          if (themeIcon) themeIcon.style.color = 'var(--app-bar-text)';
        } else if (theme === 'frost' || theme === 'minimal') {
          themeBtn.style.background = 'rgba(0,0,0,0.05)';
          if (themeIcon) themeIcon.style.color = '#4B5563';
        } else {
          themeBtn.style.background = 'rgba(255,255,255,0.1)';
          if (themeIcon) themeIcon.style.color = '#ffffff';
        }
      }
    }

    var initialTheme = localStorage.getItem('siteTheme') || 'minimal';
    updateThemeMeta(initialTheme);
    if (initialTheme !== 'default') {
      document.documentElement.setAttribute('data-theme', initialTheme);
    }

    if (!themeBtn) return;

    themeBtn.addEventListener('click', function () {
      var currentTheme = document.documentElement.getAttribute('data-theme') || 'default';
      var nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
      var nextTheme = themes[nextIndex];

      if (nextTheme === 'default') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('siteTheme', 'default');
      } else {
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('siteTheme', nextTheme);
      }

      updateThemeMeta(nextTheme);
      if (window.lucide) lucide.createIcons();
    });
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  function init() {
    buildNav();
    buildFooter();
    initThemeSwitcher();
    checkToasts();

    // Inject the global App-Locked PDF Downloader scanner
    var dlScript = document.createElement('script');
    dlScript.src = './inject-download-buttons.js';
    document.body.appendChild(dlScript);

    // Register Service Worker for heavy caching and offline PDFs
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function (err) {
          console.warn('ServiceWorker registration failed: ', err);
        });
      });
    }
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
