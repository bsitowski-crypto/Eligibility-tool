(function(){
  "use strict";
  let installed=false;
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function allDonors(){try{return donors||[]}catch{return[]}}
  function persist(){try{if(typeof save==="function")save()}catch{}}
  function ensureActiveFilterAnchor(){
    if(document.getElementById("f_active"))return;
    const host=document.getElementById("f_planning")?.parentElement||document.querySelector(".filters,.chips");
    if(!host)return;
    const b=document.createElement("button");b.id="f_active";b.type="button";b.className="chip active";b.textContent="Active";b.style.display="none";b.setAttribute("aria-hidden","true");host.appendChild(b);
  }
  function migrate(){let changed=false;for(const d of allDonors()){if(d.status!=="pending"&&d.status!=="archived"&&d.status!=="active"){d.status="active";changed=true}}if(changed)persist()}
  function donorLabel(){return "PDX DONOR"}
  function demoSafe(d){try{return typeof demo==="function"?demo(d):`${d.age||"?"} ${d.sex==="female"?"F":"M"}`}catch{return""}}
  function teamText(d){return[d.circulator,d.tech1,d.tech2].filter(Boolean).join(" / ")}
  function pickupText(d){return d.transportPickupType==="f"?(d.funeralHome||d.referralSource||"—"):(d.referralSource||d.funeralHome||"—")}
  function recPreview(d){try{return typeof preview==="function"?preview(d):""}catch{return""}}
  function cardHtml(d){
    const team=teamText(d),notes=(d.status==="pending"?d.medicalNotes:d.caseNotes)||"";
    const pendingInfo=d.status==="pending"?`<div class="kv"><strong>Authorization:</strong> ${d.authorizationComplete?"Complete":"Pending"} · <strong>Records:</strong> ${d.medicalRecordsReviewed?"Reviewed":"Pending"}</div>`:`<div class="kv"><strong>Recovery:</strong> ${esc(recPreview(d))}</div>`;
    return `<div class="donor ${d.status}"><div class="name">${donorLabel()}</div><div class="demo">${esc(demoSafe(d))}</div><span class="pill ${d.status}">${d.status.toUpperCase()}</span><div class="kv"><strong>Team:</strong> ${esc(d.caseTeam||"Not assigned")}${team?` — ${esc(team)}`:""}</div><div class="kv"><strong>Pickup:</strong> ${esc(pickupText(d))}</div>${pendingInfo}${notes?`<div class="note">${esc(notes.slice(0,220))}${notes.length>220?"…":""}</div>`:""}<div class="actions"><button class="primary donor-open-btn" data-donor-id="${esc(d.id)}">OPEN DONOR</button>${d.status==="pending"?`<button type="button" data-simple-status="active" data-donor-id="${esc(d.id)}">MAKE ACTIVE</button>`:""}<button type="button" data-simple-archive="${esc(d.id)}">ARCHIVE</button></div></div>`;
  }
  function renderSimpleBoard(){
    const b=document.getElementById("board");if(!b)return;
    let pendingOn=true,activeOn=true;try{pendingOn=filters.pending!==false;activeOn=filters.active!==false}catch{}
    b.innerHTML="";
    for(const [status,title,on] of [["pending","PENDING",pendingOn],["active","ACTIVE",activeOn]]){
      if(!on)continue;const rows=allDonors().filter(d=>d.status===status);
      b.innerHTML+=`<div class="section"><div class="sectiontitle">${title} (${rows.length})</div><div class="grid">${rows.map(cardHtml).join("")}</div></div>`;
    }
    try{if(typeof bindDonorOpenButtons==="function")bindDonorOpenButtons()}catch{}
    refreshFilterUI();
  }
  function refreshFilterUI(){
    const p=document.getElementById("f_pending"),a=document.getElementById("f_planning"),ip=document.getElementById("f_in_progress"),c=document.getElementById("f_complete"),hiddenA=document.getElementById("f_active");
    if(p){p.textContent="Pending";p.setAttribute("onclick","toggleSimpleStatusFilter('pending')");try{p.classList.toggle("on",filters.pending!==false)}catch{}}
    if(a){a.textContent="Active";a.className="chip active"+(function(){try{return filters.active!==false?" on":""}catch{return" on"}})();a.setAttribute("onclick","toggleSimpleStatusFilter('active')")}
    if(hiddenA)hiddenA.style.display="none";
    if(ip)ip.style.display="none";if(c)c.style.display="none";
  }
  window.toggleSimpleStatusFilter=function(s){try{if(typeof filters!=="object")return;filters[s]=filters[s]===false;persist();renderSimpleBoard()}catch{}};
  function setStatus(id,status){const d=allDonors().find(x=>String(x.id)===String(id));if(!d)return;d.status=status;if(status==="active"&&!d.actualStart)d.actualStart=null;persist();renderSimpleBoard()}
  function archive(id){const d=allDonors().find(x=>String(x.id)===String(id));if(!d)return;d.status="archived";d.archivedAt=new Date().toISOString();persist();renderSimpleBoard()}
  function simplifySelect(){const s=document.getElementById("status");if(!s)return;s.innerHTML='<option value="pending">Pending</option><option value="active">Active</option>';let d=null;try{d=typeof cur==="function"?cur():null}catch{};if(d)s.value=d.status==="pending"?"pending":"active"}
  function replaceRestore(){window.restore=function(id){const d=allDonors().find(x=>String(x.id)===String(id));if(!d)return;d.status="active";d.archivedAt=null;persist();try{if(typeof renderArchive==="function")renderArchive()}catch{};try{renderSimpleBoard()}catch{}}}
  function replaceUpdateStatus(){window.updateStatus=function(){let d=null;try{d=typeof cur==="function"?cur():null}catch{};if(!d)return;const el=document.getElementById("statusSummary"),s=document.getElementById("status")?.value||d.status;if(!el)return;el.className="status "+(s==="pending"?"pending":"active");el.innerHTML=s==="pending"?"<strong>PENDING</strong><br>Potential donor under review.":"<strong>ACTIVE</strong><br>Donor case is active."}}
  function install(){if(installed)return true;if(typeof window.renderBoard!=="function"||!document.getElementById("status"))return false;
    ensureActiveFilterAnchor();
    try{filters.active=filters.active!==false}catch{}
    migrate();simplifySelect();window.renderBoard=renderSimpleBoard;replaceRestore();replaceUpdateStatus();
    const style=document.createElement("style");style.id="simpleStatusStyle";style.textContent='.pill.active{background:#2e8b57}.status.active{background:#eef8f2;border-left-color:#2e8b57}.chip.active.on{background:#2e8b57;color:#fff}.donor.active{border-left-color:#2e8b57;background:#fff}';document.head.appendChild(style);
    document.addEventListener("click",e=>{const s=e.target.closest?.("[data-simple-status][data-donor-id]");if(s){e.preventDefault();setStatus(s.dataset.donorId,s.dataset.simpleStatus);return}const a=e.target.closest?.("[data-simple-archive]");if(a){e.preventDefault();archive(a.dataset.simpleArchive)}},false);
    const status=document.getElementById("status");status.addEventListener("change",()=>{let d=null;try{d=typeof cur==="function"?cur():null}catch{};if(!d)return;d.status=status.value==="pending"?"pending":"active";persist();replaceUpdateStatus();});
    installed=true;renderSimpleBoard();return true}
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>60)clearInterval(timer)},200);
  setInterval(()=>{if(!installed)return;ensureActiveFilterAnchor();simplifySelect();refreshFilterUI()},1500);
})();
