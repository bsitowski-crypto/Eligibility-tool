(function(){
  "use strict";
  function label(el){return String(el?.textContent||el?.value||"").replace(/\s+/g," ").trim().toUpperCase()}
  function isCasePrintButton(el){
    const b=el?.closest?.("button,a,input[type=button],input[type=submit]");
    if(!b)return null;
    const t=label(b);
    return (/PRINT CASE DOCUMENT/.test(t)||(/PRINTABLE/.test(t)&&/FORM/.test(t)))?b:null;
  }
  function runCasePrint(){
    try{
      if(typeof window.printCombinedCaseDocument==="function"){
        window.printCombinedCaseDocument();
        return;
      }
      const legacy=[...document.querySelectorAll("button,a,input[type=button],input[type=submit]")].find(x=>/PRINT CASE DOCUMENT/.test(label(x)));
      const code=legacy?.getAttribute?.("onclick")||"";
      if(code&&/printCombinedCaseDocument/.test(code)&&typeof printCombinedCaseDocument==="function"){
        printCombinedCaseDocument();
        return;
      }
      alert("The printable case form is not ready yet. Validate the recovery plan, then try again.");
    }catch(err){
      console.error("Print case document",err);
      alert("Unable to open the printable case form: "+(err?.message||err));
    }
  }
  document.addEventListener("click",function(e){
    const b=isCasePrintButton(e.target);if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    runCasePrint();
  },true);
})();
