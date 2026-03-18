declare const Plyr: any;

export class VideoPlayer {
  private static instance: VideoPlayer;
  private overlay: HTMLElement;
  private player: any;
  private currentUrl: string = '';

  private constructor() {
    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);
    this.initPlyr();
  }

  public static getInstance(): VideoPlayer {
    if (!VideoPlayer.instance) {
      VideoPlayer.instance = new VideoPlayer();
    }
    return VideoPlayer.instance;
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'vplayer-overlay';
    overlay.innerHTML = `
      <div class="vplayer-container">
        <button class="vplayer-close" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="vplayer-body">
          <div id="player-container"></div>
        </div>
      </div>
    `;

    overlay.querySelector('.vplayer-close')?.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    return overlay;
  }

  private initPlyr(): void {
    // We'll initialize/re-initialize when opening to handle different sources
  }

  public open(url: string, title?: string): void {
    if (this.currentUrl === url && this.overlay.classList.contains('active')) return;
    
    this.currentUrl = url;
    const container = this.overlay.querySelector('#player-container');
    if (!container) return;

    // Clear existing player
    if (this.player) {
      this.player.destroy();
    }
    container.innerHTML = '';

    // Determine source type
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isVimeo = url.includes('vimeo.com');

    if (isYouTube) {
        const videoId = this.extractYouTubeId(url);
        container.innerHTML = `<div class="plyr__video-embed"><iframe src="https://www.youtube.com/embed/${videoId}?origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1&vq=hd1080&controls=0" allowfullscreen allowtransparency allow="autoplay"></iframe></div>`;
    } else if (isVimeo) {
        const videoId = this.extractVimeoId(url);
        container.innerHTML = `<div class="plyr__video-embed"><iframe src="https://player.vimeo.com/video/${videoId}?loop=false&byline=false&portrait=false&title=false&speed=true&transparent=0&gesture=media" allowfullscreen allowtransparency allow="autoplay"></iframe></div>`;
    } else {
        // Direct MP4 or similar
        container.innerHTML = `<video playsinline controls crossorigin><source src="${url}" type="video/mp4"></video>`;
    }

    this.player = new Plyr(container.firstElementChild, {
        autoplay: true,
        muted: false,
        invertTime: false,
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
        quality: { default: 1080, options: [4320, 2880, 2160, 1440, 1080, 720, 540, 480, 360, 240] },
        fullscreen: { enabled: true, fallback: true, iosNative: true },
        youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
    });

    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Handle history to support "Back" button closing the player
    window.history.pushState({ videoPlayerOpen: true }, '');
    const handlePopState = (e: PopStateEvent) => {
        if (!e.state || !e.state.videoPlayerOpen) {
            this.close(false); // Close without pushing state again
            window.removeEventListener('popstate', handlePopState);
        }
    };
    window.addEventListener('popstate', handlePopState);
  }

  public close(shouldPopState: boolean = true): void {
    if (this.player) {
      this.player.stop();
    }
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // If we closed via the UI button, we should pop the state to keep history clean
    if (shouldPopState && window.history.state?.videoPlayerOpen) {
        window.history.back();
    }
  }

  private extractYouTubeId(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  }

  private extractVimeoId(url: string): string {
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[1] : '';
  }
}
