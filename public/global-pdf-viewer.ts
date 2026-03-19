import { getStorage, ref, getDownloadURL, getMetadata } from 'firebase/storage';
import { app } from '../firebase-config'; // Need standard firebase app init

/**
 * global-pdf-viewer.ts
 * Utterly secure, URL-masked, DOM-injected PDF Engine.
 * Intercepts all PDF links, drops into instant fullscreen, and renders on-canvas
 * while blocking all download/print/screenshot keyboard shortcuts.
 */

// 1. Listen for clicks on PDF links globally
document.addEventListener('click', async (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Skip interception if clicking the download button
    if (target.closest('.secure-download-btn') || target.closest('.dl-btn-container')) {
        return;
    }

    const a = target.closest('a');
    if (!a) return;

    const href = a.getAttribute('href') || a.href || '';
    if (!href) return;

    const isPdf = href.toLowerCase().includes('.pdf') || href.includes('firebasestorage.googleapis.com') || a.textContent?.toLowerCase().includes('.pdf');
    const hasViewerParam = href.includes('pdf-viewer.html');

    if (isPdf || hasViewerParam) {
        console.log('[PDF Viewer] Intercepting click for:', href);
        e.preventDefault();
        e.stopPropagation();

        let rawPdfUrl = href;
        if (hasViewerParam) {
            const params = new URLSearchParams(href.substring(href.indexOf('?')));
            rawPdfUrl = decodeURIComponent(params.get('url') || href);
        }

        // 2. MASK URL
        window.history.pushState({ pdfOpen: true }, '', window.location.pathname);

        // 3. BOOT IN-PAGE RENDERER
        bootSecurePdfViewer(rawPdfUrl).catch(err => {
            console.error('[PDF Viewer] Boot failed:', err);
        });
    }
}, true);


/* ── HARDWARE FULLSCREEN IGNITER ─────────────────────────────── */
// Fullscreen triggered natively on the container element
function triggerStrictFullscreen(element: HTMLElement) {
    try {
        const el = element as any;
        if (el.requestFullscreen) {
            el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
            el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
        }

        // iOS Safari Workaround
        let video = document.getElementById('ios-fullscreen-hack') as HTMLVideoElement;
        if (!video) {
            video = document.createElement('video');
            video.id = 'ios-fullscreen-hack';
            video.style.cssText = 'position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
            video.playsInline = true;
            document.body.appendChild(video);
        }
        if ((video as any).webkitEnterFullscreen) {
            (video as any).webkitEnterFullscreen();
        }
    } catch (e) {
        console.warn("Fullscreen API failed", e);
    }
}

/* ── APP-LOCKED DOWNLOAD MANAGER (Bridged to Injector) ────────── */
(window as any).FirebaseCacheManager = {
    // Fetches size using Firebase Metadata instead of HTTP HEAD
    async getFileSize(url: string): Promise<string | null> {
        let finalUrl = url;
        if (url.includes('pdf-viewer.html')) {
            const params = new URLSearchParams(url.substring(url.indexOf('?')));
            finalUrl = decodeURIComponent(params.get('url') || url);
        }

        if (!finalUrl.includes('firebasestorage.googleapis.com')) return null;
        try {
            const urlObj = new URL(finalUrl);
            const pathParts = urlObj.pathname.split('/o/');
            if (pathParts.length > 1) {
                const objectPath = decodeURIComponent(pathParts[1]);
                const storage = getStorage(app);
                const fileRef = ref(storage, objectPath);

                const meta = await getMetadata(fileRef);
                const bytes = meta.size;

                if (bytes >= 1024 * 1024) {
                    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
                }
                return Math.round(bytes / 1024) + 'KB';
            }
        } catch (e) {
            console.warn("Failed to get Firebase metadata for size", e);
        }
        return null; // Fallback
    },

    /**
     * Extracts the object path from a Firebase Storage URL and fetches a fresh download URL.
     * Prevents "400 Unexpected Server Response" when tokens expire after an hour.
     */
    async refreshFirebaseUrl(url: string): Promise<string> {
        if (!url || !url.includes('firebasestorage.googleapis.com')) return url;
        
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/o/');
            if (pathParts.length > 1) {
                const objectPath = decodeURIComponent(pathParts[1]);
                const storage = getStorage(app);
                const fileRef = ref(storage, objectPath);
                const freshUrl = await getDownloadURL(fileRef);
                console.log('[PDF Viewer] Injected URL refresh successful');
                return freshUrl;
            }
        } catch (e) {
            console.warn('[PDF Viewer] URL refresh failed, using original', e);
        }
        return url;
    },

    // Secures a fresh token, downloads via Stream, and locks in CacheAPI
    async downloadPdfSafely(btnElement: HTMLElement, pdfUrl: string, pdfName: string) {
        if (!pdfUrl) return;
        const originalText = btnElement.innerHTML;
        try {
            (btnElement as HTMLButtonElement).disabled = true;
            btnElement.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
            btnElement.style.animation = 'spin 1s linear infinite';
            btnElement.style.background = 'rgba(148, 163, 184, 0.15)';
            btnElement.style.color = '#94a3b8';

            // Extract the true absolute URL if it's hidden inside legacy routing params
            let finalUrlToFetch = pdfUrl;
            if (pdfUrl.includes('pdf-viewer.html')) {
                const params = new URLSearchParams(pdfUrl.substring(pdfUrl.indexOf('?')));
                finalUrlToFetch = decodeURIComponent(params.get('url') || pdfUrl);
            }

            // 1. Bypass Expired Tokens (400 Error Prevention)
            finalUrlToFetch = await (window as any).FirebaseCacheManager.refreshFirebaseUrl(finalUrlToFetch);

            // Fire global toast
            if ((window as any).showToast) (window as any).showToast(`Downloading ${pdfName}...`, 'info');

            const response = await fetch(finalUrlToFetch, { mode: 'cors' });
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);

            // Use ReadableStream to track progress
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            let loaded = 0;

            const reader = response.body?.getReader();
            if (!reader) throw new Error("Could not read response body");

            const chunks: Uint8Array[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    chunks.push(value);
                    loaded += value.length;
                    if (total > 0) {
                        const percent = Math.round((loaded / total) * 100);
                        // Visually fill the button itself like a radial pie chart / progress ring
                        btnElement.innerHTML = `<span style="font-size:11px; font-weight:700;">${percent}%</span>`;
                        btnElement.style.background = `rgba(180, 83, 9, 0.2)`;
                        btnElement.style.color = '#fff';
                        btnElement.style.border = '1px solid rgba(180, 83, 9, 0.4)';
                    } else {
                        btnElement.style.animation = 'spin 1.5s linear infinite';
                    }
                }
            }

            // Combine chunks into single Blob and prepare Cache Request
            const blob = new Blob(chunks as any, { type: 'application/pdf' });
            const cacheResponse = new Response(blob);

            // 3. Persist natively inside browser Cache API (App-Locked)
            const cache = await caches.open('jkssb-pdf-cache-v1');

            // Clean URL for cache key (strip token)
            const cacheUrlArr = finalUrlToFetch.split('?');
            const cleanCacheUrl = cacheUrlArr[0].includes('firebasestorage')
                ? cacheUrlArr.join('?') // keep token for firebase backwards compat
                : cacheUrlArr[0];

            await cache.put(cleanCacheUrl, cacheResponse);

            // 4. Set 30-Day Expiry Timebomb
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            const expiry = Date.now() + thirtyDaysMs;

            const downloadsStr = localStorage.getItem('jkssb_downloads');
            const downloads = downloadsStr ? JSON.parse(downloadsStr) : {};

            downloads[cleanCacheUrl] = { name: pdfName, expiresAt: expiry };
            localStorage.setItem('jkssb_downloads', JSON.stringify(downloads));

            // 5. Update UI state permanently 
            btnElement.style.animation = 'none';
            btnElement.style.border = 'none';
            btnElement.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            btnElement.style.background = 'rgba(16, 185, 129, 0.15)'; // Faint green
            btnElement.style.color = '#10b981';
            btnElement.style.cursor = 'default';
            (btnElement as HTMLButtonElement).disabled = true;

            if ((window as any).showToast) {
                (window as any).showToast('Downloaded successfully ✓', 'success');
            }

        } catch (e) {
            console.error('Download failed', e);
            if ((window as any).showToast) (window as any).showToast('Download failed. Try again.', 'error');

            btnElement.style.animation = 'none';
            btnElement.style.border = 'none';
            btnElement.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
            btnElement.style.background = 'rgba(239, 68, 68, 0.15)';
            btnElement.style.color = '#ef4444';

            setTimeout(() => {
                (btnElement as HTMLButtonElement).disabled = false;
                btnElement.innerHTML = originalText;
                btnElement.style.background = 'var(--gradient-primary, #e07b2a)';
                btnElement.style.color = '#fff';
            }, 3000);
        }
    }
};


/* ── RENDER ENGINE & SECURITY LOCKDOWN ───────────────────────── */
async function bootSecurePdfViewer(pdfUrl: string) {
    if (document.getElementById('secure-pdf-master')) return; // Already running

    // 1. INJECT DOM OVERLAY
    const master = document.createElement('div');
    master.id = 'secure-pdf-master';
    Object.assign(master.style, {
        position: 'fixed',
        inset: 0,
        background: '#111',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Poppins, sans-serif'
    });

    // 1. Initial Loading State
    const loader = document.createElement('div');
    loader.id = 'pdf-global-loader';
    loader.innerHTML = `
        <div class="pdf-spinner"></div>
        <style>
            .pdf-spinner {
                width: 32px;
                height: 32px;
                border: 2px solid rgba(255,255,255,0.1);
                border-top-color: #fbbf24;
                border-radius: 50%;
                animation: pdf-spin 0.6s linear infinite;
            }
            @keyframes pdf-spin { to { transform: rotate(360deg); } }
        </style>
    `;
    master.appendChild(loader);
    
    // 1.1 Create the actual scrollable canvas container
    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdf-canvas-container';
    Object.assign(pdfContainer.style, {
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        overflowAnchor: 'none',
        display: 'none', // Hidden until first page renders
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        webkitOverflowScrolling: 'touch'
    });
    master.appendChild(pdfContainer);

    document.body.appendChild(master);

    // Add anti-screenshot / security blocker class (uses CSS filters conceptually)
    master.className = 'strict-security-blur';

    // 2. FLOATING EXIT BUTTON
    const exitBtn = document.createElement('button');
    exitBtn.innerHTML = 'Exit Viewer';
    exitBtn.style.cssText = `
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483648;
        background: rgba(15, 23, 42, 0.85);
        color: white;
        border: 1px solid rgba(255,255,255,0.2);
        padding: 8px 16px;
        border-radius: 20px;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(4px);
    `;
    master.appendChild(exitBtn);

    // Auto-hide logic
    let hideTimer: any;
    const resetTimer = () => {
        exitBtn.style.opacity = '1';
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            exitBtn.style.opacity = '0';
        }, 3000);
    };
    master.addEventListener('pointerdown', resetTimer);
    master.addEventListener('touchstart', resetTimer);
    
    /**
     * Robust Security: Block context menu, selection, and common shortcuts
     */
    function initSecurity() {
        // 1. Prevent Right-Click & Text Selection
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('selectstart', e => e.preventDefault());
        document.addEventListener('copy', e => e.preventDefault());
        
        // 2. Prevent Keyboard Shortcuts
        document.addEventListener('keydown', e => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
            
            // Block: Print (Ctrl+P), Save (Ctrl+S), Inspect (F12, Ctrl+Shift+I), Source (Ctrl+U), Copy (Ctrl+C), Select All (Ctrl+A)
            if (
                (cmdOrCtrl && ['p', 's', 'u', 'i', 'j', 'c', 'a'].includes(e.key.toLowerCase())) ||
                e.key === 'F12' ||
                e.key === 'PrintScreen' ||
                (e.shiftKey && cmdOrCtrl && ['i', 'j', 'c'].includes(e.key.toUpperCase()))
            ) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, true);

        // 3. Blur on Focus Loss (Anti-screenshot heuristic)
        window.addEventListener('blur', () => master.style.filter = 'blur(15px)');
        window.addEventListener('focus', () => master.style.filter = 'none');
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') master.style.filter = 'blur(15px)';
            else master.style.filter = 'none';
        });

        // 4. Disable CSS Selection
        document.body.style.userSelect = 'none';
        (document.body.style as any).webkitUserSelect = 'none';
    }

    initSecurity();
    resetTimer();

    document.body.appendChild(master);

    // --- ZOOM LOGIC ---
    let currentZoom = 1;
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 3;

    const zoomControls = document.createElement('div');
    zoomControls.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483648;
        display: flex;
        gap: 8px;
        background: rgba(15, 23, 42, 0.85);
        padding: 6px 10px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(4px);
    `;

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.style.cssText = `
        background: transparent;
        color: white;
        border: none;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border-radius: 50%;
    `;

    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.style.cssText = zoomOutBtn.style.cssText;

    zoomOutBtn.disabled = true;
    zoomOutBtn.style.opacity = '0.5';

    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(zoomInBtn);
    master.appendChild(zoomControls);

    const updateZoom = () => {
        if (currentZoom < MIN_ZOOM) currentZoom = MIN_ZOOM;
        if (currentZoom > MAX_ZOOM) currentZoom = MAX_ZOOM;

        const container = master.querySelector('#pdf-canvas-container');
        if (!container) return;
        const wraps = container.querySelectorAll('.pdf-page-wrap');
        wraps.forEach((wrap: any) => {
            const baseW = wrap.dataset.baseWidth;
            const baseH = wrap.dataset.baseHeight;
            if (baseW && baseH) {
                const newW = parseFloat(baseW) * currentZoom;
                const newH = parseFloat(baseH) * currentZoom;
                wrap.style.width = `${newW}px`;
                wrap.style.height = `${newH}px`;
                const canvas = wrap.querySelector('canvas');
                if (canvas) {
                    canvas.style.width = `${newW}px`;
                    canvas.style.height = `${newH}px`;
                }
            }
        });

        zoomOutBtn.disabled = currentZoom <= MIN_ZOOM;
        zoomOutBtn.style.opacity = currentZoom <= MIN_ZOOM ? '0.5' : '1';
        zoomInBtn.disabled = currentZoom >= MAX_ZOOM;
        zoomInBtn.style.opacity = currentZoom >= MAX_ZOOM ? '0.5' : '1';
    };

    zoomOutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentZoom -= 0.5;
        updateZoom();
    });

    zoomInBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentZoom += 0.5;
        updateZoom();
    });

    master.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomAmount = e.deltaY * -0.01;
            currentZoom += zoomAmount;
            updateZoom();
        }
    }, { passive: false });

    master.addEventListener('dblclick', () => {
        currentZoom = 1;
        updateZoom();
    });

    let initialPinchDistance = -1;
    let initialZoom = 1;
    let lastTap = 0;

    master.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialZoom = currentZoom;
        }
    });

    master.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (initialPinchDistance > 0) {
                const scale = currentDistance / initialPinchDistance;
                let targetZoom = initialZoom * scale;
                if (targetZoom < MIN_ZOOM) {
                    targetZoom = MIN_ZOOM;
                    initialPinchDistance = currentDistance;
                    initialZoom = MIN_ZOOM;
                } else if (targetZoom > MAX_ZOOM) {
                    targetZoom = MAX_ZOOM;
                    initialPinchDistance = currentDistance;
                    initialZoom = MAX_ZOOM;
                }
                currentZoom = targetZoom;
                updateZoom();
            }
        }
    }, { passive: false });

    master.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialPinchDistance = -1;
        }

        if (e.changedTouches.length === 1) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 500 && tapLength > 0) {
                currentZoom = 1;
                updateZoom();
                e.preventDefault();
            }
            lastTap = currentTime;
        }
    });
    // --- END ZOOM LOGIC ---

    // TRIGGER FULLSCREEN IMMEDIATELY AFTER MOUNT
    triggerStrictFullscreen(master);

    // Exit Button Logic
    exitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        safelyDestroyViewer();
    });

    // 3. APPLY SECURITY LISTENERS
    applySecurityLockdown();

    try {
        // 4. LOAD PDF.js
        await loadPdfJsIntoMemory();

        // 5. RENDER PDF (Memory/Cache Aware)
        // REFRESH TOKEN TO PREVENT 400 ERROR
        const freshUrl = await (window as any).FirebaseCacheManager.refreshFirebaseUrl(pdfUrl);
        
        console.log('PDF: Starting load task for', freshUrl);
        const loadingTask = (window as any).pdfjsLib.getDocument({ 
            url: freshUrl,
            withCredentials: false
        });
        
        // Silent loading (max speed)
        loadingTask.onProgress = null;
        const pdfDoc = await loadingTask.promise;
        
        const pageTemp = await pdfDoc.getPage(1);
        const viewportTemp = pageTemp.getViewport({ scale: 1.0 });
        
        const containerWidth = window.innerWidth - 32;
        const fitScale = containerWidth / viewportTemp.width;
        currentZoom = fitScale < 0.8 ? fitScale : 1.0;
        
        // RENDER FIRST PAGE BEFORE HIDING LOADER
        await renderPdfToCanvasList(pdfDoc, pdfContainer, currentZoom, loader);
        
        // Now safely show container
        pdfContainer.style.display = 'flex';
        loader.style.display = 'none';

    } catch (err: any) {
        console.error('[PDF Viewer] Global Error:', err);
        loader.innerHTML = `
            <div style="color:#ef4444; padding:20px; text-align:center;">
                <p style="font-weight:600;">Unable to open document</p>
                <p style="font-size:12px; opacity:0.8;">${err.message || 'Unknown Error'}</p>
                <button onclick="location.reload()" style="margin-top:10px; background:#444; color:white; border:none; padding:5px 15px; border-radius:4px;">Retry</button>
            </div>
        `;
    }
}


/* ── DESTRUCTION ROUTINE ──────────────────────────────────────── */
function safelyDestroyViewer() {
    const master = document.getElementById('secure-pdf-master');
    if (master) {
        master.innerHTML = '';
        master.remove();
    }

    // Clean up hardware fullscreen
    try {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
        }
    } catch (e) { }

    // Clean up History state if we popped it
    if (window.history.state?.pdfOpen) {
        window.history.back(); // Undo the pushState
    }

    removeSecurityLockdown();
}

// Ensure destruction on browser BACK button
window.addEventListener('popstate', (e) => {
    if (document.getElementById('secure-pdf-master')) {
        safelyDestroyViewer();
    }
});

// Ensure destruction if Fullscreen is forced-closed (e.g. Escape key)
document.addEventListener('fullscreenchange', handleFsChange);
document.addEventListener('webkitfullscreenchange', handleFsChange);
document.addEventListener('mozfullscreenchange', handleFsChange);
document.addEventListener('MSFullscreenChange', handleFsChange);

function handleFsChange() {
    const doc = document as any;
    const isFs = doc.fullscreenElement || doc.webkitIsFullScreen || doc.mozFullScreen || doc.msFullscreenElement;
    if (!isFs && document.getElementById('secure-pdf-master')) {
        safelyDestroyViewer();
    }
}


/* ── STRICT KEYBOARD & MOUSE LOCKDOWN ────────────────────────── */
const securityInterceptor = (e: KeyboardEvent | MouseEvent) => {
    // Block Right Click
    if (e.type === 'contextmenu') {
        e.preventDefault();
        return false;
    }
    // Block specific keystrokes
    if (e.type === 'keydown') {
        const k = e as KeyboardEvent;
        // Block screenshots & printing & dev tools
        if (
            k.key === 'PrintScreen' ||
            k.code === 'PrintScreen' ||
            (k.ctrlKey && ['p', 's', 'c', 'a'].includes(k.key.toLowerCase())) ||
            (k.metaKey && ['p', 's', 'c', 'a'].includes(k.key.toLowerCase())) ||
            k.key === 'F12' ||
            (k.ctrlKey && k.shiftKey && k.key.toLowerCase() === 'i')
        ) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
};

const blockDrag = (e: DragEvent) => e.preventDefault();

function applySecurityLockdown() {
    window.addEventListener('contextmenu', securityInterceptor, { capture: true });
    window.addEventListener('keydown', securityInterceptor as EventListener, { capture: true });
    window.addEventListener('dragstart', blockDrag, { capture: true });
    window.addEventListener('drop', blockDrag, { capture: true });
}

function removeSecurityLockdown() {
    window.removeEventListener('contextmenu', securityInterceptor, { capture: true });
    window.removeEventListener('keydown', securityInterceptor as EventListener, { capture: true });
    window.removeEventListener('dragstart', blockDrag, { capture: true });
    window.removeEventListener('drop', blockDrag, { capture: true });
}


/* ── PDF.JS RENDER PIPELINE ───────────────────────────────────── */
async function loadPdfJsIntoMemory(): Promise<void> {
    if ((window as any).pdfjsLib) return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            const pdfjsLib = (window as any).pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
        };
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

// We load the PDF fully into Canvas nodes.
async function renderPdfToCanvasList(pdfDoc: any, container: HTMLElement, initialScale: number, loaderToHide?: HTMLElement) {
    try {
        // Clear container just in case
        container.innerHTML = '';

        // Check if watermark already exists on first page to prevent "double watermark"
        let alreadyHasWatermark = false;
        try {
            const firstPage = await pdfDoc.getPage(1);
            const textContent = await firstPage.getTextContent();
            const textString = textContent.items.map((item: any) => item.str).join(' ');
            if (textString.includes('JKSSB Drivers Academy')) {
                alreadyHasWatermark = true;
                console.log('PDF: Existing watermark detected. Skipping redundant overlay.');
            }
        } catch (we) {
            console.warn('PDF: Could not analyze text layer for watermark.', we);
        }

        // 3. Render all pages to canvases sequentially so you can scroll smoothly
        const totalPages = pdfDoc.numPages;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.0);

        // Pre-create all page wrappers to stabilize scrollbar and prevent "auto-scroll" jumps
        const wrappers: HTMLElement[] = [];
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: initialScale });

            const wrap = document.createElement('div');
            wrap.className = 'pdf-page-wrap';
            wrap.id = `pdf-page-${i}`;
            wrap.dataset.baseWidth = viewport.width.toString();
            wrap.dataset.baseHeight = viewport.height.toString();
            wrap.style.cssText = `
                position: relative;
                width: ${viewport.width}px;
                height: ${viewport.height}px;
                flex-shrink: 0;
                margin-bottom: 12px;
                background: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                border-radius: 4px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            // Add a subtle loader per page
            wrap.innerHTML = `<div class="p-loader" style="width:20px; height:20px; border:2px solid #333; border-top-color:#ff6b00; border-radius:50%; animation:spin 0.8s linear infinite;"></div>`;
            
            container.appendChild(wrap);
            wrappers.push(wrap);
        }

        // Now show container immediately
        if (loaderToHide) loaderToHide.style.display = 'none';
        container.style.display = 'flex';

        // 4. Use IntersectionObserver to render pages only when needed
        const observerOptions = {
            root: container,
            rootMargin: '600px', // Pre-render pages before they enter view
            threshold: 0.01
        };

        const renderPage = async (pageIdx: number, wrap: HTMLElement) => {
            if (wrap.dataset.rendered === 'true') return;
            wrap.dataset.rendered = 'true';
            
            const page = await pdfDoc.getPage(pageIdx);
            const viewport = page.getViewport({ scale: initialScale });
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { alpha: false })!;
            
            canvas.width = viewport.width * pixelRatio;
            canvas.height = viewport.height * pixelRatio;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            canvas.style.display = 'block';
            ctx.scale(pixelRatio, pixelRatio);
            
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            // DRAW DIAGONAL WATERMARK AFTER PDF RENDERS (Only if not already present)
            if (!alreadyHasWatermark) {
                ctx.save();
                ctx.translate(viewport.width / 2, viewport.height / 2);
                ctx.rotate(-45 * Math.PI / 180);
                ctx.font = `bold ${Math.max(16, viewport.width / 12)}px Poppins, Arial`;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('JKSSB Drivers Academy', 0, 0);
                ctx.restore();
            }

            wrap.innerHTML = '';
            wrap.appendChild(canvas);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = wrappers.indexOf(entry.target as HTMLElement) + 1;
                    renderPage(idx, entry.target as HTMLElement);
                }
            });
        }, observerOptions);

        wrappers.forEach(w => observer.observe(w));

    } catch (e: any) {
        console.error('PDF Render Error', e);
        const errDesc = e?.message || e?.name || String(e);
        container.innerHTML = `
            <div style="color:#ef4444; margin-top:30vh; font-family:Poppins; text-align:center; padding: 0 20px;">
                <h3>Failed to load document</h3>
                <p style="font-size: 13px; opacity: 0.8; word-break: break-all;">Error Details: ${errDesc}</p>
                <p style="font-size: 12px; margin-top:20px;">(If this says "Network response was not ok" or "Failed to fetch", your Firebase Storage bucket is actively blocking this website. You must apply the CORS rules in Google Cloud Shell).</p>
            </div>
        `;
    }
}

// Auto-boot if accessed directly as a standalone page (e.g. opened in new tab)
if (window.location.pathname.includes('pdf-viewer.html')) {
    const params = new URLSearchParams(window.location.search);
    const rawUrl = params.get('url');
    if (rawUrl) {
        // Boot automatically as soon as the DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => bootSecurePdfViewer(rawUrl));
        } else {
            bootSecurePdfViewer(rawUrl);
        }
    }
}
