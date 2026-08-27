(function(){
  "use strict";
  let menuButton=null,menuPanel=null,observer=null,bodyObserver=null;
  const groups={};

  function addStyles(){
    if(document.getElementById("solvitaCompactMenuStyle"))return;
    const style=document.createElement("style");
    style.id="solvitaCompactMenuStyle";
    style.textContent=`
#solvitaMenuButton{color:#fff;background:transparent;border:1px solid #ffffff66;border-radius:9px;padding:9px 12px;font-weight:800;min-height:40px;white-space:nowrap}
#solvitaMenuPanel{position:fixed;z-index:2000;top:72px;right:12px;width:min(330px,calc(100vw - 24px));max-height:calc(100vh - 92px);overflow:auto;background:#fff;border-radius:16px;padding:8px;box-sizing:border-box;box-shadow:0 16px 45px #0007;border:1px solid #d7d7dc}
#solvitaMenuPanel.hidden{display:none!important}
.menu-section{padding:3px 0 8px}.menu-section+.menu-section{border-top:1px solid #e5e9ef;padding-top:10px}.menu-section-title{padding:5px 12px 6px;color:#7a8390;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
#solvitaMenuPanel button,#solvitaMenuPanel a{width:100%!important;display:block;text-align:left!important;box-sizing:border-box;margin:0!important;padding:11px 13px!important;border:0!important;border-radius:9px!important;background:#fff!important;color:#071f3e!important;font:inherit!important;font-weight:760!important;min-height:42px;text-decoration:none!important}
#solvitaMenuPanel button:hover,#solvitaMenuPanel a:hover{background:#f2f6fb!important}
#solvitaMenuPanel #cloudSignOutBtn{color:#9b1c1c!important}
#solvitaMenuPanel #cloudAdminBtn,#solvitaMenuPanel #collabMasterBtn{color:#5b2a86!important}
.menu-admin-details{border-top:1px solid #e5e9ef;margin-top:2px;padding-top:4px}.menu-admin-details>summary{list-style:none;cursor:pointer;padding:12px 13px;border-radius:9px;color:#5b2a86;font-weight:850}.menu-admin-details>summary::-webkit-details-marker{display:none}.menu-admin-details>summary::after{content:"▾";float:right;color:#7a8390}.menu-admin-details[open]>summary::after{content:"▴"}.menu-admin-details>summary:hover{background:#f6f2fb}.menu-admin-body{padding:0 0 3px}.menu-admin-body button,.menu-admin-body a{padding-left:20px!important}.menu-admin-body #cloudSignOutBtn{margin-top:5px!important;border-top:1px solid #ececf0!important;border-radius:0!important;padding-top:13px!important}
.menu-source-hidden{display:none!important}
@media(max-width:600px){#solvitaMenuPanel{top:64px;right:8px;width:calc(100vw - 16px)}}`;
    document.head.appendChild(style);
  }

  function findHeader(){return document.querySelector("header .head")||document.querySelector("header")}
  function closeMenu(){if(menuPanel)menuPanel.classList.add("hidden");if(menuButton)menuButton.setAttribute("aria-expanded","false")}
  function toggleMenu(){if(!menuPanel)return;const opening=menuPanel.classList.contains("hidden");menuPanel.classList.toggle("hidden",!opening);menuButton.setAttribute("aria-expanded",opening?"true":"false")}
  function normalizedText(el){return String(el?.textContent||el?.getAttribute?.("aria-label")||"").trim().toUpperCase().replace(/\s+/g," ")}

  function buildSections(){
    if(groups.cases)return;
    const section=(key,title)=>{const box=document.createElement("div");box.className="menu-section";box.dataset.menuSection=key;const h=document.createElement("div");h.className="menu-section-title";h.textContent=title;box.appendChild(h);menuPanel.appendChild(box);groups[key]=box;};
    section("cases","Cases");
    section("directories","Directories");
    section("tools","Tools");
    const details=document.createElement("details");details.className="menu-admin-details";details.innerHTML='<summary>Admin</summary><div class="menu-admin-body"></div>';menuPanel.appendChild(details);groups.admin=details.querySelector(".menu-admin-body");
  }

  function groupFor(el){
    const t=normalizedText(el);
    if(t==="DONOR BOARD"||t.includes("NEW DONOR")||t==="ARCHIVE")return"cases";
    if(t==="HOSPITALS"||t==="FUNERAL HOMES"||t==="MEDICAL EXAMINERS"||t==="STAFF"||t==="TRANSPORT")return"directories";
    if(t==="GRAFT CRITERIA"||t==="OPEN GRAFT CRITERIA"||t==="ACTIVITY")return"tools";
    if(t==="ADMIN"||t==="STAFFING SCHEDULE"||t==="MASTER DATA"||t==="EXPORT APP DATA"||t==="IMPORT APP DATA"||t==="SIGN OUT")return"admin";
    return"tools";
  }

  function duplicateInMenu(el){
    const t=normalizedText(el).replace(/^OPEN /,"");
    return [...menuPanel.querySelectorAll("button,a")].find(x=>x!==el&&normalizedText(x).replace(/^OPEN /,"")===t);
  }

  function moveIntoMenu(el){
    if(!el||!menuPanel||el===menuButton||el.closest("#solvitaMenuPanel"))return;
    if(duplicateInMenu(el)){const card=el.closest(".card");if(card)card.classList.add("menu-source-hidden");else el.classList.add("menu-source-hidden");return;}
    const g=groupFor(el);groups[g].appendChild(el);el.dataset.solvitaMenuMoved="1";
  }

  function eligibleControl(el,head){
    if(!el||el===menuButton||el.closest("#solvitaMenuPanel")||!head.contains(el)||el.id==="solvitaMenuButton")return false;
    const text=(el.textContent||"").trim();return !!(text||el.getAttribute("aria-label"));
  }

  function moveSpecialDashboardControls(){
    if(!menuPanel)return;
    const rules=[[/^OPEN GRAFT CRITERIA$/,"GRAFT CRITERIA"],[/^EXPORT APP DATA$/,"EXPORT APP DATA"],[/^IMPORT APP DATA$/,"IMPORT APP DATA"]];
    for(const [re,label] of rules){
      const el=[...document.querySelectorAll("button,a")].find(x=>!x.closest("#solvitaMenuPanel")&&re.test(normalizedText(x)));
      if(!el)continue;
      const card=el.closest(".card");
      if(duplicateInMenu(el)){if(card)card.classList.add("menu-source-hidden");continue;}
      if(card)card.classList.add("menu-source-hidden");
      el.textContent=label;moveIntoMenu(el);
    }
  }

  function reorder(){
    const order={cases:["DONOR BOARD","+ NEW DONOR","NEW DONOR","ARCHIVE"],directories:["HOSPITALS","FUNERAL HOMES","MEDICAL EXAMINERS","STAFF","TRANSPORT"],tools:["GRAFT CRITERIA","ACTIVITY"],admin:["ADMIN","STAFFING SCHEDULE","MASTER DATA","EXPORT APP DATA","IMPORT APP DATA","SIGN OUT"]};
    for(const [key,names] of Object.entries(order)){
      const host=groups[key];if(!host)continue;
      const items=[...host.querySelectorAll(":scope > button,:scope > a")];
      items.sort((a,b)=>{const ta=normalizedText(a),tb=normalizedText(b);const ia=names.findIndex(n=>ta===n||ta.endsWith(n)),ib=names.findIndex(n=>tb===n||tb.endsWith(n));return (ia<0?99:ia)-(ib<0?99:ib)}).forEach(x=>host.appendChild(x));
    }
  }

  function moveHeaderControls(){
    const head=findHeader();if(!head||!menuPanel)return;
    [...head.querySelectorAll("button,a")].filter(el=>eligibleControl(el,head)).forEach(moveIntoMenu);
    moveSpecialDashboardControls();reorder();
    const count=menuPanel.querySelectorAll("button,a").length;menuButton.style.display=count?"inline-block":"none";
  }

  function install(){
    const head=findHeader();if(!head)return false;if(document.getElementById("solvitaMenuButton"))return true;addStyles();
    menuButton=document.createElement("button");menuButton.id="solvitaMenuButton";menuButton.type="button";menuButton.textContent="MENU ▾";menuButton.setAttribute("aria-haspopup","true");menuButton.setAttribute("aria-expanded","false");menuButton.addEventListener("click",e=>{e.stopPropagation();toggleMenu()});head.appendChild(menuButton);
    menuPanel=document.createElement("div");menuPanel.id="solvitaMenuPanel";menuPanel.className="hidden";menuPanel.setAttribute("role","menu");document.body.appendChild(menuPanel);buildSections();
    menuPanel.addEventListener("click",e=>{if(e.target.closest("button,a"))setTimeout(closeMenu,0)});
    document.addEventListener("click",e=>{if(menuPanel&&!menuPanel.classList.contains("hidden")&&!menuPanel.contains(e.target)&&e.target!==menuButton)closeMenu()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
    moveHeaderControls();observer=new MutationObserver(()=>moveHeaderControls());observer.observe(head,{childList:true,subtree:true});bodyObserver=new MutationObserver(()=>moveSpecialDashboardControls());bodyObserver.observe(document.body,{childList:true,subtree:true});setTimeout(moveHeaderControls,500);setTimeout(moveHeaderControls,1500);return true;
  }
  const timer=setInterval(()=>{if(install())clearInterval(timer)},150);setTimeout(()=>clearInterval(timer),15000);
})();
