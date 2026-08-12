(function(){
  "use strict";

  function currentDonor(){try{if(typeof cur==="function")return cur()}catch{}try{if(typeof donors!=="undefined"&&typeof activeId!=="undefined")return donors.find(d=>d.id===activeId)||null}catch{}return null}
  function donorById(id){try{return donors.find(d=>String(d.id)===String(id))||null}catch{return null}}
  function clean(s){return String(s||"").replace(/\s+/g," ").trim()}

  function addStyles(){
    if(document.getElementById("transportCardStyle"))return;
    const s=document.createElement("style");s.id="transportCardStyle";s.textContent=`
.transport-card-eta{margin-top:8px;padding:8px 10px;border-radius:9px;background:#eef6ff;color:#0b4f9c;font-size:12px;line-height:1.35;border:1px solid #d4e7fb}
.transport-card-eta strong{color:#071f3e}.transport-card-eta .tce-sub{color:#5b6877;font-size:11px;margin-top:2px}
`;
    document.head.appendChild(s);
  }

  function decorateBoard(){
    addStyles();
    document.querySelectorAll(".donor").forEach(card=>{
      const btn=card.querySelector(".donor-open-btn[data-donor-id]");if(!btn)return;
      const d=donorById(btn.dataset.donorId);if(!d)return;
      let box=card.querySelector(".transport-card-eta");
      const e=d.transportEstimate;
      if(!e){if(box)box.remove();return}
      if(!box){box=document.createElement("div");box.className="transport-card-eta";const actions=card.querySelector(".actions");if(actions)card.insertBefore(box,actions);else card.appendChild(box)}
      const company=clean(e.companyName),total=clean(e.totalText),arrival=clean(e.arrivalClock),location=clean(e.locationName);
      box.innerHTML=`<strong>Transport: ${total||"Estimate saved"}</strong>${arrival?` · ETA Solvita ${arrival}`:""}<div class="tce-sub">${company||"Transport"}${location?` · pickup ${location}`:""}</div>`;
    });
  }

  function saveEstimateFromResult(){
    const result=document.getElementById("tpResult");
    const total=result?.querySelector(".tp-total strong");if(!total)return;
    const d=currentDonor();if(!d)return;
    const companySel=document.getElementById("tpCompany"),locSel=document.getElementById("tpLocation"),type=document.getElementById("tpType")?.value||"";
    const timeline=clean(result.querySelector(".tp-timeline")?.textContent||"");
    const arrivalMatch=timeline.match(/Arrives at Solvita:\s*([^A-Za-z]*\d{1,2}:\d{2}\s*(?:AM|PM)?)/i)||timeline.match(/Arrives at Solvita:\s*([^·]+)$/i);
    d.transportEstimate={
      totalText:clean(total.textContent),
      arrivalClock:arrivalMatch?clean(arrivalMatch[1]):"",
      companyId:companySel?.value||"",
      companyName:companySel?.selectedOptions?.[0]?.textContent||"",
      locationId:locSel?.value||"",
      locationName:locSel?.selectedOptions?.[0]?.textContent||"",
      pickupType:type,
      calculatedAt:new Date().toISOString()
    };
    try{save()}catch{}
    decorateBoard();
  }

  function hookResult(){
    const result=document.getElementById("tpResult");if(!result||result.dataset.transportCardHook)return false;
    result.dataset.transportCardHook="1";
    new MutationObserver(()=>{if(result.querySelector(".tp-total strong"))setTimeout(saveEstimateFromResult,0)}).observe(result,{childList:true,subtree:true});
    return true;
  }

  function hookBoard(){
    const board=document.getElementById("board");if(!board||board.dataset.transportCardHook)return false;
    board.dataset.transportCardHook="1";
    new MutationObserver(()=>setTimeout(decorateBoard,0)).observe(board,{childList:true,subtree:true});
    decorateBoard();return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;const a=hookResult(),b=hookBoard();decorateBoard();if((a||document.getElementById("tpResult")?.dataset.transportCardHook)&&(b||document.getElementById("board")?.dataset.transportCardHook)||tries>60)clearInterval(timer)},250);
})();
