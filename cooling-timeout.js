(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(!root||!root.document)return;
  root.PDXCoolingTimeout=api;
  api.install(root,root.document);
})(typeof window!=="undefined"?window:null,function(){
  "use strict";

  const NORMAL_TIMEOUT_HOURS=24;
  const NOT_IN_COOLING_TIMEOUT_HOURS=15;
  const HOUR_MS=60*60*1000;

  function usesNotInCoolingTimeout(donor){
    const value=donor&&donor.notInCooling;
    return value===true||value===1||value==="true";
  }

  function timeoutHours(donor){
    return usesNotInCoolingTimeout(donor)
      ? NOT_IN_COOLING_TIMEOUT_HOURS
      : NORMAL_TIMEOUT_HOURS;
  }

  function adjustTiming(result,donor){
    if(!result||!(result.tod instanceof Date)||Number.isNaN(result.tod.getTime()))return result;

    const timeout=new Date(result.tod.getTime()+timeoutHours(donor)*HOUR_MS);
    const oldTimeout=result.timeout instanceof Date?result.timeout:null;
    const oldStart=result.start instanceof Date?result.start:null;
    const recoveryLeadMs=oldTimeout&&oldStart
      ? Math.max(0,oldTimeout.getTime()-oldStart.getTime())
      : 0;

    return {
      ...result,
      timeout,
      start:new Date(timeout.getTime()-recoveryLeadMs),
      timeoutHours:timeoutHours(donor)
    };
  }

  function install(root,document){
    let installed=false;

    function currentDonor(){
      try{
        if(typeof cur==="function")return cur();
      }catch{}
      return null;
    }

    function persist(){
      try{
        if(typeof save==="function")save();
      }catch(err){
        console.warn("Unable to save cooling status",err);
      }
    }

    function timeoutLabel(){
      return document.getElementById("timeout")?.previousElementSibling||null;
    }

    function updateLabel(checked){
      const label=timeoutLabel();
      if(label)label.textContent=checked?"15-Hour Timeout":"24-Hour Timeout";
    }

    function injectControl(){
      const tod=document.getElementById("tod");
      if(!tod)return null;

      let checkbox=document.getElementById("notInCooling");
      if(checkbox)return checkbox;

      const style=document.createElement("style");
      style.id="notInCoolingStyles";
      style.textContent=`
        #notInCoolingWrap{display:flex;align-items:center;gap:8px;margin-top:9px;min-height:24px}
        #notInCoolingWrap input{appearance:auto;-webkit-appearance:checkbox;width:20px;height:20px;min-width:20px;margin:0;padding:0}
        #notInCoolingWrap label{display:inline;margin:0;font-size:14px;font-weight:750;line-height:1.25}
        #notInCoolingWrap .cooling-timeout-note{color:var(--sub);font-size:12px;line-height:1.25}
      `;
      document.head.appendChild(style);

      const wrap=document.createElement("div");
      wrap.id="notInCoolingWrap";
      wrap.innerHTML=`
        <input id="notInCooling" type="checkbox">
        <label for="notInCooling">Not in cooling</label>
        <span class="cooling-timeout-note">15-hour timeout</span>
      `;
      tod.insertAdjacentElement("afterend",wrap);
      checkbox=wrap.querySelector("#notInCooling");
      return checkbox;
    }

    function syncFromDonor(donor){
      const checkbox=document.getElementById("notInCooling");
      if(!checkbox)return;
      checkbox.checked=usesNotInCoolingTimeout(donor);
      updateLabel(checkbox.checked);
      if(typeof root.updateTiming==="function")root.updateTiming();
    }

    function wrapTiming(){
      if(typeof root.timing!=="function"||root.timing.__pdxCoolingTimeout)return;
      const original=root.timing;
      const wrapped=function(donor){
        return adjustTiming(original.apply(this,arguments),donor);
      };
      wrapped.__pdxCoolingTimeout=true;
      root.timing=wrapped;
    }

    function wrapLoadDonor(){
      if(typeof root.loadDonor!=="function"||root.loadDonor.__pdxCoolingTimeout)return;
      const original=root.loadDonor;
      const wrapped=function(donor){
        const result=original.apply(this,arguments);
        syncFromDonor(donor);
        return result;
      };
      wrapped.__pdxCoolingTimeout=true;
      root.loadDonor=wrapped;
    }

    function boot(){
      if(installed)return true;
      const checkbox=injectControl();
      if(!checkbox)return false;
      installed=true;

      wrapTiming();
      wrapLoadDonor();
      updateLabel(false);

      checkbox.addEventListener("change",function(){
        const donor=currentDonor();
        if(donor){
          donor.notInCooling=this.checked;
          persist();
        }
        updateLabel(this.checked);
        if(typeof root.updateTiming==="function")root.updateTiming();
      });
      return true;
    }

    if(boot())return true;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(boot()||tries>60)clearInterval(timer);
    },200);
    return false;
  }

  return {
    NORMAL_TIMEOUT_HOURS,
    NOT_IN_COOLING_TIMEOUT_HOURS,
    usesNotInCoolingTimeout,
    timeoutHours,
    adjustTiming,
    install
  };
});
