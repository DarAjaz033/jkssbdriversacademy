import"./firebase-config-B4XEnROW.js";/* empty css               */import"./global-pdf-viewer-DNHCjlum.js";import{o as z}from"./auth-service-DMDvh9zM.js";import{j as E,g as P,b as $,d as F,p as y,q as w,r as C,s as D}from"./admin-service-Bd7EHEIN.js";import{d as A,p as S}from"./excel-parser-D9xQwGnI.js";import{a as b,s as d}from"./admin-toast-8NJD7knF.js";const Q=async h=>new Promise((e,t)=>{const i=new FileReader;i.onload=s=>{try{const n=s.target?.result,a=JSON.parse(n),l=L(a);l.length===0?t(new Error("No valid questions found in the JSON file.")):e(l)}catch{t(new Error("Failed to parse JSON file. Please ensure it is a valid Google Form export."))}},i.onerror=()=>t(new Error("Failed to read file")),i.readAsText(h)});function L(h){return Array.isArray(h)?h.map(t=>{const i=t.question||t.Question||"",s=Array.isArray(t.options)?t.options.map(String):[t.option1||"",t.option2||"",t.option3||"",t.option4||""],n=typeof t.correctAnswer=="number"?t.correctAnswer:parseInt(t.correctAnswer??"1")-1,a=t.explanation||t.Explanation||"";return!i||s.filter(Boolean).length<2?null:{question:i,options:s,correctAnswer:n,explanation:a}}).filter(Boolean):(h?.items??h?.form?.items??[]).map(t=>{const i=t?.questionItem;if(!i)return null;const s=t.title||"",n=i?.question?.choiceQuestion;if(!n)return null;const a=(n.options??[]).map(r=>typeof r=="string"?r:r.value??r.label??""),l=i?.question?.grading,o=l?.correctAnswers?.answers?.map(r=>r.value??r.answer??"")??[];let p=0;if(o.length>0){const r=a.findIndex(u=>o.includes(u));p=r>=0?r:0}const m=l?.generalFeedback?.text??l?.whenRight?.text??"";return!s||a.filter(Boolean).length<2?null:{question:s,options:a,correctAnswer:p,explanation:m}}).filter(Boolean)}const I=()=>{const h=[{question:"What is the capital of India?",options:["Mumbai","Delhi","Kolkata","Chennai"],correctAnswer:1,explanation:"Delhi (New Delhi) has been the capital since 1911."},{question:"How many cylinders does a standard 4-stroke engine have?",options:["2","4","6","8"],correctAnswer:1,explanation:"Most standard cars use a 4-cylinder 4-stroke engine."}],e=new Blob([JSON.stringify(h,null,2)],{type:"application/json"}),t=URL.createObjectURL(e),i=document.createElement("a");i.href=t,i.download="quiz_template.json",i.click(),URL.revokeObjectURL(t)};class x{constructor(){this.allCourses=[],this.allPDFs=[],this.activePdfCourseId="",this.activeQuizCourseId="",this.activePdfProgressEl=null,this.pendingQuizQuestions={},this.courseFoldersContainer=document.getElementById("course-folders-container"),this.refreshBtn=document.getElementById("refresh-btn"),this.globalPdfInput=document.getElementById("global-pdf-input"),this.globalQuizInput=document.getElementById("global-quiz-input"),this.init()}async init(){z(async e=>{if(!e){window.location.href="./admin-login.html";return}if(!await E(e)){window.location.href="./admin-login.html";return}this.bindGlobalInputs(),this.refreshBtn.addEventListener("click",()=>this.loadData()),await this.loadData()},!0)}async loadData(){this.courseFoldersContainer.innerHTML=`
      <div class="skeleton-card" style="margin-bottom: var(--spacing-sm); padding: var(--spacing-md);"><div class="skeleton skeleton-title" style="margin-bottom:0;"></div></div>
      <div class="skeleton-card" style="margin-bottom: var(--spacing-sm); padding: var(--spacing-md);"><div class="skeleton skeleton-title" style="margin-bottom:0;"></div></div>
      <div class="skeleton-card" style="margin-bottom: var(--spacing-sm); padding: var(--spacing-md);"><div class="skeleton skeleton-title" style="margin-bottom:0;"></div></div>
    `;const[e,t]=await Promise.all([P(),$()]);this.allCourses=e.courses??[],this.allPDFs=t.pdfs??[],await this.renderAllFolders()}async renderAllFolders(){const e=[{id:"part1",title:"Part 1 — Traffic Rules & Road Safety",pdfIds:[],practiceTestIds:[]},{id:"part2",title:"Part 2 — Motor Vehicle Act",pdfIds:[],practiceTestIds:[]},{id:"part3",title:"Part 3 — Mechanical Knowledge",pdfIds:[],practiceTestIds:[]}],t=[...this.allCourses];if(e.forEach(n=>{t.find(a=>a.id===n.id)||t.unshift(n)}),t.length===0){this.courseFoldersContainer.innerHTML='<p style="text-align:center;color:#64748B;padding:2rem;">No courses found. Create a course first.</p>';return}const i={};await Promise.all(t.map(async n=>{if(!n.id)return;const a=await F(n.id);i[n.id]=a.tests??[]}));let s="";t.forEach(n=>{if(!n.id)return;const a=this.allPDFs.filter(p=>p.courseId===n.id||n.pdfIds?.includes(p.id??"")),l=i[n.id]??[],o=a.length+l.length;s+=this.buildCourseFolder(n,a,l,o)}),this.courseFoldersContainer.innerHTML=s,this.attachFolderEventListeners(),window.lucide?.createIcons()}buildCourseFolder(e,t,i,s){return`
      <div class="course-folder" data-course-id="${e.id}">
        <div class="folder-header" data-course-id="${e.id}">
          <i data-lucide="folder-open" class="folder-icon" width="20" height="20"></i>
          <span class="folder-title">${e.title}</span>
          <span class="folder-count">${s} items</span>
          <i data-lucide="chevron-down" class="chevron-icon" width="18" height="18"></i>
        </div>

        <div class="subfolders-container hidden" id="folder-content-${e.id}">
          <!-- PDFs Subfolder -->
          <div class="subfolder">
            <div class="subfolder-header">
              <i data-lucide="file-text" class="subfolder-icon pdf-icon" width="16" height="16"></i>
              <span class="subfolder-title">📄 PDFs</span>
              <span class="subfolder-count" id="pdf-count-${e.id}">${t.length} files</span>
              <button
                class="subfolder-upload-btn pdf-upload trigger-pdf-upload"
                data-course-id="${e.id}"
                title="Select one or more PDFs to upload">
                <i data-lucide="upload" width="12" height="12"></i> Upload PDFs
              </button>
            </div>

            <div class="subfolder-content" id="pdf-list-${e.id}">
              ${t.length>0?t.map(n=>this.buildPDFCard(n,e.id)).join(""):'<p class="empty-state">No PDFs uploaded yet.</p>'}
            </div>
          </div>

          <!-- Quiz/MCQ Subfolder -->
          <div class="subfolder">
            <div class="subfolder-header">
              <i data-lucide="pencil-line" class="subfolder-icon quiz-icon" width="16" height="16"></i>
              <span class="subfolder-title">🧪 Quiz / MCQs</span>
              <span class="subfolder-count" id="quiz-count-${e.id}">${i.length} quizzes</span>
              <button
                class="subfolder-upload-btn quiz-upload toggle-quiz-form"
                data-course-id="${e.id}"
                title="Add quiz to this course">
                <i data-lucide="plus" width="12" height="12"></i> Add Quiz
              </button>
            </div>

            <!-- Inline quiz creation form (hidden by default) -->
            <div class="quiz-inline-form hidden" id="quiz-form-${e.id}">
              <h4>
                <i data-lucide="brain" width="14" height="14"></i>
                New Quiz for "${e.title}"
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
              <div class="file-drop-zone quiz-drop-zone" data-course-id="${e.id}">
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
                <button class="btn-quiz-submit submit-quiz-btn" data-course-id="${e.id}">
                  <i data-lucide="save" width="14" height="14"></i> Save Quiz
                </button>
                <button class="btn-quiz-cancel cancel-quiz-form" data-course-id="${e.id}">Cancel</button>
              </div>
            </div>

            <div class="subfolder-content" id="quiz-list-${e.id}">
              ${i.length>0?i.map(n=>this.buildQuizCard(n)).join(""):'<p class="empty-state">No quizzes yet.</p>'}
            </div>
          </div>
        </div>
      </div>`}buildPDFCard(e,t){const i=(e.size/1048576).toFixed(2);return`
      <div class="pdf-card" data-id="${e.id}">
        <div class="pdf-icon-wrapper">
          <i data-lucide="file-text" width="16" height="16"></i>
        </div>
        <div class="pdf-info">
          <div class="pdf-name" title="${e.name}">${e.name}</div>
          <div class="pdf-meta">${i} MB</div>
        </div>
        <div class="pdf-actions">
          <a href="./pdf-viewer.html?name=${encodeURIComponent(e.name)}&url=${encodeURIComponent(e.url)}" class="btn-icon" title="Preview">
            <i data-lucide="eye" width="16" height="16"></i>
          </a>
          <button class="btn-icon delete delete-pdf-btn" data-id="${e.id}" data-url="${e.url}" data-course-id="${t}" title="Delete">
            <i data-lucide="trash-2" width="16" height="16"></i>
          </button>
        </div>
      </div>`}buildQuizCard(e){return`
      <div class="quiz-card" data-id="${e.id}">
        <div class="quiz-icon-wrapper">
          <i data-lucide="brain" width="16" height="16"></i>
        </div>
        <div class="pdf-info">
          <div class="pdf-name">${e.title}</div>
          <div class="quiz-meta-row">
            <span class="quiz-meta"><i data-lucide="help-circle" width="12" height="12"></i> ${e.questions?.length??0} questions</span>
            <span class="quiz-meta"><i data-lucide="clock" width="12" height="12"></i> ${e.duration} min</span>
          </div>
        </div>
        <div class="pdf-actions">
          <button class="btn-icon delete delete-quiz-btn" data-id="${e.id}" title="Delete quiz">
            <i data-lucide="trash-2" width="16" height="16"></i>
          </button>
        </div>
      </div>`}attachFolderEventListeners(){document.querySelectorAll(".folder-header").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-course-id"),i=document.getElementById(`folder-content-${t}`),s=e.querySelector(".chevron-icon");i?.classList.toggle("hidden"),s?.classList.toggle("rotate-180")})}),document.querySelectorAll(".trigger-pdf-upload").forEach(e=>{e.addEventListener("click",t=>{t.stopPropagation();const i=e.getAttribute("data-course-id"),s=e.getAttribute("data-progress-id");this.activePdfCourseId=i,this.activePdfProgressEl=document.getElementById(s),this.globalPdfInput.value="",this.globalPdfInput.click()})}),document.querySelectorAll(".toggle-quiz-form").forEach(e=>{e.addEventListener("click",t=>{t.stopPropagation();const i=e.getAttribute("data-course-id"),s=document.getElementById(`quiz-form-${i}`);s.classList.toggle("hidden"),e.textContent=s.classList.contains("hidden")?"+ Add Quiz":"✕ Close",window.lucide?.createIcons()})}),document.querySelectorAll(".cancel-quiz-form").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-course-id");this.resetQuizForm(t)})}),document.querySelectorAll(".quiz-drop-zone").forEach(e=>{const t=e.querySelector(".quiz-file-input"),i=e.getAttribute("data-course-id");e.addEventListener("click",()=>t.click()),e.addEventListener("dragover",s=>{s.preventDefault(),e.classList.add("dragover")}),e.addEventListener("dragleave",()=>e.classList.remove("dragover")),e.addEventListener("drop",s=>{s.preventDefault(),e.classList.remove("dragover"),s.dataTransfer?.files[0]&&this.onQuizFileSelected(s.dataTransfer.files[0],i)}),t.addEventListener("change",()=>{t.files?.[0]&&this.onQuizFileSelected(t.files[0],i)})}),document.querySelectorAll(".submit-quiz-btn").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-course-id");this.onSubmitQuiz(t,e)})}),document.querySelectorAll(".dl-excel-template").forEach(e=>{e.addEventListener("click",()=>A())}),document.querySelectorAll(".dl-json-template").forEach(e=>{e.addEventListener("click",()=>I())}),document.querySelectorAll(".delete-pdf-btn").forEach(e=>{e.addEventListener("click",async()=>{const t=e.getAttribute("data-id"),i=e.getAttribute("data-url"),s=e.getAttribute("data-course-id");if(!await b("Delete PDF?","This will remove the PDF from the course.","Delete PDF"))return;e.disabled=!0;const a=await y(t,i,s);a.success?(e.closest(".pdf-card")?.remove(),this.updatePDFCount(s),d("PDF deleted.","success")):(d("Error: "+a.error,"error"),e.disabled=!1)})}),document.querySelectorAll(".delete-quiz-btn").forEach(e=>{e.addEventListener("click",async()=>{const t=e.getAttribute("data-id");if(!await b("Delete Quiz?","This will permanently delete the quiz and all its questions.","Delete Quiz"))return;e.disabled=!0;const s=await w(t);s.success?(e.closest(".quiz-card")?.remove(),d("Quiz deleted.","success")):(d("Error: "+s.error,"error"),e.disabled=!1)})})}bindGlobalInputs(){this.globalPdfInput.addEventListener("change",async()=>{const e=Array.from(this.globalPdfInput.files??[]);if(this.globalPdfInput.value="",!e.length||!this.activePdfCourseId)return;const t=this.activePdfCourseId,i=document.getElementById(`pdf-list-${t}`),s=new Set(Array.from(i?.querySelectorAll(".pdf-name")??[]).map(u=>u.textContent?.trim()??"")),n=[];for(const u of e)s.has(u.name)?d(`"${u.name}" is already in this folder — skipped.`,"warning",4e3):n.push(u);if(n.length===0)return;const a=`upload-queue-${t}`;let l=document.getElementById(a);l||(l=document.createElement("div"),l.id=a,l.className="upload-queue",i?.parentElement?.insertBefore(l,i));const o=n.map((u,g)=>{const c=`uq-${t}-${Date.now()}-${g}`,v=u.name.length>32?u.name.substring(0,30)+"…":u.name,f=document.createElement("div");return f.id=c,f.className="upload-queue-item",f.innerHTML=`
          <div class="uq-meta">
            <span class="uq-icon">📄</span>
            <span class="uq-name" title="${u.name}">${v}</span>
            <span class="uq-pct" id="${c}-pct">0%</span>
          </div>
          <div class="uq-bar-bg"><div class="uq-bar-fill" id="${c}-fill" style="width:0%"></div></div>
        `,l.appendChild(f),c}),p=await Promise.all(n.map((u,g)=>this.uploadOnePDF(u,t,c=>{const v=document.getElementById(`${o[g]}-fill`),f=document.getElementById(`${o[g]}-pct`);v&&(v.style.width=`${c}%`),f&&(f.textContent=`${c}%`)}).finally(()=>{setTimeout(()=>{const c=document.getElementById(o[g]);c&&(c.style.opacity="0",c.style.transition="opacity 0.4s"),setTimeout(()=>document.getElementById(o[g])?.remove(),450)},700)})));setTimeout(()=>{l?.children.length||l?.remove()},1200);const m=p.filter(Boolean).length,r=p.length-m;p.length>1&&(r===0?d(`All ${p.length} PDFs uploaded!`,"success"):d(`${m} uploaded, ${r} failed.`,r===p.length?"error":"warning"))})}async onQuizFileSelected(e,t){const i=document.querySelector(`#quiz-form-${t} .quiz-file-label`);i&&(i.textContent="Parsing file…",i.classList.remove("hidden"));try{let s;e.name.endsWith(".json")?s=await Q(e):s=await S(e),this.pendingQuizQuestions[t]={questions:s,fileName:e.name},i&&(i.textContent=`✓ ${s.length} questions loaded from "${e.name}"`),d(`${s.length} questions loaded!`,"success",2500)}catch(s){d("Error parsing file: "+s.message,"error"),i&&(i.textContent=""),delete this.pendingQuizQuestions[t]}}async onSubmitQuiz(e,t){const i=document.getElementById(`quiz-form-${e}`),s=i.querySelector(".quiz-title-input")?.value.trim()??"",n=parseInt(i.querySelector(".quiz-duration-input")?.value??"0"),a=i.querySelector(".quiz-category-input")?.value??"Practice Test",l=i.querySelector(".quiz-desc-input")?.value.trim()??"",o=this.pendingQuizQuestions[e];if(!s){d("Please enter a quiz title.","warning");return}if(!n||n<1){d("Please enter a valid duration (minutes).","warning");return}if(!o||o.questions.length===0){d("Please upload an Excel or Google Form JSON file with questions.","warning");return}t.disabled=!0,t.textContent="Saving…";const p=e==="part1"||e==="part2"||e==="part3"?e:void 0,m=await C({title:s,description:l,questions:o.questions,duration:n,courseId:e,partId:p,category:a});if(m.success){const r=document.getElementById(`quiz-list-${e}`);r.querySelector(".empty-state")?.remove();const g={id:m.id,title:s,description:l,questions:o.questions,duration:n,courseId:e,category:a,createdAt:null};r.insertAdjacentHTML("beforeend",this.buildQuizCard(g));const c=r.querySelector(`.delete-quiz-btn[data-id="${m.id}"]`);c&&c.addEventListener("click",async()=>{if(!await b("Delete Quiz?","This will permanently delete the quiz.","Delete Quiz"))return;c.disabled=!0;const q=await w(m.id);q.success?(c.closest(".quiz-card")?.remove(),d("Quiz deleted.","success")):(d("Error: "+q.error,"error"),c.disabled=!1)});const v=document.getElementById(`quiz-count-${e}`);if(v){const f=parseInt(v.textContent??"0");v.textContent=`${f+1} quizzes`}d("Quiz saved successfully!","success"),delete this.pendingQuizQuestions[e],this.resetQuizForm(e),window.lucide?.createIcons()}else d("Error saving quiz: "+m.error,"error");t.disabled=!1,t.innerHTML='<i data-lucide="save" width="14" height="14"></i> Save Quiz',window.lucide?.createIcons()}resetQuizForm(e){const t=document.getElementById(`quiz-form-${e}`);if(!t)return;t.querySelector(".quiz-title-input").value="",t.querySelector(".quiz-duration-input").value="",t.querySelector(".quiz-desc-input").value="",t.querySelector(".quiz-file-input").value="";const i=t.querySelector(".quiz-file-label");i&&(i.textContent="",i.classList.add("hidden")),t.classList.add("hidden"),delete this.pendingQuizQuestions[e];const s=document.querySelector(`.toggle-quiz-form[data-course-id="${e}"]`);s&&(s.innerHTML='<i data-lucide="plus" width="12" height="12"></i> Add Quiz'),window.lucide?.createIcons()}async uploadOnePDF(e,t,i){const n=await D(e,t,t==="part1"||t==="part2"||t==="part3"?t:void 0,i);if(n.success){const a=document.getElementById(`pdf-list-${t}`);a.querySelector(".empty-state")?.remove();const l={id:n.id,name:e.name,url:n.url,size:e.size,uploadedAt:null};a.insertAdjacentHTML("beforeend",this.buildPDFCard(l,t));const o=a.querySelector(`.delete-pdf-btn[data-id="${n.id}"]`);return o&&o.addEventListener("click",async()=>{if(!await b("Delete PDF?","This will remove the PDF from this course.","Delete PDF"))return;o.disabled=!0;const m=await y(n.id,n.url,t);m.success?(o.closest(".pdf-card")?.remove(),this.updatePDFCount(t),d("PDF deleted.","success")):(d("Error: "+m.error,"error"),o.disabled=!1)}),this.updatePDFCount(t),window.lucide?.createIcons(),e===(this.globalPdfInput.files?.[0]??e)&&(this.globalPdfInput.files?.length??0)<=1&&d(`"${e.name}" uploaded!`,"success"),!0}else return d(`Failed "${e.name}": `+n.error,"error"),!1}async uploadPDF(e,t){return this.uploadOnePDF(e,t,()=>{})}updatePDFCount(e){const t=document.getElementById(`pdf-list-${e}`),i=document.getElementById(`pdf-count-${e}`);if(!t||!i)return;const s=t.querySelectorAll(".pdf-card").length;i.textContent=`${s} files`}}new x;
