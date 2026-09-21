(function(){
  "use strict";
  let dialog,panel,button,sequence=0;
  const DEFAULT_INTERVALS=3;
  const engine=window.CoolingCalculator;
  if(!engine)return;
  function styles(){
    const style=document.createElement("style");style.id="plannerToolsStyle";
    style.textContent=`
#plannerHeaderActions{display:flex;gap:8px;align-items:center;flex-shrink:0}
#plannerToolsButton{color:#183153;background:#fff;border:1px solid #fff;border-radius:9px;padding:9px 12px;font-weight:800;min-height:40px;white-space:nowrap}
#plannerToolsPanel{position:fixed;z-index:2100;width:min(300px,calc(100vw - 16px));overflow:auto;padding:8px;background:#fff;color:#172a44;border:1px solid #d4dce7;border-radius:12px;box-shadow:0 16px 45px #0005;box-sizing:border-box}
#plannerToolsPanel[hidden]{display:none}#plannerToolsPanel button{width:100%;border:0;background:#fff;color:#172a44;text-align:left;padding:14px;border-radius:8px;font:inherit;font-weight:750}#plannerToolsPanel button:hover{background:#eef4fb}
#coolingTool{width:min(1020px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);padding:0;border:0;border-radius:16px;background:#f2f4f8;color:#172a44;box-shadow:0 16px 60px #0005;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left}
#coolingTool::backdrop{background:#071f3ecc}#coolingTool *{box-sizing:border-box}#coolingTool [hidden]{display:none!important}
#coolingTool .ct-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 16px;background:#183153;color:#fff}#coolingTool h2{margin:0;color:inherit;font-size:21px}#coolingTool .ct-head button{background:transparent;border:1px solid #ffffff88;color:#fff;border-radius:8px;padding:8px 12px;font:inherit;min-height:40px}
#coolingTool .ct-body{padding:12px 16px}#coolingTool .ct-note{color:#5c6d83;font-size:12px;line-height:1.4;margin:0 0 9px}
#coolingTool .ct-summary,#coolingTool .ct-total{display:grid;grid-template-columns:1fr auto;align-items:center;gap:16px;padding:10px 13px;background:#fff;border:1px solid #d4dce7}#coolingTool .ct-summary{border-radius:10px 10px 0 0}#coolingTool .ct-summary span,#coolingTool .ct-total span{color:#5c6d83;font-size:12px}#coolingTool .ct-summary strong,#coolingTool .ct-total strong{font-size:18px;font-variant-numeric:tabular-nums}#coolingTool .ct-total{background:#e8f5ec;border-top:0;border-radius:0 0 10px 10px;color:#155b32}#coolingTool .ct-total small{display:block;color:#4c6f59;font-size:11px;margin-top:2px}#coolingTool .ct-summary.warn,#coolingTool .ct-total.warn{background:#fff0f1;border-color:#e7b7bf;color:#922a3e}
#coolingTool .ct-table{display:grid;grid-template-columns:42px minmax(95px,.55fr) minmax(110px,.7fr) minmax(245px,1.4fr);background:#fff;border-left:1px solid #d4dce7;border-right:1px solid #d4dce7}#coolingTool .ct-row{display:contents}#coolingTool .ct-cell{min-height:43px;display:flex;align-items:center;padding:5px 10px;border-bottom:1px solid #d4dce7}#coolingTool .ct-cell+.ct-cell{border-left:1px solid #d4dce7}#coolingTool .ct-columns .ct-cell{min-height:31px;background:#f4f6f9;color:#5c6d83;font-size:11px;font-weight:700}#coolingTool .ct-number{justify-content:center;color:#5c6d83;font-variant-numeric:tabular-nums}#coolingTool .ct-label{font-size:14px;font-weight:750;color:#172a44}#coolingTool .ct-row.ct-out .ct-number,#coolingTool .ct-row.ct-out .ct-label{background:#fff7e2}#coolingTool .ct-row.ct-in .ct-number,#coolingTool .ct-row.ct-in .ct-label{background:#edf8f0}#coolingTool .ct-row input{display:block;min-width:0;width:100%;height:32px;border:1px solid #aabbd0;border-radius:7px;padding:4px 8px;background:#fff;color:#172a44;font:inherit;font-size:16px;font-variant-numeric:tabular-nums}#coolingTool .ct-row input[aria-invalid=true]{border:2px solid #a32a3e}#coolingTool .ct-calculation{justify-content:space-between;gap:10px}#coolingTool .ct-calc-label{color:#5c6d83;font-size:12px}#coolingTool .ct-duration{margin-left:auto;font-size:15px;font-weight:800;color:#205a79;font-variant-numeric:tabular-nums;white-space:nowrap}
#coolingTool .ct-actions{display:flex;align-items:center;gap:8px;margin-top:8px}#coolingTool .ct-add,#coolingTool .ct-remove-last,#coolingTool .ct-reset{border:1px solid #bcc9d9;background:#e6effa;color:#183153;border-radius:8px;padding:7px 10px;font:inherit;font-size:13px;font-weight:700;min-height:34px}#coolingTool .ct-remove-last,#coolingTool .ct-reset{background:#fff}#coolingTool .ct-remove-last:disabled{opacity:.5}#coolingTool .ct-alerts{margin-top:9px}#coolingTool .ct-alert{border:1px solid #e7b7bf;background:#fff0f1;color:#922a3e;padding:9px 11px;border-radius:9px;margin:7px 0;font-size:12px;line-height:1.4}#coolingTool .ct-alert strong{display:block;margin-bottom:3px;font-size:14px}#coolingTool .ct-status{font-size:12px;color:#5c6d83;line-height:1.4;margin:6px 0}#coolingTool .ct-errors{color:#922a3e;padding-left:20px;font-size:12px;line-height:1.4;margin:6px 0}#coolingTool .ct-footer{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:9px}#coolingTool .ct-footer .ct-note{margin:0}#coolingTool button:focus-visible,#coolingTool input:focus-visible,#plannerToolsButton:focus-visible{outline:3px solid #4d91cb;outline-offset:2px}
@media(max-width:700px){#coolingTool .ct-head{padding:12px 14px}#coolingTool h2{font-size:20px}#coolingTool .ct-body{padding:10px}#coolingTool .ct-table{grid-template-columns:30px 68px 86px minmax(128px,1fr)}#coolingTool .ct-cell{padding:5px 6px;min-height:45px}#coolingTool .ct-label{font-size:13px}#coolingTool .ct-calc-label{font-size:11px}#coolingTool .ct-duration{font-size:13px}#coolingTool .ct-calculation{display:block}#coolingTool .ct-duration{display:block;margin-top:2px}#coolingTool .ct-footer{align-items:flex-start;flex-direction:column}}
@media(max-width:360px){#coolingTool .ct-table{grid-template-columns:26px 54px 74px minmax(120px,1fr)}#coolingTool .ct-cell{padding:4px}#coolingTool .ct-columns .ct-cell{font-size:10px}}
@media print{#plannerToolsPanel,#coolingTool,#plannerHeaderActions{display:none!important}}`;
    document.head.appendChild(style);
  }
  function timeRow(key,label,output,calcLabel,rowClass=""){return `<div class="ct-row ${rowClass}" data-time-row="${key}"><span class="ct-cell ct-number" data-row-number></span><label class="ct-cell ct-label" for="ct-${key}">${label}</label><div class="ct-cell"><input id="ct-${key}" data-time="${key}" type="text" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="HHMM" aria-describedby="ct-time-help"></div><div class="ct-cell ct-calculation">${calcLabel?`<span class="ct-calc-label">${calcLabel}</span>`:""}${output?`<output class="ct-duration" id="ct-${output}">—</output>`:""}</div></div>`;}
  function triggerButton(){const desktop=document.getElementById("desktopToolsButton");return desktop&&window.matchMedia?.("(min-width:1100px)").matches?desktop:button;}
  function setExpanded(expanded){button.setAttribute("aria-expanded",String(expanded));document.getElementById("desktopToolsButton")?.setAttribute("aria-expanded",String(expanded));}
  function closePanel(){panel.hidden=true;setExpanded(false);}
  function positionPanel(){if(panel&&!panel.hidden)window.positionPlannerDropdown(triggerButton(),panel);}
  function togglePanel(){const opening=panel.hidden;panel.hidden=!opening;setExpanded(opening);document.getElementById("solvitaMenuPanel")?.classList.add("hidden");document.getElementById("solvitaMenuButton")?.setAttribute("aria-expanded","false");if(opening){positionPanel();panel.querySelector("button").focus({preventScroll:true});}}
  function buildDialog(){
    dialog=document.createElement("dialog");dialog.id="coolingTool";dialog.setAttribute("aria-labelledby","ct-title");
    dialog.innerHTML=`<div class="ct-head"><h2 id="ct-title">Cooling time calculator</h2><button type="button" id="ct-close">Close</button></div><div class="ct-body"><p class="ct-note" id="ct-time-help">Use military time (0000–2359) and enter the form from top to bottom. An earlier clock time means the next day; matching times mean zero elapsed.</p><div class="ct-summary"><span>Total time from death to skin prep</span><strong id="ct-total-elapsed">—</strong></div><div class="ct-table" role="table" aria-label="Cooling times and calculations"><div class="ct-row ct-columns" role="row"><span class="ct-cell">#</span><span class="ct-cell">ENTRY</span><span class="ct-cell">TIME</span><span class="ct-cell">CALCULATED TIME</span></div>${timeRow("death","TOD")}${timeRow("initial","Cooling started","initial-duration","TOD → cooling")}<div id="ct-intervals" style="display:contents"></div>${timeRow("prep","Skin prep","prep-duration","Last out → prep")}</div><div class="ct-total" id="ct-out-card"><div><span>Total time out of cooling</span><small id="ct-subtotal-note">Includes TOD → initial cooling</small></div><strong id="ct-total-out">—</strong></div><div class="ct-actions"><button type="button" class="ct-add" id="ct-add">+ Add out / in</button><button type="button" class="ct-remove-last" id="ct-remove-last">Remove last</button></div><section class="ct-alerts" aria-labelledby="ct-alert-heading"><h3 id="ct-alert-heading" class="ct-note">Alerts</h3><div id="ct-results" aria-live="polite" aria-atomic="true"></div></section><div class="ct-footer"><p class="ct-note">The final open Out entry automatically ends at skin prep. Entries remain only while this page is open and are not saved to a donor.</p><button type="button" class="ct-reset" id="ct-reset">Clear times</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector("#ct-close").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("close",()=>button.focus());
    dialog.querySelector("#ct-add").addEventListener("click",()=>addInterval());
    dialog.querySelector("#ct-remove-last").addEventListener("click",()=>removeLastInterval());
    dialog.querySelector("#ct-reset").addEventListener("click",()=>{if(window.confirm("Clear all cooling times for a new calculation?")){dialog.querySelectorAll("input[data-time]").forEach(el=>el.value="");resetIntervals();dialog.querySelector("#ct-death").focus();}});
    dialog.addEventListener("input",update);
    dialog.addEventListener("focusout",e=>{if(e.target.matches("input[data-time]")&&engine.parseTime(e.target.value)!==null)e.target.value=e.target.value.trim().replace(":","");});
    dialog.addEventListener("change",update);
    resetIntervals();
  }
  function resetIntervals(){dialog.querySelector("#ct-intervals").replaceChildren();for(let i=0;i<DEFAULT_INTERVALS;i++)addInterval(false);update();}
  function addInterval(focus=true){
    const id=++sequence,row=document.createElement("div");row.className="ct-interval";row.dataset.interval=String(id);row.setAttribute("aria-label","Out-of-cooling interval");row.style.display="contents";
    row.innerHTML=`${timeRow(`out-${id}`,"Out","","","ct-out")}${timeRow(`in-${id}`,"In",`duration-${id}`,"Out → in","ct-in")}`;
    dialog.querySelector("#ct-intervals").appendChild(row);refreshIntervals();update();if(focus)row.querySelector("input").focus();
  }
  function removeLastInterval(){
    const rows=[...dialog.querySelectorAll(".ct-interval")];if(rows.length<=DEFAULT_INTERVALS)return;rows.at(-1).remove();refreshIntervals();update();dialog.querySelector("#ct-add").focus();
  }
  function refreshIntervals(){
    const rows=[...dialog.querySelectorAll(".ct-interval")];
    rows.forEach((row,i)=>{
      row.setAttribute("aria-label",`Out-of-cooling interval ${i+1}`);const number=3+i*2;
      row.querySelector('[data-time-row^="out-"] [data-row-number]').textContent=String(number);
      row.querySelector('[data-time-row^="in-"] [data-row-number]').textContent=String(number+1);
    });
    dialog.querySelector('[data-time-row="death"] [data-row-number]').textContent="1";
    dialog.querySelector('[data-time-row="initial"] [data-row-number]').textContent="2";
    dialog.querySelector('[data-time-row="prep"] [data-row-number]').textContent=String(3+rows.length*2);
    dialog.querySelector("#ct-remove-last").disabled=rows.length<=DEFAULT_INTERVALS;
  }
  function update(){
    refreshIntervals();
    const rows=[...dialog.querySelectorAll(".ct-interval")];
    const get=id=>dialog.querySelector(`#ct-${id}`).value;
    const prep=get("prep"),used=row=>[...row.querySelectorAll("input[data-time]")].some(input=>input.value.trim()),lastUsed=rows.reduce((last,row,i)=>used(row)?i:last,-1);
    const result=engine.calculate({death:get("death"),initial:get("initial"),prep,intervals:rows.map((row,i)=>{const out=row.querySelector('[data-time^="out-"]').value,inTime=row.querySelector('[data-time^="in-"]').value;return {out,in:inTime,untilPrep:!!prep.trim()&&i===lastUsed&&!!out.trim()&&!inTime.trim()};})});
    const fmt=engine.formatDuration,set=(id,value)=>dialog.querySelector(`#ct-${id}`).textContent=fmt(value);
    set("total-elapsed",result.deathToPrep);set("total-out",result.totalOut);set("initial-duration",result.initialDelay);
    rows.forEach((row,i)=>row.querySelector("output[id]").textContent=fmt(result.intervals[i]?.untilPrep?null:result.intervals[i]?.minutes));
    set("prep-duration",result.finalIndex>=0?result.intervals[result.finalIndex].minutes:null);
    dialog.querySelector("#ct-subtotal-note").textContent=result.totalIsPartial?"Includes TOD → cooling and completed intervals":"Includes TOD → cooling and all intervals";
    dialog.querySelector(".ct-summary").classList.toggle("warn",result.alerts.some(a=>a.code==="late-cooling-and-prep"));dialog.querySelector("#ct-out-card").classList.toggle("warn",result.alerts.some(a=>a.code==="total-out"));
    dialog.querySelectorAll("input[data-time]").forEach(input=>input.setAttribute("aria-invalid",String(!input.disabled&&!!input.value.trim()&&engine.parseTime(input.value)===null)));
    const host=dialog.querySelector("#ct-results");host.replaceChildren();
    if(!result.valid){const p=document.createElement("p");p.className="ct-status";p.textContent="Durations update as each pair is entered. Blank intervals are unused. Open or incomplete intervals are not yet included in the subtotal; no current-clock time is assumed.";host.appendChild(p);const list=document.createElement("ul");list.className="ct-errors";result.errors.forEach(error=>{const li=document.createElement("li");li.textContent=error.message;list.appendChild(li)});host.appendChild(list);}
    else if(!result.alerts.length){const p=document.createElement("p");p.className="ct-status";p.textContent="Neither configured cooling alert is triggered by these entries. This calculation is not an eligibility determination.";host.appendChild(p);}
    result.alerts.forEach(alert=>{const box=document.createElement("div"),title=document.createElement("strong"),detail=document.createElement("span");box.className="ct-alert";title.textContent=alert.title;detail.textContent=alert.detail;box.append(title,detail);host.appendChild(box);});
  }
  function install(){
    const menu=document.getElementById("solvitaMenuButton");if(!menu)return false;if(document.getElementById("plannerToolsButton"))return true;
    styles();const actions=document.createElement("div");actions.id="plannerHeaderActions";menu.before(actions);actions.appendChild(menu);
    button=document.createElement("button");button.id="plannerToolsButton";button.type="button";button.textContent="TOOLS ▾";button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","plannerToolsPanel");actions.appendChild(button);
    panel=document.createElement("div");panel.id="plannerToolsPanel";panel.hidden=true;panel.innerHTML='<button type="button">Cooling time calculator</button>';document.body.appendChild(panel);buildDialog();
    window.PDXPlannerTools={toggle:togglePanel,close:closePanel,trigger:triggerButton};
    button.addEventListener("click",e=>{e.stopPropagation();togglePanel()});
    panel.querySelector("button").addEventListener("click",()=>{closePanel();dialog.showModal();dialog.querySelector("#ct-death").focus();});
    document.addEventListener("click",e=>{if(!panel.contains(e.target)&&e.target!==button)closePanel();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){const trigger=triggerButton();closePanel();trigger.focus();}});
    window.addEventListener("resize",positionPanel);window.addEventListener("scroll",positionPanel,{passive:true});
    window.visualViewport?.addEventListener("resize",positionPanel);window.visualViewport?.addEventListener("scroll",positionPanel);
    return true;
  }
  if(!install()){const timer=setInterval(()=>{if(install())clearInterval(timer)},150);setTimeout(()=>clearInterval(timer),15000);}
})();
