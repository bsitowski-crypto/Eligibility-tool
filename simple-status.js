(function(){
  "use strict";
  let installed=false;
  const noteDrafts=new Map();
  function noteOwner(){try{return window.firebase?.auth().currentUser?.uid||""}catch{return ""}}
  function notesHtml(d){
    const draft=noteDrafts.get(d.id),editing=draft&&draft.owner===noteOwner(),notes=String(d.caseNotes||"");
    return `<section class="priority-notes" data-notes-id="${esc(d.id)}"><div class="priority-notes-head"><strong>CASE NOTES</strong>${editing?"":`<button type="button" data-edit-notes="${esc(d.id)}">${notes?"Edit":"Add"} notes</button>`}</div>${editing?`<textarea aria-label="Case notes" data-note-input="${esc(d.id)}" ${draft.busy?"disabled":""}>${esc(draft.text)}</textarea><div class="priority-notes-buttons"><button type="button" data-cancel-notes="${esc(d.id)}" ${draft.busy?"disabled":""}>Cancel</button><button type="button" class="primary" data-save-notes="${esc(d.id)}" ${draft.busy?"disabled":""}>${draft.busy?"Saving…":"Save notes"}</button></div><div role="status">${esc(draft.error||"")}</div>`:`<div class="priority-note-text">${notes?esc(notes):"No case notes yet."}</div>`}</section>`;
  }
  async function noteAction(event){
    const button=event.target.closest?.('[data-edit-notes],[data-cancel-notes],[data-save-notes]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const id=button.dataset.editNotes||button.dataset.cancelNotes||button.dataset.saveNotes;
    const donor=allDonors().find(d=>d.id===id);if(!donor)return;
    if(button.dataset.editNotes){noteDrafts.set(id,{owner:noteOwner(),expected:String(donor.caseNotes||""),text:String(donor.caseNotes||""),busy:false});}
    else if(button.dataset.cancelNotes){noteDrafts.delete(id);}
    else{
      const draft=noteDrafts.get(id);if(!draft||draft.busy||draft.owner!==noteOwner())return;
      draft.busy=true;draft.error="";renderSimpleBoard();
      try{
        if(typeof window.cloudSaveCaseNotes!=="function")throw Error("Shared notes are not connected. Refresh and sign in again.");
        await window.cloudSaveCaseNotes(id,draft.expected,draft.text);noteDrafts.delete(id);
      }catch(error){draft.error=error.message||"Notes could not be saved. Please try again.";}
      finally{draft.busy=false;}
    }
    renderSimpleBoard();
    if(button.dataset.editNotes)document.querySelector(`[data-note-input="${CSS.escape(id)}"]`)?.focus();
  }
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
  function timingFor(d){try{return typeof timing==="function"?timing(d):null}catch{return null}}
  function validDate(value){return value instanceof Date&&!Number.isNaN(value.getTime())}
  function deadlineTime(d){const t=timingFor(d);return validDate(t?.timeout)?t.timeout.getTime():Infinity}
  function formatDeadline(value){
    if(!validDate(value))return"Not entered";
    const day=value.toLocaleDateString([], {weekday:"short",month:"numeric",day:"numeric"});
    const time=String(value.getHours()).padStart(2,"0")+String(value.getMinutes()).padStart(2,"0");
    return day+" · "+time;
  }
  function compactDuration(ms){
    let minutes=Math.max(0,Math.round(Math.abs(ms)/60000));
    const days=Math.floor(minutes/1440);minutes-=days*1440;
    const hours=Math.floor(minutes/60);minutes-=hours*60;
    if(days)return days+"d "+hours+"h";
    if(hours)return hours+"h "+minutes+"m";
    return minutes+"m";
  }
  function relativeDeadline(value,now){
    if(!validDate(value))return"Add date and TOD";
    const difference=value.getTime()-(now||Date.now());
    return difference>=0?"in "+compactDuration(difference):"passed "+compactDuration(difference)+" ago";
  }
  function timingBox(t){
    const stamp=validDate(t?.timeout)?t.timeout.toISOString():"";
    return `<div class="priority-time timeout"><div class="priority-time-label">TIME OUT</div><div class="priority-time-value">${esc(formatDeadline(t?.timeout))}</div><div class="priority-start-secondary"><span>Suggested start by:</span> <span class="priority-start-value">${esc(formatDeadline(t?.start))}</span></div><div class="priority-time-relative"${stamp?` data-deadline="${esc(stamp)}"`:""}>${esc(relativeDeadline(t?.timeout))}</div></div>`;
  }
  function refreshDeadlineLabels(){
    const now=Date.now();
    document.querySelectorAll(".priority-time-relative[data-deadline]").forEach(el=>{
      el.textContent=relativeDeadline(new Date(el.dataset.deadline),now);
    });
  }
  function cardHtml(d){
    const team=teamText(d),notes=d.status==="pending"?(d.medicalNotes||""):"",t=timingFor(d);
    const pendingInfo=d.status==="pending"?`<div class="kv"><strong>Authorization:</strong> ${d.authorizationComplete?"Complete":"Pending"} · <strong>Records:</strong> ${d.medicalRecordsReviewed?"Reviewed":"Pending"}</div>`:`<div class="kv"><strong>Recovery:</strong> ${esc(recPreview(d))}</div>`;
    return `<div class="donor ${d.status} priority-card"><div class="priority-identity"><div class="name">${donorLabel()}</div><div class="demo">${esc(demoSafe(d))}</div><span class="pill ${d.status}">${d.status.toUpperCase()}</span></div><div class="priority-timing">${timingBox(t)}</div><div class="priority-details"><div class="kv"><strong>Team:</strong> ${esc(d.caseTeam||"Not assigned")}${team?` — ${esc(team)}`:""}</div><div class="kv"><strong>Pickup:</strong> ${esc(pickupText(d))}</div>${pendingInfo}${notes?`<div class="note">${esc(notes.slice(0,220))}${notes.length>220?"…":""}</div>`:""}</div><div class="actions"><button class="primary donor-open-btn" data-donor-id="${esc(d.id)}">OPEN DONOR</button>${d.status==="pending"?`<button type="button" data-simple-status="active" data-donor-id="${esc(d.id)}">MAKE ACTIVE</button>`:""}<button type="button" data-simple-archive="${esc(d.id)}">ARCHIVE</button></div></div>`;
  }
  function renderSimpleBoard(){
    const b=document.getElementById("board");if(!b)return;
    let pendingOn=true,activeOn=true;try{pendingOn=filters.pending!==false;activeOn=filters.active!==false}catch{}
    const rows=allDonors().filter(d=>(d.status==="pending"&&pendingOn)||(d.status==="active"&&activeOn)).sort((a,b)=>{
      const difference=deadlineTime(a)-deadlineTime(b);
      if(Number.isFinite(difference)&&difference!==0)return difference;
      if(deadlineTime(a)!==deadlineTime(b))return deadlineTime(a)-deadlineTime(b);
      return String(a.id||"").localeCompare(String(b.id||""));
    });
    const pendingCount=rows.filter(d=>d.status==="pending").length;
    const activeCount=rows.filter(d=>d.status==="active").length;
    const focused=document.activeElement,noteId=focused?.dataset?.noteInput,selection=noteId?[focused.selectionStart,focused.selectionEnd]:null;
    b.innerHTML=`<div class="section priority-board"><div class="sectiontitle">DONORS BY TIME OUT (${rows.length})</div><div class="priority-board-summary">${pendingCount} Pending · ${activeCount} Active · Earliest time out first</div><div class="grid priority-board-grid">${rows.map(d=>cardHtml(d).replace(/<\/div>$/,notesHtml(d)+"</div>")).join("")||'<div class="priority-board-empty">No donors match the selected filters.</div>'}</div></div>`;
    if(noteId){const input=[...b.querySelectorAll('[data-note-input]')].find(n=>n.dataset.noteInput===noteId);if(input&&!input.disabled){input.focus();input.setSelectionRange(...selection);}}
    try{if(typeof bindDonorOpenButtons==="function")bindDonorOpenButtons()}catch{}
    refreshDeadlineLabels();
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
    const style=document.createElement("style");style.id="simpleStatusStyle";style.textContent=`
      body>main{max-width:none;padding-left:20px;padding-right:20px}header>.head{max-width:none}
      .priority-notes{grid-area:notes;border-top:1px solid #dce3eb;background:#f7f9fc;margin-top:12px;padding:14px 2px 4px;min-width:0}
      .priority-notes-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:9px;font-size:14px}
      .priority-note-text{font-size:16px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;min-height:50px}
      .priority-notes textarea{width:100%;min-height:112px;box-sizing:border-box;font-size:16px;line-height:1.5;resize:vertical}
      .priority-notes-buttons{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}.priority-notes [role=status]{color:#9c2839;font-size:14px}
      .pill.active{background:#2e8b57}.status.active{background:#eef8f2;border-left-color:#2e8b57}.chip.active.on{background:#2e8b57;color:#fff}.donor.active{border-left-color:#2e8b57;background:#fff}
      .priority-board-summary{margin:-4px 0 10px;color:var(--sub);font-size:12px;font-weight:650}
      .priority-board-grid{grid-template-columns:minmax(0,1fr)!important;gap:12px}
      .priority-board-empty{padding:20px;border:1px dashed var(--bd);border-radius:12px;background:#fff;color:var(--sub);text-align:center}
      .priority-card{display:grid;grid-template-columns:minmax(110px,.55fr) minmax(230px,1.25fr) minmax(170px,.95fr) minmax(160px,.75fr) minmax(120px,.52fr);grid-template-areas:"identity timing details transport actions" "notes notes notes notes notes";column-gap:12px;align-items:center;padding:11px 13px}
      .priority-identity{grid-area:identity;display:flex;flex-direction:column;justify-content:center;padding-right:11px;border-right:1px solid #e2e2e7;min-width:0}
      .priority-identity .pill{align-self:flex-start;margin-bottom:0}
      .priority-timing{grid-area:timing;min-width:0;align-self:center}
      .priority-time{border:1px solid #dfe3e8;border-radius:10px;padding:7px 8px;min-width:0}
      .priority-time.timeout{background:#fff0f1;border-color:#edc4c8}
      .priority-time-label{font-size:10px;line-height:1.15;color:#5f6670;font-weight:850;letter-spacing:.025em}
      .priority-time-value{margin-top:3px;color:#071f3e;font-size:18px;line-height:1.2;font-weight:900;font-variant-numeric:tabular-nums}
      .priority-start-secondary{margin-top:4px;color:#515b68;font-size:12px;line-height:1.35;font-weight:500;overflow-wrap:anywhere}
      .priority-start-value{font-weight:650;font-variant-numeric:tabular-nums}
      .priority-time-relative{margin-top:3px;color:#626874;font-size:11px;font-weight:750}
      .priority-details{grid-area:details;align-self:center;min-width:0}
      .priority-details .note{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:6px;padding:6px}
      .priority-card>.transport-card-safe{grid-area:transport;align-self:center;margin:0;padding:7px 8px}
      .priority-card>.transport-card-safe button{padding:6px!important;margin-top:5px!important}
      .priority-card>.actions{grid-area:actions;align-self:center;display:flex;flex-direction:column;justify-content:center;gap:5px;margin-top:0}
      .priority-card>.actions button{width:100%;padding:7px 8px}
      @media(max-width:1050px){
        .priority-card{grid-template-columns:minmax(0,1fr);grid-template-areas:"identity" "timing" "details" "transport" "actions" "notes";gap:11px;padding:14px}
        .priority-identity{display:block;padding:0 0 9px;border-right:0;border-bottom:1px solid #e2e2e7}
        .priority-identity .pill{margin-bottom:0}
        .priority-time{padding:10px}
        .priority-time-value{font-size:20px}
        .priority-details{align-self:start}
        .priority-details .note{display:block;overflow:visible;margin-top:8px;padding:8px}
        .priority-card>.transport-card-safe{align-self:stretch;margin-top:0;padding:9px 10px}
        .priority-card>.transport-card-safe button{padding:9px!important;margin-top:7px!important}
        .priority-card>.actions{display:grid;grid-template-columns:minmax(0,1fr);gap:7px}
        .priority-card>.actions button{padding:9px}
      }
      @media(max-width:700px){body>main{padding-left:12px;padding-right:12px}.priority-notes button{min-height:44px}}
    `;document.head.appendChild(style);
    document.addEventListener("click",noteAction,true);
    document.addEventListener("input",event=>{const id=event.target.dataset?.noteInput,draft=noteDrafts.get(id);if(draft&&draft.owner===noteOwner())draft.text=event.target.value;});
    document.addEventListener("click",e=>{const s=e.target.closest?.("[data-simple-status][data-donor-id]");if(s){e.preventDefault();setStatus(s.dataset.donorId,s.dataset.simpleStatus);return}const a=e.target.closest?.("[data-simple-archive]");if(a){e.preventDefault();archive(a.dataset.simpleArchive)}},false);
    const status=document.getElementById("status");status.addEventListener("change",()=>{let d=null;try{d=typeof cur==="function"?cur():null}catch{};if(!d)return;d.status=status.value==="pending"?"pending":"active";persist();replaceUpdateStatus();});
    installed=true;renderSimpleBoard();return true}
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>60)clearInterval(timer)},200);
  setInterval(()=>{if(!installed)return;ensureActiveFilterAnchor();simplifySelect();refreshFilterUI()},1500);
  setInterval(()=>{if(installed)refreshDeadlineLabels()},30000);
})();
