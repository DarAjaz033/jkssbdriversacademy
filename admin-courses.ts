import { onAuthChange } from './auth-service';
import { isAdmin, getCourses, createCourse, updateCourse, updateCourseRank, deleteCourse, Course } from './admin-service';
import { showToast, showConfirm } from './admin-toast';

class AdminCoursesPage {
  private form: HTMLFormElement;
  private submitBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private coursesContainer: HTMLElement;
  private editingCourseId: string | null = null;
  private coursesList: Course[] = [];

  private descriptionPointsContainer: HTMLElement;
  private addPointBtn: HTMLButtonElement;

  constructor() {
    this.form = document.getElementById('course-form') as HTMLFormElement;
    this.submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    this.cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
    this.coursesContainer = document.getElementById('courses-container') as HTMLElement;
    this.descriptionPointsContainer = document.getElementById('description-points-container') as HTMLElement;
    this.addPointBtn = document.getElementById('add-point-btn') as HTMLButtonElement;
    this.init();
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  private async init(): Promise<void> {
    onAuthChange(async (user) => {
      if (!user) { window.location.href = './admin-login.html'; return; }
      const adminCheck = await isAdmin(user);
      if (!adminCheck) { window.location.href = './admin-login.html'; return; }

      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      this.cancelBtn.addEventListener('click', () => this.cancelEdit());
      this.addPointBtn.addEventListener('click', () => this.addDescriptionPoint());
      this.ensureDescriptionPoints();
      await this.loadCourses();
    }, true);
  }

  // ─── Description Helpers ─────────────────────────────────────────────────────

  private buildDescriptionFromForm(): string {
    const heading = (document.getElementById('description-heading') as HTMLInputElement).value.trim();
    const inputs = this.descriptionPointsContainer.querySelectorAll<HTMLInputElement>('.description-point-input');
    const lines = Array.from(inputs).map(inp => inp.value.trim()).filter(Boolean);
    if (lines.length === 0 && !heading) return '';
    const numbered = lines.map((l, i) => `${i + 1}. ${l}`);
    return heading ? [heading, ...numbered].join(' ') : numbered.join(' ');
  }

  private ensureDescriptionPoints(): void {
    if (this.descriptionPointsContainer.children.length === 0) this.addDescriptionPoint('', false);
  }

  private addDescriptionPoint(value = '', focus = true): void {
    const index = this.descriptionPointsContainer.children.length + 1;
    const row = document.createElement('div');
    row.className = 'description-point-row';

    const numSpan = document.createElement('span');
    numSpan.className = 'point-number';
    numSpan.textContent = `${index}.`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input description-point-input';
    input.placeholder = 'e.g., Identification of major assemblies';
    input.value = value;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-icon delete';
    removeBtn.title = 'Remove point';
    removeBtn.style.flexShrink = '0';
    removeBtn.innerHTML = '<i data-lucide="trash-2" width="16" height="16"></i>';
    removeBtn.addEventListener('click', () => { row.remove(); this.updatePointNumbers(); });

    row.append(numSpan, input, removeBtn);
    this.descriptionPointsContainer.appendChild(row);
    (window as any).lucide?.createIcons();
    if (focus) input.focus();
  }

  private updatePointNumbers(): void {
    this.descriptionPointsContainer.querySelectorAll('.description-point-row').forEach((row, i) => {
      const span = row.querySelector('.point-number');
      if (span) span.textContent = `${i + 1}.`;
    });
  }

  private parseDescriptionToForm(description: string): void {
    const trimmed = description.trim();
    const segments = trimmed.split(/\s*\d+\.\s+/).map(s => s.trim()).filter(Boolean);
    (document.getElementById('description-heading') as HTMLInputElement).value = '';
    this.descriptionPointsContainer.innerHTML = '';
    if (segments.length > 1) {
      (document.getElementById('description-heading') as HTMLInputElement).value = segments[0];
      segments.slice(1).forEach(p => this.addDescriptionPoint(p, false));
    } else {
      if (trimmed) this.addDescriptionPoint(trimmed, false);
      else this.ensureDescriptionPoints();
    }
  }

  // ─── Form Submit ─────────────────────────────────────────────────────────────

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const description = this.buildDescriptionFromForm();
    const syllabus = (document.getElementById('syllabus') as HTMLTextAreaElement).value.trim();
    const paymentLink = (document.getElementById('payment-link') as HTMLInputElement).value.trim();

    const category = (document.getElementById('category') as HTMLSelectElement).value;
    const title = (document.getElementById('title') as HTMLInputElement).value.trim();
    const price = parseInt((document.getElementById('price') as HTMLInputElement).value);
    const oldPrice = (document.getElementById('old-price') as HTMLInputElement).value ? parseInt((document.getElementById('old-price') as HTMLInputElement).value) : undefined;
    const duration = (document.getElementById('duration') as HTMLInputElement).value.trim();
    const validityDays = (document.getElementById('validity-days') as HTMLInputElement).value ? parseInt((document.getElementById('validity-days') as HTMLInputElement).value) : undefined;
    const descriptionHeading = (document.getElementById('description-heading') as HTMLInputElement).value.trim();

    const courseData: Partial<Course> = {
      category,
      title,
      description,
      syllabus,
      price,
      oldPrice,
      duration,
      paymentLink,
      validityDays,
      descriptionHeading,
      thumbCssClass: (document.getElementById('thumb-css-class') as HTMLSelectElement).value,
      thumbBadge: (document.getElementById('thumb-badge') as HTMLInputElement).value.trim(),
      thumbBadgeStyle: (document.getElementById('thumb-badge-style') as HTMLSelectElement).value,
      thumbTopLabel: (document.getElementById('thumb-top-label') as HTMLInputElement).value.trim(),
      thumbMainHeading: (document.getElementById('thumb-main-heading') as HTMLInputElement).value.trim(),
      thumbSubHeading: (document.getElementById('thumb-sub-heading') as HTMLInputElement).value.trim(),
      thumbPartTags: (document.getElementById('thumb-part-tags') as HTMLInputElement).value.trim(),
      thumbBottomCaption: (document.getElementById('thumb-bottom-caption') as HTMLInputElement).value.trim(),
      pdfIds: [],
      practiceTestIds: []
    };

    if (!courseData.title) {
      showToast('Please enter a course title', 'warning');
      return;
    }

    this.submitBtn.disabled = true;
    const originalText = this.submitBtn.textContent!;
    this.submitBtn.textContent = this.editingCourseId ? 'Updating…' : 'Creating…';

    const result = this.editingCourseId
      ? await updateCourse(this.editingCourseId, courseData)
      : await createCourse(courseData as Course);

    if (result.success) {
      showToast(this.editingCourseId ? 'Course updated successfully!' : 'Course created successfully!', 'success');
      this.form.reset();
      this.cancelEdit();
      await this.loadCourses();
    } else {
      showToast('Error: ' + result.error, 'error');
    }

    this.submitBtn.disabled = false;
    this.submitBtn.textContent = originalText;
  }

  // ─── Load & Render ───────────────────────────────────────────────────────────

  private async loadCourses(): Promise<void> {
    this.coursesContainer.innerHTML = `
      <div class="skeleton-card" style="margin-bottom:var(--spacing-sm);flex-direction:row;align-items:center;justify-content:space-between;">
        <div style="flex:1;"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width:50%;"></div></div>
        <div class="skeleton" style="width:80px;height:32px;border-radius:var(--radius-sm);"></div>
      </div>
      <div class="skeleton-card" style="margin-bottom:var(--spacing-sm);flex-direction:row;align-items:center;justify-content:space-between;">
        <div style="flex:1;"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width:50%;"></div></div>
        <div class="skeleton" style="width:80px;height:32px;border-radius:var(--radius-sm);"></div>
      </div>
    `;
    const result = await getCourses();
    if (result.success && result.courses) {
      this.coursesList = result.courses;
      this.coursesContainer.innerHTML = result.courses.length > 0
        ? result.courses.map((c, i) => this.renderCourseItem(c, i)).join('')
        : '<p style="text-align:center;color:#64748B;padding:2rem;">No courses yet. Create one using the form.</p>';
      this.attachEventListeners();
    } else {
      this.coursesContainer.innerHTML = '<p style="text-align:center;color:#DC2626;padding:2rem;">Failed to load courses.</p>';
      showToast('Failed to load courses: ' + ((result as any).error ?? 'Unknown error'), 'error');
    }
  }

  private renderCourseItem(course: Course, index: number): string {
    const rank = index + 1;
    const canUp = index > 0;
    const canDown = index < this.coursesList.length - 1;
    return `
      <div class="course-card" data-id="${course.id}">
        <div class="course-info">
          <h3>${course.title}</h3>
          <div class="course-meta">
            <div class="meta-item"><i data-lucide="indian-rupee" width="13" height="13"></i> ${course.oldPrice ? `<del style="color:#DC2626; margin-right:4px;">${course.oldPrice}</del>` : ''}₹${course.price}</div>
            <div class="meta-item"><i data-lucide="clock" width="13" height="13"></i> ${course.duration}</div>
            ${course.paymentLink ? '<div class="meta-item" style="color:#16A34A;"><i data-lucide="link" width="13" height="13"></i> Payment Link ✓</div>' : ''}
            <div class="meta-item"><i data-lucide="hash" width="13" height="13"></i> Rank #${rank}</div>
          </div>
        </div>
        <div class="btn-icon-group">
          <div style="display:flex;flex-direction:column;gap:3px;margin-right:6px;">
            <button class="btn-icon move-up-btn" data-id="${course.id}" data-index="${index}" ${!canUp ? 'disabled' : ''} title="Move up">
              <i data-lucide="chevron-up" width="15" height="15"></i>
            </button>
            <button class="btn-icon move-down-btn" data-id="${course.id}" data-index="${index}" ${!canDown ? 'disabled' : ''} title="Move down">
              <i data-lucide="chevron-down" width="15" height="15"></i>
            </button>
          </div>
          <button class="btn-icon edit-btn" data-id="${course.id}" title="Edit">
            <i data-lucide="edit-3" width="17" height="17"></i>
          </button>
          <button class="btn-icon delete delete-btn" data-id="${course.id}" title="Delete">
            <i data-lucide="trash-2" width="17" height="17"></i>
          </button>
        </div>
      </div>`;
  }

  private attachEventListeners(): void {
    (window as any).lucide?.createIcons();

    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.editCourse(id);
      });
    });

    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.handleDelete(id, btn);
      });
    });

    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.move-up-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index') ?? '0');
        this.moveCourse(index, -1);
      });
    });

    this.coursesContainer.querySelectorAll<HTMLButtonElement>('.move-down-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index') ?? '0');
        this.moveCourse(index, 1);
      });
    });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  private async handleDelete(courseId: string, btn: HTMLButtonElement): Promise<void> {
    const course = this.coursesList.find(c => c.id === courseId);
    const confirmed = await showConfirm(
      'Delete Course?',
      `This will permanently delete "${course?.title ?? 'this course'}". This cannot be undone.`,
      'Delete Course'
    );
    if (!confirmed) return;

    btn.disabled = true;
    const card = btn.closest<HTMLElement>('.course-card');
    if (card) card.style.opacity = '0.5';

    const result = await deleteCourse(courseId);
    if (result.success) {
      showToast('Course deleted successfully!', 'success');
      await this.loadCourses();
    } else {
      showToast('Delete failed: ' + result.error, 'error');
      btn.disabled = false;
      if (card) card.style.opacity = '1';
    }
  }

  private async moveCourse(currentIndex: number, direction: number): Promise<void> {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= this.coursesList.length) return;

    const current = this.coursesList[currentIndex];
    const target = this.coursesList[targetIndex];
    if (!current?.id || !target?.id) return;

    const base = 1000;
    const currentRank = typeof current.rank === 'number' ? current.rank : base + currentIndex;
    const targetRank = typeof target.rank === 'number' ? target.rank : base + targetIndex;

    const [r1, r2] = await Promise.all([
      updateCourseRank(current.id, targetRank),
      updateCourseRank(target.id, currentRank)
    ]);

    if (r1.success && r2.success) {
      showToast('Course order updated!', 'info');
      await this.loadCourses();
    } else {
      showToast('Error updating order: ' + (r1.error ?? r2.error), 'error');
    }
  }

  private async editCourse(courseId: string): Promise<void> {
    const course = this.coursesList.find(c => c.id === courseId);
    if (!course) return;

    this.editingCourseId = courseId;
    (document.getElementById('category') as HTMLSelectElement).value = course.category || 'Complete Package';
    (document.getElementById('title') as HTMLInputElement).value = course.title;
    (document.getElementById('price') as HTMLInputElement).value = course.price.toString();
    (document.getElementById('old-price') as HTMLInputElement).value = course.oldPrice ? course.oldPrice.toString() : '';
    (document.getElementById('duration') as HTMLInputElement).value = course.duration;
    (document.getElementById('payment-link') as HTMLInputElement).value = course.paymentLink ?? '';
    (document.getElementById('validity-days') as HTMLInputElement).value = course.validityDays ? course.validityDays.toString() : '';
    (document.getElementById('syllabus') as HTMLTextAreaElement).value = course.syllabus ?? '';
    (document.getElementById('thumb-css-class') as HTMLSelectElement).value = course.thumbCssClass ?? 'thumb-fullcourse';
    (document.getElementById('thumb-badge') as HTMLInputElement).value = course.thumbBadge ?? '';
    (document.getElementById('thumb-badge-style') as HTMLSelectElement).value = course.thumbBadgeStyle ?? 'badge-pop';
    (document.getElementById('thumb-top-label') as HTMLInputElement).value = course.thumbTopLabel ?? '';
    (document.getElementById('thumb-main-heading') as HTMLInputElement).value = course.thumbMainHeading ?? '';
    (document.getElementById('thumb-sub-heading') as HTMLInputElement).value = course.thumbSubHeading ?? '';
    (document.getElementById('thumb-part-tags') as HTMLInputElement).value = course.thumbPartTags ?? '';
    (document.getElementById('thumb-bottom-caption') as HTMLInputElement).value = course.thumbBottomCaption ?? '';
    this.parseDescriptionToForm(course.description);

    document.getElementById('form-title')!.textContent = 'Edit Course';
    this.submitBtn.textContent = 'Update Course';
    this.cancelBtn.style.display = 'block';
    this.form.scrollIntoView({ behavior: 'smooth' });
    showToast(`Editing "${course.title}"`, 'info', 2000);
  }

  private cancelEdit(): void {
    this.editingCourseId = null;
    this.form.reset();
    (document.getElementById('thumb-css-class') as HTMLSelectElement).value = 'thumb-fullcourse';
    (document.getElementById('category') as HTMLSelectElement).value = 'Complete Package';
    (document.getElementById('thumb-badge-style') as HTMLSelectElement).value = 'badge-pop';
    (document.getElementById('description-heading') as HTMLInputElement).value = '';
    this.descriptionPointsContainer.innerHTML = '';
    this.ensureDescriptionPoints();
    document.getElementById('form-title')!.textContent = 'Create New Course';
    this.submitBtn.textContent = 'Create Course';
    this.cancelBtn.style.display = 'none';
  }
}

new AdminCoursesPage();
