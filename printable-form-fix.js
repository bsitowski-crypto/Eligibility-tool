(function(){
  "use strict";

  const PRINT_READY_ID="pdxPrintReady";
  let pdfFile=null;
  let pdfUrl="";
  let pdfPreparing=null;

  function label(el){
    return String(el?.textContent||el?.value||"").replace(/\s+/g," ").trim().toUpperCase();
  }

  function isCasePrintButton(el){
    const b=el?.closest?.("button,a,input[type=button],input[type=submit]");
    if(!b)return null;
    const t=label(b);
    return (/PRINT CASE DOCUMENT/.test(t)||(/PRINTABLE/.test(t)&&/FORM/.test(t)))?b:null;
  }

  function text(el){
    return String(el?.textContent||"").replace(/\s+/g," ").trim();
  }

  function extractCasePdfData(){
    const sheet=document.getElementById("printSheet");
    if(!sheet||!String(sheet.innerHTML||"").trim())throw new Error("The case document is empty.");

    const sections=[...sheet.querySelectorAll(".print-case-left .print-section")].map(section=>{
      const rows=[...section.querySelectorAll(".print-info > div")].map(text).filter(Boolean);
      const groups=[...section.querySelectorAll(".print-group-label")].map(group=>({
        label:text(group),
        items:[...(group.nextElementSibling?.querySelectorAll("li")||[])].map(text).filter(Boolean)
      }));
      return {title:text(section.querySelector("h3")),rows,groups};
    }).filter(section=>section.title);

    const validatedIndex=sections.findIndex(section=>/validated graft list/i.test(section.title));
    if(validatedIndex>=0&&window.PDXGraftListOrder?.currentColumns){
      const columns=window.PDXGraftListOrder.currentColumns();
      sections[validatedIndex].groups=["left","middle","right"].map(column=>({
        label:column[0].toUpperCase()+column.slice(1),
        items:[...(columns[column]||[])]
      }));
    }

    const supplies=[...sheet.querySelectorAll(".print-supply-row")].map(row=>({
      name:text(row.children?.[0]),
      qty:text(row.querySelector(".qty"))
    })).filter(item=>item.name);

    const donorRow=sections.flatMap(section=>section.rows).find(row=>/^Donor\s*:/i.test(row))||"";
    const donor=donorRow.replace(/^Donor\s*:\s*/i,"")||"Case document";
    return {donor,generated:new Date().toLocaleString(),sections,supplies};
  }

  function resetPdf(){
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);
    pdfFile=null;
    pdfUrl="";
    pdfPreparing=null;
  }

  function panelParts(panel){
    return {
      title:panel.querySelector("[data-pdx-title]"),
      message:panel.querySelector("[data-pdx-message]"),
      share:panel.querySelector("[data-pdx-share]"),
      open:panel.querySelector("[data-pdx-open]"),
      status:panel.querySelector("[data-pdx-status]")
    };
  }

  async function prepareCasePdf(panel){
    if(pdfPreparing)return pdfPreparing;
    const parts=panelParts(panel);
    parts.title.textContent="Preparing case PDF";
    parts.message.textContent="The finished case document is being created on this iPhone.";
    parts.share.disabled=true;
    parts.share.textContent="PREPARING PDF...";
    parts.open.hidden=true;
    parts.status.textContent="";

    pdfPreparing=(async()=>{
      try{
        if(!window.PDXCasePdf?.createCasePdf)throw new Error("The PDF generator is not ready.");
        const bytes=await window.PDXCasePdf.createCasePdf(extractCasePdfData());
        const blob=new Blob([bytes],{type:"application/pdf"});
        pdfUrl=URL.createObjectURL(blob);
        pdfFile=typeof File==="function"?new File([blob],"PDX-Case-Document.pdf",{type:"application/pdf"}):null;
        parts.title.textContent="Case PDF is ready";
        parts.message.textContent="Tap Share / Print PDF, then choose Print in the iPhone share sheet.";
        parts.share.disabled=false;
        parts.share.textContent="SHARE / PRINT PDF";
        parts.open.href=pdfUrl;
        parts.open.hidden=false;
        parts.status.textContent="The Open PDF button is available as a fallback.";
      }catch(err){
        console.error("Prepare case PDF",err);
        parts.title.textContent="Unable to prepare PDF";
        parts.message.textContent="The case document could not be converted to a PDF.";
        parts.share.disabled=true;
        parts.share.textContent="PDF UNAVAILABLE";
        parts.status.textContent=String(err?.message||err);
      }
    })();
    return pdfPreparing;
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
        <h2 data-pdx-title style="margin-top:0">Preparing case PDF</h2>
        <p data-pdx-message>The finished case document is being created on this iPhone.</p>
        <button type="button" class="btn purple full" data-pdx-share style="margin-top:8px" disabled>PREPARING PDF...</button>
        <a class="btn full" data-pdx-open href="#" target="_self" style="display:block;text-align:center;text-decoration:none;margin-top:10px" hidden>OPEN PDF</a>
        <button type="button" class="btn gray full" data-pdx-print-close style="margin-top:10px">BACK TO CASE</button>
        <p class="small" data-pdx-status style="margin:16px 0 0"></p>
      </div>`;

    (document.querySelector("main")||document.body).appendChild(panel);

    panel.querySelector("[data-pdx-share]").addEventListener("click",function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(!pdfUrl)return;
      const parts=panelParts(panel);
      const shareData=pdfFile?{files:[pdfFile],title:"PDX Case Document"}:null;
      if(shareData&&typeof navigator.share==="function"&&
        (typeof navigator.canShare!=="function"||navigator.canShare(shareData))){
        navigator.share(shareData).catch(err=>{
          if(err?.name!=="AbortError")parts.status.textContent="Share was unavailable. Tap Open PDF instead.";
        });
        return;
      }
      parts.status.textContent="File sharing is unavailable here. Opening the PDF instead.";
      panel.querySelector("[data-pdx-open]").click();
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
    resetPdf();
    panel.hidden=false;
    panel.scrollTop=0;
    prepareCasePdf(panel);
  }

  function installPdfShare(){
    // The case builder still prepares its normal print DOM. Instead of relying
    // on Safari's inconsistent window.print() path, convert that DOM to a PDF
    // and hand the finished file to iOS's native Share sheet.
    if(typeof window.printNow==="function"&&!window.printNow.__pdxPdfShare){
      const ready=function(){ showPrintReady(); };
      ready.__pdxPdfShare=true;
      window.printNow=ready;
    }
  }

  function runCasePrint(){
    try{
      installPdfShare();

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
    installPdfShare();
    if((typeof window.printNow==="function"&&window.printNow.__pdxPdfShare)||tries>80)clearInterval(timer);
  },200);
})();
