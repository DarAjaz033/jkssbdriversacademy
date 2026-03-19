import"./firebase-config-B4XEnROW.js";/* empty css               */import{o}from"./auth-service-DMDvh9zM.js";import{j as r,l as i,a as d}from"./admin-service-Bd7EHEIN.js";import{s as c}from"./admin-toast-8NJD7knF.js";class u{constructor(){this.purchasesContainer=document.getElementById("purchases-container"),this.init()}async init(){o(async s=>{if(!s){window.location.href="./admin-login.html";return}if(!await r(s)){window.location.href="./admin-login.html";return}await this.loadPurchases()},!0)}async loadPurchases(){const s=await i();if(s.success&&s.purchases){const n=await Promise.all(s.purchases.map(async t=>{const e=await d(t.courseId);return{...t,courseName:e.success&&e.course?e.course.title:"Unknown Course"}}));this.purchasesContainer.innerHTML=n.sort((t,e)=>{const a=t.purchasedAt?.seconds||0;return(e.purchasedAt?.seconds||0)-a}).map(t=>this.renderPurchaseRow(t)).join("")}else this.purchasesContainer.innerHTML='<tr><td colspan="6" style="text-align: center; color: #64748B; padding: 2rem;">No purchases found.</td></tr>',c("No purchases to display.","info",2500)}renderPurchaseRow(s){const n=s.purchasedAt?.seconds?new Date(s.purchasedAt.seconds*1e3).toLocaleDateString():"N/A",t=s.status==="completed"?"completed":s.status==="pending"?"pending":"failed";return`
      <tr>
        <td>
            <div class="user-info">
                <span>${s.userId.substring(0,10)}...</span>
                <span class="user-email">UID: ${s.userId}</span>
            </div>
        </td>
        <td style="font-weight: 600;">${s.courseName}</td>
        <td style="font-weight: 700;">₹${s.amount}</td>
        <td style="font-family: monospace; font-size: 0.75rem; color: #64748B;">${s.paymentId}</td>
        <td><span class="status-badge ${t}">${s.status.toUpperCase()}</span></td>
        <td>${n}</td>
      </tr>
    `}}new u;
