(function(){
  "use strict";

  let menuButton=null,menuPanel=null,observer=null;

  function addStyles(){
    if(document.getElementById("solvitaCompactMenuStyle"))return;
    const style=document.createElement("style");
    style.id="solvitaCompactMenuStyle";
    style.textContent=`
#solvitaMenuButton{color:#fff;background:transparent;border:1px solid #ffffff66;border-radius:9px;padding:9px 12px;font-weight:800;min-height:40px;white-space:nowrap}
#solvitaMenuPanel{position:fixed;z-index:2000;top:72px;right:12px;width:min(310px,calc(100vw - 24px));max-height:calc(100vh - 92px);overflow:auto;background:#fff;border-radius:14px;padding:8px;box-sizing:border-box;box-shadow:0 16px 45px #0007;border:1px solid #d7d7dc}
#solvitaMenuPanel.hidden{display:none!important}
#solvitaMenuPanel button,#solvitaMenuPanel a{width:100%!important;display:block;text-align:left!important;box-sizing:border-box;margin:0!important;padding:12px 13px!important;border:0!important;border-bottom:1px solid #ececf0!important;border-radius:8px!important;background:#fff!important;color:#071f3e!important;font:inherit!important;font-weight:750!important;min-height:44px;text-decoration:none!important}
#solvitaMenuPanel button:last-child,#solvitaMenuPanel a:last-child{border-bottom:0!important}
#solvitaMenuPanel button:hover,#solvitaMenuPanel a:hover{background:#f2f6fb!important}
#solvitaMenuPanel #cloudSignOutBtn{color:#9b1c1c!important}
#solvitaMenuPanel #cloudAdminBtn,#solvitaMenuPanel #collabMasterBtn{color:#5b2a86!important}
@media(max-width:600px){#solvitaMenuPanel{top:64px;right:8px;width:calc(100vw - 16px)}}
`;
    document.head.appendChild(style);
  }

  function findHeader(){return document.querySelector("header .head")||document.querySelector("header")}

  function closeMenu(){if(menuPanel)menuPanel.classList.add("hidden");if(menuButton)menuButton.setAttribute("aria-expanded","false")}
  function toggleMenu(){
    if(!menuPanel)return;
    const opening=menuPanel.classList.contains("hidden");
    menuPanel.classList.toggle("hidden",!opening);
    menuButton.setAttribute("aria-expanded",opening?"true":"false");
  }

  function eligibleControl(el,head){
    if(!el||el===menuButton||el.closest("#solvitaMenuPanel"))return false;
    if(!head.contains(el))return false;
    if(el.id==="solvitaMenuButton")return false;
    const text=(el.textContent||"").trim();
    if(!text&&!el.getAttribute("aria-label"))return false;
    return true;
  }

  function moveHeaderControls(){
    const head=findHeader();if(!head||!menuPanel)return;
    const controls=[...head.querySelectorAll("button,a")].filter(el=>eligibleControl(el,head));
    controls.forEach(el=>{
      if(el.dataset.solvitaMenuMoved==="1")return;
      el.dataset.solvitaMenuMoved="1";
      menuPanel.appendChild(el);
    });
    if(menuPanel.children.length===0){menuButton.style.display="none"}else{menuButton.style.display="inline-block"}
  }

  function install(){
    const head=findHeader();if(!head)return false;
    if(document.getElementById("solvitaMenuButton"))return true;
    addStyles();

    menuButton=document.createElement("button");
    menuButton.id="solvitaMenuButton";
    menuButton.type="button";
    menuButton.textContent="MENU ▾";
    menuButton.setAttribute("aria-haspopup","true");
    menuButton.setAttribute("aria-expanded","false");
    menuButton.addEventListener("click",e=>{e.stopPropagation();toggleMenu()});
    head.appendChild(menuButton);

    menuPanel=document.createElement("div");
    menuPanel.id="solvitaMenuPanel";
    menuPanel.className="hidden";
    menuPanel.setAttribute("role","menu");
    document.body.appendChild(menuPanel);
    menuPanel.addEventListener("click",e=>{if(e.target.closest("button,a"))setTimeout(closeMenu,0)});

    document.addEventListener("click",e=>{if(menuPanel&&!menuPanel.classList.contains("hidden")&&!menuPanel.contains(e.target)&&e.target!==menuButton)closeMenu()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});

    moveHeaderControls();
    observer=new MutationObserver(()=>moveHeaderControls());
    observer.observe(head,{childList:true,subtree:true});
    setTimeout(moveHeaderControls,750);
    setTimeout(moveHeaderControls,2000);
    return true;
  }

  const timer=setInterval(()=>{if(install())clearInterval(timer)},150);
  setTimeout(()=>clearInterval(timer),15000);
})();
