import { onAuthChange } from './auth-service';
import { isAdmin, getCourses, getCourseVideos, createVideo, deleteVideo, Video } from './admin-service';
import { showToast, showConfirm } from './admin-toast';

class AdminVideosPage {
  private form: HTMLFormElement;
  private videosContainer: HTMLElement;
  private courseSelect: HTMLSelectElement;
  private submitBtn: HTMLButtonElement;

  constructor() {
    this.form = document.getElementById('video-form') as HTMLFormElement;
    this.videosContainer = document.getElementById('videos-container') as HTMLElement;
    this.courseSelect = document.getElementById('course-select') as HTMLSelectElement;
    this.submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
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

      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      await this.loadCourses();

      // Load videos for the first course initially if available
      this.courseSelect.addEventListener('change', () => this.loadVideos());
    }, true);
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const title = (document.getElementById('title') as HTMLInputElement).value;
    const url = (document.getElementById('video-url') as HTMLInputElement).value;
    const courseId = this.courseSelect.value;

    if (!courseId) {
      showToast('Please select a course', 'warning');
      return;
    }

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Adding...';

    const partId = (courseId === 'part1' || courseId === 'part2' || courseId === 'part3') ? courseId : undefined;
    const videoData = {
      title,
      url,
      courseId,
      partId
    };

    const result = await createVideo(videoData);

    if (result.success) {
      showToast('Video added successfully!', 'success');
      this.form.reset();
      await this.loadVideos();
    } else {
      showToast('Error: ' + result.error, 'error');
    }

    this.submitBtn.disabled = false;
    this.submitBtn.textContent = 'Add Video';
  }

  private async loadVideos(): Promise<void> {
    const courseId = this.courseSelect.value;
    if (!courseId) {
      this.videosContainer.innerHTML = '<p style="text-align: center; color: #64748B; padding: 2rem;">Select a course to view videos.</p>';
      return;
    }

    this.videosContainer.innerHTML = '<p style="text-align: center; color: #64748B; padding: 2rem;">Loading videos...</p>';
    const result = await getCourseVideos(courseId);

    if (result.success && result.videos) {
      if (result.videos.length === 0) {
        this.videosContainer.innerHTML = '<p style="text-align: center; color: #64748B; padding: 2rem;">No videos found for this course.</p>';
      } else {
        this.videosContainer.innerHTML = result.videos.map(video => this.renderVideoItem(video)).join('');
        this.attachEventListeners();
      }
    } else {
      this.videosContainer.innerHTML = '<p style="text-align: center; color: #EF4444; padding: 2rem;">Error loading videos.</p>';
    }
  }

  private renderVideoItem(video: Video): string {
    return `
      <div class="video-card">
        <div class="video-info">
          <h3>${video.title}</h3>
          <div class="video-meta">
            <div class="meta-item">
              <i data-lucide="link" width="14" height="14"></i>
              <a href="${video.url}" target="_blank" style="color: inherit; text-decoration: none;">View Link</a>
            </div>
          </div>
        </div>
        <button class="btn-icon delete delete-btn" data-id="${video.id}" title="Delete Video">
          <i data-lucide="trash-2" width="18" height="18"></i>
        </button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.deleteVideo(id);
      });
    });
  }

  private async deleteVideo(videoId: string): Promise<void> {
    const confirmed = await showConfirm('Delete Video?', 'This will permanently remove the video from this course.', 'Delete Video');
    if (!confirmed) return;

    const result = await deleteVideo(videoId);
    if (result.success) {
      showToast('Video deleted.', 'success');
      await this.loadVideos();
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

      this.courseSelect.innerHTML = '<option value="">Select a Course</option>' +
        displayCourses.map(course => `<option value="${course.id}">${course.title}</option>`).join('');
      
      // If there are courses, select the first one and load its videos
      if (displayCourses.length > 0) {
        this.courseSelect.selectedIndex = 1;
        await this.loadVideos();
      }
    }
  }
}

new AdminVideosPage();
