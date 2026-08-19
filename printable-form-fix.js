(function(){
  "use strict";

  function label(el){
    return String(el?.textContent||el?.value||"").replace(/\s+/g," ").trim().toUpperCase();
  }

  function isCasePrintButton(el){
    const b=el?.closest?.("button,a,input[type=button],input[type=submit]");
    if(!b)return null;
    const t=label(b);
    return (/PRINT CASE DOCUMENT/.test(t)||(/PRINTABLE/.test(t)&&/FORM/.test(t)))?b:null;
  }

  function installSynchronousPrint(){
    // The original planner delays window.print() by 50 ms. iOS Safari can lose
    // user activation during that delay and silently block the print sheet.
    // Replacing the global helper keeps all normal form-building logic intact,
    // but opens the native print sheet synchronously from the user's tap.
    if(typeof window.printNow==="function"&&!window.printNow.__pdxSyncPrint){
      const sync=function(){
        try{ window.print(); }
        catch(err){
          console.error("Print dialog",err);
          alert("Unable to open the print dialog: "+(err?.message||err));
        }
      };
      sync.__pdxSyncPrint=true;
      window.printNow=sync;
    }
  }

  function runCasePrint(){
    try{
      installSynchronousPrint();

      if(typeof window.printCombinedCaseDocument==="function"){
        window.printCombinedCaseDocument();
        return;
      }

      if(typeof printCombinedCaseDocument==="function"){
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
    const b=isCasePrintButton(e.target);
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    runCasePrint();
  },true);

  let tries=0;
  const timer=setInterval(function(){
    tries++;
    installSynchronousPrint();
    if((typeof window.printNow==="function"&&window.printNow.__pdxSyncPrint)||tries>80)clearInterval(timer);
  },200);
})();
