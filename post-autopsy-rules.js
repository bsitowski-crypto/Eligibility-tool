(function(){
  "use strict";
  const BLOCKED=new Set(["heartArtivion","heartLeMaitre","aiArtivion","aiLeMaitre","dta","cartilage","pericardium"]);
  const MESSAGE="Post-autopsy donors cannot donate Heart, AI, DTA, Cartilage with Sternum, or Pericardium.";

  function install(){
    if(typeof window.graftRuleReasons!=="function")return false;
    if(window.graftRuleReasons.__postAutopsyPatched)return true;
    const original=window.graftRuleReasons;
    const wrapped=function(g,a,s){
      const reasons=original.apply(this,arguments)||[];
      try{
        const aut=document.getElementById("autopsy");
        if(aut&&aut.value==="after"&&g&&BLOCKED.has(g.id)&&!reasons.includes(MESSAGE))reasons.push(MESSAGE);
      }catch{}
      return reasons;
    };
    wrapped.__postAutopsyPatched=true;
    window.graftRuleReasons=wrapped;

    const aut=document.getElementById("autopsy");
    if(aut&&!aut.__postAutopsyBound){
      aut.__postAutopsyBound=true;
      aut.addEventListener("change",()=>{
        try{
          const restore=typeof getRecovery==="function"?getRecovery():null;
          if(typeof screenDonor==="function"&&document.getElementById("recoveryCard")&&!document.getElementById("recoveryCard").classList.contains("hidden"))screenDonor(restore);
        }catch{}
      });
    }
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>60)clearInterval(timer)},200);
})();
