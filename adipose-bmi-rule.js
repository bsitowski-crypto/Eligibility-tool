(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root&&root.document)api.install(root,root.document);
})(typeof window!=="undefined"?window:null,function(){
  "use strict";

  const MESSAGE="Adipose requires BMI ≥ 32.";

  function measuredBMI(weightPounds,heightInches){
    if(!Number.isFinite(weightPounds)||weightPounds<=0||
       !Number.isFinite(heightInches)||heightInches<=0)return NaN;
    return weightPounds/(heightInches*heightInches)*703;
  }

  function install(root,document){
    if(root.__pdxAdiposeBmiRule)return true;
    if(typeof root.graftRuleReasons!=="function"||typeof root.screenDonor!=="function"||
       typeof root.getRecovery!=="function")return false;

    // Use the full precision measurements. The planner's displayed BMI is
    // rounded to one decimal and can read 32.0 when the actual BMI is below 32.
    const eligibleBMI=()=>measuredBMI(root.lbs?.(),root.ins?.())>=32;
    const originalCalcBMI=root.calcBMI;
    if(typeof originalCalcBMI==="function"){
      root.calcBMI=function(){
        const result=originalCalcBMI.apply(this,arguments);
        const value=measuredBMI(root.lbs?.(),root.ins?.());
        const display=document.getElementById("bmi");
        if(value<32&&display?.textContent==="32.0")display.textContent="<32.0";
        return result;
      };
    }
    const originalReasons=root.graftRuleReasons;
    root.graftRuleReasons=function(graft){
      const reasons=originalReasons.apply(this,arguments)||[];
      if(graft?.id==="adipose"&&!eligibleBMI()&&!reasons.includes(MESSAGE)){
        reasons.push(MESSAGE);
      }
      return reasons;
    };

    const originalRecovery=root.getRecovery;
    root.getRecovery=function(){
      const recovery=originalRecovery.apply(this,arguments);
      if(recovery&&!eligibleBMI()){
        recovery.selected=(recovery.selected||[]).filter(id=>id!=="adipose");
      }
      return recovery;
    };

    const originalScreen=root.screenDonor;
    root.screenDonor=function(){
      root.calcBMI?.();
      return originalScreen.apply(this,arguments);
    };

    function refreshPlan(){
      const options=document.getElementById("recoveryOptions");
      if(!options?.children.length||!document.getElementById("age")?.value)return;
      root.calcBMI?.();
      // G is a global lexical binding in the decoded planner, so Safari does
      // not expose it as a property of window.
      const graft=typeof G==="function"?G("adipose"):root.G?.("adipose");
      if(!graft)return;

      const shouldShow=root.graftRuleReasons(graft,root.donorAgeYears(),
        document.getElementById("sex")?.value).length===0;
      const isShown=!!document.getElementById("recover_adipose");
      if(shouldShow===isShown)return;

      const recovery=root.getRecovery();
      root.screenDonor({...recovery,initialized:true});
      for(const id of ["validationCard","suppliesCard","printActions"]){
        document.getElementById(id)?.classList.add("hidden");
      }
      root.snapshot?.();
    }

    for(const id of ["weight","height"]){
      const input=document.getElementById(id);
      input?.addEventListener("input",refreshPlan);
      input?.addEventListener("change",refreshPlan);
    }

    const originalValidate=root.validateRecovery;
    if(typeof originalValidate==="function"){
      root.validateRecovery=function(){
        refreshPlan();
        return originalValidate.apply(this,arguments);
      };
    }

    root.__pdxAdiposeBmiRule=true;
    return true;
  }

  return {measuredBMI,install};
});
