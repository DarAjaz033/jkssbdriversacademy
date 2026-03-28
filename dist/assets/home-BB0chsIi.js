import{o as g,i as y,g as b}from"./auth-service-R8_UVxkw.js";import{e as o}from"./escape-html-BUkjI-KV.js";import{g as f}from"./admin-service-CpAm8p6-.js";function w(c){document.getElementById("course-detail-modal")?.remove();const e=(c.syllabus??"").split(`
`).map(l=>l.trim()).filter(Boolean),r=[],t=c.description?.trim()??"",d=t.split(/\s*\d+\.\s+/).map(l=>l.trim()).filter(Boolean);let n="";d.length>1?(n=d[0],r.push(...d.slice(1))):t&&r.push(t);const a=e.length?`<ul class="cdm-list">${e.map(l=>`<li>${o(l)}</li>`).join("")}</ul>`:'<p style="color:#888;font-style:italic;">No syllabus added yet.</p>',s=r.length?`${n?`<p class="cdm-desc-heading">${o(n)}</p>`:""}<ul class="cdm-list">${r.map(l=>`<li>${o(l)}</li>`).join("")}</ul>`:t?`<p style="color:#ccc;line-height:1.7;">${o(t)}</p>`:'<p style="color:#888;font-style:italic;">No description added yet.</p>',i=document.createElement("div");i.id="course-detail-modal",i.className="cdm-overlay",i.innerHTML=`
    <div class="cdm-panel" role="dialog" aria-modal="true">
      <div class="cdm-header">
        <button class="cdm-close" aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 class="cdm-title">${o(c.title)}</h2>
        <div class="cdm-price">
          ${c.oldPrice?`<del style="color:#DC2626; font-size:0.85em; margin-right:8px; text-decoration-thickness: 2px;">₹${c.oldPrice.toLocaleString()}</del>`:""}
          ₹${c.price.toLocaleString()}
        </div>
      </div>

      <div class="cdm-body">
        <!-- Syllabus toggle -->
        <div class="cdm-toggle-bar watery-tab" data-target="cdm-syllabus">
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Syllabus</span>
          <svg class="cdm-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="cdm-section" id="cdm-syllabus" style="display:none;">
          ${a}
        </div>

        <!-- Description toggle -->
        <div class="cdm-toggle-bar watery-tab" data-target="cdm-description">
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Description</span>
          <svg class="cdm-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="cdm-section" id="cdm-description" style="display:none;">
          ${s}
        </div>
      </div>

      <div class="cdm-footer">
        <div class="cdm-price-box">
          <span style="font-size:22px; font-weight:800; color:var(--text-primary); line-height: 1;">₹${c.price.toLocaleString()}</span>
        </div>
        <button class="${b()?"cdm-buy-btn":"cdm-buy-btn signin-mode"}" id="cdm-buy-btn-trigger" style="flex: 1; justify-content: center;">
          <span>${b()?"Buy Now":"Sign In to Enroll"}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  `,i.querySelectorAll(".cdm-toggle-bar").forEach(l=>{l.addEventListener("click",()=>{const u=l.dataset.target,m=document.getElementById(u),v=l.querySelector(".cdm-arrow"),h=m.style.display!=="none";i.querySelectorAll(".cdm-section").forEach(p=>p.style.display="none"),i.querySelectorAll(".cdm-arrow").forEach(p=>p.style.transform=""),h||(m.style.display="block",v.style.transform="rotate(180deg)")})}),i.addEventListener("click",l=>{l.target===i&&i.remove()}),i.querySelector("#cdm-buy-btn-trigger")?.addEventListener("click",()=>{if(!b()){window.location.href=`./login.html?redirect=${encodeURIComponent(`index.html?buyCourse=${c.id}`)}`;return}window.location.href=`./course-details.html?id=${c.id}&buy=true`}),i.querySelector(".cdm-close")?.addEventListener("click",()=>i.remove()),document.body.appendChild(i)}class C{constructor(){this.currentUser=null,this.coursesContainer=document.querySelector(".course-cards"),this.init(),this.setupExpandTopicsDelegation(),this.updateProfileBadge()}setupExpandTopicsDelegation(){document.addEventListener("click",e=>{const r=e.target.closest(".expand-more-topics-btn");if(!r)return;e.preventDefault(),e.stopPropagation();const t=r,n=t.closest(".course-description-card")?.querySelector(".course-topics-extra");if(!n)return;const a=getComputedStyle(n).display==="none";n.style.display=a?"block":"none",t.textContent=a?t.dataset.lessText||"Show less":t.dataset.moreText||"+ more topics",window.lucide?.createIcons()})}async init(){g(async e=>{this.currentUser=e,await this.loadCourses(),await this.updateProfileBadge()})}async loadCourses(){if(this.coursesContainer){this.coursesContainer.innerHTML=`
      <div class="glass-card skeleton-glass"></div>
      <div class="glass-card skeleton-glass"></div>
      <div class="glass-card skeleton-glass"></div>
    `;try{const e=await f(),r=e.success&&"courses"in e&&e.courses?e.courses:[];if(r.length===0){this.coursesContainer.innerHTML=`
          <div class="alert-card info" style="grid-column:1/-1;">
            <div class="alert-icon"><i data-lucide="info"></i></div>
            <div class="alert-content">
              <h3>No Courses Available</h3>
              <p>Courses are being prepared. Check back soon!</p>
            </div>
          </div>
        `,window.lucide.createIcons();return}const t=this.currentUser?(()=>{try{return JSON.parse(localStorage.getItem(`jkssb_enrolled_${this.currentUser.uid}`)??"[]")}catch{return[]}})():[],d=r.map(s=>({id:s.id,title:s.title,description:s.description,syllabus:s.syllabus,price:s.price,oldPrice:s.oldPrice,duration:s.duration,paymentLink:s.paymentLink,thumbnailUrl:s.thumbnailUrl??s.thumbnailUrl,emoji:s.emoji})).sort((s,i)=>{const l=t.includes(s.id),u=t.includes(i.id);return l&&!u?-1:!l&&u?1:0});this.coursesContainer.innerHTML=d.map(s=>this.renderCourseCard(s,t.includes(s.id))).join(""),this.coursesContainer.querySelectorAll(".btn-enrolled").forEach(s=>{s.addEventListener("click",()=>{window.location.href="./my-courses.html"})}),this.coursesContainer.querySelectorAll(".btn-enroll").forEach(s=>{s.addEventListener("click",()=>{const i=s.dataset.courseId,l=d.find(u=>u.id===i);l&&w(l)})});const a=new URLSearchParams(window.location.search).get("buyCourse");if(a&&this.currentUser){const s=d.find(i=>i.id===a);s&&!t.includes(s.id)&&(window.location.href=`./course-details.html?id=${s.id}&buy=true`,window.history.replaceState({},document.title,window.location.pathname))}window.lucide?.createIcons()}catch(e){console.error("Error loading courses:",e),this.coursesContainer&&(this.coursesContainer.innerHTML=`
          <div class="alert-card error" style="grid-column:1/-1;">
            <div class="alert-icon"><i data-lucide="alert-circle"></i></div>
            <div class="alert-content">
              <h3>Error Loading Courses</h3>
              <p>Unable to load courses. Please refresh the page.</p>
            </div>
          </div>
        `,window.lucide?.createIcons())}}}getThumbInfo(e){if(e.thumbnailUrl||e.emoji){const d=e.thumbBadgeStyle||"badge-pop";let n="";e.thumbBadge&&(n=`<span class="thumb-badge ${d}">${o(e.thumbBadge)}</span>`);let a="";return e.thumbnailUrl&&(a=`<img src="${e.thumbnailUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`),a+=`<div class="thumb-emoji-fallback" style="width:100%; height:100%; display:none; align-items:center; justify-content:center; font-size:40px;">${e.emoji||"📚"}</div>`,!e.thumbnailUrl&&e.emoji&&(a=`<div class="thumb-emoji-fallback" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:40px;">${e.emoji}</div>`),{class:e.thumbCssClass||"thumb-default",label:e.thumbTopLabel?o(e.thumbTopLabel):o(e.title),badge:n,content:a}}if(e.thumbCssClass){const d=e.thumbBadgeStyle||"badge-pop";let n="";e.thumbBadge&&(n=`<span class="thumb-badge ${d}">${o(e.thumbBadge)}</span>`);let a="";if(e.thumbPartTags){const s=e.thumbPartTags.split(",").map(i=>i.trim()).filter(Boolean);s.length>0&&(a=`<div class="fc-parts">${s.map(i=>`<span class="part-pill">${o(i)}</span>`).join("")}</div>`)}return{class:e.thumbCssClass,label:e.thumbTopLabel?o(e.thumbTopLabel):"",badge:n,content:`
          ${e.thumbMainHeading?`<div class="fc-title">${e.thumbMainHeading}</div>`:""}
          ${e.thumbSubHeading?`<div class="fc-sub">${e.thumbSubHeading}</div>`:""}
          ${a}
          ${e.thumbBottomCaption?`<div class="fc-includes">${e.thumbBottomCaption}</div>`:""}
        `}}const t=e.title.toLowerCase();return t.includes("full course")?{class:"thumb-fullcourse",label:"JKSSB Driver Full Course",badge:'<span class="thumb-badge badge-pop">Popular</span>',content:`
        <div class="fc-title">FULL<br>COURSE</div>
        <div class="fc-sub">All 3 Parts Included</div>
        <div class="fc-parts">
          <span class="part-pill">Part I</span>
          <span class="part-pill">Part II</span>
          <span class="part-pill">Part III</span>
        </div>
        <div class="fc-includes">
          Notes, Videos + 2500+ MCQ Book + <span class="blink-free">FREE</span> MV Act MCQ Book
        </div>
      `}:t.includes("part i")&&!t.includes("part ii")&&!t.includes("part iii")?{class:"thumb-part1",label:"JKSSB Driver Part I",badge:'<span class="thumb-badge badge-val">Best Value</span>',content:`
        <div class="p1-main">TRAFFIC<br>RULES &<br>SIGNALLING</div>
        <div class="p1-icons">🚦 🛑 ⚠️</div>
        <div class="p1-sub">Road Safety & Signals</div>
      `}:t.includes("part ii")&&!t.includes("part iii")?{class:"thumb-part2",label:"JKSSB Driver Part II",badge:'<span class="thumb-badge badge-val">Best Value</span>',content:`
        <div class="mv-italic">Objective Questions Answers</div>
        <div class="mv-title">MOTOR<br>VEHICLE<br>ACT</div>
        <div class="mv-sub">1988 & CMV Rules 1989</div>
        <div class="mv-line"></div>
        <div class="mv-by">By Drivers Academy</div>
      `}:t.includes("part iii")?{class:"thumb-part3",label:"JKSSB Driver Part III",badge:'<span class="thumb-badge badge-val">Best Value</span>',content:`
        <div class="p3-title">MOTOR<br>PARTS &<br>REPAIR</div>
        <div class="p3-icons">🔧 ⚙️ 🔩 🛞</div>
        <div class="p3-sub">Mechanical Knowledge</div>
      `}:t.includes("mv act")&&t.includes("mcq")?{class:"thumb-mvact",label:"JKSSB Driver MV Act MCQ Book",badge:"",content:`
        <div class="mvb-italic">Objective Questions Answers</div>
        <div class="mvb-main">MOTOR<br>VEHICLE<br>ACT</div>
        <div class="mvb-mcq">MCQs book</div>
        <div class="mvb-line"></div>
        <div class="mvb-by">By Drivers Academy</div>
      `}:t.includes("old driver papers")||t.includes("old papers")?{class:"thumb-oldpapers",label:"JKSSB Driver Old Papers",badge:'<span class="thumb-badge badge-new">New</span>',content:`
        <div class="op-title">OLD<br>DRIVER<br>PAPERS</div>
        <div class="op-sub">JKSSB & Other Boards</div>
        <div class="op-line"></div>
        <div class="op-detail">Previous Year Papers</div>
        <div class="op-by">By Drivers Academy</div>
      `}:{class:"thumb-mcqbook",label:"JKSSB Driver MCQ Book",badge:'<span class="thumb-badge badge-new">New</span>',content:`
        <div class="mcq-count">2500+<br>MCQs</div>
        <div class="mcq-sub">Full Syllabus Covered</div>
        <div class="mcq-line"></div>
        <div class="mcq-detail">Topic Wise · With Answers</div>
        <div class="mcq-by">By Drivers Academy</div>
      `}}renderCourseCard(e,r=!1){const t=this.getThumbInfo(e);let d="";if(e.oldPrice&&e.oldPrice>e.price&&(d=`<span class="discount-tag">${Math.round((e.oldPrice-e.price)/e.oldPrice*100)}% OFF</span>`),r){const n=e.title.toLowerCase().includes("full course")||e.id==="full_course"||e.id==="FullCourse";let a=`
        <button class="btn-enrolled enroll-btn" data-course-id="${e.id}" style="background: linear-gradient(90deg, #16A34A, #22C55E);">
          🎉 Enrolled - Go to Course
        </button>
      `;return n&&(a=`
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
              <button class="btn-enrolled enroll-btn part-btn" onclick="window.location.href='./my-courses.html#part1'" style="background: #1e293b; padding: 10px 5px; font-size: 11px;">Part I</button>
              <button class="btn-enrolled enroll-btn part-btn" onclick="window.location.href='./my-courses.html#part2'" style="background: #1e293b; padding: 10px 5px; font-size: 11px;">Part II</button>
              <button class="btn-enrolled enroll-btn part-btn" onclick="window.location.href='./my-courses.html#part3'" style="background: #1e293b; padding: 10px 5px; font-size: 11px;">Part III</button>
            </div>
            <button class="btn-enrolled enroll-btn" data-course-id="${e.id}" style="background: linear-gradient(90deg, #16A34A, #22C55E); margin-top: 4px;">
              View Full Dashboard
            </button>
          </div>
        `),`
        <div class="card" style="box-shadow: 0 4px 20px rgba(22, 163, 74, 0.15); border: 2px solid rgba(22, 163, 74, 0.3);">
          <div class="card-thumb ${t.class}">
            <div class="thumb-toplabel">${t.label}</div>
            ${t.badge}
            ${t.content}
          </div>
          <div class="card-body">
            <div class="card-title">${o(e.title)}</div>
            ${a}
          </div>
        </div>
      `}return`
      <div class="card">
        <div class="card-thumb ${t.class}">
          <div class="thumb-toplabel">${t.label}</div>
          ${t.badge}
          ${t.content}
        </div>
        <div class="card-body">
          <div class="card-title">${o(e.title)}</div>
          <div class="price-row">
            ${e.oldPrice?`<span class="old-price">₹${e.oldPrice.toLocaleString()}</span>`:""}
            <span class="new-price">₹${e.price.toLocaleString()}</span>
            ${d}
          </div>
          <button class="btn-enroll enroll-btn" data-course-id="${e.id}">
            View Details &amp; Enroll
          </button>
        </div>
      </div>
    `}async updateProfileBadge(){const e=document.getElementById("home-profile-badge");if(!e)return;if(!this.currentUser){e.className="home-profile-badge guest",e.innerHTML="👤",e.style.display="flex";return}await y(this.currentUser.uid)?(e.className="home-profile-badge premium",e.innerHTML="⭐",e.style.display="flex"):(e.className="home-profile-badge guest",e.innerHTML="👤",e.style.display="flex")}}document.querySelector(".course-cards")&&new C;
