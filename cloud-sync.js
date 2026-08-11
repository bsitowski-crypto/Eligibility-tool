(function(){
  "use strict";

  const firebaseConfig={
    apiKey:"AIzaSyCQT1YVBoybNFHkm_Q9h_BrfYuq3zvInng",
    authDomain:"eligibility-tool-4df2a.firebaseapp.com",
    projectId:"eligibility-tool-4df2a",
    storageBucket:"eligibility-tool-4df2a.firebasestorage.app",
    messagingSenderId:"950682240640",
    appId:"1:950682240640:web:9f3567fd93d49c2336c865"
  };

  let cloudAuth=null,cloudDb=null,cloudUnsub=null,cloudReady=false,cloudApplying=false,cloudSyncTimer=null;
  let cloudKnown=new Map();

  function installCloudUI(){
    const style=document.createElement("style");
    style.textContent=`
#cloudAuthGate{position:fixed;inset:0;z-index:1000;background:#071f3eee;display:flex;align-items:center;justify-content:center;padding:18px;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
#cloudAuthGate.hidden{display:none!important}.cloud-auth-box{width:min(430px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 18px 55px #0006;color:#1c1c1e}.cloud-auth-box h2{font-size:24px;color:#071f3e;margin:0 0 6px}.cloud-auth-box p{margin:0 0 16px;color:#666;line-height:1.45}.cloud-auth-box label{display:block;font-weight:700;margin:0 0 6px}.cloud-auth-box input{font:inherit;font-size:16px;width:100%;box-sizing:border-box;padding:11px;border:1px solid #d6d6dc;border-radius:10px;background:#fff;margin-bottom:13px}.cloud-auth-box button{font:inherit;width:100%;border:0;border-radius:10px;padding:12px 14px;background:#0b63ce;color:#fff;font-weight:800}.cloud-auth-box button:disabled{opacity:.55}.cloud-auth-error{display:none;background:#fff0f0;color:#8a1d1d;border-left:5px solid #c93535;padding:10px;border-radius:8px;margin:10px 0;font-size:13px}.cloud-auth-note{font-size:12px;color:#666;line-height:1.45;margin-top:12px}.cloud-status{display:inline-block;font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;background:#a86b00;color:#fff;white-space:nowrap;margin-right:6px}.cloud-status.ok{background:#2e8b57}.cloud-status.bad{background:#a52b2b}#cloudSignOutBtn{display:none}
`;
    document.head.appendChild(style);

    const gate=document.createElement("div");
    gate.id="cloudAuthGate";
    gate.innerHTML=`<div class="cloud-auth-box"><h2>Solvita Planner Sign In</h2><p>Sign in with an authorized account to access the shared donor board.</p><label>Email</label><input id="cloudEmail" type="email" inputmode="email" autocomplete="username" placeholder="name@example.com"><label>Password</label><input id="cloudPassword" type="password" autocomplete="current-password" placeholder="Password"><div id="cloudAuthError" class="cloud-auth-error"></div><button id="cloudSignInBtn" type="button">SIGN IN</button><div class="cloud-auth-note">Accounts are created by the Firebase project administrator. There is no public sign-up from this app.</div></div>`;
    document.body.appendChild(gate);

    const head=document.querySelector("header .head");
    if(head){
      const wrap=document.createElement("div");
      wrap.style.cssText="display:flex;align-items:center;gap:6px;flex-wrap:wrap";
      wrap.innerHTML='<span id="cloudStatus" class="cloud-status">CLOUD: SIGN IN</span><button id="cloudSignOutBtn" style="color:#fff;background:transparent;border:1px solid #ffffff55;border-radius:9px;padding:9px 11px;font-weight:750" type="button">SIGN OUT</button>';
      head.appendChild(wrap);
    }

    const ver=document.querySelector(".ver");
    if(ver)ver.textContent="Version 9.10.2 — Shared Cloud Donor Board — Firebase sync";

    document.getElementById("cloudSignInBtn").addEventListener("click",cloudSignIn);
    document.getElementById("cloudPassword").addEventListener("keydown",e=>{if(e.key==="Enter")cloudSignIn()});
    const out=document.getElementById("cloudSignOutBtn");if(out)out.addEventListener("click",cloudSignOut);
  }

  function cloudStatusText(text,state="warn"){
    const el=document.getElementById("cloudStatus");if(!el)return;el.textContent=text;el.className="cloud-status"+(state==="ok"?" ok":state==="bad"?" bad":"");
  }
  function cloudErrorMessage(err){
    const code=String(err&&err.code||"");
    if(code.includes("invalid-credential")||code.includes("wrong-password")||code.includes("user-not-found"))return "Email or password was not accepted.";
    if(code.includes("too-many-requests"))return "Too many attempts. Please wait a little and try again.";
    if(code.includes("network-request-failed"))return "Could not reach Firebase. Check your internet connection.";
    if(code.includes("permission-denied"))return "This account is signed in but does not have permission to use the shared donor database.";
    return (err&&err.message)||String(err);
  }
  async function cloudSignIn(){
    const email=(document.getElementById("cloudEmail").value||"").trim();
    const password=document.getElementById("cloudPassword").value||"";
    const box=document.getElementById("cloudAuthError"),btn=document.getElementById("cloudSignInBtn");
    box.style.display="none";btn.disabled=true;btn.textContent="SIGNING IN…";
    try{await cloudAuth.signInWithEmailAndPassword(email,password)}catch(err){box.textContent=cloudErrorMessage(err);box.style.display="block"}
    finally{btn.disabled=false;btn.textContent="SIGN IN"}
  }
  async function cloudSignOut(){try{await cloudAuth.signOut()}catch(err){console.warn(err)}}
  function donorCloudCopy(d){return JSON.parse(JSON.stringify(d))}
  function donorJson(d){try{return JSON.stringify(donorCloudCopy(d))}catch{return ""}}

  function scheduleCloudDonorSync(){
    if(!cloudReady||cloudApplying)return;
    clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(cloudSyncNow,650);
  }
  async function cloudSyncNow(){
    if(!cloudReady||cloudApplying||!cloudDb)return;
    const current=new Map(donors.map(d=>[d.id,donorJson(d)]));
    const jobs=[];
    for(const d of donors){
      const json=current.get(d.id);
      if(cloudKnown.get(d.id)!==json)jobs.push(cloudDb.collection("donors").doc(d.id).set(donorCloudCopy(d)));
    }
    for(const id of cloudKnown.keys())if(!current.has(id))jobs.push(cloudDb.collection("donors").doc(id).delete());
    if(!jobs.length)return;
    cloudStatusText("CLOUD: SAVING");
    try{await Promise.all(jobs);cloudStatusText("CLOUD: SYNCED","ok")}
    catch(err){console.error("Cloud donor save failed",err);cloudStatusText("CLOUD: SAVE ERROR","bad")}
  }

  function applyCloudSnapshot(snap){
    cloudApplying=true;
    try{
      const incoming=new Map();snap.forEach(doc=>incoming.set(doc.id,{...doc.data(),id:doc.id}));
      const merged=new Map(donors.map(d=>[d.id,d]));
      for(const [id,d] of incoming)merged.set(id,d);
      for(const id of [...merged.keys()])if(!incoming.has(id)&&cloudKnown.has(id))merged.delete(id);
      donors=[...merged.values()];
      cloudKnown=new Map(donors.filter(d=>incoming.has(d.id)).map(d=>[d.id,donorJson(d)]));
      localStorage.setItem(APPKEY,JSON.stringify(donors));
      if(typeof homeView!=="undefined"&&!homeView.classList.contains("hidden"))renderBoard();
      if(typeof archiveView!=="undefined"&&!archiveView.classList.contains("hidden"))renderArchive();
    }finally{cloudApplying=false}
  }

  async function startCloudDonorSync(user){
    if(cloudUnsub){cloudUnsub();cloudUnsub=null}
    cloudReady=false;cloudKnown.clear();cloudStatusText("CLOUD: CONNECTING");
    try{
      const localBefore=cloneData(donors);
      const snap=await cloudDb.collection("donors").get();
      const remote=new Map();snap.forEach(doc=>remote.set(doc.id,{...doc.data(),id:doc.id}));
      // First-time migration: cloud wins when the same donor ID already exists; local-only donors are uploaded.
      for(const d of localBefore)if(!remote.has(d.id))await cloudDb.collection("donors").doc(d.id).set(donorCloudCopy(d));
      const refreshed=await cloudDb.collection("donors").get();
      donors=[];cloudKnown.clear();
      refreshed.forEach(doc=>{const d={...doc.data(),id:doc.id};donors.push(d);cloudKnown.set(d.id,donorJson(d))});
      localStorage.setItem(APPKEY,JSON.stringify(donors));
      cloudReady=true;cloudStatusText("CLOUD: SYNCED","ok");
      document.getElementById("cloudAuthGate").classList.add("hidden");
      const out=document.getElementById("cloudSignOutBtn");if(out)out.style.display="inline-block";
      renderBoard();
      cloudUnsub=cloudDb.collection("donors").onSnapshot(applyCloudSnapshot,err=>{console.error("Cloud listener error",err);cloudStatusText("CLOUD: CONNECTION ERROR","bad")});
    }catch(err){
      console.error("Cloud startup failed",err);cloudStatusText("CLOUD: ERROR","bad");
      const box=document.getElementById("cloudAuthError");box.textContent="Signed in, but the shared donor database could not be opened: "+cloudErrorMessage(err);box.style.display="block";document.getElementById("cloudAuthGate").classList.remove("hidden");
    }
  }

  function initCloud(){
    installCloudUI();
    try{
      if(!window.firebase)throw new Error("Firebase libraries did not load.");
      if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
      cloudAuth=firebase.auth();cloudDb=firebase.firestore();
      cloudAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err=>console.warn("Auth persistence",err));
      try{cloudDb.enablePersistence({synchronizeTabs:true}).catch(()=>{})}catch{}
      cloudAuth.onAuthStateChanged(user=>{
        if(user){
          document.getElementById("cloudEmail").value=user.email||"";
          document.getElementById("cloudAuthError").style.display="none";
          startCloudDonorSync(user);
        }else{
          cloudReady=false;if(cloudUnsub){cloudUnsub();cloudUnsub=null}
          document.getElementById("cloudAuthGate").classList.remove("hidden");
          const out=document.getElementById("cloudSignOutBtn");if(out)out.style.display="none";
          cloudStatusText("CLOUD: SIGN IN");
        }
      });
    }catch(err){
      console.error(err);cloudStatusText("CLOUD: UNAVAILABLE","bad");
      const box=document.getElementById("cloudAuthError");box.textContent="Firebase could not start: "+cloudErrorMessage(err);box.style.display="block";
    }
  }

  const originalSave=save;
  save=function(){originalSave();scheduleCloudDonorSync()};
  const originalInit=init;
  init=function(){originalInit();initCloud()};

  window.cloudSignIn=cloudSignIn;
  window.cloudSignOut=cloudSignOut;
})();
