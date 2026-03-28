import './public/global-pdf-viewer';
import { db, storage } from './firebase-config';
import { onAuthChange } from './auth-service';
import {
  isAdmin,
  getCourses,
  getPDFs,
  uploadPDFToCourse,
  deletePDFFromCourse,
  getCourseQuizzes,
  createPracticeTest,
  deletePracticeTest,
  Course,
  PDF,
  PracticeTest
} from './admin-service';
import { parseExcelFile, downloadExcelTemplate } from './excel-parser';
import { parseGoogleFormFile, downloadGoogleFormTemplate } from './google-form-parser';
import { showToast, showConfirm } from './admin-toast';

class AdminPDFsPage {
  private courseFoldersContainer: HTMLElement;
  private refreshBtn: HTMLButtonElement;

  // Global file inputs used by all subfolders
  private globalPdfInput: HTMLInputElement;
  private globalQuizInput: HTMLInputElement;

  private allCourses: Course[] = [];
  private allPDFs: PDF[] = [];

  // Track which course the active upload targets
  private activePdfCourseId: string = '';
  private activeQuizCourseId: string = '';
  // Track which progress element to update during PDF upload
  private activePdfProgressEl: HTMLElement | null = null;

  constructor() {
    this.courseFoldersContainer = document.getElementById('course-folders-container') as HTMLElement;
    this.refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
    this.globalPdfInput = document.getElementById('global-pdf-input') as HTMLInputElement;
    this.globalQuizInput = document.getElementById('global-quiz-input') as HTMLInputElement;
    this.init();
  }

  // ─── Auth & Bootstrap ────────────────────────────────────────────────────────

  private async init(): Promise<void> {
    onAuthChange(async (user) => {
      if (!user) { window.location.href = './admin-login.html'; return; }
      const adminCheck = await isAdmin(user);
      if (!adminCheck) { window.location.href = './admin-login.html'; return; }

      this.bindGlobalInputs();
      this.refreshBtn.addEventListener('click', () => this.loadData());
      await this.loadData();
    }, true);
  }

  // ─── Data Loading ────────────────────────────────────────────────────────────

  private async loadData(): Promise<void> {
    this.courseFoldersContainer.innerHTML = `
      <div class="skeleton-card" style="margin-bottom: var(--spacing-sm); padding: var(--spacing-md);"><div class="skeleton skeleton-title" style="margin-bottom:0;"></div></div>
      <div class="skeleton-card" style="margin-bottom: var(--spacing-sm); padding: var(--spacing-md);"><div class="skeleton skeleton-title" style="margin-bottom:0;"></div></div>
      <div class="skeleton-card" style="margin-bottom: var(--spacing-sm); padding: var(--spacing-md);"><div class="skeleton skeleton-title" style="margin-bottom:0;"></div></div>
    `;

    const [coursesRes, pdfsRes] = await Promise.all([getCourses(), getPDFs()]);
    this.allCourses = coursesRes.courses ?? [];
    this.allPDFs = pdfsRes.pdfs ?? [];
    await this.renderAllFolders();
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────

  private async renderAllFolders(): Promise<void> {
    // Prepend canonical parts if they don't exist in the list
    const canonicalParts = [
      { id: 'part1', title: 'Part 1 — Traffic Rules & Road Safety', pdfIds: [], practiceTestIds: [] },
      { id: 'part2', title: 'Part 2 — Motor Vehicle Act', pdfIds: [], practiceTestIds: [] },
      { id: 'part3', title: 'Part 3 — Mechanical Knowledge', pdfIds: [], practiceTestIds: [] }
    ];

    const displayCourses = [...this.allCourses];
    canonicalParts.forEach(p => {
      if (!displayCourses.find(c => c.id === p.id)) {
        displayCourses.unshift(p as any);
      }
    });

    if (displayCourses.length === 0) {
      this.courseFoldersContainer.innerHTML =
        '<p style="text-align:center;color:#64748B;padding:2rem;">No courses found. Create a course first.</p>';
      return;
    }

    // Load quizzes for all courses in parallel
    const quizzesMap: Record<string, PracticeTest[]> = {};
    await Promise.all(
      displayCourses.map(async (c) => {
        if (!c.id) return;
        const res = await getCourseQuizzes(c.id);
        quizzesMap[c.id] = res.tests ?? [];
      })
    );

    let html = '';
    displayCourses.forEach((course) => {
      if (!course.id) return;
      // Filter by both document property (website) and courseId field (app sync)
      const coursePDFs = this.allPDFs.filter((p) =>
        (p as any).courseId === course.id || course.pdfIds?.includes(p.id ?? '')
      );
      const courseQuizzes = quizzesMap[course.id] ?? [];
      const totalItems = coursePDFs.length + courseQuizzes.length;
      html += this.buildCourseFolder(course, coursePDFs, courseQuizzes, totalItems);
    });

    this.courseFoldersContainer.innerHTML = html;
    this.attachFolderEventListeners();
    (window as any).lucide?.createIcons();
  }

  private buildCourseFolder(
    course: Course,
    pdfs: PDF[],
    quizzes: PracticeTest[],
    totalItems: number
  ): string {
    return `
      <div class="course-folder" data-course-id="${course.id}">
        <div class="folder-header" data-course-id="${course.id}">
          <i data-lucide="folder-open" class="folder-icon" width="20" height="20"></i>
          <span class="folder-title">${course.title}</span>
          <span class="folder-count">${totalItems} items</span>
          <i data-lucide="chevron-down" class="chevron-icon" width="18" height="18"></i>
        </div>

        <div class="subfolders-container hidden" id="folder-content-${course.id}">
          <!-- PDFs Subfolder -->
          <div class="subfolder">
            <div class="subfolder-header">
              <i data-lucide="file-text" class="subfolder-icon pdf-icon" width="16" height="16"></i>
              <span class="subfolder-title">📄 PDFs</span>
              <span class="subfolder-count" id="pdf-count-${course.id}">${pdfs.length} files</span>
              <button
                class="subfolder-upload-btn pdf-upload trigger-pdf-upload"
                data-course-id="${course.id}"
                title="Select one or more PDFs to upload">
                <i data-lucide="upload" width="12" height="12"></i> Upload PDFs
              </button>
              ${['part1', 'part2', 'part3'].includes(course.id || '') ? `
                <select class="pdf-category-select" id="pdf-cat-${course.id}" style="margin-left: 10px; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border); font-size: 11px; background: var(--bg-app); cursor: pointer;">
                  <option value="computerised">Computerised</option>
                  <option value="handwritten">Handwritten</option>
                </select>
              ` : ''}
            </div>

            <div class="subfolder-content" id="pdf-list-${course.id}">
              ${pdfs.length > 0
        ? pdfs.map((p) => this.buildPDFCard(p, course.id!)).join('')
        : '<p class="empty-state">No PDFs uploaded yet.</p>'}
            </div>
          </div>

          <!-- Quiz/MCQ Subfolder -->
          <div class="subfolder">
            <div class="subfolder-header">
              <i data-lucide="pencil-line" class="subfolder-icon quiz-icon" width="16" height="16"></i>
              <span class="subfolder-title">🧪 Quiz / MCQs</span>
              <span class="subfolder-count" id="quiz-count-${course.id}">${quizzes.length} quizzes</span>
              <button
                class="subfolder-upload-btn quiz-upload toggle-quiz-form"
                data-course-id="${course.id}"
                title="Add quiz to this course">
                <i data-lucide="plus" width="12" height="12"></i> Add Quiz
              </button>
            </div>

            <!-- Inline quiz creation form (hidden by default) -->
            <div class="quiz-inline-form hidden" id="quiz-form-${course.id}">
              <h4>
                <i data-lucide="brain" width="14" height="14"></i>
                New Quiz for "${course.title}"
              </h4>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Quiz Title *</label>
                  <input type="text" class="form-input quiz-title-input" placeholder="e.g. Traffic Signs MCQ" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Duration (minutes) *</label>
                  <input type="number" class="form-input quiz-duration-input" placeholder="30" min="1" required>
                </div>
              </div>

              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label">Category *</label>
                <select class="form-input quiz-category-input" required>
                  <option value="Practice Test">Practice Test</option>
                  <option value="Chapter Test">Chapter Test</option>
                  <option value="Full Mock Test">Full Mock Test</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label">Description (optional)</label>
                <input type="text" class="form-input quiz-desc-input" placeholder="Brief description">
              </div>

              <!-- File upload zone -->
              <div class="file-drop-zone quiz-drop-zone" data-course-id="${course.id}">
                <input type="file" class="quiz-file-input" accept=".xlsx,.xls,.json">
                <p><strong>Click or drag</strong> an Excel (.xlsx) or Google Form JSON (.json) file here</p>
                <p style="margin-top:0.25rem;font-size:0.75rem;">Max 10 MB</p>
              </div>

              <div class="file-name-label hidden quiz-file-label"></div>

              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                <div>
                  <button class="btn-download-template dl-excel-template">
                    <i data-lucide="download" width="12" height="12"></i> Excel template
                  </button>
                  &nbsp;·&nbsp;
                  <button class="btn-download-template dl-json-template">
                    <i data-lucide="download" width="12" height="12"></i> JSON template
                  </button>
                </div>
              </div>

              <div class="quiz-form-actions">
                <button class="btn-quiz-submit submit-quiz-btn" data-course-id="${course.id}">
                  <i data-lucide="save" width="14" height="14"></i> Save Quiz
                </button>
                <button class="btn-quiz-cancel cancel-quiz-form" data-course-id="${course.id}">Cancel</button>
              </div>
            </div>

            <div class="subfolder-content" id="quiz-list-${course.id}">
              ${quizzes.length > 0
        ? quizzes.map((q) => this.buildQuizCard(q)).join('')
        : '<p class="empty-state">No quizzes yet.</p>'}
            </div>
          </div>
        </div>
      </div>`;
  }

  private buildPDFCard(pdf: PDF, courseId: string): string {
    const sizeMB = (pdf.size / (1024 * 1024)).toFixed(2);
    return `
      <div class="pdf-card" data-id="${pdf.id}">
        <div class="pdf-icon-wrapper">
          <i data-lucide="file-text" width="16" height="16"></i>
        </div>
        <div class="pdf-info">
          <div class="pdf-name" title="${pdf.name}">${pdf.name}</div>
          <div class="pdf-meta">${sizeMB} MB</div>
        </div>
        <div class="pdf-actions">
          <a href="./pdf-viewer.html?name=${encodeURIComponent(pdf.name)}&url=${encodeURIComponent(pdf.url)}" class="btn-icon" title="Preview">
            <i data-lucide="eye" width="16" height="16"></i>
          </a>
          <button class="btn-icon delete delete-pdf-btn" data-id="${pdf.id}" data-url="${pdf.url}" data-course-id="${courseId}" title="Delete">
            <i data-lucide="trash-2" width="16" height="16"></i>
          </button>
        </div>
      </div>`;
  }

  private buildQuizCard(quiz: PracticeTest): string {
    return `
      <div class="quiz-card" data-id="${quiz.id}">
        <div class="quiz-icon-wrapper">
          <i data-lucide="brain" width="16" height="16"></i>
        </div>
        <div class="pdf-info">
          <div class="pdf-name">${quiz.title}</div>
          <div class="quiz-meta-row">
            <span class="quiz-meta"><i data-lucide="help-circle" width="12" height="12"></i> ${quiz.questions?.length ?? 0} questions</span>
            <span class="quiz-meta"><i data-lucide="clock" width="12" height="12"></i> ${quiz.duration} min</span>
          </div>
        </div>
        <div class="pdf-actions">
          <button class="btn-icon delete delete-quiz-btn" data-id="${quiz.id}" title="Delete quiz">
            <i data-lucide="trash-2" width="16" height="16"></i>
          </button>
        </div>
      </div>`;
  }

  // ─── Event Listeners ─────────────────────────────────────────────────────────

  private attachFolderEventListeners(): void {
    // Toggle course folder open/close
    document.querySelectorAll<HTMLElement>('.folder-header').forEach((header) => {
      header.addEventListener('click', () => {
        const cid = header.getAttribute('data-course-id')!;
        const content = document.getElementById(`folder-content-${cid}`);
        const chevron = header.querySelector('.chevron-icon');
        content?.classList.toggle('hidden');
        chevron?.classList.toggle('rotate-180');
      });
    });

    // Trigger PDF upload (hidden global input)
    document.querySelectorAll<HTMLButtonElement>('.trigger-pdf-upload').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-course-id')!;
        const progressId = btn.getAttribute('data-progress-id')!;
        this.activePdfCourseId = cid;
        this.activePdfProgressEl = document.getElementById(progressId);
        this.globalPdfInput.value = '';
        this.globalPdfInput.click();
      });
    });

    // Toggle inline quiz form
    document.querySelectorAll<HTMLButtonElement>('.toggle-quiz-form').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-course-id')!;
        const form = document.getElementById(`quiz-form-${cid}`)!;
        form.classList.toggle('hidden');
        btn.textContent = form.classList.contains('hidden') ? '+ Add Quiz' : '✕ Close';
        (window as any).lucide?.createIcons();
      });
    });

    // Cancel quiz form
    document.querySelectorAll<HTMLButtonElement>('.cancel-quiz-form').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-course-id')!;
        this.resetQuizForm(cid);
      });
    });

    // Quiz file drop zones (inline per course)
    document.querySelectorAll<HTMLElement>('.quiz-drop-zone').forEach((zone) => {
      const input = zone.querySelector<HTMLInputElement>('.quiz-file-input')!;
      const cid = zone.getAttribute('data-course-id')!;

      zone.addEventListener('click', () => input.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer?.files[0]) {
          this.onQuizFileSelected(e.dataTransfer.files[0], cid);
        }
      });

      input.addEventListener('change', () => {
        if (input.files?.[0]) this.onQuizFileSelected(input.files[0], cid);
      });
    });

    // Submit quiz
    document.querySelectorAll<HTMLButtonElement>('.submit-quiz-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-course-id')!;
        this.onSubmitQuiz(cid, btn);
      });
    });

    // Download templates
    document.querySelectorAll<HTMLButtonElement>('.dl-excel-template').forEach((btn) => {
      btn.addEventListener('click', () => downloadExcelTemplate());
    });

    document.querySelectorAll<HTMLButtonElement>('.dl-json-template').forEach((btn) => {
      btn.addEventListener('click', () => downloadGoogleFormTemplate());
    });

    // Delete PDF
    document.querySelectorAll<HTMLButtonElement>('.delete-pdf-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id')!;
        const url = btn.getAttribute('data-url')!;
        const cid = btn.getAttribute('data-course-id')!;
        const confirmed = await showConfirm('Delete PDF?', 'This will remove the PDF from the course.', 'Delete PDF');
        if (!confirmed) return;
        btn.disabled = true;
        const res = await deletePDFFromCourse(id, url, cid);
        if (res.success) {
          btn.closest('.pdf-card')?.remove();
          this.updatePDFCount(cid);
          showToast('PDF deleted.', 'success');
        } else {
          showToast('Error: ' + res.error, 'error');
          btn.disabled = false;
        }
      });
    });

    // Delete Quiz
    document.querySelectorAll<HTMLButtonElement>('.delete-quiz-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id')!;
        const confirmed = await showConfirm('Delete Quiz?', 'This will permanently delete the quiz and all its questions.', 'Delete Quiz');
        if (!confirmed) return;
        btn.disabled = true;
        const res = await deletePracticeTest(id);
        if (res.success) {
          btn.closest('.quiz-card')?.remove();
          showToast('Quiz deleted.', 'success');
        } else {
          showToast('Error: ' + res.error, 'error');
          btn.disabled = false;
        }
      });
    });
  }

  private bindGlobalInputs(): void {
    this.globalPdfInput.addEventListener('change', async () => {
      const files = Array.from(this.globalPdfInput.files ?? []);
      this.globalPdfInput.value = ''; // reset immediately so same files can be re-picked
      if (!files.length || !this.activePdfCourseId) return;

      const courseId = this.activePdfCourseId;

      // ── Duplicate detection ────────────────────────────────────────────────
      // Collect names of PDFs already in this course's subfolder
      const pdfListEl = document.getElementById(`pdf-list-${courseId}`);
      const existingNames = new Set(
        Array.from(pdfListEl?.querySelectorAll<HTMLElement>('.pdf-name') ?? [])
          .map(el => el.textContent?.trim() ?? '')
      );

      const toUpload: File[] = [];
      for (const file of files) {
        if (existingNames.has(file.name)) {
          showToast(`"${file.name}" is already in this folder — skipped.`, 'warning', 4000);
        } else {
          toUpload.push(file);
        }
      }

      if (toUpload.length === 0) return;

      // ── Build the upload queue UI ──────────────────────────────────────────
      const queueContainerId = `upload-queue-${courseId}`;
      let queueEl = document.getElementById(queueContainerId);
      if (!queueEl) {
        queueEl = document.createElement('div');
        queueEl.id = queueContainerId;
        queueEl.className = 'upload-queue';
        // Insert above the PDF list
        pdfListEl?.parentElement?.insertBefore(queueEl, pdfListEl);
      }

      // One row per file
      const rowIds = toUpload.map((f, i) => {
        const id = `uq-${courseId}-${Date.now()}-${i}`;
        const shortName = f.name.length > 32 ? f.name.substring(0, 30) + '…' : f.name;
        const row = document.createElement('div');
        row.id = id;
        row.className = 'upload-queue-item';
        row.innerHTML = `
          <div class="uq-meta">
            <span class="uq-icon">📄</span>
            <span class="uq-name" title="${f.name}">${shortName}</span>
            <span class="uq-pct" id="${id}-pct">0%</span>
          </div>
          <div class="uq-bar-bg"><div class="uq-bar-fill" id="${id}-fill" style="width:0%"></div></div>
        `;
        queueEl!.appendChild(row);
        return id;
      });

      // ── Upload all in parallel ─────────────────────────────────────────────
      const results = await Promise.all(
        toUpload.map((file, idx) =>
          this.uploadOnePDF(file, courseId, (pct) => {
            const fill = document.getElementById(`${rowIds[idx]}-fill`);
            const label = document.getElementById(`${rowIds[idx]}-pct`);
            if (fill) fill.style.width = `${pct}%`;
            if (label) label.textContent = `${pct}%`;
          }).finally(() => {
            // Fade-out the row after a short delay
            setTimeout(() => {
              const row = document.getElementById(rowIds[idx]);
              if (row) { row.style.opacity = '0'; row.style.transition = 'opacity 0.4s'; }
              setTimeout(() => document.getElementById(rowIds[idx])?.remove(), 450);
            }, 700);
          })
        )
      );

      // Remove the queue container if now empty
      setTimeout(() => {
        if (!queueEl?.children.length) queueEl?.remove();
      }, 1200);

      const succeeded = results.filter(Boolean).length;
      const failed = results.length - succeeded;
      if (results.length > 1) {
        if (failed === 0) showToast(`All ${results.length} PDFs uploaded!`, 'success');
        else showToast(`${succeeded} uploaded, ${failed} failed.`, failed === results.length ? 'error' : 'warning');
      }
    });
  }

  // ─── Quiz File Handling ──────────────────────────────────────────────────────

  // Store parsed questions keyed by courseId until form is submitted
  private pendingQuizQuestions: Record<string, { questions: any[]; fileName: string }> = {};

  private async onQuizFileSelected(file: File, courseId: string): Promise<void> {
    const labelEl = document.querySelector<HTMLElement>(`#quiz-form-${courseId} .quiz-file-label`);
    if (labelEl) { labelEl.textContent = 'Parsing file…'; labelEl.classList.remove('hidden'); }

    try {
      let questions: any[];
      if (file.name.endsWith('.json')) {
        questions = await parseGoogleFormFile(file);
      } else {
        questions = await parseExcelFile(file);
      }
      this.pendingQuizQuestions[courseId] = { questions, fileName: file.name };
      if (labelEl) labelEl.textContent = `✓ ${questions.length} questions loaded from "${file.name}"`;
      showToast(`${questions.length} questions loaded!`, 'success', 2500);
    } catch (err: any) {
      showToast('Error parsing file: ' + err.message, 'error');
      if (labelEl) labelEl.textContent = '';
      delete this.pendingQuizQuestions[courseId];
    }
  }

  private async onSubmitQuiz(courseId: string, btn: HTMLButtonElement): Promise<void> {
    const form = document.getElementById(`quiz-form-${courseId}`)!;
    const title = form.querySelector<HTMLInputElement>('.quiz-title-input')?.value.trim() ?? '';
    const duration = parseInt(form.querySelector<HTMLInputElement>('.quiz-duration-input')?.value ?? '0');
    const category = form.querySelector<HTMLSelectElement>('.quiz-category-input')?.value ?? 'Practice Test';
    const description = form.querySelector<HTMLInputElement>('.quiz-desc-input')?.value.trim() ?? '';
    const pending = this.pendingQuizQuestions[courseId];

    if (!title) { showToast('Please enter a quiz title.', 'warning'); return; }
    if (!duration || duration < 1) { showToast('Please enter a valid duration (minutes).', 'warning'); return; }
    if (!pending || pending.questions.length === 0) {
      showToast('Please upload an Excel or Google Form JSON file with questions.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving…';

    const partId = (courseId === 'part1' || courseId === 'part2' || courseId === 'part3') ? courseId : undefined;
    const result = await createPracticeTest({
      title,
      description,
      questions: pending.questions,
      duration,
      courseId,
      partId,
      category
    });

    if (result.success) {
      // Insert new quiz card immediately without full reload
      const quizListEl = document.getElementById(`quiz-list-${courseId}`)!;
      const emptyState = quizListEl.querySelector('.empty-state');
      emptyState?.remove();

      const tempQuiz: PracticeTest = {
        id: result.id,
        title,
        description,
        questions: pending.questions,
        duration,
        courseId,
        category,
        createdAt: null
      };

      quizListEl.insertAdjacentHTML('beforeend', this.buildQuizCard(tempQuiz));

      // Attach delete listener to new card
      const newDeleteBtn = quizListEl.querySelector<HTMLButtonElement>(`.delete-quiz-btn[data-id="${result.id}"]`);
      if (newDeleteBtn) {
        newDeleteBtn.addEventListener('click', async () => {
          const ok = await showConfirm('Delete Quiz?', 'This will permanently delete the quiz.', 'Delete Quiz');
          if (!ok) return;
          newDeleteBtn.disabled = true;
          const res = await deletePracticeTest(result.id!);
          if (res.success) { newDeleteBtn.closest('.quiz-card')?.remove(); showToast('Quiz deleted.', 'success'); }
          else { showToast('Error: ' + res.error, 'error'); newDeleteBtn.disabled = false; }
        });
      }

      // Update count badge
      const countEl = document.getElementById(`quiz-count-${courseId}`);
      if (countEl) {
        const current = parseInt(countEl.textContent ?? '0');
        countEl.textContent = `${current + 1} quizzes`;
      }

      showToast('Quiz saved successfully!', 'success');
      delete this.pendingQuizQuestions[courseId];
      this.resetQuizForm(courseId);
      (window as any).lucide?.createIcons();
    } else {
      showToast('Error saving quiz: ' + result.error, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" width="14" height="14"></i> Save Quiz';
    (window as any).lucide?.createIcons();
  }

  private resetQuizForm(courseId: string): void {
    const form = document.getElementById(`quiz-form-${courseId}`);
    if (!form) return;
    form.querySelector<HTMLInputElement>('.quiz-title-input')!.value = '';
    form.querySelector<HTMLInputElement>('.quiz-duration-input')!.value = '';
    form.querySelector<HTMLInputElement>('.quiz-desc-input')!.value = '';
    form.querySelector<HTMLInputElement>('.quiz-file-input')!.value = '';
    const label = form.querySelector<HTMLElement>('.quiz-file-label');
    if (label) { label.textContent = ''; label.classList.add('hidden'); }
    form.classList.add('hidden');
    delete this.pendingQuizQuestions[courseId];

    // Reset toggle button text
    const toggleBtn = document.querySelector<HTMLButtonElement>(`.toggle-quiz-form[data-course-id="${courseId}"]`);
    if (toggleBtn) toggleBtn.innerHTML = '<i data-lucide="plus" width="12" height="12"></i> Add Quiz';
    (window as any).lucide?.createIcons();
  }

  // ─── PDF Upload ──────────────────────────────────────────────────────────────

  /** Upload a single PDF with real Firebase progress, returns success bool. */
  private async uploadOnePDF(
    file: File,
    courseId: string,
    onProgress: (pct: number) => void
  ): Promise<boolean> {
    const partId = (courseId === 'part1' || courseId === 'part2' || courseId === 'part3') ? courseId : undefined;
    const catSelect = document.getElementById(`pdf-cat-${courseId}`) as HTMLSelectElement;
    const category = catSelect?.value;
    const result = await uploadPDFToCourse(file, courseId, partId, category, onProgress);

    if (result.success) {
      const pdfListEl = document.getElementById(`pdf-list-${courseId}`)!;
      pdfListEl.querySelector('.empty-state')?.remove();

      const newPdf: PDF = {
        id: result.id,
        name: file.name,
        url: result.url,
        size: file.size,
        uploadedAt: null
      };

      pdfListEl.insertAdjacentHTML('beforeend', this.buildPDFCard(newPdf, courseId));

      const newDeleteBtn = pdfListEl.querySelector<HTMLButtonElement>(`.delete-pdf-btn[data-id="${result.id}"]`);
      if (newDeleteBtn) {
        newDeleteBtn.addEventListener('click', async () => {
          const ok = await showConfirm('Delete PDF?', 'This will remove the PDF from this course.', 'Delete PDF');
          if (!ok) return;
          newDeleteBtn.disabled = true;
          const res = await deletePDFFromCourse(result.id, result.url, courseId);
          if (res.success) { newDeleteBtn.closest('.pdf-card')?.remove(); this.updatePDFCount(courseId); showToast('PDF deleted.', 'success'); }
          else { showToast('Error: ' + res.error, 'error'); newDeleteBtn.disabled = false; }
        });
      }

      this.updatePDFCount(courseId);
      (window as any).lucide?.createIcons();

      if (file === (this.globalPdfInput.files?.[0] ?? file) && (this.globalPdfInput.files?.length ?? 0) <= 1) {
        showToast(`"${file.name}" uploaded!`, 'success');
      }
      return true;
    } else {
      showToast(`Failed "${file.name}": ` + result.error, 'error');
      return false;
    }
  }

  /** @deprecated Use uploadOnePDF instead */
  private async uploadPDF(file: File, courseId: string): Promise<boolean> {
    return this.uploadOnePDF(file, courseId, () => { });
  }

  private updatePDFCount(courseId: string): void {
    const listEl = document.getElementById(`pdf-list-${courseId}`);
    const countEl = document.getElementById(`pdf-count-${courseId}`);
    if (!listEl || !countEl) return;
    const count = listEl.querySelectorAll('.pdf-card').length;
    countEl.textContent = `${count} files`;
  }
}

new AdminPDFsPage();
