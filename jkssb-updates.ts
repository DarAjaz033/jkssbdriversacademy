import { db } from './firebase-config';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

// --- Official Updates Data (1:1 with App) ---
const OFFICIAL_UPDATES = [
  {
    icon: '🔔',
    title: 'JKSSB Driver Recruitment 2025',
    date: '15 Jan 2025',
    tag: 'NEW',
    desc: 'Official notification released for 450 LDC and Driver posts in J&K. Last date to apply: 28 Feb 2025.',
  },
  {
    icon: '📋',
    title: 'Admit Card Download – Batch 3',
    date: '10 Jan 2025',
    tag: 'IMPORTANT',
    desc: 'Batch 3 admit cards are now available on jkssb.nic.in. Download before 20 Jan 2025.',
  },
  {
    icon: '📢',
    title: 'Result Announced – Driver Posts',
    date: '5 Jan 2025',
    tag: 'RESULT',
    desc: 'Results for Driver posts (Batch 1) declared. Check your status on official portal.',
  },
  {
    icon: '🗓️',
    title: 'Exam Date Rescheduled',
    date: '28 Dec 2024',
    tag: 'UPDATE',
    desc: 'The written exam for Driver category posts rescheduled to 15 Feb 2025 due to administrative reasons.',
  },
  {
    icon: '📝',
    title: 'Syllabus Update — 2025 Pattern',
    date: '20 Dec 2024',
    tag: 'SYLLABUS',
    desc: 'Updated syllabus for JKSSB Driver exam includes new chapters on Motor Vehicles Amendment Act 2019.',
  },
];

// --- Selectors ---
const tabOfficial = document.getElementById('tab-official') as HTMLButtonElement;
const tabNews = document.getElementById('tab-news') as HTMLButtonElement;
const viewOfficial = document.getElementById('view-official') as HTMLElement;
const viewNews = document.getElementById('view-news') as HTMLElement;
const newsContent = document.getElementById('news-content') as HTMLElement;
const newsLoading = document.getElementById('news-loading') as HTMLElement;

function init() {
  // Tab Switching Logic
  tabOfficial?.addEventListener('click', () => {
    setActiveTab('official');
  });

  tabNews?.addEventListener('click', () => {
    setActiveTab('news');
    fetchAiNews();
  });

  // Initial Render
  renderOfficialUpdates();
  
  // Check URL params for initial tab (parity with app's initialTabIndex)
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab');
  if (initialTab === '1') {
    setActiveTab('news');
    fetchAiNews();
  }
}

function setActiveTab(tab: 'official' | 'news') {
  if (tab === 'official') {
    tabOfficial.classList.add('active');
    tabNews.classList.remove('active');
    viewOfficial.classList.remove('hidden');
    viewNews.classList.add('hidden');
  } else {
    tabNews.classList.add('active');
    tabOfficial.classList.remove('active');
    viewNews.classList.remove('hidden');
    viewOfficial.classList.add('hidden');
  }
}

function renderOfficialUpdates() {
  viewOfficial.innerHTML = OFFICIAL_UPDATES.map((u, i) => `
    <div class="update-card" style="animation-delay: ${i * 80}ms">
      <div class="update-header">
        <span class="update-icon">${u.icon}</span>
        <h3 class="update-title">${u.title}</h3>
        <span class="tag-badge" style="background: ${getTagBg(u.tag)}; color: ${getTagColor(u.tag)}">${u.tag}</span>
      </div>
      <p class="update-desc">${u.desc}</p>
      <div class="update-footer">
        <i data-lucide="calendar" style="width:12px; opacity:0.5"></i>
        <span class="update-date">${u.date}</span>
      </div>
    </div>
  `).join('');
  
  if ((window as any).lucide) (window as any).lucide.createIcons();
}

/**
 * Fetch and filter news following NewsService.dart logic
 */
async function fetchAiNews() {
  if (newsContent.innerHTML !== '') return; // Already loaded

  newsLoading.classList.remove('hidden');
  
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q = query(
      collection(db, 'jkssb_news'),
      where('pubDate', '>=', Timestamp.fromDate(sevenDaysAgo)),
      orderBy('pubDate', 'desc'),
      limit(50)
    );

    const snap = await getDocs(q);
    const articles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    // Relevance filtering (Rule 23 in NewsService.dart)
    const keywords = ['jkssb', 'driver', 'drivers', 'recruitment', 'exam', 'paper', 'papers', 'examination', 'test', 'syllabus', 'notification', 'jkpsc', 'police', 'traffic'];
    const filtered = articles.filter((a: any) => {
      const title = (a.title || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      return keywords.some((k: string) => title.includes(k) || desc.includes(k));
    });

    if (filtered.length === 0) {
      newsContent.innerHTML = `
        <div style="text-align:center; padding:40px; opacity:0.5;">
          <i data-lucide="newspaper" style="width:48px; height:48px; margin-bottom:12px;"></i>
          <p>No recent relevant exam news found.</p>
        </div>
      `;
    } else {
      newsContent.innerHTML = filtered.map(a => `
        <div class="update-card news-card" onclick="window.open('${a.link}', '_blank')">
          <div class="news-source-row">
            <span class="news-source">${(a.source || 'News').toUpperCase()}</span>
            <span class="update-date">${formatDate(a.pubDate)}</span>
          </div>
          <h3 class="news-title">${a.title}</h3>
          <p class="update-desc" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${a.description || ''}
          </p>
          <div class="read-more-link">
            <span>READ FULL ARTICLE</span>
            <i data-lucide="arrow-right" width="14" height="14"></i>
          </div>
        </div>
      `).join('');
    }

    if ((window as any).lucide) (window as any).lucide.createIcons();
  } catch (err) {
    console.error('News fetch failed:', err);
    newsContent.innerHTML = '<p style="text-align:center; padding:20px; color:red;">Failed to load news. Please try again later.</p>';
  } finally {
    newsLoading.classList.add('hidden');
  }
}

// Helper types & functions
function getTagColor(tag: string) {
  switch (tag) {
    case 'NEW': return '#059669';
    case 'IMPORTANT': return '#DC2626';
    case 'RESULT': return '#2563EB';
    case 'UPDATE': return '#D97706';
    default: return '#78716C';
  }
}

function getTagBg(tag: string) {
  const color = getTagColor(tag);
  return `${color}1F`; // 12% opacity
}

function formatDate(timestamp: any) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Polyfill for .any if needed (modern JS articles might not have it)
if (!(Array.prototype as any).any) {
  (Array.prototype as any).any = function(fn: (v: any) => boolean) {
    return this.some(fn);
  };
}

init();
