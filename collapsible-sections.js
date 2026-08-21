(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(!root||!root.document)return;
  root.PDXCollapsibleSections=api;
  api.install(root,root.document);
})(typeof window!=="undefined"?window:null,function(){
  "use strict";

  const COLLAPSE_KEY="pdx_planner_collapsed_sections_v1";

  function truthy(value){
    return value===true||value===1||value==="true"||value==="yes";
  }

  function timingEnabledFor(donor){
    if(!donor||typeof donor!=="object")return false;
    if(Object.prototype.hasOwnProperty.call(donor,"timingEnabled")){
      return truthy(donor.timingEnabled);
    }
    // Existing donors that already contain timing information keep the
    // section enabled when this optional-section feature is introduced.
    return Boolean(donor.deathDate||donor.tod||donor.actualStart||donor.completedAt);
  }

  function slug(value){
    return String(value||"")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-|-$/g,"")||"section";
  }

  function install(root,document){
    let collapsedState={};
    try{
      const saved=JSON.parse(localStorage.getItem(COLLAPSE_KEY)||"{}");
      if(saved&&typeof saved==="object"&&!Array.isArray(saved))collapsedState=saved;
    }catch{}

    function currentDonor(){
      try{return typeof cur==="function"?cur():null}catch{return null}
    }

    function persistDonors(){
      try{if(typeof save==="function")save()}catch(err){console.warn("Save optional section state",err)}
    }

    function persistCollapsedState(){
      try{localStorage.setItem(COLLAPSE_KEY,JSON.stringify(collapsedState))}catch{}
    }

    function addStyles(){
      if(document.getElementById("pdxCollapsibleSectionStyles"))return;
      const style=document.createElement("style");
      style.id="pdxCollapsibleSectionStyles";
      style.textContent=`
        #plannerView>.card.pdx-collapsible-card{padding-top:12px}
        .pdx-section-head{display:flex;align-items:center;gap:9px;min-height:46px}
        .pdx-section-head h2{min-width:0;margin:0;line-height:1.2}
        .pdx-section-head-spacer{flex:1}
        .pdx-section-badge{flex:0 0 auto;border-radius:999px;padding:4px 7px;background:#e8eef7;color:#315273;font-size:10px;font-weight:850;letter-spacing:.02em}
        .pdx-section-toggle{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;margin:-4px -7px -4px 0;border:0;border-radius:10px;background:transparent;color:#315273}
        .pdx-section-toggle:disabled{opacity:.35;cursor:default}
        .pdx-section-chevron{font-size:24px;line-height:1;transition:transform .16s ease}
        .pdx-section-toggle[aria-expanded="true"] .pdx-section-chevron{transform:rotate(180deg)}
        .pdx-section-body{padding-top:13px}
        .pdx-section-collapsed>.pdx-section-body{display:none!important}
        .pdx-optional-control{display:flex;align-items:center;gap:6px;margin:0;padding:5px 8px;border:1px solid #c5d2e2;border-radius:999px;background:#f7faff;color:#183153;font-size:12px;font-weight:800;white-space:nowrap}
        .pdx-optional-control input{appearance:auto;-webkit-appearance:checkbox;flex:0 0 19px;width:19px;height:19px;margin:0;padding:0;accent-color:#0b63ce}
        .pdx-optional-state{min-width:21px;color:#596b7d;font-size:10px;text-transform:uppercase}
        #timingCard[data-timing-enabled="false"]{background:#fafbfc;border-style:dashed;box-shadow:none}
        @media(max-width:600px){
          .pdx-section-head{gap:6px;flex-wrap:wrap}
          .pdx-section-head h2{flex:1 1 calc(100% - 52px)}
          .pdx-section-head-spacer{display:none}
          .pdx-section-badge{order:3}
          .pdx-optional-control{order:4;margin-left:auto}
          .pdx-section-toggle{order:2}
        }
      `;
      document.head.appendChild(style);
    }

    function sectionParts(card){
      return {
        head:card.querySelector(":scope > .pdx-section-head"),
        body:card.querySelector(":scope > .pdx-section-body"),
        toggle:card.querySelector(":scope > .pdx-section-head .pdx-section-toggle")
      };
    }

    function setCollapsed(card,collapsed,persist){
      if(!card)return;
      const parts=sectionParts(card);
      card.classList.toggle("pdx-section-collapsed",!!collapsed);
      parts.body?.setAttribute("aria-hidden",String(!!collapsed));
      parts.toggle?.setAttribute("aria-expanded",String(!collapsed));
      if(parts.toggle){
        const title=String(parts.head?.querySelector("h2")?.textContent||"section").trim();
        parts.toggle.setAttribute("aria-label",(collapsed?"Expand ":"Collapse ")+title);
      }
      if(persist){
        collapsedState[card.dataset.pdxSectionKey]=!!collapsed;
        persistCollapsedState();
      }
    }

    function enhanceCard(card,index){
      if(card.dataset.pdxCollapsible==="1")return;
      const heading=[...card.children].find(node=>node.tagName==="H2");
      if(!heading)return;

      const key=card.id||slug(heading.textContent)||`section-${index}`;
      card.dataset.pdxCollapsible="1";
      card.dataset.pdxSectionKey=key;
      card.classList.add("pdx-collapsible-card");

      const head=document.createElement("div");
      head.className="pdx-section-head";
      heading.before(head);
      head.appendChild(heading);

      if(card.id==="timingCard"){
        const badge=document.createElement("span");
        badge.className="pdx-section-badge";
        badge.textContent="OPTIONAL";
        head.appendChild(badge);
      }

      const spacer=document.createElement("span");
      spacer.className="pdx-section-head-spacer";
      head.appendChild(spacer);

      if(card.id==="timingCard"){
        const control=document.createElement("label");
        control.className="pdx-optional-control";
        control.innerHTML='<input id="timingSectionEnabled" type="checkbox"><span>Include timing</span><span id="timingSectionState" class="pdx-optional-state">OFF</span>';
        head.appendChild(control);
      }

      const toggle=document.createElement("button");
      toggle.className="pdx-section-toggle";
      toggle.type="button";
      toggle.setAttribute("aria-label","Collapse "+heading.textContent.trim());
      toggle.innerHTML='<span class="pdx-section-chevron" aria-hidden="true">⌄</span>';
      head.appendChild(toggle);

      const body=document.createElement("div");
      body.className="pdx-section-body";
      while(head.nextSibling)body.appendChild(head.nextSibling);
      card.appendChild(body);

      toggle.addEventListener("click",function(){
        if(toggle.disabled)return;
        const collapsed=!card.classList.contains("pdx-section-collapsed");
        setCollapsed(card,collapsed,true);
      });
      head.addEventListener("click",function(event){
        if(event.target.closest("button,input,label,select,a"))return;
        toggle.click();
      });

      setCollapsed(card,Boolean(collapsedState[key]),false);
    }

    function enhanceCards(){
      [...document.querySelectorAll("#plannerView > .card")]
        .forEach((card,index)=>enhanceCard(card,index));
    }

    function resetTimingOutput(){
      const values={timeout:"Not included",suggested:"—",untilStart:"—",actual:"—"};
      for(const [id,text] of Object.entries(values)){
        const node=document.getElementById(id);
        if(node)node.textContent=text;
      }
      const reason=document.getElementById("startReason");
      if(reason)reason.textContent="Timing is optional for this donor.";
      document.getElementById("actualRow")?.classList.add("hidden");
    }

    function applyTimingState(donor,openWhenEnabled){
      const card=document.getElementById("timingCard");
      const checkbox=document.getElementById("timingSectionEnabled");
      if(!card||!checkbox)return;
      const enabled=timingEnabledFor(donor);
      checkbox.checked=enabled;
      card.dataset.timingEnabled=String(enabled);
      const state=document.getElementById("timingSectionState");
      if(state)state.textContent=enabled?"ON":"OFF";
      const toggle=sectionParts(card).toggle;
      if(toggle)toggle.disabled=!enabled;
      if(enabled){
        setCollapsed(card,openWhenEnabled?false:Boolean(collapsedState[card.dataset.pdxSectionKey]),false);
      }else{
        setCollapsed(card,true,false);
        resetTimingOutput();
      }
    }

    function captureTimingState(persist){
      const donor=currentDonor();
      const checkbox=document.getElementById("timingSectionEnabled");
      if(!donor||!checkbox)return;
      donor.timingEnabled=checkbox.checked;
      if(persist)persistDonors();
    }

    function installTimingControl(){
      const checkbox=document.getElementById("timingSectionEnabled");
      if(!checkbox||checkbox.dataset.pdxBound==="1")return;
      checkbox.dataset.pdxBound="1";
      checkbox.addEventListener("change",function(){
        const donor=currentDonor();
        if(donor)donor.timingEnabled=this.checked;
        if(this.checked){
          const card=document.getElementById("timingCard");
          if(card){
            collapsedState[card.dataset.pdxSectionKey]=false;
            persistCollapsedState();
          }
        }
        persistDonors();
        applyTimingState(donor,this.checked);
        if(typeof root.updateTiming==="function")root.updateTiming();
      });
      applyTimingState(currentDonor(),false);
    }

    function installWrappers(){
      if(typeof root.timing==="function"&&!root.timing.__pdxOptionalTiming){
        const original=root.timing;
        const wrapped=function(donor){
          if(!timingEnabledFor(donor))return null;
          return original.apply(this,arguments);
        };
        wrapped.__pdxOptionalTiming=true;
        root.timing=wrapped;
      }

      if(typeof root.updateTiming==="function"&&!root.updateTiming.__pdxOptionalTiming){
        const original=root.updateTiming;
        const wrapped=function(){
          const result=original.apply(this,arguments);
          if(!timingEnabledFor(currentDonor()))resetTimingOutput();
          return result;
        };
        wrapped.__pdxOptionalTiming=true;
        root.updateTiming=wrapped;
      }

      if(typeof root.snapshot==="function"&&!root.snapshot.__pdxOptionalTiming){
        const original=root.snapshot;
        const wrapped=function(){
          captureTimingState(false);
          return original.apply(this,arguments);
        };
        wrapped.__pdxOptionalTiming=true;
        root.snapshot=wrapped;
      }

      if(typeof root.loadDonor==="function"&&!root.loadDonor.__pdxOptionalTiming){
        const original=root.loadDonor;
        const wrapped=function(donor){
          const result=original.apply(this,arguments);
          applyTimingState(donor,false);
          return result;
        };
        wrapped.__pdxOptionalTiming=true;
        root.loadDonor=wrapped;
      }

      if(typeof root.screenDonor==="function"&&!root.screenDonor.__pdxCollapsibleSections){
        const original=root.screenDonor;
        const wrapped=function(){
          const openedByUser=arguments.length===0||arguments[0]==null;
          const result=original.apply(this,arguments);
          if(openedByUser){
            const card=document.getElementById("recoveryCard");
            if(card){
              collapsedState[card.dataset.pdxSectionKey]=false;
              setCollapsed(card,false,false);
              persistCollapsedState();
            }
          }
          return result;
        };
        wrapped.__pdxCollapsibleSections=true;
        root.screenDonor=wrapped;
      }

      if(typeof root.validateRecovery==="function"&&!root.validateRecovery.__pdxCollapsibleSections){
        const original=root.validateRecovery;
        const wrapped=function(){
          const result=original.apply(this,arguments);
          for(const id of ["validationCard","suppliesCard"]){
            const card=document.getElementById(id);
            if(!card||card.classList.contains("hidden"))continue;
            collapsedState[card.dataset.pdxSectionKey]=false;
            setCollapsed(card,false,false);
          }
          persistCollapsedState();
          return result;
        };
        wrapped.__pdxCollapsibleSections=true;
        root.validateRecovery=wrapped;
      }
    }

    addStyles();
    enhanceCards();
    installTimingControl();
    installWrappers();

    return true;
  }

  return {truthy,timingEnabledFor,slug,install};
});
