import { db } from './firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';

// --- Selectors ---
const tabPdfs = document.getElementById('tab-pdfs') as HTMLButtonElement;
const tabMocks = document.getElementById('tab-mocks') as HTMLButtonElement;
const viewPdfs = document.getElementById('view-pdfs') as HTMLElement;
const viewMocks = document.getElementById('view-mocks') as HTMLElement;
const demoLoading = document.getElementById('demo-loading') as HTMLElement;

async function init() {
  // Tab Switching
  tabPdfs?.addEventListener('click', () => setActiveTab('pdfs'));
  tabMocks?.addEventListener('click', () => setActiveTab('mocks'));

  // Initial Content Fetch
  await fetchDemoContent();
}

function setActiveTab(tab: 'pdfs' | 'mocks') {
  if (tab === 'pdfs') {
    tabPdfs.classList.add('active');
    tabMocks.classList.remove('active');
    viewPdfs.classList.remove('hidden');
    viewMocks.classList.add('hidden');
  } else {
    tabMocks.classList.add('active');
    tabPdfs.classList.remove('active');
    viewMocks.classList.remove('hidden');
    viewPdfs.classList.add('hidden');
  }
}

async function fetchDemoContent() {
  demoLoading.classList.remove('hidden');
  
  try {
    // 1. Fetch PDFs
    const pdfQuery = query(collection(db, 'pdfs'), where('courseId', '==', null));
    const pdfSnap = await getDocs(pdfQuery);
    const pdfs = pdfSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    renderPdfs(pdfs);

    // 2. Fetch Mocks
    const mockQuery = query(collection(db, 'practice_tests'), where('courseId', '==', null));
    const mockSnap = await getDocs(mockQuery);
    const mocks = mockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    renderMocks(mocks);

  } catch (err) {
    console.error('Error fetching demo material:', err);
  } finally {
    demoLoading.classList.add('hidden');
  }
}

function renderPdfs(pdfs: any[]) {
  if (pdfs.length === 0) {
    viewPdfs.innerHTML = `
      <div class="empty-state">
        <i data-lucide="file-x"></i>
        <p>No demo PDFs available yet.</p>
      </div>
    `;
  } else {
    viewPdfs.innerHTML = pdfs.map((p, i) => `
      <div class="demo-card" style="animation-delay: ${i * 50}ms">
        <div class="card-icon-box pdf">
          <i data-lucide="file-text"></i>
        </div>
        <div class="card-info">
          <h3 class="card-title">${p.name || 'Untitled PDF'}</h3>
          <p class="card-subtitle">${formatSize(p.size)}</p>
        </div>
        <button class="view-btn" onclick="openPdf('${p.name}', '${p.url}')">
          <i data-lucide="eye"></i>
          <span>View</span>
        </button>
      </div>
    `).join('');
  }
  if ((window as any).lucide) (window as any).lucide.createIcons();
}

function renderMocks(mocks: any[]) {
  if (mocks.length === 0) {
    viewMocks.innerHTML = `
      <div class="empty-state">
        <i data-lucide="clipboard-x"></i>
        <p>No demo mocks available yet.</p>
      </div>
    `;
  } else {
    viewMocks.innerHTML = mocks.map((m, i) => `
      <div class="demo-card" style="animation-delay: ${i * 50}ms">
        <div class="card-icon-box mock">
          <i data-lucide="check-square"></i>
        </div>
        <div class="card-info">
          <h3 class="card-title">${m.title || 'Practice Test'}</h3>
          <p class="card-subtitle">${(m.questions || []).length} Questions</p>
        </div>
        <button class="view-btn" onclick="openMock('${m.id}')">
          <i data-lucide="play"></i>
          <span>Start</span>
        </button>
      </div>
    `).join('');
  }
  if ((window as any).lucide) (window as any).lucide.createIcons();
}

// Global helpers for onclick
(window as any).openPdf = (name: string, url: string) => {
  window.location.href = `./pdf-viewer.html?name=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`;
};

(window as any).openMock = (id: string) => {
  window.location.href = `./practice-test.html?id=${id}`;
};

function formatSize(bytes: number) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb > 0.1 ? `${mb.toFixed(1)} MB` : '<0.1 MB';
}

init();
