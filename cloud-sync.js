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
  const ADMIN_EMAIL="bsitowski@gmail.com";

  let cloudAuth=null,cloudDb=null,cloudUnsub=null,cloudReady=false,cloudApplying=false,cloudSyncTimer=null;
  let cloudKnown=new Map();

  function installCloudUI(){
    const style=document.createElement("style");
    style.textContent=`
#cloudAuthGate,#cloudAdminModal,#cloudPasswordModal{position:fixed;inset:0;z-index:1000;background:#071f3eee;display:flex;align-items:center;justify-content:center;padding:18px;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
#cloudPasswordModal{z-index:1100}#cloudAuthGate.hidden,#cloudAdminModal.hidden,#cloudPasswordModal.hidden{display:none!important}.cloud-auth-box,.cloud-admin-box{width:min(470px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:22px;box-shadow:0 18px 55px #0006;color:#1c1c1e;box-sizing:border-box}.cloud-auth-box h2,.cloud-admin-box h2{font-size:24px;color:#071f3e;margin:0 0 6px}.cloud-auth-box p,.cloud-admin-box p{margin:0 0 16px;color:#666;line-height:1.45}.cloud-auth-box label,.cloud-admin-box label{display:block;font-weight:700;margin:0 0 6px}.cloud-auth-box input,.cloud-admin-box input{font:inherit;font-size:16px;width:100%;box-sizing:border-box;padding:11px;border:1px solid #d6d6dc;border-radius:10px;background:#fff;margin-bottom:13px}.cloud-auth-box button,.cloud-admin-box button{font:inherit;width:100%;border:0;border-radius:10px;padding:12px 14px;background:#0b63ce;color:#fff;font-weight:800}.cloud-auth-box button:disabled,.cloud-admin-box button:disabled{opacity:.55}.cloud-link-btn{margin-top:8px!important;background:transparent!important;color:#0b63ce!important;padding:8px!important;font-weight:700!important}.cloud-auth-error{display:none;background:#fff0f0;color:#8a1d1d;border-left:5px solid #c93535;padding:10px;border-radius:8px;margin:10px 0;font-size:13px}.cloud-auth-note{font-size:12px;color:#666;line-height:1.45;margin-top:12px}.cloud-status{display:inline-block;font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;background:#a86b00;color:#fff;white-space:nowrap;margin-right:6px}.cloud-status.ok{background:#2e8b57}.cloud-status.bad{background:#a52b2b}#cloudSignOutBtn,#cloudAdminBtn{display:none}.cloud-admin-row{border-top:1px solid #e5e5ea;padding:12px 0;display:flex;gap:10px;align-items:center}.cloud-admin-row .who{flex:1;min-width:0}.cloud-admin-row .email{font-weight:800;overflow-wrap:anywhere}.cloud-admin-row .uid{font-size:11px;color:#777;overflow-wrap:anywhere}.cloud-admin-row .status{font-size:11px;color:#a86b00;font-weight:700;margin-top:3px}.cloud-user-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.cloud-admin-row .cloud-user-actions button{width:auto;min-width:86px;padding:9px 10px}.cloud-reset-btn{background:#0b63ce!important}.cloud-revoke-btn{background:#a52b2b!important}.cloud-admin-actions{display:flex;gap:8px;margin-top:10px}.cloud-admin-actions button{flex:1}.cloud-admin-actions .secondary{background:#68707a}.cloud-admin-success{display:none;background:#eefaf2;color:#23633a;border-left:5px solid #2e8b57;padding:10px;border-radius:8px;margin:10px 0;font-size:13px}
`;
    document.head.appendChild(style);

    const gate=document.createElement("div");
    gate.id="cloudAuthGate";
    gate.innerHTML=`<div class="cloud-auth-box"><h2>Solvita Planner Sign In</h2><p>Sign in with an authorized Solvita Planner account.</p><label>Email</label><input id="cloudEmail" type="email" inputmode="email" autocomplete="username" placeholder="name@example.com"><label>Password</label><input id="cloudPassword" type="password" autocomplete="current-password" placeholder="Password"><div id="cloudAuthError" class="cloud-auth-error"></div><div id="cloudAuthSuccess" class="cloud-admin-success"></div><button id="cloudSignInBtn" type="button">SIGN IN</button><button id="cloudForgotBtn" class="cloud-link-btn" type="button">Forgot password?</button><div class="cloud-auth-note">Accounts are created and approved by the planner administrator.</div></div>`;
    document.body.appendChild(gate);

    const passwordModal=document.createElement("div");
    passwordModal.id="cloudPasswordModal";passwordModal.className="hidden";
    passwordModal.innerHTML=`<div class="cloud-auth-box"><h2>Create Your New Password</h2><p>Your account is using a temporary password. Choose a new password before opening the planner.</p><label>New password</label><input id="cloudNewPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters"><label>Confirm new password</label><input id="cloudConfirmPassword" type="password" autocomplete="new-password" placeholder="Enter it again"><div id="cloudPasswordError" class="cloud-auth-error"></div><button id="cloudChangePasswordBtn" type="button">SAVE NEW PASSWORD</button><button id="cloudPasswordSignOutBtn" class="cloud-link-btn" type="button">Sign out</button></div>`;
    document.body.appendChild(passwordModal);

    const admin=document.createElement("div");
    admin.id="cloudAdminModal";admin.className="hidden";
    admin.innerHTML=`<div class="cloud-admin-box"><h2>User Administration</h2><p>Create an approved planner account. New employees start with a temporary password and will be required to choose a new password at first sign-in.</p><label>Email</label><input id="adminNewEmail" type="email" inputmode="email" placeholder="coworker@example.com"><label>Temporary password</label><input id="adminNewPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters"><div id="adminError" class="cloud-auth-error"></div><div id="adminSuccess" class="cloud-admin-success"></div><button id="adminCreateBtn" type="button">CREATE & APPROVE USER</button><div class="cloud-admin-actions"><button id="adminRefreshBtn" class="secondary" type="button">REFRESH LIST</button><button id="adminCloseBtn" class="secondary" type="button">CLOSE</button></div><h3>Approved users</h3><div id="adminUserList"><div class="cloud-auth-note">Loading…</div></div><div class="cloud-auth-note">SEND RESET emails a secure Firebase password-reset link. REVOKE removes planner access but does not delete the Firebase Authentication account.</div></div>`;
    document.body.appendChild(admin);

    const head=document.querySelector("header .head");
    if(head){
      const wrap=document.createElement("div");
      wrap.style.cssText="display:flex;align-items:center;gap:6px;flex-wrap:wrap";
      wrap.innerHTML='<span id="cloudStatus" class="cloud-status">CLOUD: SIGN IN</span><button id="cloudAdminBtn" style="color:#fff;background:transparent;border:1px solid #ffffff55;border-radius:9px;padding:9px 11px;font-weight:750" type="button">ADMIN</button><button id="cloudSignOutBtn" style="color:#fff;background:transparent;border:1px solid #ffffff55;border-radius:9px;padding:9px 11px;font-weight:750" type="button">SIGN OUT</button>';
      head.appendChild(wrap);
    }

    const ver=document.querySelector(".ver");
    if(ver)ver.textContent="Version 9.10.4 — Password Reset + First Login Change";

    document.getElementById("cloudSignInBtn").addEventListener("click",cloudSignIn);
    document.getElementById("cloudForgotBtn").addEventListener("click",forgotPassword);
    document.getElementById("cloudPassword").addEventListener("keydown",e=>{if(e.key==="Enter")cloudSignIn()});
    document.getElementById("cloudChangePasswordBtn").addEventListener("click",changeTemporaryPassword);
    document.getElementById("cloudConfirmPassword").addEventListener("keydown",e=>{if(e.key==="Enter")changeTemporaryPassword()});
    document.getElementById("cloudPasswordSignOutBtn").addEventListener("click",cloudSignOut);
    const out=document.getElementById("cloudSignOutBtn");if(out)out.addEventListener("click",cloudSignOut);
    const ab=document.getElementById("cloudAdminBtn");if(ab)ab.addEventListener("click",openAdmin);
    document.getElementById("adminCloseBtn").addEventListener("click",()=>admin.classList.add("hidden"));
    document.getElementById("adminRefreshBtn").addEventListener("click",renderApprovedUsers);
    document.getElementById("adminCreateBtn").addEventListener("click",adminCreateUser);
  }

  function isAdminUser(user){return !!(user&&String(user.email||"").toLowerCase()===ADMIN_EMAIL)}
  function cloudStatusText(text,state="warn"){
    const el=document.getElementById("cloudStatus");if(!el)return;el.textContent=text;el.className="cloud-status"+(state==="ok"?" ok":state==="bad"?" bad":"");
  }
  function cloudErrorMessage(err){
    const code=String(err&&err.code||"");
    if(code.includes("invalid-credential")||code.includes("wrong-password")||code.includes("user-not-found"))return "Email or password was not accepted.";
    if(code.includes("email-already-in-use"))return "That email already has a Firebase account.";
    if(code.includes("weak-password"))return "Use a password with at least 6 characters.";
    if(code.includes("too-many-requests"))return "Too many attempts. Please wait a little and try again.";
    if(code.includes("network-request-failed"))return "Could not reach Firebase. Check your internet connection.";
    if(code.includes("permission-denied"))return "This account is signed in but is not approved for the shared donor database.";
    if(code.includes("requires-recent-login"))return "For security, sign out and sign back in with the temporary password, then try again.";
    return (err&&err.message)||String(err);
  }
  function showAuthMessage(text,isError=false){
    const err=document.getElementById("cloudAuthError"),ok=document.getElementById("cloudAuthSuccess");
    err.style.display="none";ok.style.display="none";
    const box=isError?err:ok;box.textContent=text;box.style.display="block";
  }
  async function cloudSignIn(){
    const email=(document.getElementById("cloudEmail").value||"").trim();
    const password=document.getElementById("cloudPassword").value||"";
    const box=document.getElementById("cloudAuthError"),ok=document.getElementById("cloudAuthSuccess"),btn=document.getElementById("cloudSignInBtn");
    box.style.display="none";ok.style.display="none";btn.disabled=true;btn.textContent="SIGNING IN…";
    try{await cloudAuth.signInWithEmailAndPassword(email,password)}catch(err){box.textContent=cloudErrorMessage(err);box.style.display="block"}
    finally{btn.disabled=false;btn.textContent="SIGN IN"}
  }
  async function forgotPassword(){
    const email=(document.getElementById("cloudEmail").value||"").trim().toLowerCase();
    if(!email){showAuthMessage("Enter your email address first, then tap Forgot password?",true);return}
    const btn=document.getElementById("cloudForgotBtn");btn.disabled=true;btn.textContent="SENDING…";
    try{
      await cloudAuth.sendPasswordResetEmail(email);
      showAuthMessage("Password reset email sent. Check your inbox and follow the secure link to choose a new password.");
    }catch(err){showAuthMessage(cloudErrorMessage(err),true)}
    finally{btn.disabled=false;btn.textContent="Forgot password?"}
  }
  async function cloudSignOut(){try{await cloudAuth.signOut()}catch(err){console.warn(err)}}

  async function requiresTemporaryPasswordChange(user){
    if(isAdminUser(user))return false;
    const doc=await cloudDb.collection("approvedUsers").doc(user.uid).get();
    if(!doc.exists)throw new Error("This account has not been approved for the Solvita Planner.");
    return doc.data().mustResetPassword===true;
  }
  async function changeTemporaryPassword(){
    const user=cloudAuth.currentUser;if(!user)return;
    const p1=document.getElementById("cloudNewPassword").value||"";
    const p2=document.getElementById("cloudConfirmPassword").value||"";
    const box=document.getElementById("cloudPasswordError"),btn=document.getElementById("cloudChangePasswordBtn");
    box.style.display="none";
    if(p1.length<6){box.textContent="Use a password with at least 6 characters.";box.style.display="block";return}
    if(p1!==p2){box.textContent="The two passwords do not match.";box.style.display="block";return}
    btn.disabled=true;btn.textContent="SAVING…";
    try{
      await user.updatePassword(p1);
      await cloudDb.collection("approvedUsers").doc(user.uid).update({mustResetPassword:false,passwordChangedAt:firebase.firestore.FieldValue.serverTimestamp()});
      document.getElementById("cloudNewPassword").value="";document.getElementById("cloudConfirmPassword").value="";
      document.getElementById("cloudPasswordModal").classList.add("hidden");
      await startCloudDonorSync(user);
    }catch(err){box.textContent=cloudErrorMessage(err);box.style.display="block"}
    finally{btn.disabled=false;btn.textContent="SAVE NEW PASSWORD"}
  }

  async function openAdmin(){
    if(!isAdminUser(cloudAuth.currentUser))return;
    document.getElementById("cloudAdminModal").classList.remove("hidden");
    await renderApprovedUsers();
  }
  async function renderApprovedUsers(){
    const list=document.getElementById("adminUserList");
    list.innerHTML='<div class="cloud-auth-note">Loading…</div>';
    try{
      const snap=await cloudDb.collection("approvedUsers").orderBy("email").get();
      if(snap.empty){list.innerHTML='<div class="cloud-auth-note">No coworker accounts have been approved yet.</div>';return}
      list.innerHTML="";
      snap.forEach(doc=>{
        const d=doc.data()||{};const row=document.createElement("div");row.className="cloud-admin-row";
        row.innerHTML=`<div class="who"><div class="email"></div><div class="uid"></div><div class="status"></div></div><div class="cloud-user-actions"><button class="cloud-reset-btn" type="button">SEND RESET</button><button class="cloud-revoke-btn" type="button">REVOKE</button></div>`;
        row.querySelector(".email").textContent=d.email||"(no email)";row.querySelector(".uid").textContent=doc.id;
        row.querySelector(".status").textContent=d.mustResetPassword?"Temporary password — change required":"Password setup complete";
        row.querySelector(".cloud-reset-btn").addEventListener("click",()=>adminSendPasswordReset(doc.id,d.email||""));
        row.querySelector(".cloud-revoke-btn").addEventListener("click",()=>adminRevokeUser(doc.id,d.email||"this user"));list.appendChild(row);
      });
    }catch(err){list.innerHTML='<div class="cloud-auth-error" style="display:block">'+cloudErrorMessage(err)+'</div>'}
  }
  async function adminCreateUser(){
    if(!isAdminUser(cloudAuth.currentUser))return;
    const email=(document.getElementById("adminNewEmail").value||"").trim().toLowerCase();
    const password=document.getElementById("adminNewPassword").value||"";
    const errBox=document.getElementById("adminError"),ok=document.getElementById("adminSuccess"),btn=document.getElementById("adminCreateBtn");
    errBox.style.display="none";ok.style.display="none";
    if(!email||password.length<6){errBox.textContent="Enter a valid email and a temporary password of at least 6 characters.";errBox.style.display="block";return}
    btn.disabled=true;btn.textContent="CREATING…";
    let secondary=null;
    try{
      secondary=firebase.apps.find(a=>a.name==="userCreator")||firebase.initializeApp(firebaseConfig,"userCreator");
      const secondaryAuth=secondary.auth();
      const cred=await secondaryAuth.createUserWithEmailAndPassword(email,password);
      const uid=cred.user.uid;
      await secondaryAuth.signOut();
      await cloudDb.collection("approvedUsers").doc(uid).set({email,approved:true,mustResetPassword:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdBy:cloudAuth.currentUser.email||ADMIN_EMAIL});
      document.getElementById("adminNewEmail").value="";document.getElementById("adminNewPassword").value="";
      ok.textContent="User created and approved: "+email+". They will be required to change the temporary password at first sign-in.";ok.style.display="block";await renderApprovedUsers();
    }catch(err){errBox.textContent=cloudErrorMessage(err);errBox.style.display="block"}
    finally{btn.disabled=false;btn.textContent="CREATE & APPROVE USER"}
  }
  async function adminSendPasswordReset(uid,email){
    if(!isAdminUser(cloudAuth.currentUser)||!email)return;
    if(!confirm("Send a password reset email to "+email+"?"))return;
    const ok=document.getElementById("adminSuccess"),errBox=document.getElementById("adminError");ok.style.display="none";errBox.style.display="none";
    try{
      await cloudAuth.sendPasswordResetEmail(email);
      await cloudDb.collection("approvedUsers").doc(uid).set({lastResetSentAt:firebase.firestore.FieldValue.serverTimestamp(),lastResetSentBy:cloudAuth.currentUser.email||ADMIN_EMAIL},{merge:true});
      ok.textContent="Password reset email sent to "+email+".";ok.style.display="block";
    }catch(err){errBox.textContent=cloudErrorMessage(err);errBox.style.display="block"}
  }
  async function adminRevokeUser(uid,email){
    if(!isAdminUser(cloudAuth.currentUser))return;
    if(!confirm("Revoke planner access for "+email+"?"))return;
    try{await cloudDb.collection("approvedUsers").doc(uid).delete();await renderApprovedUsers()}catch(err){alert(cloudErrorMessage(err))}
  }

  function donorCloudCopy(d){return JSON.parse(JSON.stringify(d))}
  function donorJson(d){try{return JSON.stringify(donorCloudCopy(d))}catch{return ""}}
  function scheduleCloudDonorSync(){if(!cloudReady||cloudApplying)return;clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(cloudSyncNow,650)}
  async function cloudSyncNow(){
    if(!cloudReady||cloudApplying||!cloudDb)return;
    const current=new Map(donors.map(d=>[d.id,donorJson(d)]));const jobs=[];
    for(const d of donors){const json=current.get(d.id);if(cloudKnown.get(d.id)!==json)jobs.push(cloudDb.collection("donors").doc(d.id).set(donorCloudCopy(d)))}
    for(const id of cloudKnown.keys())if(!current.has(id))jobs.push(cloudDb.collection("donors").doc(id).delete());
    if(!jobs.length)return;cloudStatusText("CLOUD: SAVING");
    try{await Promise.all(jobs);cloudStatusText("CLOUD: SYNCED","ok")}catch(err){console.error("Cloud donor save failed",err);cloudStatusText("CLOUD: SAVE ERROR","bad")}
  }
  function applyCloudSnapshot(snap){
    cloudApplying=true;
    try{
      const incoming=new Map();snap.forEach(doc=>incoming.set(doc.id,{...doc.data(),id:doc.id}));
      const merged=new Map(donors.map(d=>[d.id,d]));for(const [id,d] of incoming)merged.set(id,d);for(const id of [...merged.keys()])if(!incoming.has(id)&&cloudKnown.has(id))merged.delete(id);
      donors=[...merged.values()];cloudKnown=new Map(donors.filter(d=>incoming.has(d.id)).map(d=>[d.id,donorJson(d)]));localStorage.setItem(APPKEY,JSON.stringify(donors));
      if(typeof homeView!=="undefined"&&!homeView.classList.contains("hidden"))renderBoard();if(typeof archiveView!=="undefined"&&!archiveView.classList.contains("hidden"))renderArchive();
    }finally{cloudApplying=false}
  }
  async function startCloudDonorSync(user){
    if(cloudUnsub){cloudUnsub();cloudUnsub=null}cloudReady=false;cloudKnown.clear();cloudStatusText("CLOUD: CONNECTING");
    try{
      const localBefore=cloneData(donors);const snap=await cloudDb.collection("donors").get();const remote=new Map();snap.forEach(doc=>remote.set(doc.id,{...doc.data(),id:doc.id}));
      for(const d of localBefore)if(!remote.has(d.id))await cloudDb.collection("donors").doc(d.id).set(donorCloudCopy(d));
      const refreshed=await cloudDb.collection("donors").get();donors=[];cloudKnown.clear();refreshed.forEach(doc=>{const d={...doc.data(),id:doc.id};donors.push(d);cloudKnown.set(d.id,donorJson(d))});
      localStorage.setItem(APPKEY,JSON.stringify(donors));cloudReady=true;cloudStatusText("CLOUD: SYNCED","ok");document.getElementById("cloudAuthGate").classList.add("hidden");
      const out=document.getElementById("cloudSignOutBtn");if(out)out.style.display="inline-block";const ab=document.getElementById("cloudAdminBtn");if(ab)ab.style.display=isAdminUser(user)?"inline-block":"none";
      renderBoard();cloudUnsub=cloudDb.collection("donors").onSnapshot(applyCloudSnapshot,err=>{console.error("Cloud listener error",err);cloudStatusText("CLOUD: CONNECTION ERROR","bad")});
    }catch(err){
      console.error("Cloud startup failed",err);cloudStatusText("CLOUD: ERROR","bad");const box=document.getElementById("cloudAuthError");box.textContent="Signed in, but the shared donor database could not be opened: "+cloudErrorMessage(err);box.style.display="block";document.getElementById("cloudAuthGate").classList.remove("hidden");
    }
  }
  async function handleAuthenticatedUser(user){
    document.getElementById("cloudEmail").value=user.email||"";document.getElementById("cloudAuthError").style.display="none";document.getElementById("cloudAuthSuccess").style.display="none";
    try{
      if(await requiresTemporaryPasswordChange(user)){
        cloudReady=false;cloudStatusText("PASSWORD CHANGE REQUIRED");document.getElementById("cloudAuthGate").classList.add("hidden");document.getElementById("cloudPasswordModal").classList.remove("hidden");return;
      }
      document.getElementById("cloudPasswordModal").classList.add("hidden");await startCloudDonorSync(user);
    }catch(err){
      cloudStatusText("CLOUD: ERROR","bad");showAuthMessage(cloudErrorMessage(err),true);document.getElementById("cloudAuthGate").classList.remove("hidden");
    }
  }
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error("Could not load "+src));document.head.appendChild(s)})}
  async function ensureFirebase(){if(window.firebase)return;await loadScript("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");await loadScript("https://www.gstatic.com/firebasejs/12.17.1/firebase-auth-compat.js");await loadScript("https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore-compat.js")}
  async function initCloud(){
    installCloudUI();
    try{
      await ensureFirebase();if(!window.firebase)throw new Error("Firebase libraries did not load.");if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
      cloudAuth=firebase.auth();cloudDb=firebase.firestore();cloudAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err=>console.warn("Auth persistence",err));try{cloudDb.enablePersistence({synchronizeTabs:true}).catch(()=>{})}catch{}
      cloudAuth.onAuthStateChanged(user=>{
        if(user){handleAuthenticatedUser(user)}
        else{cloudReady=false;if(cloudUnsub){cloudUnsub();cloudUnsub=null}document.getElementById("cloudAuthGate").classList.remove("hidden");document.getElementById("cloudPasswordModal").classList.add("hidden");const out=document.getElementById("cloudSignOutBtn");if(out)out.style.display="none";const ab=document.getElementById("cloudAdminBtn");if(ab)ab.style.display="none";document.getElementById("cloudAdminModal").classList.add("hidden");cloudStatusText("CLOUD: SIGN IN")}
      });
    }catch(err){console.error(err);cloudStatusText("CLOUD: UNAVAILABLE","bad");const box=document.getElementById("cloudAuthError");box.textContent="Firebase could not start: "+cloudErrorMessage(err);box.style.display="block"}
  }
  const originalSave=save;save=function(){originalSave();scheduleCloudDonorSync()};const originalInit=init;init=function(){originalInit();initCloud()};
  window.cloudSignIn=cloudSignIn;window.cloudSignOut=cloudSignOut;
})();
