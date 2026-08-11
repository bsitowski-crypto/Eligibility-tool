(function(){
  "use strict";
  const ADMIN_EMAIL="bsitowski@gmail.com";
  const PRESENCE_TTL_MS=90000;
  const MASTER_DOC="current";
  let db=null,auth=null,activityBaseline=new Map(),activityTimers=new Map();
  let activeDonorId=null,presenceTimer=null,presenceUnsub=null,masterUnsub=null;

  const clone=x=>JSON.parse(JSON.stringify(x));
  const json=x=>{try{return JSON.stringify(x)}catch{return ""}};
  const isAdmin=()=>!!(auth&&auth.currentUser&&String(auth.currentUser.email||"").toLowerCase()===ADMIN_EMAIL);
  const safeText=x=>String(x==null?"":x);
  const donorLabel=d=>{
    if(!d)return "Unknown donor";
    const last=d.lastName||d.last||d.lastname||"";
    const first=d.firstName||d.first||d.firstname||"";
    const name=[last,first].filter(Boolean).join(", ");
    return name||d.referralId||d.caseId||d.id||"Donor";
  };

  function injectUI(){
    const style=document.createElement("style");
    style.textContent=`
#collabActivityModal,#collabMasterModal{position:fixed;inset:0;z-index:1050;background:#071f3eee;display:flex;align-items:center;justify-content:center;padding:18px;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
#collabActivityModal.hidden,#collabMasterModal.hidden{display:none!important}.collab-box{width:min(560px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:22px;box-sizing:border-box;color:#1c1c1e;box-shadow:0 18px 55px #0006}.collab-box h2{margin:0 0 8px;color:#071f3e}.collab-box p{color:#666;line-height:1.4}.collab-btn{color:#fff;background:transparent;border:1px solid #ffffff55;border-radius:9px;padding:9px 11px;font-weight:750}.collab-close,.collab-primary{width:100%;border:0;border-radius:10px;padding:12px 14px;font-weight:800}.collab-close{background:#68707a;color:#fff;margin-top:12px}.collab-primary{background:#0b63ce;color:#fff}.activity-row{border-top:1px solid #e5e5ea;padding:11px 0}.activity-main{font-weight:800}.activity-meta{font-size:12px;color:#666;margin-top:3px}.presence-badge{display:inline-block;margin:5px 0 0 6px;padding:4px 7px;border-radius:999px;background:#fff3cd;color:#6a4a00;border:1px solid #f0d57a;font-size:11px;font-weight:800}.presence-badge.self{background:#eaf4ff;color:#0b4f9c;border-color:#b9d8fa}.master-key{font-size:12px;padding:5px 7px;background:#f2f2f7;border-radius:7px;margin:5px 0;overflow-wrap:anywhere}.collab-note{font-size:12px;color:#666;margin-top:10px}.collab-success{display:none;background:#eefaf2;color:#23633a;border-left:5px solid #2e8b57;padding:10px;border-radius:8px;margin:10px 0;font-size:13px}.collab-error{display:none;background:#fff0f0;color:#8a1d1d;border-left:5px solid #c93535;padding:10px;border-radius:8px;margin:10px 0;font-size:13px}`;
    document.head.appendChild(style);

    const activity=document.createElement("div");activity.id="collabActivityModal";activity.className="hidden";
    activity.innerHTML='<div class="collab-box"><h2>Recent Activity</h2><p>Recent donor changes from the shared planner.</p><div id="collabActivityList">Loading…</div><button id="collabActivityClose" class="collab-close" type="button">CLOSE</button></div>';
    document.body.appendChild(activity);
    document.getElementById("collabActivityClose").onclick=()=>activity.classList.add("hidden");

    const master=document.createElement("div");master.id="collabMasterModal";master.className="hidden";
    master.innerHTML='<div class="collab-box"><h2>Master Data</h2><p>Publish this device\'s staff, graft criteria, hospital, and funeral-home settings as the shared master copy.</p><div id="collabMasterKeys"></div><div id="collabMasterSuccess" class="collab-success"></div><div id="collabMasterError" class="collab-error"></div><button id="collabMasterPublish" class="collab-primary" type="button">PUBLISH THIS DEVICE\'S MASTER DATA</button><div class="collab-note">Other signed-in devices receive the shared master data on their next load. Only the administrator can publish it.</div><button id="collabMasterClose" class="collab-close" type="button">CLOSE</button></div>';
    document.body.appendChild(master);
    document.getElementById("collabMasterClose").onclick=()=>master.classList.add("hidden");
    document.getElementById("collabMasterPublish").onclick=publishMasterData;

    const head=document.querySelector("header .head");
    if(head){
      const activityBtn=document.createElement("button");activityBtn.id="collabActivityBtn";activityBtn.className="collab-btn";activityBtn.type="button";activityBtn.textContent="ACTIVITY";activityBtn.onclick=openActivity;head.appendChild(activityBtn);
      const masterBtn=document.createElement("button");masterBtn.id="collabMasterBtn";masterBtn.className="collab-btn";masterBtn.type="button";masterBtn.textContent="MASTER DATA";masterBtn.style.display="none";masterBtn.onclick=openMaster;head.appendChild(masterBtn);
    }
    const ver=document.querySelector(".ver");if(ver)ver.textContent="Version 9.10.5 — Collaboration + Activity + Master Data";
  }

  async function openActivity(){
    const modal=document.getElementById("collabActivityModal"),list=document.getElementById("collabActivityList");modal.classList.remove("hidden");list.textContent="Loading…";
    try{
      const snap=await db.collection("activityLogs").orderBy("createdAt","desc").limit(50).get();
      if(snap.empty){list.innerHTML='<div class="collab-note">No activity has been recorded yet.</div>';return}
      list.innerHTML="";snap.forEach(doc=>{const d=doc.data()||{};const row=document.createElement("div");row.className="activity-row";const when=d.createdAt&&d.createdAt.toDate?d.createdAt.toDate().toLocaleString():"Just now";row.innerHTML='<div class="activity-main"></div><div class="activity-meta"></div>';row.querySelector(".activity-main").textContent=safeText(d.action||"Updated donor")+" — "+safeText(d.donorLabel||d.donorId||"");row.querySelector(".activity-meta").textContent=safeText(d.userEmail||"Unknown user")+" • "+when;list.appendChild(row)});
    }catch(err){list.textContent="Unable to load activity: "+(err.message||err)}
  }

  function masterKeys(){
    const out=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||"";
      if(k==="solvita_v950_donors")continue;
      if(/staff|graft[_-]?criteria|hospital|funeral/i.test(k))out.push(k);
    }
    return [...new Set(out)].sort();
  }
  function openMaster(){
    if(!isAdmin())return;
    const keys=masterKeys(),box=document.getElementById("collabMasterKeys");box.innerHTML=keys.length?keys.map(k=>'<div class="master-key"></div>').join(""):'<div class="collab-note">No matching local settings were detected on this device.</div>';
    [...box.querySelectorAll(".master-key")].forEach((el,i)=>el.textContent=keys[i]);
    document.getElementById("collabMasterModal").classList.remove("hidden");
  }
  async function publishMasterData(){
    if(!isAdmin())return;
    const ok=document.getElementById("collabMasterSuccess"),bad=document.getElementById("collabMasterError"),btn=document.getElementById("collabMasterPublish");ok.style.display="none";bad.style.display="none";
    const keys=masterKeys(),items={};for(const k of keys)items[k]=localStorage.getItem(k);
    if(!keys.length){bad.textContent="No staff, graft criteria, hospital, or funeral-home settings were found to publish.";bad.style.display="block";return}
    btn.disabled=true;btn.textContent="PUBLISHING…";
    try{await db.collection("masterSettings").doc(MASTER_DOC).set({items,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:auth.currentUser.email||ADMIN_EMAIL});ok.textContent="Master data published successfully.";ok.style.display="block"}
    catch(err){bad.textContent=err.message||String(err);bad.style.display="block"}
    finally{btn.disabled=false;btn.textContent="PUBLISH THIS DEVICE'S MASTER DATA"}
  }
  async function applyMasterData(){
    try{
      const doc=await db.collection("masterSettings").doc(MASTER_DOC).get();if(!doc.exists)return;
      const items=(doc.data()||{}).items||{};let changed=false;
      for(const [k,v] of Object.entries(items)){if(typeof v!=="string")continue;if(localStorage.getItem(k)!==v){localStorage.setItem(k,v);changed=true}}
      if(changed&&sessionStorage.getItem("solvita_master_reload_guard")!=="1"){
        sessionStorage.setItem("solvita_master_reload_guard","1");location.reload();return;
      }
      sessionStorage.removeItem("solvita_master_reload_guard");
    }catch(err){console.warn("Master data sync",err)}
  }

  function snapshotDonors(){
    const m=new Map();
    try{for(const d of donors||[])m.set(d.id,{json:json(d),data:clone(d)})}catch{}
    return m;
  }
  function initializeActivityBaseline(){activityBaseline=snapshotDonors()}
  function describeChange(oldD,newD){
    if(!oldD&&newD)return "Created donor";
    if(oldD&&!newD)return "Removed donor";
    const os=oldD&&oldD.status,ns=newD&&newD.status;if(os!==ns&&ns)return "Changed status to "+ns;
    return "Updated donor";
  }
  function captureActivity(){
    if(!auth||!auth.currentUser||!db)return;
    const now=snapshotDonors(),ids=new Set([...activityBaseline.keys(),...now.keys()]);
    for(const id of ids){
      const before=activityBaseline.get(id),after=now.get(id);if((before&&before.json)===(after&&after.json))continue;
      clearTimeout(activityTimers.get(id));
      const oldData=before&&before.data,newData=after&&after.data;
      activityTimers.set(id,setTimeout(async()=>{
        try{await db.collection("activityLogs").add({donorId:id,donorLabel:donorLabel(newData||oldData),action:describeChange(oldData,newData),userUid:auth.currentUser.uid,userEmail:auth.currentUser.email||"",createdAt:firebase.firestore.FieldValue.serverTimestamp()})}catch(err){console.warn("Activity log",err)}
      },1200));
    }
    activityBaseline=now;
  }

  async function setPresence(donorId){
    activeDonorId=donorId||null;if(!auth||!auth.currentUser||!db)return;
    try{
      const ref=db.collection("editing").doc(auth.currentUser.uid);
      if(!activeDonorId){await ref.delete().catch(()=>{});return}
      await ref.set({donorId:activeDonorId,userUid:auth.currentUser.uid,userEmail:auth.currentUser.email||"",touchedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }catch(err){console.warn("Presence",err)}
  }
  function plannerVisible(){const pv=document.getElementById("plannerView")||document.querySelector("#planner");return pv?!pv.classList.contains("hidden"):!!activeDonorId}
  function startPresenceHeartbeat(){
    clearInterval(presenceTimer);presenceTimer=setInterval(()=>{if(activeDonorId&&plannerVisible())setPresence(activeDonorId);else if(activeDonorId){activeDonorId=null;setPresence(null)}},30000);
  }
  function renderPresence(entries){
    document.querySelectorAll(".presence-badge").forEach(x=>x.remove());
    const now=Date.now();
    for(const p of entries){
      const ts=p.touchedAt&&p.touchedAt.toMillis?p.touchedAt.toMillis():0;if(!ts||now-ts>PRESENCE_TTL_MS)continue;
      const btn=document.querySelector('.donor-open-btn[data-donor-id="'+CSS.escape(String(p.donorId||""))+'"]');if(!btn)continue;
      const host=btn.closest(".donor-card,.card")||btn.parentElement;if(!host)continue;
      const b=document.createElement("span");b.className="presence-badge"+(auth.currentUser&&p.userUid===auth.currentUser.uid?" self":"");b.textContent=auth.currentUser&&p.userUid===auth.currentUser.uid?"You are editing":"Editing: "+safeText((p.userEmail||"user").split("@")[0]);host.appendChild(b);
    }
  }
  function startPresenceListener(){
    if(presenceUnsub)presenceUnsub();presenceUnsub=db.collection("editing").onSnapshot(s=>{const arr=[];s.forEach(d=>arr.push(d.data()||{}));renderPresence(arr)},e=>console.warn("Presence listener",e));
  }

  function hookPlanner(){
    try{
      const oldSave=save;save=function(){const r=oldSave.apply(this,arguments);captureActivity();return r};
      const oldOpen=openDonor;openDonor=function(id){setPresence(id);return oldOpen.apply(this,arguments)};
      const oldRender=renderBoard;renderBoard=function(){const r=oldRender.apply(this,arguments);setTimeout(()=>{if(presenceUnsub){/* listener will repaint on next snapshot */}},0);return r};
    }catch(err){console.warn("Collaboration hooks",err)}
  }

  function waitForFirebase(){
    const t=setInterval(()=>{
      if(!window.firebase||!firebase.apps||!firebase.apps.length)return;
      clearInterval(t);auth=firebase.auth();db=firebase.firestore();injectUI();hookPlanner();
      auth.onAuthStateChanged(async user=>{
        if(!user){activeDonorId=null;if(presenceUnsub){presenceUnsub();presenceUnsub=null}if(masterUnsub){masterUnsub();masterUnsub=null}return}
        const mb=document.getElementById("collabMasterBtn");if(mb)mb.style.display=isAdmin()?"inline-block":"none";
        await applyMasterData();initializeActivityBaseline();startPresenceListener();startPresenceHeartbeat();
        if(masterUnsub)masterUnsub();masterUnsub=db.collection("masterSettings").doc(MASTER_DOC).onSnapshot(()=>{});
      });
    },250);
  }
  window.addEventListener("beforeunload",()=>{if(auth&&auth.currentUser&&db)db.collection("editing").doc(auth.currentUser.uid).delete().catch(()=>{})});
  waitForFirebase();
})();