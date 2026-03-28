import{d as g,a as b,g as p}from"./firebase-config-k64TBo1P.js";/* empty css               */import{e as h}from"./escape-html-BUkjI-KV.js";class y{constructor(){this.test=null,this.currentQuestionIndex=0,this.userAnswers=[],this.currentState="LOBBY",this.timerInterval=null,this.timeRemaining=0,this.handleFullscreenChange=()=>{!document.fullscreenElement&&this.currentState==="IN_PROGRESS"&&(this.pauseTimer(),this.showAntiCheatWarning())},this.testContent=document.getElementById("test-content"),this.init()}async init(){const e=new URLSearchParams(window.location.search).get("id");if(!e){this.testContent.innerHTML='<div style="text-align: center; padding: var(--spacing-xl);">Test not found</div>';return}await this.loadTest(e)}async loadTest(t){try{const e=g(b,"practiceTests",t),s=await p(e);if(s.exists()){this.test={id:s.id,...s.data()},this.userAnswers=new Array(this.test.questions.length).fill(null);const i=this.test.questions.length;this.timeRemaining=i*60,this.render()}else this.testContent.innerHTML='<div style="text-align: center; padding: var(--spacing-xl);">Test not found</div>'}catch{this.testContent.innerHTML='<div style="text-align: center; padding: var(--spacing-xl);">Error loading test</div>'}}render(){if(this.test)switch(this.currentState==="IN_PROGRESS"?document.body.classList.add("is-testing"):document.body.classList.remove("is-testing"),this.currentState){case"LOBBY":this.renderLobby();break;case"IN_PROGRESS":this.renderActiveTest();break;case"REVIEW":this.renderActiveTest(!0);break;case"RESULTS":this.renderResults();break}}renderLobby(){if(!this.test)return;const t=this.test.questions.length,e=t*1;this.testContent.innerHTML=`
      <div class="lobby-card">
        <h1 class="lobby-title">${this.test.title}</h1>
        
        <div class="lobby-instructions">
          <h3><i data-lucide="info" width="20"></i> Important Instructions</h3>
          <ul>
            <li><i data-lucide="check-circle-2" width="16" color="#16A34A"></i> <strong>Total Questions:</strong> ${t}</li>
            <li><i data-lucide="award" width="16" color="#EAB308"></i> <strong>Total Marks:</strong> ${e}</li>
            <li><i data-lucide="clock" width="16" color="#3B82F6"></i> <strong>Time limit:</strong> 1 Minute per Question (${t} mins total)</li>
            <li><i data-lucide="alert-triangle" width="16" color="#DC2626"></i> <strong>Negative Marking:</strong> 0.25 marks deducted per wrong answer.</li>
            <li><i data-lucide="maximize" width="16" color="#7C3AED"></i> <strong>Fullscreen:</strong> Test will enforce fullscreen mode. Exiting may pause or flag the attempt.</li>
          </ul>
        </div>

        <button class="btn btn-primary" id="start-test-btn" style="width: 100%; font-size: 16px; padding: 14px;">
          Start Test Now
        </button>
      </div>
    `,document.getElementById("start-test-btn")?.addEventListener("click",()=>this.startTest()),window.lucide.createIcons()}async startTest(){try{document.documentElement.requestFullscreen&&await document.documentElement.requestFullscreen()}catch(t){console.warn("Fullscreen API block:",t)}document.addEventListener("fullscreenchange",this.handleFullscreenChange),this.currentState="IN_PROGRESS",this.startTimer(),this.render()}showAntiCheatWarning(){let t=document.getElementById("warn-modal");t||(t=document.createElement("div"),t.id="warn-modal",t.className="modal-overlay",t.innerHTML=`
        <div class="modal-content">
          <i data-lucide="alert-octagon" width="48" height="48" color="#DC2626" style="margin: 0 auto 16px;"></i>
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Test Paused</h2>
          <p style="color: #475569; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
            You have exited full-screen mode. This is prohibited during an active test to prevent cheating. 
            Please resume the test to continue your attempt.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-secondary" id="warn-submit-btn">Submit Early</button>
            <button class="btn btn-primary" id="warn-resume-btn">Resume Test</button>
          </div>
        </div>
      `,document.body.appendChild(t),window.lucide.createIcons(),document.getElementById("warn-submit-btn")?.addEventListener("click",()=>{t?.remove(),this.submitTest()}),document.getElementById("warn-resume-btn")?.addEventListener("click",async()=>{try{document.documentElement.requestFullscreen&&await document.documentElement.requestFullscreen()}catch{}t?.classList.remove("active"),setTimeout(()=>t?.remove(),300),this.startTimer()})),requestAnimationFrame(()=>{t?.classList.add("active")})}startTimer(){this.timerInterval!==null&&window.clearInterval(this.timerInterval),this.timerInterval=window.setInterval(()=>{this.timeRemaining--,this.updateTimerUI(),this.timeRemaining<=0&&(this.timerInterval!==null&&window.clearInterval(this.timerInterval),this.submitTest())},1e3)}pauseTimer(){this.timerInterval!==null&&window.clearInterval(this.timerInterval)}updateTimerUI(){const t=Math.floor(this.timeRemaining/60).toString().padStart(2,"0"),e=(this.timeRemaining%60).toString().padStart(2,"0"),s=document.getElementById("dash-timer-txt");if(s){s.textContent=`${t}:${e}`;const i=document.getElementById("dash-timer-wrap");this.timeRemaining<=60&&i&&i.classList.add("dash-time-warn")}}renderActiveTest(t=!1){if(!this.test)return;const e=this.test.questions[this.currentQuestionIndex],s=this.currentQuestionIndex===0,i=this.currentQuestionIndex===this.test.questions.length-1,r=this.userAnswers[this.currentQuestionIndex],a=e.correctAnswer;let l="";if(t)l=`
        <div class="test-dash-header" style="background: #FOFDFA">
          <button class="btn btn-secondary" id="exit-review-btn" style="padding: 6px 12px; font-size: 12px;">
            <i data-lucide="arrow-left" width="14" style="margin-right:4px; vertical-align:middle;"></i>Back to Results
          </button>
          <div style="font-weight:700; color:#0D9488;">Review Mode</div>
        </div>
      `;else{const c=Math.floor(this.timeRemaining/60).toString().padStart(2,"0"),n=(this.timeRemaining%60).toString().padStart(2,"0");l=`
        <div class="test-dash-header">
          <div style="font-weight:700; color:#475569; font-size:16px;">Practice Test</div>
          <div class="dash-timer ${this.timeRemaining<=60?"dash-time-warn":""}" id="dash-timer-wrap">
            <i data-lucide="timer" width="18"></i> <span id="dash-timer-txt">${c}:${n}</span>
          </div>
        </div>
      `}const d=e.options.map((c,n)=>{let o="";if(t){n===a?o="correct":n===r&&n!==a&&(o="wrong");let m="";return n===a?m='<span style="margin-left:auto; color:#16A34A; font-weight:700; font-size:12px;">Correct Answer</span>':n===r&&(m='<span style="margin-left:auto; color:#DC2626; font-weight:700; font-size:12px;">Your Answer</span>'),`
          <div class="option-item ${o}" style="cursor: default;">
            <div class="option-radio ${r===n?"selected":""}"></div>
            <div class="option-text">${h(c)}</div>
            ${m}
          </div>
        `}else return o=r===n?"selected":"",`
          <div class="option-item selectable-option ${o}" data-index="${n}">
            <div class="option-radio ${r===n?"selected":""}"></div>
            <div class="option-text">${h(c)}</div>
          </div>
        `}).join(""),v=`
      <button class="btn btn-secondary" id="prev-btn" ${s?"disabled":""}>
        Back
      </button>
    `;let u="";!t&&i?u=`
        <button class="btn btn-primary" id="submit-test-btn" style="background:#16A34A;">
          Submit Test
        </button>
      `:u=`
        <button class="btn btn-primary" id="next-btn" ${i?"disabled":""}>
          Next
        </button>
      `,this.testContent.innerHTML=`
      ${l}
      <div class="question-card">
        <div class="question-number">Question ${this.currentQuestionIndex+1} of ${this.test.questions.length}</div>
        <div class="question-text">${h(e.question)}</div>
        <div class="options-list">
          ${d}
        </div>
      </div>

      <div class="test-nav">
        ${v}
        ${u}
      </div>
      
      ${t?"":`
        <div style="margin-top: var(--spacing-xl); text-align: center; border-top: 1px solid #E2E8F0; padding-top: var(--spacing-lg);">
          <button class="btn btn-secondary" id="leave-test-btn" style="color: #DC2626; border-color: #FECACA; background: #FEF2F2;">
            <i data-lucide="log-out" width="16" style="margin-right:8px; vertical-align:middle;"></i>Leave Test
          </button>
        </div>
      `}
    `,this.attachActiveTestListeners(t),window.lucide.createIcons()}attachActiveTestListeners(t){t||document.querySelectorAll(".selectable-option").forEach(e=>{e.addEventListener("click",s=>{const i=parseInt(s.currentTarget.getAttribute("data-index"));this.userAnswers[this.currentQuestionIndex]=i,this.render()})}),document.getElementById("prev-btn")?.addEventListener("click",()=>{this.currentQuestionIndex>0&&(this.currentQuestionIndex--,this.render())}),document.getElementById("next-btn")?.addEventListener("click",()=>{this.currentQuestionIndex<this.test.questions.length-1&&(this.currentQuestionIndex++,this.render())}),document.getElementById("leave-test-btn")?.addEventListener("click",()=>this.confirmLeave()),document.getElementById("exit-review-btn")?.addEventListener("click",()=>{this.currentState="RESULTS",this.render()}),document.getElementById("submit-test-btn")?.addEventListener("click",()=>this.confirmSubmit())}confirmLeave(){this.pauseTimer(),confirm("Are you sure you want to completely leave this test? Your progress will be lost.")?(document.fullscreenElement&&document.exitFullscreen().catch(e=>console.warn(e)),window.location.href="mock-tests.html"):this.startTimer()}confirmSubmit(){this.pauseTimer();let t=this.userAnswers.filter(s=>s===null).length,e=document.createElement("div");e.className="modal-overlay",e.innerHTML=`
      <div class="modal-content">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Submit Test?</h2>
        <p style="color: #475569; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
          You are about to submit your test. <br>
          <strong style="color: #DC2626">Unanswered Questions: ${t}</strong><br>
          Are you sure you want to proceed?
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-secondary" id="conf-cancel-btn">Back to Test</button>
          <button class="btn btn-primary" id="conf-submit-btn" style="background:#16A34A;">Yes, Submit</button>
        </div>
      </div>
    `,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add("active")),document.getElementById("conf-cancel-btn")?.addEventListener("click",()=>{e.classList.remove("active"),setTimeout(()=>e.remove(),300),this.startTimer()}),document.getElementById("conf-submit-btn")?.addEventListener("click",()=>{e.classList.remove("active"),setTimeout(()=>e.remove(),300),this.submitTest()})}submitTest(){this.timerInterval!==null&&window.clearInterval(this.timerInterval),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),this.currentState="RESULTS",this.render()}renderResults(){if(!this.test)return;let t=0,e=0,s=0;this.test.questions.forEach((a,l)=>{const d=this.userAnswers[l];d===null?s++:d===a.correctAnswer?t++:e++});const i=t*1-e*.25,r=this.test.questions.length;this.testContent.innerHTML=`
      <div class="results-card">
        <i data-lucide="check-circle" width="48" height="48" color="#16A34A" style="margin: 0 auto 16px;"></i>
        <div class="test-title">Test Submitted Successfully!</div>
        
        <div style="margin: var(--spacing-xl) 0; padding: var(--spacing-xl); background: #F8FAFC; border-radius: var(--radius-lg); border: 2px solid #E2E8F0;">
          <div style="font-size: 14px; color: #64748B; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;">Total Score</div>
          <div class="results-score" style="margin: 0;">${i.toFixed(2)} <span style="font-size: 20px; color:#94A3B8;">/ ${r}</span></div>
        </div>

        <div class="results-grid">
          <div class="stat-item" style="background: #DCFCE7; border: 1px solid #BBF7D0;">
            <div class="stat-value" style="color: #16A34A;">${t}</div>
            <div class="stat-label">Correct (+1)</div>
          </div>
          <div class="stat-item" style="background: #FEE2E2; border: 1px solid #FECACA;">
            <div class="stat-value" style="color: #DC2626;">${e}</div>
            <div class="stat-label">Wrong (-0.25)</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${s}</div>
            <div class="stat-label">Unattempted (0)</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${r}</div>
            <div class="stat-label">Total Questions</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: var(--spacing-xl);">
          <button class="btn btn-primary" id="review-btn" style="padding: 14px; font-size: 16px;">
            <i data-lucide="eye" width="18" style="margin-right:8px; vertical-align:middle;"></i>See Correct Answers
          </button>
          
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-secondary" onclick="location.reload()" style="flex:1;">Reattempt</button>
            <button class="btn btn-secondary" id="results-leave-btn" style="flex:1;">Leave Test</button>
          </div>
        </div>
      </div>
    `,document.getElementById("review-btn")?.addEventListener("click",()=>{this.currentState="REVIEW",this.currentQuestionIndex=0,this.render()}),document.getElementById("results-leave-btn")?.addEventListener("click",()=>{document.fullscreenElement&&document.exitFullscreen().catch(a=>console.warn(a)),window.location.href="mock-tests.html"}),window.lucide.createIcons()}}new y;
