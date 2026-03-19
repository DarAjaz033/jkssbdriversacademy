import"./firebase-config-B4XEnROW.js";/* empty css               */import{o as i}from"./auth-service-DMDvh9zM.js";import{a as n,h as o}from"./admin-service-Bd7EHEIN.js";class c{constructor(){this.course=null,this.userId=null,this.userEmail=null,this.userName=null,this.courseContent=document.getElementById("course-content"),this.init()}async init(){const e=new URLSearchParams(window.location.search).get("id");if(!e){this.courseContent.innerHTML='<div style="text-align: center; padding: var(--spacing-xl);">Course not found</div>';return}i(async s=>{s?(this.userId=s.uid,this.userEmail=s.email||"",this.userName=s.displayName||"Student",await this.loadCourse(e)):this.courseContent.innerHTML=`
          <div style="text-align: center; padding: var(--spacing-xl);">
            <p style="margin-bottom: var(--spacing-md);">Please sign in to purchase this course</p>
            <a href="./index.html" class="btn btn-primary">Go to Home</a>
          </div>
        `})}async loadCourse(t){const e=await n(t);if(e.success&&e.course){this.course=e.course;const s=await o(this.userId,t);if(this.courseContent.innerHTML=`
        <div class="course-header">
          <div class="course-title">${this.course.title}</div>
          <div class="course-meta">
            <span>${this.course.duration}</span>
            <span>•</span>
            <span>${(this.course.category||"").replace("-"," ").toUpperCase()}</span>
          </div>
        </div>

        ${s.hasPurchased?`
          <div class="already-purchased">
            You already own this course! Go to My Courses to access it.
          </div>
          <a href="./my-courses.html" class="btn btn-primary" style="width: 100%; text-align: center; display: block; text-decoration: none;">
            Go to My Courses
          </a>
        `:`
          <div class="course-body">
            <div class="section-title">About This Course</div>
            <div class="course-description">${this.course.description}</div>
          </div>

          <div class="price-card">
            <div class="price-label">Course Price</div>
            <div class="price-amount">₹${this.course.price}</div>
          </div>

          <button class="purchase-btn" id="purchase-btn">
            Purchase Course
          </button>
          <p style="text-align: center; font-size: 12px; color: var(--text-tertiary); margin-top: var(--spacing-sm);">
            Secure payment powered by Cashfree
          </p>
        `}
      `,!s.hasPurchased){const r=document.getElementById("purchase-btn");r&&r.addEventListener("click",()=>this.handlePurchase())}window.lucide.createIcons()}else this.courseContent.innerHTML='<div style="text-align: center; padding: var(--spacing-xl);">Course not found</div>'}async handlePurchase(){if(!this.course||!this.userId)return;const t=document.getElementById("purchase-btn");t.disabled=!0,t.textContent="Creating Secure Order...";try{const e=await fetch("/api/payment/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId:this.course.id,courseName:this.course.title,amount:this.course.price,userId:this.userId,userEmail:this.userEmail,userName:this.userName})});if(!e.ok){const a=await e.json();throw new Error(a.error||"Failed to create payment order")}const{paymentSessionId:s}=await e.json();if(!s)throw new Error("No payment session returned from server");if(typeof window.Cashfree>"u")throw new Error("Cashfree SDK not loaded. Please refresh the page and try again.");(await window.Cashfree({mode:"production"})).checkout({paymentSessionId:s,redirectTarget:"_self"})}catch(e){alert("Payment error: "+(e.message||"Unknown error")),t.disabled=!1,t.textContent="Purchase Course"}}}new c;
