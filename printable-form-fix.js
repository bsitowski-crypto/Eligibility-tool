(function(){
  "use strict";

  const PRINT_READY_ID="pdxPrintReady";

  function label(el){
    return String(el?.textContent||el?.value||"").replace(/\s+/g," ").trim().toUpperCase();
  }

  function isCasePrintButton(el){
    const b=el?.closest?.("button,a,input[type=button],input[type=submit]");
    if(!b)return null;
    const t=label(b);
    return (/PRINT CASE DOCUMENT/.test(t)||(/PRINTABLE/.test(t)&&/FORM/.test(t)))?b:null;
  }

  function callNativePrint(){
    const wrapped=window.print;
    const nativePrint=wrapped?.__pdxNativePrint||wrapped;
    if(typeof nativePrint!=="function")throw new Error("Printing is not available in this browser.");
    nativePrint.call(window);
  }

  function ensurePrintReadyPanel(){
    let panel=document.getElementById(PRINT_READY_ID);
    if(panel)return panel;

    panel=document.createElement("div");
    panel.id=PRINT_READY_ID;
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-modal","true");
    panel.hidden=true;
    panel.style.cssText="position:fixed;inset:0;z-index:1000;overflow:auto;background:#f2f2f7;padding:calc(22px + env(safe-area-inset-top)) 18px calc(22px + env(safe-area-inset-bottom));";
    panel.innerHTML=`
      <div style="max-width:560px;margin:36px auto;background:#fff;border-radius:16px;padding:22px;box-shadow:0 8px 30px #0002">
        <h2 style="margin-top:0">Case document is ready</h2>
        <p>The document has been prepared. Tap the button below to open the iPhone print sheet.</p>
        <button type="button" class="btn purple full" data-pdx-print-now style="margin-top:8px">OPEN PRINT SHEET</button>
        <button type="button" class="btn gray full" data-pdx-print-close style="margin-top:10px">BACK TO CASE</button>
        <p class="small" style="margin:16px 0 0">If the print sheet still does not open, use Safari's Share button and choose <strong>Print</strong> while this screen is open.</p>
      </div>`;

    (document.querySelector("main")||document.body).appendChild(panel);

    panel.querySelector("[data-pdx-print-now]").addEventListener("click",function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      try{ callNativePrint(); }
      catch(err){
        console.error("Print dialog",err);
        alert("Unable to open the print dialog: "+(err?.message||err));
      }
    },true);

    panel.querySelector("[data-pdx-print-close]").addEventListener("click",function(e){
      e.preventDefault();
      panel.hidden=true;
    });

    return panel;
  }

  function showPrintReady(){
    const sheet=document.getElementById("printSheet");
    if(!sheet||!String(sheet.innerHTML||"").trim()){
      alert("The case document could not be prepared. Validate the recovery plan, then try again.");
      return;
    }
    const panel=ensurePrintReadyPanel();
    panel.hidden=false;
    panel.scrollTop=0;
  }

  function installTwoStepPrint(){
    // Build the document on the first tap, then reserve a clean second user tap
    // exclusively for Safari's native print call. This avoids iOS dropping the
    // print request while the case document and culture totals are being built.
    if(typeof window.printNow==="function"&&!window.printNow.__pdxTwoStepPrint){
      const ready=function(){ showPrintReady(); };
      ready.__pdxTwoStepPrint=true;
      window.printNow=ready;
    }
  }

  function runCasePrint(){
    try{
      installTwoStepPrint();

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
    installTwoStepPrint();
    if((typeof window.printNow==="function"&&window.printNow.__pdxTwoStepPrint)||tries>80)clearInterval(timer);
  },200);
})();
