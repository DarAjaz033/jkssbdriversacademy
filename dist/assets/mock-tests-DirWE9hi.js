import{f as n,q as a,h as r,a as l,o as d}from"./firebase-config-B4XEnROW.js";/* empty css               */import{o as c}from"./auth-service-DMDvh9zM.js";import{i as h,g as v}from"./admin-service-Bd7EHEIN.js";class p{constructor(){this.enrolledGrid=document.getElementById("cd-enrolled-grid"),this.availList=document.getElementById("cd-avail-list"),this.dynamicTests=document.getElementById("cd-dynamic-tests"),this.init()}async init(){c(async e=>{const[i,t]=await Promise.all([e?this.loadEnrolled(e.uid):this.showEnrolledGuest(),this.loadAvailableCourses(),this.loadDynamicTests()])})}async loadEnrolled(e){const i=await h(e),t=i.success&&i.courses?i.courses:[];if(t.length===0){this.enrolledGrid.innerHTML=`
        <div style="grid-column:1/-1;text-align:center;padding:18px 12px;">
          <p style="font-size:13px;color:#9ca3af;margin:0 0 10px;">You haven't enrolled in any course yet.</p>
          <a href="./index.html" style="font-size:12.5px;font-weight:600;color:#b45309;text-decoration:none;">Browse Courses →</a>
        </div>`;return}this.enrolledGrid.innerHTML=t.map((o,s)=>this.enrolledCard(o,s)).join(""),window.lucide?.createIcons()}showEnrolledGuest(){this.enrolledGrid.innerHTML=`
      <div style="grid-column:1/-1;text-align:center;padding:18px 12px;">
        <p style="font-size:13px;color:#9ca3af;margin:0 0 10px;">Sign in to see your enrolled courses.</p>
        <a href="./login.html" style="font-size:12.5px;font-weight:600;color:#b45309;text-decoration:none;">Sign In →</a>
      </div>`}enrolledCard(e,i){const t=this.catIcon(e.category);return`
      <div class="cd-enrolled-card" style="animation-delay:${i*.07}s;">
        <div class="cd-enrolled-face">
          <span class="cd-enrolled-badge">✓ Enrolled</span>
          <div>
            <div style="width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,0.18);
                        border:1.5px solid rgba(255,255,255,0.28);display:flex;align-items:center;
                        justify-content:center;color:#fff;margin-bottom:9px;position:relative;z-index:1;">
              ${t}
            </div>
            <div class="cd-enrolled-title">${e.title}</div>
          </div>
          <a href="./my-courses.html" class="cd-enrolled-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            View Material
          </a>
        </div>
      </div>`}async loadAvailableCourses(){const e=await v(),i=e.success&&e.courses?e.courses:[];if(i.length===0){this.availList.innerHTML='<p style="font-size:13px;color:#9ca3af;text-align:center;padding:12px 0;">No courses available yet.</p>';return}this.availList.innerHTML=i.map((t,o)=>this.availCard(t,o)).join(""),window.lucide?.createIcons()}availCard(e,i){const t=this.catIcon(e.category);return`
      <a href="./course-details.html?id=${e.id}" class="cd-avail-card" style="animation-delay:${i*.07}s;">
        <div class="cd-avail-icon">${t}</div>
        <div class="cd-avail-body">
          <div class="cd-avail-title">${e.title}</div>
          <div class="cd-avail-meta">${e.duration} · ${e.category}</div>
          <span class="cd-avail-price">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            ₹${e.price.toLocaleString()}
          </span>
        </div>
        <svg class="cd-avail-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>`}async loadDynamicTests(){try{const e=await n(a(r(l,"practiceTests"),d("createdAt","desc")));if(e.empty)return;const i=e.docs.map(t=>{const o={id:t.id,...t.data()};return`
          <div class="cd-mock-card">
            <div class="cd-mock-icon free">
              <i data-lucide="clipboard-check" width="20" height="20"></i>
            </div>
            <div class="cd-mock-body">
              <div class="cd-mock-title">${o.title}</div>
              <div class="cd-mock-meta">${o.questions?.length??0} questions · ${o.duration} min</div>
            </div>
            <a href="./practice-test.html?id=${o.id}" class="cd-mock-action-free">Start</a>
          </div>`}).join("");this.dynamicTests.innerHTML=i,window.lucide?.createIcons()}catch(e){console.warn("Tests load error",e)}}catIcon(e){return{"Complete Package":'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',"Traffic Rules":'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',"MV Act":'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',Mechanical:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.34 19.66l-1.41 1.41M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.34 4.34L2.93 2.93M12 20v2M12 2v2"/></svg>'}[e||""]??'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'}}new p;
