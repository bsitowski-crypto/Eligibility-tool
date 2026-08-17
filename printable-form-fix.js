(function(){
  "use strict";
  function text(el){return String(el?.textContent||el?.value||"").replace(/\s+/g," ").trim().toUpperCase()}
  function isPrintableButton(el){const b=el?.closest?.("button,a,input[type=button],input[type=submit]");if(!b)return null;const t=text(b);return /PRINTABLE/.test(t)&&/FORM/.test(t)?b:null}
  document.addEventListener("click",function(e){
    const b=isPrintableButton(e.target);if(!b)return;
    // Prevent stale/broken legacy click wiring from swallowing the tap on iOS Safari.
    e.preventDefault();e.stopImmediatePropagation();
    try{
      // Give the planner a chance to update any print-only values before opening print preview.
      document.dispatchEvent(new Event("beforeprint"));
    }catch{}
    try{window.print()}catch(err){console.error("Printable form",err)}
  },true);
})();
