(function(){
  "use strict";

  const ADMIN_EMAIL="bsitowski@gmail.com";
  const STORAGE_KEY="solvita.staffingSchedule.v1";
  const FIRESTORE_COLLECTION="masterSettings";
  const FIRESTORE_DOCUMENT="staffing-schedule-v1";
  const ROLE_DEFS=[
    ["admin","Admin","Admin"],
    ["coordinator","Coordinator","Coordinator"],
    ["primaryCirculator","Primary Circulator","Primary Circ."],
    ["primaryTech1","Primary Tech 1","Primary Tech 1"],
    ["primaryTech2","Primary Tech 2","Primary Tech 2"],
    ["backupCirculator","24 (backup) Circulator","24 Backup Circ."],
    ["backupTech1","24 (backup) Tech 1","24 Backup Tech 1"],
    ["backupTech2","24 (backup) Tech 2","24 Backup Tech 2"]
  ];
  const ROLE_CLASS={admin:"admin",coordinator:"coordinator",primaryCirculator:"circulator",primaryTech1:"tech",primaryTech2:"tech",backupCirculator:"backup-circulator",backupTech1:"backup-tech",backupTech2:"backup-tech"};
  const MONTH_NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let activeSchedule=loadLocalSchedule(),candidate=null,db=null,auth=null,unsubscribe=null,clockTimer=null,trackerCollapsed=false;

  function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
  function localDateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
  function military(date){return `${String(date.getHours()).padStart(2,"0")}${String(date.getMinutes()).padStart(2,"0")}`}
  function dayLabel(date){return date.toLocaleDateString(undefined,{weekday:"short"}).toUpperCase()}
  function fullDateLabel(key){
    const [year,month,day]=key.split("-").map(Number);return new Date(year,month-1,day).toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"short",year:"numeric"}).toUpperCase();
  }
  function peopleText(people){return (people||[]).map(person=>person.name||person.initials).filter(Boolean).join(" + ")||"—"}
  function sameAssignment(a,b){return peopleText(a)===peopleText(b)}
  function loadLocalSchedule(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}catch{return null}}
  function saveLocalSchedule(value){activeSchedule=value;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value))}catch{}renderTracker()}
  function isAdmin(){return !!(auth?.currentUser&&String(auth.currentUser.email||"").toLowerCase()===ADMIN_EMAIL)}
  function scheduleDoc(){return db?.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOCUMENT)}

  function addStyles(){
    if(document.getElementById("staffingScheduleStyles"))return;
    const style=document.createElement("style");style.id="staffingScheduleStyles";style.textContent=`
#staffingTracker{background:#fff;border:1px solid #d9dfe8;border-radius:14px;overflow:hidden;margin-bottom:14px;box-shadow:0 2px 7px #0000000b;color:#17243a}
.staffing-tracker-head{height:54px;padding:0 17px;background:#14233b;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px}
.staffing-tracker-title{font-size:18px;font-weight:850;letter-spacing:.02em}.staffing-tracker-meta{font-size:12px;color:#ccd7e7;font-weight:750}.staffing-collapse{display:none;border:1px solid #ffffff66;background:transparent;color:#fff;border-radius:8px;padding:7px 9px;font-weight:800}
.staffing-empty{padding:14px 17px;color:#66748a;font-size:13px}.staffing-empty strong{display:block;color:#17243a;margin-bottom:3px}
.staffing-chart{--staff-label:220px;position:relative;padding:0 14px 10px}.staffing-axis{height:42px;margin-left:var(--staff-label);position:relative;border-left:1px solid #ccd4df;border-right:1px solid #ccd4df;background:#fafbfd}
.staffing-axis-mark{position:absolute;top:0;bottom:0;border-left:1px solid #e2e7ee}.staffing-axis-mark strong{position:absolute;top:18px;left:0;transform:translateX(-50%);font-size:11px;color:#617087;font-variant-numeric:tabular-nums}.staffing-axis-mark small{position:absolute;top:3px;left:0;transform:translateX(-50%);font-size:8px;color:#7a8799;font-weight:900}.staffing-axis-mark.edge-end strong,.staffing-axis-mark.edge-end small{transform:translateX(-100%)}.staffing-axis-mark.edge-start strong,.staffing-axis-mark.edge-start small{transform:none}
.staffing-rows{position:relative}.staffing-row{display:grid;grid-template-columns:var(--staff-label) minmax(0,1fr);min-height:28px}.staffing-role{display:flex;align-items:center;padding:3px 12px 3px 0;background:#fafbfd;font-size:12px;font-weight:800}.staffing-role .mobile{display:none}.staffing-lane{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));position:relative}.staffing-segment{min-width:0;display:flex;align-items:center;justify-content:center;padding:3px 5px;border-top:1px solid #fff;font-size:11px;font-weight:800;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.staffing-segment.empty{color:#68778c;background:#edf0f4!important}.staffing-segment.admin.tone-0{background:#dce1e8}.staffing-segment.admin.tone-1{background:#c3cad4}.staffing-segment.coordinator.tone-0{background:#c5def2}.staffing-segment.coordinator.tone-1{background:#a7cce8}.staffing-segment.circulator.tone-0{background:#dbcaf3}.staffing-segment.circulator.tone-1{background:#bea5e8}.staffing-segment.tech.tone-0{background:#cfe9d6}.staffing-segment.tech.tone-1{background:#a9dcb7}.staffing-segment.backup-circulator.tone-0{background:#ecdef8}.staffing-segment.backup-circulator.tone-1{background:#d7c2ed}.staffing-segment.backup-tech.tone-0{background:#e0f0e4}.staffing-segment.backup-tech.tone-1{background:#c2e2ca}
.staffing-gridline{position:absolute;top:0;bottom:0;border-left:1px solid #dfe5ec;pointer-events:none}.staffing-shiftline{border-left:2px solid #7a8799}.staffing-now{position:absolute;top:-42px;bottom:-12px;width:3px;background:#df3740;z-index:4;pointer-events:none}.staffing-now-label{position:absolute;top:4px;left:50%;transform:translateX(-50%);background:#df3740;color:#fff;border-radius:7px;padding:4px 6px;font-size:9px;font-weight:900;white-space:nowrap;font-variant-numeric:tabular-nums}
.staffing-team-note{margin-top:9px;padding:8px 10px;border-radius:8px;background:#eef5fb;color:#36546f;font-size:12px;font-weight:700}.staffing-team-note.warning{background:#fff5dc;color:#674b0b}
#staffingScheduleModal{position:fixed;inset:0;z-index:2400;background:#071f3eee;display:flex;align-items:center;justify-content:center;padding:18px}#staffingScheduleModal.hidden{display:none!important}.staffing-modal-box{width:min(1050px,100%);max-height:92vh;overflow:auto;background:#fff;color:#17243a;border-radius:18px;box-shadow:0 18px 55px #0007}.staffing-modal-head{background:#14233b;color:#fff;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px}.staffing-modal-head h2{margin:0;font-size:21px}.staffing-modal-head button{border:1px solid #ffffff66;background:transparent;color:#fff;border-radius:8px;padding:8px 10px;font-weight:800}.staffing-modal-body{padding:20px}.staffing-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:18px}.staffing-step{padding:10px;text-align:center;background:#e9edf3;color:#65738a;border-radius:9px;font-weight:800}.staffing-step.active{background:#d9e6f6;color:#174675}.staffing-upload{border:2px dashed #bcc8d8;border-radius:13px;padding:28px 18px;text-align:center;background:#fafbfd}.staffing-upload h3{margin:0 0 6px}.staffing-upload p{color:#66748a;margin:0 0 15px}.staffing-upload input{display:none}.staffing-file-button{display:inline-block;background:#285d91;color:#fff;padding:11px 15px;border-radius:9px;font-weight:850;cursor:pointer}.staffing-import-error{display:none;background:#fff0f0;color:#8a1d1d;border-left:5px solid #c93535;padding:11px;border-radius:8px;margin-top:13px}.staffing-import-error.show{display:block}.staffing-file-summary{border:1px solid #d7dee8;border-radius:11px;padding:13px 15px;display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.staffing-file-summary strong{overflow-wrap:anywhere}.staffing-ready{color:#217044;font-weight:850;white-space:nowrap}.staffing-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.staffing-stat{background:#f3f6fa;border-radius:9px;padding:11px}.staffing-stat strong{display:block}.staffing-stat small{color:#68778c}.staffing-notices{display:grid;gap:7px;margin-bottom:14px}.staffing-notice{background:#fff5dc;color:#674b0b;border-radius:8px;padding:9px 11px;font-size:13px}.staffing-preview-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 8px}.staffing-preview-head h3{margin:0}.staffing-preview-head select{width:auto;min-width:190px;padding:8px;font-size:14px}.staffing-preview-table{width:100%;border-collapse:collapse}.staffing-preview-table th,.staffing-preview-table td{text-align:left;padding:8px 9px;border-bottom:1px solid #dfe5ed}.staffing-preview-table th{background:#edf1f6;color:#617087;font-size:12px}.staffing-preview-table td:first-child{font-weight:800}.staffing-modal-note{font-size:12px;color:#68778c;margin-top:11px}.staffing-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}.staffing-actions button{border:1px solid #cdd5e0;background:#fff;color:#33435a;border-radius:9px;padding:11px 14px;font-weight:850}.staffing-actions button.primary{background:#285d91;border-color:#285d91;color:#fff}.staffing-actions button:disabled{opacity:.55}.staffing-success{text-align:center;padding:24px}.staffing-success strong{display:block;font-size:23px;color:#217044;margin-bottom:7px}
@media(max-width:700px){.staffing-tracker-head{height:52px}.staffing-tracker-title{font-size:16px}.staffing-tracker-meta{display:none}.staffing-collapse{display:block}.staffing-chart{--staff-label:132px;padding:0 8px 8px}.staffing-axis{height:43px}.staffing-axis-mark:nth-child(even) strong{display:none}.staffing-row{min-height:39px}.staffing-role{font-size:10px;padding-right:7px}.staffing-role .desktop{display:none}.staffing-role .mobile{display:inline}.staffing-segment{font-size:9px;padding:2px;white-space:normal;line-height:1.05}.staffing-chart.collapsed{display:none}.staffing-modal-body{padding:14px}.staffing-steps{gap:6px}.staffing-step{font-size:12px;padding:9px 3px}.staffing-file-summary{align-items:flex-start;flex-direction:column}.staffing-stats{grid-template-columns:1fr}.staffing-preview-head{align-items:stretch;flex-direction:column}.staffing-preview-head select{width:100%}.staffing-preview-table,.staffing-preview-table tbody,.staffing-preview-table tr,.staffing-preview-table td{display:block}.staffing-preview-table thead{display:none}.staffing-preview-table tr{padding:8px 0;border-bottom:1px solid #dfe5ed}.staffing-preview-table td{border:0;padding:3px 0}.staffing-preview-table td:first-child{margin-bottom:3px}.staffing-preview-table td:nth-child(2)::before{content:"0600–1800  ";font-size:11px;color:#617087;font-weight:850}.staffing-preview-table td:nth-child(3)::before{content:"1800–0600  ";font-size:11px;color:#617087;font-weight:850}.staffing-actions{flex-direction:column-reverse}.staffing-actions button{width:100%}}
@media print{#staffingTracker,#staffingScheduleModal{display:none!important}}
`;
    document.head.appendChild(style);
  }

  function installUI(){
    addStyles();
    const home=document.getElementById("homeView");
    if(home&&!document.getElementById("staffingTracker")){
      const tracker=document.createElement("div");tracker.id="staffingTracker";home.insertBefore(tracker,home.firstChild);
    }
    const head=document.querySelector("header .head");
    if(head&&!document.getElementById("staffingScheduleBtn")){
      const button=document.createElement("button");button.id="staffingScheduleBtn";button.type="button";button.textContent="STAFFING SCHEDULE";button.style.display="none";button.addEventListener("click",openModal);head.appendChild(button);
    }
    if(!document.getElementById("staffingScheduleModal")){
      const modal=document.createElement("div");modal.id="staffingScheduleModal";modal.className="hidden";
      modal.innerHTML=`<div class="staffing-modal-box" role="dialog" aria-modal="true" aria-labelledby="staffingModalTitle"><div class="staffing-modal-head"><h2 id="staffingModalTitle">Import Staffing Schedule</h2><button id="staffingModalClose" type="button">CLOSE</button></div><div class="staffing-modal-body"><div class="staffing-steps"><div class="staffing-step active" data-staffing-step="1">1 Upload</div><div class="staffing-step" data-staffing-step="2">2 Review</div><div class="staffing-step" data-staffing-step="3">3 Activate</div></div><section id="staffingUploadPanel"><div class="staffing-upload"><h3>Choose the monthly Excel schedule</h3><p>Use the PDX Full Calendar Scheduling workbook exactly as received.</p><label class="staffing-file-button" for="staffingFileInput">CHOOSE EXCEL FILE</label><input id="staffingFileInput" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><div id="staffingImportError" class="staffing-import-error" role="alert"></div></div></section><section id="staffingReviewPanel" class="hidden"></section><section id="staffingSuccessPanel" class="hidden"></section></div></div>`;
      document.body.appendChild(modal);
      document.getElementById("staffingModalClose").addEventListener("click",closeModal);
      document.getElementById("staffingFileInput").addEventListener("change",handleFile);
      modal.addEventListener("click",event=>{if(event.target===modal)closeModal()});
      document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!modal.classList.contains("hidden"))closeModal()});
    }
    installTeamAutofill();
    renderTracker();
    if(!clockTimer)clockTimer=setInterval(renderTracker,30000);
  }

  function setStep(step){document.querySelectorAll("[data-staffing-step]").forEach(el=>el.classList.toggle("active",Number(el.dataset.staffingStep)===step))}
  function showPanel(name){
    document.getElementById("staffingUploadPanel").classList.toggle("hidden",name!=="upload");
    document.getElementById("staffingReviewPanel").classList.toggle("hidden",name!=="review");
    document.getElementById("staffingSuccessPanel").classList.toggle("hidden",name!=="success");
  }
  function openModal(){if(!isAdmin())return;candidate=null;document.getElementById("staffingFileInput").value="";document.getElementById("staffingImportError").classList.remove("show");setStep(1);showPanel("upload");document.getElementById("staffingScheduleModal").classList.remove("hidden")}
  function closeModal(){document.getElementById("staffingScheduleModal")?.classList.add("hidden")}
  function showImportError(message){const box=document.getElementById("staffingImportError");box.textContent=message;box.classList.add("show")}

  async function handleFile(event){
    const file=event.target.files?.[0];if(!file)return;
    const box=document.getElementById("staffingImportError");box.classList.remove("show");
    try{
      if(!window.StaffingScheduleParser||!window.fflate?.unzipSync)throw new Error("The Excel reader did not load. Refresh the planner and try again.");
      candidate=window.StaffingScheduleParser.parseWorkbook(await file.arrayBuffer(),window.fflate.unzipSync);candidate.sourceFileName=file.name;
      renderReview();setStep(2);showPanel("review");
    }catch(error){console.error("Staffing import",error);showImportError(error?.message||String(error));event.target.value=""}
  }
  function monthRangeText(data){
    if(!data.months?.length)return String(data.targetYear||"");const first=data.months[0]-1,last=data.months[data.months.length-1]-1;
    return `${MONTH_NAMES[first]}${first===last?"":"–"+MONTH_NAMES[last]} ${data.targetYear}`;
  }
  function closestPreviewDate(keys){
    const today=localDateKey(new Date());if(keys.includes(today))return today;
    return keys.find(key=>key>=today)||keys[keys.length-1];
  }
  function renderReview(selectedDate){
    if(!candidate)return;const panel=document.getElementById("staffingReviewPanel"),date=selectedDate||closestPreviewDate(candidate.dateKeys);
    panel.innerHTML=`<div class="staffing-file-summary"><div><strong>${esc(candidate.sourceFileName)}</strong><div class="small">Excel workbook interpreted locally</div></div><div class="staffing-ready">✓ READY TO REVIEW</div></div><div class="staffing-stats"><div class="staffing-stat"><strong>${esc(monthRangeText(candidate))}</strong><small>${candidate.stats.monthCount} populated month${candidate.stats.monthCount===1?"":"s"}</small></div><div class="staffing-stat"><strong>${candidate.errors.length} ERRORS</strong><small>${candidate.errors.length?"Fix before activation":"Safe to activate"}</small></div><div class="staffing-stat"><strong>${candidate.notices.length} NOTICES</strong><small>Review before activation</small></div></div><div class="staffing-notices">${candidate.notices.map(note=>`<div class="staffing-notice">${esc(note)}</div>`).join("")}</div><div class="staffing-preview-head"><h3>Assignment Preview</h3><select id="staffingPreviewDate" aria-label="Preview date">${candidate.dateKeys.map(key=>`<option value="${esc(key)}"${key===date?" selected":""}>${esc(fullDateLabel(key))}</option>`).join("")}</select></div><div id="staffingPreviewTable"></div><div class="staffing-modal-note">The existing live schedule remains active until this import is approved. The original Excel file is not stored.</div><div class="staffing-actions"><button id="staffingImportBack" type="button">CHOOSE A DIFFERENT FILE</button><button id="staffingActivate" class="primary" type="button"${candidate.errors.length?" disabled":""}>ACTIVATE SCHEDULE</button></div>`;
    document.getElementById("staffingPreviewDate").addEventListener("change",event=>renderPreviewTable(event.target.value));
    document.getElementById("staffingImportBack").addEventListener("click",()=>{setStep(1);showPanel("upload")});
    document.getElementById("staffingActivate").addEventListener("click",activateCandidate);renderPreviewTable(date);
  }
  function renderPreviewTable(key){
    const host=document.getElementById("staffingPreviewTable"),day=candidate?.days?.[key];if(!host||!day)return;
    host.innerHTML=`<table class="staffing-preview-table"><thead><tr><th>Role</th><th>0600–1800</th><th>1800–0600</th></tr></thead><tbody>${ROLE_DEFS.map(([role,label])=>`<tr><td>${esc(label)}</td><td>${esc(peopleText(day[role]?.day))}</td><td>${esc(peopleText(day[role]?.night))}</td></tr>`).join("")}</tbody></table>`;
  }
  async function activateCandidate(){
    if(!candidate||!isAdmin())return;const button=document.getElementById("staffingActivate");button.disabled=true;button.textContent="ACTIVATING…";
    const record={schemaVersion:1,targetYear:candidate.targetYear,days:candidate.days,firstDate:candidate.firstDate,lastDate:candidate.lastDate,months:candidate.months,notices:candidate.notices,stats:candidate.stats,sourceFileName:candidate.sourceFileName,importedBy:auth.currentUser.email||ADMIN_EMAIL};
    try{
      if(!db)throw new Error("The shared database is not connected.");
      await scheduleDoc().set({...record,importedAt:firebase.firestore.FieldValue.serverTimestamp()});saveLocalSchedule(record);
      setStep(3);showPanel("success");document.getElementById("staffingSuccessPanel").innerHTML=`<div class="staffing-success"><strong>Schedule Activated</strong><div>${esc(monthRangeText(record))} is now supplying the live staffing tracker.</div><div class="staffing-actions"><button id="staffingSuccessClose" class="primary" type="button">CLOSE</button></div></div>`;document.getElementById("staffingSuccessClose").addEventListener("click",closeModal);
    }catch(error){button.disabled=false;button.textContent="ACTIVATE SCHEDULE";alert("The schedule could not be activated: "+(error?.message||String(error)))}
  }

  function operationalStart(now){const start=new Date(now);start.setHours(6,0,0,0);if(now<start)start.setDate(start.getDate()-1);return start}
  function assignmentFor(date,role){
    const key=localDateKey(date),half=date.getHours()>=18?"night":"day";return activeSchedule?.days?.[key]?.[role]?.[half]||[];
  }
  function segmentDates(now){const start=operationalStart(now);return [0,12,24].map(hours=>new Date(start.getTime()+hours*3600000))}
  function axisHtml(start){
    return [0,6,12,18,24,30,36].map((hours,index)=>{const d=new Date(start.getTime()+hours*3600000),pct=hours/36*100,edge=index===0?" edge-start":index===6?" edge-end":"",shift=hours===12||hours===24?" staffing-shiftline":"";return `<span class="staffing-axis-mark${edge}${shift}" style="left:${pct}%"><small>${hours===0||d.getHours()===0?esc(dayLabel(d)):hours===24?esc(dayLabel(d)):""}</small><strong>${esc(military(d))}</strong></span>`}).join("");
  }
  function renderTracker(){
    const host=document.getElementById("staffingTracker");if(!host)return;const now=new Date(),start=operationalStart(now),dates=segmentDates(now);
    const header=`<div class="staffing-tracker-head"><div class="staffing-tracker-title">LIVE STAFFING · 36 HOURS</div><div class="staffing-tracker-meta">${esc(dayLabel(now))} ${esc(String(now.getDate()).padStart(2,"0"))} ${esc(MONTH_NAMES[now.getMonth()].toUpperCase())} · NOW ${esc(military(now))}</div><button class="staffing-collapse" type="button" aria-expanded="${trackerCollapsed?"false":"true"}">${trackerCollapsed?"SHOW":"HIDE"}</button></div>`;
    if(!activeSchedule?.days){host.innerHTML=header+`<div class="staffing-empty"><strong>No staffing schedule is active.</strong>${isAdmin()?"Open Staffing Schedule from the Admin menu to import the monthly Excel workbook.":"An administrator needs to import the monthly schedule."}</div>`;bindCollapse();return}
    const rows=ROLE_DEFS.map(([key,desktop,mobile])=>{
      const assignments=dates.map(date=>assignmentFor(date,key));let tone=0;
      const segments=assignments.map((people,index)=>{if(index&& !sameAssignment(assignments[index-1],people))tone=1-tone;const empty=!people.length;return `<div class="staffing-segment ${ROLE_CLASS[key]} tone-${tone}${empty?" empty":""}" title="${esc(peopleText(people))}">${esc(peopleText(people))}</div>`}).join("");
      return `<div class="staffing-row"><div class="staffing-role"><span class="desktop">${esc(desktop)}</span><span class="mobile">${esc(mobile)}</span></div><div class="staffing-lane">${segments}</div></div>`;
    }).join("");
    const elapsed=(now-start)/3600000,nowPct=Math.max(0,Math.min(100,elapsed/36*100));
    host.innerHTML=header+`<div class="staffing-chart${trackerCollapsed?" collapsed":""}"><div class="staffing-axis">${axisHtml(start)}</div><div class="staffing-rows">${rows}<span class="staffing-gridline staffing-shiftline" style="left:calc(var(--staff-label) + (100% - var(--staff-label)) / 3)"></span><span class="staffing-gridline staffing-shiftline" style="left:calc(var(--staff-label) + (100% - var(--staff-label)) * 2 / 3)"></span><span class="staffing-now" style="left:calc(var(--staff-label) + (100% - var(--staff-label)) * ${nowPct/100})"><span class="staffing-now-label">NOW ${esc(military(now))}</span></span></div></div>`;bindCollapse();
  }
  function bindCollapse(){const button=document.querySelector("#staffingTracker .staffing-collapse");if(button)button.addEventListener("click",()=>{trackerCollapsed=!trackerCollapsed;renderTracker()})}

  function installTeamAutofill(){
    const team=document.getElementById("caseTeam");if(!team||team.dataset.staffingAutofillBound)return;
    team.dataset.staffingAutofillBound="true";
    const card=team.closest(".card");
    if(card&&!document.getElementById("staffingTeamNote")){
      const note=document.createElement("div");note.id="staffingTeamNote";note.className="staffing-team-note";note.textContent="Choose a team to fill the scheduled staff automatically. You can change any name afterward.";card.appendChild(note);
    }
    team.addEventListener("change",()=>autofillCaseTeam(team.value));
  }
  function scheduledShiftLabel(assignment){
    const date=assignment.shiftStart.toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"short"}).toUpperCase();
    return `${date} · ${assignment.half==="day"?"0600–1800":"1800–0600"}`;
  }
  function setScheduledStaff(select,person){
    if(!select)return {changed:false,missing:null};
    if(!person){select.value="";return {changed:true,missing:null}}
    const exists=[...select.options].some(option=>option.value===person.initials);
    if(!exists){select.value="";return {changed:true,missing:person.initials}}
    select.value=person.initials;return {changed:true,missing:null};
  }
  function autofillCaseTeam(teamName){
    const note=document.getElementById("staffingTeamNote");
    if(!teamName){if(note){note.classList.remove("warning");note.textContent="Choose a team to fill the scheduled staff automatically. You can change any name afterward."}return}
    const assignment=window.StaffingScheduleParser?.caseTeamAssignment?.(activeSchedule,teamName,new Date());
    if(!activeSchedule?.days||!assignment?.found){
      if(note){note.classList.add("warning");note.textContent=`No active schedule was found for ${assignment?scheduledShiftLabel(assignment):teamName}. Choose the staff manually.`}return;
    }
    const fields=["circulator","tech1","tech2"],missing=[];
    for(const field of fields){const result=setScheduledStaff(document.getElementById(field),assignment.selected[field]);if(result.missing)missing.push(result.missing)}
    for(const field of fields)document.getElementById(field)?.dispatchEvent(new Event("change",{bubbles:true}));
    if(note){
      note.classList.toggle("warning",!!missing.length);
      note.textContent=missing.length?`Scheduled staff loaded for ${scheduledShiftLabel(assignment)}, but ${missing.join(", ")} ${missing.length===1?"is":"are"} not in the Staff Directory. Choose that role manually.`:`Scheduled staff loaded for ${scheduledShiftLabel(assignment)}. You can change any name for this case.`;
    }
  }

  function connectFirebase(){
    if(!window.firebase?.apps?.length){setTimeout(connectFirebase,250);return}
    auth=firebase.auth();db=firebase.firestore();
    auth.onAuthStateChanged(user=>{
      const button=document.getElementById("staffingScheduleBtn");if(button)button.style.display=user&&isAdmin()?"inline-block":"none";
      if(unsubscribe){unsubscribe();unsubscribe=null}
      if(user){unsubscribe=scheduleDoc().onSnapshot(doc=>{if(doc.exists)saveLocalSchedule(doc.data())},error=>console.warn("Staffing schedule sync",error))}
      renderTracker();
    });
  }

  function init(){installUI();connectFirebase()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
  window.StaffingSchedule={render:renderTracker,parseFile:async file=>window.StaffingScheduleParser.parseWorkbook(await file.arrayBuffer(),window.fflate.unzipSync),getActive:()=>activeSchedule,fillCaseTeam:()=>autofillCaseTeam(document.getElementById("caseTeam")?.value||"")};
})();
