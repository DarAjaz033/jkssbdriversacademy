import"./firebase-config-k64TBo1P.js";/* empty css               */import"./global-pdf-viewer-Ch1F8G3Z.js";import{o as z}from"./auth-service-R8_UVxkw.js";import{f as E,g as L,a as T,b as k,c as C}from"./admin-service-CpAm8p6-.js";class v{constructor(){this.currentUrl="",this.overlay=this.createOverlay(),document.body.appendChild(this.overlay),this.initPlyr()}static getInstance(){return v.instance||(v.instance=new v),v.instance}createOverlay(){const e=document.createElement("div");return e.className="vplayer-overlay",e.innerHTML=`
      <div class="vplayer-container">
        <button class="vplayer-close" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="vplayer-body">
          <div id="player-container"></div>
        </div>
      </div>
    `,e.querySelector(".vplayer-close")?.addEventListener("click",()=>this.close()),e.addEventListener("click",o=>{o.target===e&&this.close()}),e}initPlyr(){}open(e,o){if(this.currentUrl===e&&this.overlay.classList.contains("active"))return;this.currentUrl=e;const t=this.overlay.querySelector("#player-container");if(!t)return;this.player&&this.player.destroy(),t.innerHTML="";const s=e.includes("youtube.com")||e.includes("youtu.be"),c=e.includes("vimeo.com");if(s){const l=this.extractYouTubeId(e);t.innerHTML=`<div class="plyr__video-embed"><iframe src="https://www.youtube.com/embed/${l}?origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1&vq=hd1080&controls=0" allowfullscreen allowtransparency allow="autoplay"></iframe></div>`}else if(c){const l=this.extractVimeoId(e);t.innerHTML=`<div class="plyr__video-embed"><iframe src="https://player.vimeo.com/video/${l}?loop=false&byline=false&portrait=false&title=false&speed=true&transparent=0&gesture=media" allowfullscreen allowtransparency allow="autoplay"></iframe></div>`}else t.innerHTML=`<video playsinline controls crossorigin><source src="${e}" type="video/mp4"></video>`;this.player=new Plyr(t.firstElementChild,{autoplay:!0,muted:!1,invertTime:!1,controls:["play-large","play","progress","current-time","mute","volume","fullscreen"],quality:{default:1080,options:[4320,2880,2160,1440,1080,720,540,480,360,240]},fullscreen:{enabled:!0,fallback:!0,iosNative:!0},youtube:{noCookie:!0,rel:0,showinfo:0,iv_load_policy:3,modestbranding:1}}),this.overlay.classList.add("active"),document.body.style.overflow="hidden",window.history.pushState({videoPlayerOpen:!0},"");const a=l=>{(!l.state||!l.state.videoPlayerOpen)&&(this.close(!1),window.removeEventListener("popstate",a))};window.addEventListener("popstate",a)}close(e=!0){this.player&&this.player.stop(),this.overlay.classList.remove("active"),document.body.style.overflow="",e&&window.history.state?.videoPlayerOpen&&window.history.back()}extractYouTubeId(e){const o=/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,t=e.match(o);return t&&t[2].length===11?t[2]:""}extractVimeoId(e){const o=/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/,t=e.match(o);return t?t[1]:""}}let j=0;function y(){return++j}class S{constructor(){this.coursesContainer=document.querySelector("#courses-content"),this.injectStyles(),this.init()}injectStyles(){if(document.getElementById("mc-styles"))return;const e=document.createElement("style");e.id="mc-styles",e.textContent=`
      #courses-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 14px 13px 30px;
        background: transparent;
      }
      .mc-wrapper {
        position: relative;
        width: 100%;
        overflow-x: hidden;
      }
      .mc-courses-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .mc-courses-list.hidden {
        transform: translateX(-50%);
        opacity: 0;
        pointer-events: none;
        position: absolute;
        width: 100%;
      }
      .mc-card {
        border-radius: 20px;
        overflow: hidden;
        box-shadow: var(--shadow-lg);
        animation: mcUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        background: var(--bg-card);
        border: 1px solid var(--border);
      }
      @keyframes mcUp {
        from { opacity:0; transform:translateY(20px) scale(0.96); }
        to   { opacity:1; transform:translateY(0)    scale(1); }
      }
      .mc-face {
        position: relative;
        min-height: 175px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 16px 13px 14px;
        overflow: hidden;
        background: var(--gradient-hero, linear-gradient(135deg, #B45309 0%, #D97706 50%, #EA580C 100%));
      }
      .mc-face::before {
        content:''; position:absolute; width:120px; height:120px; border-radius:50%;
        background:rgba(255,255,255,0.07); top:-40px; right:-30px; pointer-events:none;
      }
      .mc-face::after {
        content:''; position:absolute; width:75px; height:75px; border-radius:50%;
        background:rgba(255,255,255,0.08); bottom:-18px; left:-18px; pointer-events:none;
      }
      .mc-enrolled {
        position: absolute; top: 10px; right: 10px; z-index: 2; font-size: 9px; font-weight: 700;
        letter-spacing: 0.4px; color: #fff; background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.35); border-radius: 99px; padding: 2px 8px; backdrop-filter: blur(6px);
      }
      .mc-icon {
        width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.18);
        border: 1.5px solid rgba(255,255,255,0.28); display: flex; align-items: center; justify-content: center;
        color: #fff; flex-shrink: 0; position: relative; z-index: 1; margin-bottom: 8px; backdrop-filter: blur(4px);
      }
      .mc-title {
        font-size: 13.5px; font-weight: 700; color: #fff; line-height: 1.38;
        text-shadow: 0 1px 4px rgba(0,0,0,0.2); margin: 0 0 13px; position: relative; z-index: 1;
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
      }
      .mc-btns {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px; position: relative; z-index: 1; margin-top: auto;
      }
      .mc-btn {
        display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1.5px solid rgba(255,255,255,0.25);
        border-radius: 12px; background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); color: #fff;
        font-family: 'Poppins', system-ui, sans-serif; font-size: 11.5px; font-weight: 600; cursor: pointer;
        transition: background .18s, border-color .18s, transform .13s; -webkit-tap-highlight-color: transparent;
        user-select: none; width: 100%;
      }
      .mc-btn:hover  { background:rgba(255,255,255,0.22); border-color:rgba(255,255,255,0.5); }
      .mc-btn:active { transform:scale(0.95); }
      .mc-btn-icon-pdf { width: 22px; height: 22px; background: #ef4444; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 5px rgba(239,68,68,0.3); }
      .mc-btn-icon-quiz { width: 22px; height: 22px; background: #22c55e; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 5px rgba(34,197,94,0.3); }
      .mc-btn-icon-video { width: 22px; height: 22px; background: #f97316; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 5px rgba(249,115,22,0.3); }
      .mc-btn-lbl { flex:1; text-align: left; }
      .mc-chev { margin-left:auto; flex-shrink:0; transition:transform .24s; }
      .mc-content-view {
        position: absolute; top: 0; left: 0; right: 0; background: transparent; transform: translateX(100%);
        opacity: 0; visibility: hidden; transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s;
        z-index: 10; min-height: 400px;
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
      .mc-item {
        display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: var(--bg-card);
        border: 1px solid var(--border); text-decoration: none; color: var(--text-primary); font-size: 12px;
        font-weight: 500; transition: background .14s, border-color .14s, transform .14s; box-shadow: var(--shadow-sm);
        line-height: 1.4; margin-bottom: 10px;
      }
      .mc-item:hover { background: var(--bg-app); border-color: var(--primary); transform: translateX(2px); }
      .mc-ico-pdf { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; background: linear-gradient(135deg, #fee2e2, #ef4444); display: flex; align-items: center; justify-content: center; color: #fff; }
      .mc-ico-quiz { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; background: linear-gradient(135deg, #dcfce7, #22c55e); display: flex; align-items: center; justify-content: center; color: #fff; }
      .mc-ico-video { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; background: linear-gradient(135deg, #ffedd5, #f97316); display: flex; align-items: center; justify-content: center; color: #fff; }
      .mc-item-txt { flex: 1; word-break: break-word; }
      .mc-item-badge { font-size: 10px; color: #fff; background: var(--primary); padding: 2px 8px; border-radius: 99px; font-weight: 600; flex-shrink: 0; white-space: nowrap; }
      .mc-none { text-align: center; color: var(--text-tertiary); font-size: 13px; padding: 24px 0; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border); }
      .mc-full { width: 100%; }
      .mc-tabs { display: flex; gap: 8px; margin-bottom: 16px; background: var(--bg-app); padding: 5px; border-radius: 12px; border: 1px solid var(--border); }
      .mc-tab { flex: 1; padding: 8px; border: none; background: transparent; color: var(--text-secondary); font-size: 11px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
      .mc-tab.active { background: var(--bg-card); color: var(--primary); box-shadow: var(--shadow-sm); }
      .mc-tab-content { display: none; }
      .mc-tab-content.active { display: block; }

      .mc-part-badge {
        font-size: 10px; font-weight: 800; text-transform: uppercase; color: rgba(255,255,255,0.9);
        background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; margin-right: 6px;
      }

      /* Minimal Theme Overrides */
      [data-theme="minimal"] .mc-face {
        background: #ffffff !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      [data-theme="minimal"] .mc-title,
      [data-theme="minimal"] .mc-enrolled,
      [data-theme="minimal"] .mc-icon,
      [data-theme="minimal"] .mc-btn {
        color: #000000 !important;
      }
      [data-theme="minimal"] .mc-title { text-shadow: none !important; }
      [data-theme="minimal"] .mc-enrolled {
        background: #f3f4f6 !important;
        border-color: #000000 !important;
      }
      [data-theme="minimal"] .mc-icon {
        background: #f3f4f6 !important;
        border-color: #000000 !important;
      }
      [data-theme="minimal"] .mc-btn {
        background: #ffffff !important;
        border-color: #000000 !important;
      }
      [data-theme="minimal"] .mc-btn:hover {
        background: #000000 !important;
        color: #ffffff !important;
      }
      [data-theme="minimal"] .mc-face::before,
      [data-theme="minimal"] .mc-face::after {
        display: none !important;
      }
      [data-theme="minimal"] .mc-part-badge {
        background: #000000 !important;
        color: #ffffff !important;
      }
      [data-theme="minimal"] .mc-item-badge {
        background: #000000 !important;
        color: #ffffff !important;
      }
      [data-theme="minimal"] .mc-item-txt {
        color: #000000 !important;
        font-weight: 600 !important;
      }

      /* Revoked Card Theme Support */
      .mc-card.revoked .mc-face {
        background: var(--bg-card) !important;
        border: 1px solid #ef4444 !important;
      }
      .mc-card.revoked .mc-title {
        color: var(--text-primary) !important;
        text-shadow: none !important;
      }
      .mc-card.revoked p {
        color: #ef4444 !important;
      }
    `,document.head.appendChild(e)}async init(){z(async e=>{e?await this.loadEnrolledCourses(e.uid):this.showEmptyState("Sign In Required","Please sign in to view your enrolled courses.","Go to Home","./index.html")},!0)}async loadEnrolledCourses(e){this.coursesContainer.innerHTML=`
      <div class="skeleton-card" style="margin-bottom: var(--spacing-md);"><div class="skeleton skeleton-img"></div><div style="padding-top:12px;"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div></div>
    `;const o=await E(e),t=o.success?o.enrolledIds:[],s=o.success?o.revokedIds:[],c=await L(),a=c.success&&"courses"in c&&c.courses?c.courses:[];if(t.length===0&&s.length===0){this.showEmptyState("No Courses Found","You have no active enrolled courses at the moment.","Browse Courses","./course-details.html");return}const l=t.includes("full_course"),n=["part1","part2","part3"],m=a.filter(i=>!(!i.id||!t.includes(i.id)||l&&n.includes(i.id))),h=a.filter(i=>!(!i.id||!s.includes(i.id)||t.includes(i.id)));if(m.length===0&&h.length===0){this.showEmptyState("No Courses Found","No courses found in your account.","Browse Courses","./course-details.html");return}const d=await T(),f=d.success&&d.pdfs?d.pdfs:[],p=[],r=[];for(const i of m)if(i.id==="full_course"||i.id==="FullCourse"||i.title.toLowerCase().includes("full course")){const g=await this.buildFullCourseCard(i,f);p.push(g.card),r.push(g.views)}else{const g=f.filter(u=>i.pdfIds&&i.pdfIds.includes(u.id)||u.courseId===i.id),b=await k(i.id),I=b.success&&b.tests?b.tests.filter(u=>u.courseId===i.id||u.partId===i.id):[],x=await C(i.id),$=x.success&&x.videos?x.videos.filter(u=>u.courseId===i.id||u.partId===i.id):[],w=this.buildCardWithViews(i,g,I,$);p.push(w.card),r.push(w.views)}for(const i of h)p.push(this.buildRevokedCard(i));this.coursesContainer.innerHTML=`
      <div class="mc-wrapper">
        <div class="mc-courses-list" id="mc-courses-list">
          ${p.join("")}
        </div>
        ${r.join("")}
      </div>
    `,this.attachListeners()}buildRevokedCard(e){return`
      <div class="mc-card revoked" style="filter: grayscale(0.2); border-color: #ef4444; opacity: 1;">
        <div class="mc-face">
          <span class="mc-enrolled" style="background: #ef4444; border-color: #fca5a5; color: #fff;">! Access Revoked</span>
          <div>
            <div class="mc-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div class="mc-title">${e.title}</div>
          </div>
          <div style="background: rgba(239, 68, 68, 0.05); border: 1px dashed #ef4444; border-radius: 12px; padding: 10px; margin-top: 10px;">
            <p style="margin: 0; font-size: 11px; font-weight: 600; line-height: 1.4; text-align: center;">
              Admin has revoked access to this course. Please contact support if you believe this is a mistake.
            </p>
          </div>
        </div>
      </div>
    `}async buildFullCourseCard(e,o){const t=y(),s=[{id:"part1",title:"Part I: Traffic Rules",label:"Part 1"},{id:"part2",title:"Part II: MV Act",label:"Part 2"},{id:"part3",title:"Part III: Mechanical",label:"Part 3"}];let c="";const a=s.map(n=>`
        <button class="mc-btn" data-target="${`mc-view-full-${n.id}-${t}`}">
          <span class="mc-part-badge">${n.label}</span>
          <span class="mc-btn-lbl">Explore</span>
          <svg class="mc-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      `).join("");for(const n of s){const m=`mc-view-full-${n.id}-${t}`,h=o.filter(i=>i.courseId===n.id||i.partId===n.id),d=await k(n.id),f=d.success&&d.tests?d.tests.filter(i=>i.courseId===n.id||i.partId===n.id):[],p=await C(n.id),r=p.success&&p.videos?p.videos.filter(i=>i.courseId===n.id||i.partId===n.id):[];c+=this.renderContentView(m,`${n.title}`,h,f,r)}return{card:`
      <div class="mc-card" id="${e.id}">
        <div class="mc-face">
          <span class="mc-enrolled">✓ Enrolled</span>
          <div>
            <div class="mc-icon">${this.categoryIcon("Complete Package")}</div>
            <div class="mc-title">${e.title}</div>
          </div>
          <div class="mc-btns">
            ${a}
          </div>
        </div>
      </div>
    `,views:c}}buildCardWithViews(e,o,t,s){const a=`mc-view-course-${y()}`,l=`
      <div class="mc-card" id="${e.id}">
        <div class="mc-face">
          <span class="mc-enrolled">✓ Enrolled</span>
          <div>
            <div class="mc-icon">${this.categoryIcon(e.category??"")}</div>
            <div class="mc-title">${e.title}</div>
          </div>
          <div class="mc-btns">
            <button class="mc-btn" data-target="${a}" style="grid-column: span 2;">
              <span class="mc-btn-lbl">View Content</span>
              <svg class="mc-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`,n=this.renderContentView(a,e.title,o,t,s);return{card:l,views:n}}renderContentView(e,o,t,s,c){const a=y(),l=t.length>0?t.map(r=>`
      <a href="./pdf-viewer.html?name=${encodeURIComponent(r.name)}&url=${encodeURIComponent(r.url)}" class="mc-item">
        <span class="mc-ico-pdf"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></span>
        <span class="mc-item-txt">${r.name}</span>
      </a>`).join(""):'<p class="mc-none">No PDFs.</p>',n=c.length>0?c.map(r=>`
      <div class="mc-item mc-video-link" data-url="${btoa(r.url)}" data-title="${r.title}" style="cursor: pointer;">
        <span class="mc-ico-video"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
        <span class="mc-item-txt">${r.title}</span>
        <span class="mc-item-badge">Watch</span>
      </div>`).join(""):'<p class="mc-none">No videos.</p>',m=r=>`
      <a href="./practice-test.html?id=${r.id}" class="mc-item">
        <span class="mc-ico-quiz"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <span class="mc-item-txt">${r.title}</span>
        <span class="mc-item-badge">${r.questions?.length??0}Q</span>
      </a>`,h=s.filter(r=>r.category==="Practice Test"),d=s.filter(r=>r.category==="Chapter Test"),f=s.filter(r=>r.category==="Full Mock Test"),p=`
      <div class="mc-tabs">
        <button class="mc-tab active" data-tab-id="vid-${a}">Videos</button>
        <button class="mc-tab" data-tab-id="pdf-${a}">PDFs</button>
        <button class="mc-tab" data-tab-id="qz-${a}">Quizzes</button>
      </div>
      <div id="vid-${a}" class="mc-tab-content active">${n}</div>
      <div id="pdf-${a}" class="mc-tab-content">${l}</div>
      <div id="qz-${a}" class="mc-tab-content">
        <p style="font-size:10px; font-weight:700; color:var(--text-tertiary); margin:10px 0 5px;">PRACTICE TESTS</p>
        ${h.length>0?h.map(m).join(""):'<p class="mc-none">None.</p>'}
        <p style="font-size:10px; font-weight:700; color:var(--text-tertiary); margin:15px 0 5px;">CHAPTER TESTS</p>
        ${d.length>0?d.map(m).join(""):'<p class="mc-none">None.</p>'}
        <p style="font-size:10px; font-weight:700; color:var(--text-tertiary); margin:15px 0 5px;">MOCK TESTS</p>
        ${f.length>0?f.map(m).join(""):'<p class="mc-none">None.</p>'}
      </div>
    `;return`
      <div class="mc-content-view" id="${e}">
        <div class="mc-view-header">
          <button class="mc-btn-back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
          <h3 class="mc-view-title">${o}</h3>
        </div>
        ${p}
      </div>
    `}attachListeners(){const e=this.coursesContainer.querySelector(".mc-courses-list");this.coursesContainer.querySelectorAll(".mc-btn").forEach(o=>{o.addEventListener("click",()=>{const t=document.getElementById(o.getAttribute("data-target"));t&&(e.classList.add("hidden"),t.classList.add("active"),window.scrollTo({top:0,behavior:"smooth"}))})}),this.coursesContainer.querySelectorAll(".mc-btn-back").forEach(o=>{o.addEventListener("click",t=>{t.currentTarget.closest(".mc-content-view").classList.remove("active"),e.classList.remove("hidden")})}),this.coursesContainer.querySelectorAll(".mc-tab").forEach(o=>{o.addEventListener("click",()=>{const t=o.closest(".mc-content-view");t.querySelectorAll(".mc-tab").forEach(s=>s.classList.remove("active")),o.classList.add("active"),t.querySelectorAll(".mc-tab-content").forEach(s=>s.classList.remove("active")),document.getElementById(o.getAttribute("data-tab-id"))?.classList.add("active")})}),this.coursesContainer.addEventListener("click",o=>{const t=o.target.closest(".mc-video-link");if(t){const s=t.getAttribute("data-url")||"",c=t.getAttribute("data-title")||"";try{const a=atob(s);v.getInstance().open(a,c)}catch{console.error("Failed to decode video URL")}}})}categoryIcon(e){return{"Complete Package":'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',"Traffic Rules":'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',"MV Act":'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'}[e]??'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'}showEmptyState(e,o,t,s){const c=e.toLowerCase().includes("sign in");this.coursesContainer.innerHTML=`
      <div class="mc-empty-container" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 60px 20px; text-align:center; animation: fadeIn 0.5s ease-out;">
        <div class="mc-empty-icon" style="width:100px; height:100px; border-radius:30px; background:var(--bg-card); display:flex; align-items:center; justify-content:center; margin-bottom:24px; box-shadow:0 15px 35px rgba(0,0,0,0.1); border:1px solid var(--border);">
          ${c?'<svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>':'<svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'}
        </div>
        <h2 style="font-size:24px; font-weight:800; color:var(--text-primary); margin-bottom:12px; letter-spacing:-0.5px;">${e}</h2>
        <p style="font-size:15px; color:var(--text-secondary); margin-bottom:32px; max-width:280px; line-height:1.6;">${o}</p>
        <a href="${s}" class="mc-cta-btn" style="display:inline-flex; align-items:center; gap:10px; background:var(--primary); color:#fff; padding:14px 32px; border-radius:16px; font-weight:700; text-decoration:none; box-shadow:0 10px 20px rgba(180, 83, 9, 0.2); transition: transform 0.2s;">
          ${t}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        
        ${c?"":`
          <div style="margin-top:40px; padding-top:20px; border-top:1px solid var(--border); width:100%;">
            <p style="font-size:12px; color:var(--text-tertiary); font-weight:600; text-transform:uppercase; letter-spacing:1px;">Need Help?</p>
            <a href="https://wa.me/917889396347" target="_blank" style="color:var(--primary); font-size:14px; font-weight:700; text-decoration:none; display:block; margin-top:8px;">Contact Support on WhatsApp</a>
          </div>
        `}
      </div>
      <style>
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .mc-cta-btn:active { transform: scale(0.96); }
      </style>
    `}}new S;
