import { onAuthChange } from './auth-service';
import { isAdmin, createPracticeTest, getPracticeTests, deletePracticeTest, getCourses, updateCourse, getCourse, PracticeTest, Question } from './admin-service';
import { parseExcelFile, downloadExcelTemplate } from './excel-parser';
import { showToast, showConfirm } from './admin-toast';

class AdminTestsPage {
  private form: HTMLFormElement;
  private uploadArea: HTMLElement;
  private excelInput: HTMLInputElement;
  private fileNameEl: HTMLElement;
  private testsContainer: HTMLElement;
  private courseSelect: HTMLSelectElement;
  private submitBtn: HTMLButtonElement;
  private downloadTemplateBtn: HTMLButtonElement;
  private questions: Question[] = [];

  constructor() {
    this.form = document.getElementById('test-form') as HTMLFormElement;
    this.uploadArea = document.getElementById('upload-area') as HTMLElement;
    this.excelInput = document.getElementById('excel-input') as HTMLInputElement;
    this.fileNameEl = document.getElementById('file-name') as HTMLElement;
    this.testsContainer = document.getElementById('tests-container') as HTMLElement;
    this.courseSelect = document.getElementById('course-select') as HTMLSelectElement;
    this.submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    this.downloadTemplateBtn = document.getElementById('download-template-btn') as HTMLButtonElement;
    this.init();
  }

  private async init(): Promise<void> {
    onAuthChange(async (user) => {
      if (!user) {
        window.location.href = './admin-login.html';
        return;
      }

      const isUserAdmin = await isAdmin(user);
      if (!isUserAdmin) {
        window.location.href = './admin-login.html';
        return;
      }

      this.setupUploadArea();
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      this.downloadTemplateBtn.addEventListener('click', () => downloadExcelTemplate());
      await this.loadTests();
      await this.loadCourses();
    }, true);
  }

  private setupUploadArea(): void {
    this.uploadArea.addEventListener('click', () => this.excelInput.click());
    this.excelInput.addEventListener('change', () => this.handleFileSelect());

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.excelInput.files = files;
        this.handleFileSelect();
      }
    });
  }

  private async handleFileSelect(): Promise<void> {
    const file = this.excelInput.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showToast('Please select an Excel (.xlsx) file', 'warning');
      return;
    }

    try {
      this.fileNameEl.textContent = 'Parsing Excel file...';
      this.questions = await parseExcelFile(file);
      this.fileNameEl.textContent = `✓ Loaded ${this.questions.length} questions from ${file.name}`;
      this.fileNameEl.style.color = '#16A34A';
      showToast(`Loaded ${this.questions.length} questions`, 'success', 2500);
    } catch (error) {
      showToast('Error parsing Excel file. Check the format and try again.', 'error');
      this.fileNameEl.textContent = '';
      this.questions = [];
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.questions.length === 0) {
      showToast('Please upload an Excel file with questions', 'warning');
      return;
    }

    const title = (document.getElementById('title') as HTMLInputElement).value;
    const description = (document.getElementById('description') as HTMLTextAreaElement).value;
    const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value);
    const courseId = this.courseSelect.value;
    const category = (document.getElementById('category') as HTMLSelectElement).value;

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Creating...';

    const testData: any = {
      title,
      description,
      questions: this.questions,
      duration,
      category
    };

    if (courseId) {
      testData.courseId = courseId;
    }

    const result = await createPracticeTest(testData);

    if (result.success && result.id) {
      if (courseId) {
        const courseResult = await getCourse(courseId);
        if (courseResult.success && courseResult.course) {
          const course = courseResult.course;
          if (!course.practiceTestIds.includes(result.id)) {
            course.practiceTestIds.push(result.id);
            await updateCourse(courseId, { practiceTestIds: course.practiceTestIds });
          }
        }
      }

      showToast('Practice test created successfully!', 'success');
      this.form.reset();
      this.fileNameEl.textContent = '';
      this.questions = [];
      await this.loadTests();
    } else {
      showToast('Error: ' + result.error, 'error');
    }

    this.submitBtn.disabled = false;
    this.submitBtn.textContent = 'Create Practice Test';
  }

  private async loadTests(): Promise<void> {
    const result = await getPracticeTests();

    if (result.success && result.tests) {
      this.testsContainer.innerHTML = result.tests.map(test => this.renderTestItem(test)).join('');
      this.attachEventListeners();
    } else {
      this.testsContainer.innerHTML = '<p style="text-align: center; color: #64748B; padding: 2rem;">No practice tests found.</p>';
    }
  }

  private renderTestItem(test: PracticeTest): string {
    return `
      <div class="test-card">
        <div class="test-info">
          <h3>${test.title}</h3>
          <p style="font-size: 0.875rem; color: #64748B; margin-bottom: 0.75rem;">${test.description}</p>
          <div class="test-meta">
            <div class="meta-item">
              <i data-lucide="help-circle" width="14" height="14"></i>
              ${test.questions.length} questions
            </div>
            <div class="meta-item">
              <i data-lucide="clock" width="14" height="14"></i>
              ${test.duration} minutes
            </div>
          </div>
        </div>
        <button class="btn-icon delete delete-btn" data-id="${test.id}" title="Delete Test">
          <i data-lucide="trash-2" width="18" height="18"></i>
        </button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    (window as any).lucide.createIcons();

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.deleteTest(id);
      });
    });
  }

  private async deleteTest(testId: string): Promise<void> {
    const confirmed = await showConfirm('Delete Practice Test?', 'This will permanently delete the test and all its questions.', 'Delete Test');
    if (!confirmed) return;

    const result = await deletePracticeTest(testId);
    if (result.success) {
      showToast('Practice test deleted.', 'success');
      await this.loadTests();
    } else {
      showToast('Error: ' + result.error, 'error');
    }
  }

  private async loadCourses(): Promise<void> {
    const result = await getCourses();
    if (result.success && result.courses) {
      const canonicalParts = [
        { id: 'part1', title: 'Part 1 — Traffic Rules & Road Safety' },
        { id: 'part2', title: 'Part 2 — Motor Vehicle Act' },
        { id: 'part3', title: 'Part 3 — Mechanical Knowledge' }
      ];

      const displayCourses = [...result.courses];
      canonicalParts.forEach(p => {
        if (!displayCourses.find(c => c.id === p.id)) {
          displayCourses.unshift(p as any);
        }
      });

      this.courseSelect.innerHTML = '<option value="">None / General</option>' +
        displayCourses.map(course => `<option value="${course.id}">${course.title}</option>`).join('');
    }
  }
}

new AdminTestsPage();

