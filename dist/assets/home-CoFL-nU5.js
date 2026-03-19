import{o as f,i as w,g as b}from"./auth-service-DMDvh9zM.js";import{e as c}from"./escape-html-BUkjI-KV.js";import{c as C,g as S}from"./admin-service-Bd7EHEIN.js";const v=async(r,e)=>{try{const a=`TEST_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,t=await C({userId:e,courseId:r.id,amount:r.price,paymentId:a,status:"completed"});return t.success?{success:!0}:{success:!1,error:t.error}}catch(a){return{success:!1,error:a.message||"Payment simulation failed"}}},h=(r,e)=>{const a=document.createElement("div");a.className="cdm-overlay",a.style.zIndex="999999",a.innerHTML=`
    <div class="checkout-panel">
      <div class="cdm-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px;">
        <h2 class="cdm-title" style="margin: 0; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Secure Checkout
        </h2>
        <button class="cdm-close" style="position: static;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <div class="checkout-iframe-container">
        <iframe src="${r.paymentLink}"></iframe>
      </div>
      
      <div class="cdm-footer" style="padding: 12px 20px; text-align: center; background: rgba(16, 185, 129, 0.05); border-top: 1px solid var(--border);">
        <p style="color: #10b981; font-size: 13px; font-weight: 500; margin: 0;">
          Do not close this window. You will be automatically redirected upon success.
        </p>
        <button id="verify-payment-btn" style="background: none; border: none; color: var(--text-tertiary); font-size: 12px; text-decoration: underline; margin-top: 6px; cursor: pointer; padding: 4px;">
          Click here if not redirected automatically
        </button>
      </div>
    </div>
  `,document.body.appendChild(a),a.querySelector(".cdm-close")?.addEventListener("click",()=>a.remove());const d=async()=>{a.remove(),await v(r,e);try{const i=`jkssb_enrolled_${e}`,l=JSON.parse(localStorage.getItem(i)??"[]");r.id&&!l.includes(r.id)&&(l.push(r.id),localStorage.setItem(i,JSON.stringify(l)))}catch(i){console.error("Error syncing local storage:",i)}const s=window.showToast;s&&(s("Payment successful! 🎉","success"),setTimeout(()=>{s("You are now enrolled.","success")},1500),setTimeout(()=>{s("Learn and enjoy! 🚀","success")},3e3)),setTimeout(()=>{window.location.href="./my-courses.html"},4500)},o=s=>{s.data?.type==="CASHFREE_PAYMENT_SUCCESS"&&(window.removeEventListener("message",o),d())};window.addEventListener("message",o);const n=a.querySelector("#verify-payment-btn");n?.addEventListener("click",async()=>{n.disabled=!0,n.textContent="Verifying...",window.removeEventListener("message",o),(await v(r,e)).success?d():(alert("Verification failed. If you paid, please contact support."),n.disabled=!1,n.textContent="Click here if not redirected automatically",window.addEventListener("message",o))})};function x(r){document.getElementById("course-detail-modal")?.remove();const e=(r.syllabus??"").split(`
`).map(l=>l.trim()).filter(Boolean),a=[],t=r.description?.trim()??"",d=t.split(/\s*\d+\.\s+/).map(l=>l.trim()).filter(Boolean);let o="";d.length>1?(o=d[0],a.push(...d.slice(1))):t&&a.push(t);const n=e.length?`<ul class="cdm-list">${e.map(l=>`<li>${c(l)}</li>`).join("")}</ul>`:'<p style="color:#888;font-style:italic;">No syllabus added yet.</p>',s=a.length?`${o?`<p class="cdm-desc-heading">${c(o)}</p>`:""}<ul class="cdm-list">${a.map(l=>`<li>${c(l)}</li>`).join("")}</ul>`:t?`<p style="color:#ccc;line-height:1.7;">${c(t)}</p>`:'<p style="color:#888;font-style:italic;">No description added yet.</p>',i=document.createElement("div");i.id="course-detail-modal",i.className="cdm-overlay",i.innerHTML=`
    <div class="cdm-panel" role="dialog" aria-modal="true">
      <div class="cdm-header">
        <button class="cdm-close" aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 class="cdm-title">${c(r.title)}</h2>
        <div class="cdm-price">
          ${r.oldPrice?`<del style="color:#DC2626; font-size:0.85em; margin-right:8px; text-decoration-thickness: 2px;">₹${r.oldPrice.toLocaleString()}</del>`:""}
          ₹${r.price.toLocaleString()}
        </div>
      </div>

      <div class="cdm-body">
        <!-- Syllabus toggle -->
        <div class="cdm-toggle-bar watery-tab" data-target="cdm-syllabus">
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Syllabus</span>
          <svg class="cdm-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="cdm-section" id="cdm-syllabus" style="display:none;">
          ${n}
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
          <span style="font-size:22px; font-weight:800; color:var(--text-primary); line-height: 1;">₹${r.price.toLocaleString()}</span>
        </div>
        <button class="${b()?"cdm-buy-btn":"cdm-buy-btn signin-mode"}" id="cdm-buy-btn-trigger" style="flex: 1; justify-content: center;">
          <span>${b()?"Buy Now":"Sign In to Enroll"}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  `,i.querySelectorAll(".cdm-toggle-bar").forEach(l=>{l.addEventListener("click",()=>{const u=l.dataset.target,p=document.getElementById(u),g=l.querySelector(".cdm-arrow"),y=p.style.display!=="none";i.querySelectorAll(".cdm-section").forEach(m=>m.style.display="none"),i.querySelectorAll(".cdm-arrow").forEach(m=>m.style.transform=""),y||(p.style.display="block",g.style.transform="rotate(180deg)")})}),i.addEventListener("click",l=>{l.target===i&&i.remove()}),i.querySelector("#cdm-buy-btn-trigger")?.addEventListener("click",()=>{const l=b();if(!l){window.location.href=`./login.html?redirect=${encodeURIComponent(`index.html?buyCourse=${r.id}`)}`;return}let u=r.paymentLink;const p=r.title.toLowerCase();u||(p.includes("old driver papers")||p.includes("old papers")?u="https://payments.cashfree.com/forms?code=OldDriverPapers":p.includes("full course")&&(u="https://payments.cashfree.com/forms?code=jkssbfullcourse&formId=FULLCOURSE")),u?h({...r,paymentLink:u},l.uid):window.location.href=`./course-details.html?id=${r.id}`}),i.querySelector(".cdm-close")?.addEventListener("click",()=>i.remove()),document.body.appendChild(i)}class k{constructor(){this.currentUser=null,this.coursesContainer=document.querySelector(".course-cards"),this.init(),this.setupExpandTopicsDelegation(),this.updateProfileBadge()}setupExpandTopicsDelegation(){document.addEventListener("click",e=>{const a=e.target.closest(".expand-more-topics-btn");if(!a)return;e.preventDefault(),e.stopPropagation();const t=a,o=t.closest(".course-description-card")?.querySelector(".course-topics-extra");if(!o)return;const n=getComputedStyle(o).display==="none";o.style.display=n?"block":"none",t.textContent=n?t.dataset.lessText||"Show less":t.dataset.moreText||"+ more topics",window.lucide?.createIcons()})}async init(){f(async e=>{this.currentUser=e,await this.loadCourses(),await this.updateProfileBadge()})}async loadCourses(){if(this.coursesContainer){this.coursesContainer.innerHTML=`
      <div class="glass-card skeleton-glass"></div>
      <div class="glass-card skeleton-glass"></div>
      <div class="glass-card skeleton-glass"></div>
    `;try{const e=await S(),a=e.success&&"courses"in e&&e.courses?e.courses:[];if(a.length===0){this.coursesContainer.innerHTML=`
          <div class="alert-card info" style="grid-column:1/-1;">
            <div class="alert-icon"><i data-lucide="info"></i></div>
            <div class="alert-content">
              <h3>No Courses Available</h3>
              <p>Courses are being prepared. Check back soon!</p>
            </div>
          </div>
        `,window.lucide.createIcons();return}const t=this.currentUser?(()=>{try{return JSON.parse(localStorage.getItem(`jkssb_enrolled_${this.currentUser.uid}`)??"[]")}catch{return[]}})():[],d=a.map(s=>({id:s.id,title:s.title,description:s.description,syllabus:s.syllabus,price:s.price,oldPrice:s.oldPrice,duration:s.duration,paymentLink:s.paymentLink,thumbnailUrl:s.thumbnailUrl??s.thumbnailUrl,emoji:s.emoji})).sort((s,i)=>{const l=t.includes(s.id),u=t.includes(i.id);return l&&!u?-1:!l&&u?1:0});this.coursesContainer.innerHTML=d.map(s=>this.renderCourseCard(s,t.includes(s.id))).join(""),this.coursesContainer.querySelectorAll(".btn-enrolled").forEach(s=>{s.addEventListener("click",()=>{window.location.href="./my-courses.html"})}),this.coursesContainer.querySelectorAll(".btn-enroll").forEach(s=>{s.addEventListener("click",()=>{const i=s.dataset.courseId,l=d.find(u=>u.id===i);l&&x(l)})});const n=new URLSearchParams(window.location.search).get("buyCourse");if(n&&this.currentUser){const s=d.find(i=>i.id===n);s&&!t.includes(s.id)&&(s.paymentLink?h(s,this.currentUser.uid):window.location.href=`./course-details.html?id=${s.id}`,window.history.replaceState({},document.title,window.location.pathname))}window.lucide?.createIcons()}catch(e){console.error("Error loading courses:",e),this.coursesContainer&&(this.coursesContainer.innerHTML=`
          <div class="alert-card error" style="grid-column:1/-1;">
            <div class="alert-icon"><i data-lucide="alert-circle"></i></div>
            <div class="alert-content">
              <h3>Error Loading Courses</h3>
              <p>Unable to load courses. Please refresh the page.</p>
            </div>
          </div>
        `,window.lucide?.createIcons())}}}getThumbInfo(e){if(e.thumbnailUrl||e.emoji){const d=e.thumbBadgeStyle||"badge-pop";let o="";e.thumbBadge&&(o=`<span class="thumb-badge ${d}">${c(e.thumbBadge)}</span>`);let n="";return e.thumbnailUrl&&(n=`<img src="${e.thumbnailUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`),n+=`<div class="thumb-emoji-fallback" style="width:100%; height:100%; display:none; align-items:center; justify-content:center; font-size:40px;">${e.emoji||"📚"}</div>`,!e.thumbnailUrl&&e.emoji&&(n=`<div class="thumb-emoji-fallback" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:40px;">${e.emoji}</div>`),{class:e.thumbCssClass||"thumb-default",label:e.thumbTopLabel?c(e.thumbTopLabel):c(e.title),badge:o,content:n}}if(e.thumbCssClass){const d=e.thumbBadgeStyle||"badge-pop";let o="";e.thumbBadge&&(o=`<span class="thumb-badge ${d}">${c(e.thumbBadge)}</span>`);let n="";if(e.thumbPartTags){const s=e.thumbPartTags.split(",").map(i=>i.trim()).filter(Boolean);s.length>0&&(n=`<div class="fc-parts">${s.map(i=>`<span class="part-pill">${c(i)}</span>`).join("")}</div>`)}return{class:e.thumbCssClass,label:e.thumbTopLabel?c(e.thumbTopLabel):"",badge:o,content:`
          ${e.thumbMainHeading?`<div class="fc-title">${e.thumbMainHeading}</div>`:""}
          ${e.thumbSubHeading?`<div class="fc-sub">${e.thumbSubHeading}</div>`:""}
          ${n}
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
        <div class="mv-by">By JKSSB Drivers Academy</div>
      `}:t.includes("part iii")?{class:"thumb-part3",label:"JKSSB Driver Part III",badge:'<span class="thumb-badge badge-val">Best Value</span>',content:`
        <div class="p3-title">MOTOR<br>PARTS &<br>REPAIR</div>
        <div class="p3-icons">🔧 ⚙️ 🔩 🛞</div>
        <div class="p3-sub">Mechanical Knowledge</div>
      `}:t.includes("mv act")&&t.includes("mcq")?{class:"thumb-mvact",label:"JKSSB Driver MV Act MCQ Book",badge:"",content:`
        <div class="mvb-italic">Objective Questions Answers</div>
        <div class="mvb-main">MOTOR<br>VEHICLE<br>ACT</div>
        <div class="mvb-mcq">MCQs book</div>
        <div class="mvb-line"></div>
        <div class="mvb-by">By JKSSB Drivers Academy</div>
      `}:t.includes("old driver papers")||t.includes("old papers")?{class:"thumb-oldpapers",label:"JKSSB Driver Old Papers",badge:'<span class="thumb-badge badge-new">New</span>',content:`
        <div class="op-title">OLD<br>DRIVER<br>PAPERS</div>
        <div class="op-sub">JKSSB & Other Boards</div>
        <div class="op-line"></div>
        <div class="op-detail">Previous Year Papers</div>
        <div class="op-by">By JKSSB Drivers Academy</div>
      `}:{class:"thumb-mcqbook",label:"JKSSB Driver MCQ Book",badge:'<span class="thumb-badge badge-new">New</span>',content:`
        <div class="mcq-count">2500+<br>MCQs</div>
        <div class="mcq-sub">Full Syllabus Covered</div>
        <div class="mcq-line"></div>
        <div class="mcq-detail">Topic Wise · With Answers</div>
        <div class="mcq-by">By JKSSB Drivers Academy</div>
      `}}renderCourseCard(e,a=!1){const t=this.getThumbInfo(e);let d="";if(e.oldPrice&&e.oldPrice>e.price&&(d=`<span class="discount-tag">${Math.round((e.oldPrice-e.price)/e.oldPrice*100)}% OFF</span>`),a){const o=e.title.toLowerCase().includes("full course")||e.id==="full_course"||e.id==="FullCourse";let n=`
        <button class="btn-enrolled enroll-btn" data-course-id="${e.id}" style="background: linear-gradient(90deg, #16A34A, #22C55E);">
          🎉 Enrolled - Go to Course
        </button>
      `;return o&&(n=`
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
            <div class="card-title">${c(e.title)}</div>
            ${n}
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
          <div class="card-title">${c(e.title)}</div>
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
    `}async updateProfileBadge(){const e=document.getElementById("home-profile-badge");if(!e)return;if(!this.currentUser){e.className="home-profile-badge guest",e.innerHTML="👤",e.style.display="flex";return}await w(this.currentUser.uid)?(e.className="home-profile-badge premium",e.innerHTML="⭐",e.style.display="flex"):(e.className="home-profile-badge guest",e.innerHTML="👤",e.style.display="flex")}}document.querySelector(".course-cards")&&new k;
