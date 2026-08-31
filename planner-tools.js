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
#coolingTool{width:min(1120px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);padding:0;border:0;border-radius:16px;background:#f2f4f8;color:#172a44;box-shadow:0 16px 60px #0005;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left}
#coolingTool::backdrop{background:#071f3ecc}#coolingTool *{box-sizing:border-box}#coolingTool [hidden]{display:none!important}
#coolingTool .ct-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 22px;background:#183153;color:#fff}#coolingTool h2{margin:0;color:inherit;font-size:24px}#coolingTool .ct-head button{background:transparent;border:1px solid #ffffff88;color:#fff;border-radius:8px;padding:9px 12px;font:inherit;min-height:44px}
#coolingTool .ct-body{padding:22px}#coolingTool .ct-note{color:#5c6d83;font-size:13px;line-height:1.5;margin:0 0 16px}#coolingTool .ct-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}#coolingTool .ct-stat{padding:16px;border:1px solid #d4dce7;background:#fff;border-radius:10px}#coolingTool .ct-stat span{display:block;font-size:14px}#coolingTool .ct-stat strong{display:block;font-size:26px;margin-top:8px;font-variant-numeric:tabular-nums}#coolingTool .ct-stat.warn{background:#fff0f1;border-color:#e7b7bf}
#coolingTool .ct-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,1fr);gap:18px}#coolingTool .ct-box{padding:18px;background:#fff;border:1px solid #d4dce7;border-radius:12px;min-width:0}#coolingTool h3{margin:0 0 14px;font-size:20px}#coolingTool .ct-row{display:grid;grid-template-columns:minmax(0,1fr) 110px 132px;gap:12px;align-items:center;margin:12px 0}#coolingTool .ct-row label{font-size:15px;font-weight:650;margin:0;color:#172a44}#coolingTool .ct-row input{display:block;min-width:0;width:100%;height:46px;border:1px solid #aabbd0;border-radius:7px;padding:10px;background:#fff;color:#172a44;font:inherit;font-size:18px;font-variant-numeric:tabular-nums}#coolingTool .ct-row input[aria-invalid=true]{border:2px solid #a32a3e}#coolingTool .ct-duration{font-size:17px;font-weight:800;color:#205a79;font-variant-numeric:tabular-nums}#coolingTool .ct-columns{font-size:11px;color:#5c6d83;font-weight:750}#coolingTool .ct-interval{border:0;border-top:1px solid #dbe2ec;margin:18px 0 0;padding:14px 0 0;min-width:0}#coolingTool .ct-interval-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:750}#coolingTool .ct-remove{border:0;background:transparent;color:#6c3543;font:inherit;font-size:13px;min-height:44px;padding:8px}#coolingTool .ct-check{display:flex;gap:9px;align-items:center;font-size:14px;margin:12px 0;color:#172a44}#coolingTool .ct-check input{width:20px;height:20px;flex-shrink:0;margin:0}#coolingTool .ct-add,#coolingTool .ct-reset{border:1px solid #bcc9d9;background:#e6effa;color:#183153;border-radius:8px;padding:12px;font:inherit;font-weight:700;margin-top:12px;min-height:44px}#coolingTool .ct-add:disabled{opacity:.5}#coolingTool .ct-prep{border-top:1px solid #dbe2ec;padding-top:14px;margin-top:18px}#coolingTool .ct-alert{border:1px solid #e7b7bf;background:#fff0f1;color:#922a3e;padding:14px;border-radius:9px;margin:12px 0;font-size:14px;line-height:1.5}#coolingTool .ct-alert strong{display:block;margin-bottom:6px;font-size:16px}#coolingTool .ct-status{font-size:14px;color:#5c6d83;line-height:1.5}#coolingTool .ct-errors{color:#922a3e;padding-left:20px;font-size:14px;line-height:1.5}#coolingTool .ct-footer{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:14px}#coolingTool .ct-footer .ct-note{margin:0}#coolingTool .ct-reset{background:#fff;margin:0;flex-shrink:0}#coolingTool button:focus-visible,#coolingTool input:focus-visible,#plannerToolsButton:focus-visible{outline:3px solid #4d91cb;outline-offset:2px}
#coolingTool .ct-stat small{display:block;color:#5c6d83;font-size:11px;margin-top:3px}
@media(min-width:701px){
#coolingTool{width:min(1180px,calc(100vw - 24px))}#coolingTool .ct-head{padding:10px 16px}#coolingTool h2{font-size:21px}#coolingTool .ct-body{padding:12px 16px}#coolingTool .ct-note{margin-bottom:8px;font-size:12px}#coolingTool .ct-stats{margin-bottom:10px;gap:10px}#coolingTool .ct-stat{padding:9px 12px}#coolingTool .ct-stat strong{font-size:23px;margin-top:3px}#coolingTool .ct-layout{gap:12px;grid-template-columns:minmax(0,1.8fr) minmax(260px,1fr)}#coolingTool .ct-box{padding:12px}#coolingTool h3{font-size:18px;margin-bottom:7px}#coolingTool .ct-row{margin:6px 0;gap:8px;grid-template-columns:minmax(0,1fr) 100px 125px}#coolingTool .ct-row input{height:36px;padding:6px 8px;font-size:16px}#coolingTool .ct-duration{font-size:15px}#coolingTool .ct-columns{margin:0 0 3px}
#coolingTool .ct-interval{display:grid;grid-template-columns:82px minmax(80px,.7fr) minmax(210px,1.5fr);align-items:center;gap:3px 10px;margin:7px 0 0;padding:7px 0 0}#coolingTool .ct-interval-head{grid-row:1/3;display:block;font-size:13px}#coolingTool .ct-remove{display:block;min-height:24px;padding:3px 0;font-size:11px}#coolingTool .ct-interval>.ct-row{display:block;margin:0}#coolingTool .ct-interval>.ct-row output{display:none}#coolingTool .ct-interval .ct-row label{font-size:11px;margin-bottom:3px}#coolingTool .ct-interval [data-return] .ct-row{grid-template-columns:minmax(70px,1fr) 112px;margin:0;gap:3px 8px}#coolingTool .ct-interval [data-return] label{grid-column:1/3}#coolingTool .ct-interval .ct-check{grid-column:2/4;margin:0;font-size:11px;min-height:22px}#coolingTool .ct-check input{width:16px;height:16px}#coolingTool .ct-add{padding:7px 10px;min-height:32px;margin-top:8px;font-size:13px}#coolingTool .ct-prep{margin-top:8px;padding-top:4px}#coolingTool .ct-footer{margin-top:8px}#coolingTool .ct-reset{padding:7px 10px;min-height:32px;font-size:13px}#coolingTool .ct-alert{padding:9px;margin:7px 0;font-size:12px}#coolingTool .ct-alert strong{font-size:14px;margin-bottom:3px}#coolingTool .ct-status,#coolingTool .ct-errors{font-size:12px;margin:7px 0}
}
@media(max-width:700px){#coolingTool .ct-layout{grid-template-columns:1fr}#coolingTool .ct-body{padding:12px}#coolingTool .ct-head{padding:14px}#coolingTool h2{font-size:20px}#coolingTool .ct-stats{gap:6px}#coolingTool .ct-stat{padding:10px 8px}#coolingTool .ct-stat span{font-size:11px}#coolingTool .ct-stat strong{font-size:18px}#coolingTool .ct-box{padding:12px}#coolingTool .ct-row{grid-template-columns:minmax(0,1fr) 82px 98px;gap:7px}#coolingTool .ct-row label{font-size:13px}#coolingTool .ct-row input{padding:8px;font-size:16px}#coolingTool .ct-duration{font-size:14px}#coolingTool .ct-columns{font-size:9px}#coolingTool .ct-footer{align-items:flex-start;flex-direction:column}}
@media(min-width:701px){
#coolingTool .ct-head{padding:6px 16px}#coolingTool .ct-body{padding:10px 16px}#coolingTool .ct-box{padding:10px}#coolingTool .ct-row{margin:4px 0}#coolingTool .ct-row input{height:32px;padding:4px 8px}#coolingTool .ct-interval{grid-template-columns:66px minmax(76px,.7fr) minmax(190px,1.5fr) 76px;gap:3px 8px;margin-top:5px;padding-top:5px}#coolingTool .ct-interval-head{grid-row:auto}#coolingTool .ct-interval .ct-check{grid-column:4;grid-row:1;display:flex;align-items:center;font-size:11px;line-height:1.2;gap:4px}#coolingTool .ct-interval [data-return]{grid-column:3;grid-row:1}#coolingTool .ct-interval>.ct-row{grid-column:2;grid-row:1}#coolingTool .ct-interval [data-return] .ct-row{grid-template-columns:minmax(70px,1fr) 104px}#coolingTool .ct-interval .ct-duration{font-size:14px}#coolingTool .ct-add{min-height:28px;padding:5px 8px;margin-top:6px}
}
@media(min-width:701px) and (max-width:950px){#coolingTool .ct-layout{grid-template-columns:1fr}}
@media(max-width:360px){#coolingTool .ct-row{grid-template-columns:minmax(0,1fr) 72px 88px;gap:5px}#coolingTool .ct-box{padding:9px}}
@media print{#plannerToolsPanel,#coolingTool,#plannerHeaderActions{display:none!important}}`;
    document.head.appendChild(style);
  }
  function timeRow(key,label,output){return `<div class="ct-row"><label for="ct-${key}">${label}</label><input id="ct-${key}" data-time="${key}" type="text" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="HHMM" aria-describedby="ct-time-help"><output class="ct-duration" ${output?`id="ct-${output}"`:""}></output></div>`;}
  function closePanel(){panel.hidden=true;button.setAttribute("aria-expanded","false");}
  function positionPanel(){if(panel&&!panel.hidden)window.positionPlannerDropdown(button,panel);}
  function buildDialog(){
    dialog=document.createElement("dialog");dialog.id="coolingTool";dialog.setAttribute("aria-labelledby","ct-title");
    dialog.innerHTML=`<div class="ct-head"><h2 id="ct-title">Cooling time calculator</h2><button type="button" id="ct-close">Close</button></div><div class="ct-body"><p class="ct-note" id="ct-time-help">Use military time (0000–2359), in chronological order. An earlier clock time means the next day; matching times mean zero elapsed.</p><div class="ct-stats"><div class="ct-stat"><span>Death → prep</span><strong id="ct-total-elapsed">—</strong></div><div class="ct-stat" id="ct-initial-card"><span>Death → initial cooling</span><strong id="ct-total-initial">—</strong></div><div class="ct-stat" id="ct-out-card"><span>Total out of cooling</span><strong id="ct-total-out">—</strong></div></div><div class="ct-layout"><section class="ct-box"><h3>Recorded times</h3><div class="ct-row ct-columns" aria-hidden="true"><span></span><span>MILITARY TIME</span><span>OUT OF COOLING</span></div>${timeRow("death","Time of death")}${timeRow("initial","Initial cooling","initial-duration")}<div id="ct-intervals"></div><button type="button" class="ct-add" id="ct-add">+ Add out-of-cooling interval</button><div class="ct-prep">${timeRow("prep","Prep time · final","prep-duration")}</div></section><section class="ct-box" aria-labelledby="ct-alert-heading"><h3 id="ct-alert-heading">Alerts</h3><p class="ct-note">Based on the two configured cooling thresholds.</p><div id="ct-results" aria-live="polite" aria-atomic="true"></div></section></div><div class="ct-footer"><p class="ct-note">Includes death-to-initial-cooling time. Standalone calculator: entries remain while this page is open, but are not saved to a donor. Clear before starting another case.</p><button type="button" class="ct-reset" id="ct-reset">Clear times</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector("#ct-close").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("close",()=>button.focus());
    dialog.querySelector("#ct-add").addEventListener("click",()=>addInterval());
    dialog.querySelector("#ct-reset").addEventListener("click",()=>{if(window.confirm("Clear all cooling times for a new calculation?")){dialog.querySelectorAll("input[data-time]").forEach(el=>el.value="");resetIntervals();dialog.querySelector("#ct-death").focus();}});
    dialog.addEventListener("input",update);
    dialog.addEventListener("focusout",e=>{if(e.target.matches("input[data-time]")&&engine.parseTime(e.target.value)!==null)e.target.value=e.target.value.trim().replace(":","");});
    dialog.addEventListener("change",e=>{if(e.target.matches("[data-until]")){const row=e.target.closest(".ct-interval");row.querySelector("[data-return]").hidden=e.target.checked;row.querySelector("[data-return] input").disabled=e.target.checked;refreshIntervals();}update();});
    const subtotalNote=document.createElement("small");subtotalNote.id="ct-subtotal-note";dialog.querySelector("#ct-out-card").appendChild(subtotalNote);
    resetIntervals();
  }
  function resetIntervals(){dialog.querySelector("#ct-intervals").replaceChildren();for(let i=0;i<DEFAULT_INTERVALS;i++)addInterval(false);update();}
  function addInterval(focus=true){
    const id=++sequence,row=document.createElement("fieldset");row.className="ct-interval";row.dataset.interval=String(id);row.setAttribute("aria-label","Out-of-cooling interval");
    row.innerHTML=`<div class="ct-interval-head"><span data-interval-title></span><button type="button" class="ct-remove">Remove</button></div>${timeRow(`out-${id}`,"Out of cooling")}<div data-return>${timeRow(`in-${id}`,"Back in cooling",`duration-${id}`)}</div><label class="ct-check"><input type="checkbox" data-until> Out until prep</label>`;
    row.querySelector(".ct-remove").addEventListener("click",()=>{row.remove();refreshIntervals();update();dialog.querySelector("#ct-add").focus();});
    dialog.querySelector("#ct-intervals").appendChild(row);refreshIntervals();update();if(focus)row.querySelector("input").focus();
  }
  function refreshIntervals(){
    const rows=[...dialog.querySelectorAll(".ct-interval")];
    const used=row=>[...row.querySelectorAll("input[data-time]")].some(input=>input.value.trim())||row.querySelector("[data-until]").checked;
    const finalIndex=rows.findIndex(row=>row.querySelector("[data-until]").checked);
    rows.forEach((row,i)=>{
      row.querySelector("[data-interval-title]").textContent=`Interval ${i+1}`;row.setAttribute("aria-label",`Out-of-cooling interval ${i+1}`);
      const check=row.querySelector("[data-until]"),blocked=finalIndex>=0&&i>finalIndex;
      check.disabled=blocked||rows.slice(i+1).some(used);row.querySelector(".ct-check").hidden=false;
      row.querySelector('[data-time^="out-"]').disabled=blocked;row.querySelector('[data-time^="in-"]').disabled=blocked||check.checked;
    });
    dialog.querySelector("#ct-add").disabled=finalIndex>=0;
  }
  function update(){
    refreshIntervals();
    const rows=[...dialog.querySelectorAll(".ct-interval")];
    const get=id=>dialog.querySelector(`#ct-${id}`).value;
    const result=engine.calculate({death:get("death"),initial:get("initial"),prep:get("prep"),intervals:rows.map(row=>({out:row.querySelector('[data-time^="out-"]').value,in:row.querySelector('[data-time^="in-"]').value,untilPrep:row.querySelector("[data-until]").checked}))});
    const fmt=engine.formatDuration,set=(id,value)=>dialog.querySelector(`#ct-${id}`).textContent=fmt(value);
    set("total-elapsed",result.deathToPrep);set("total-initial",result.initialDelay);set("total-out",result.totalOut);set("initial-duration",result.initialDelay);
    rows.forEach((row,i)=>row.querySelector("output[id]").textContent=fmt(result.intervals[i]?.minutes));
    set("prep-duration",result.finalIndex>=0?result.intervals[result.finalIndex].minutes:null);
    dialog.querySelector("#ct-subtotal-note").textContent=result.totalIsPartial?"So far · completed intervals only":"All entered intervals included";
    dialog.querySelector("#ct-initial-card").classList.toggle("warn",result.alerts.some(a=>a.code==="late-cooling-and-prep"));dialog.querySelector("#ct-out-card").classList.toggle("warn",result.alerts.some(a=>a.code==="total-out"));
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
    button.addEventListener("click",e=>{e.stopPropagation();const opening=panel.hidden;panel.hidden=!opening;button.setAttribute("aria-expanded",String(opening));document.getElementById("solvitaMenuPanel")?.classList.add("hidden");menu.setAttribute("aria-expanded","false");if(opening){positionPanel();panel.querySelector("button").focus({preventScroll:true});}});
    panel.querySelector("button").addEventListener("click",()=>{closePanel();dialog.showModal();dialog.querySelector("#ct-death").focus();});
    document.addEventListener("click",e=>{if(!panel.contains(e.target)&&e.target!==button)closePanel();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){closePanel();button.focus();}});
    window.addEventListener("resize",positionPanel);window.addEventListener("scroll",positionPanel,{passive:true});
    window.visualViewport?.addEventListener("resize",positionPanel);window.visualViewport?.addEventListener("scroll",positionPanel);
    return true;
  }
  if(!install()){const timer=setInterval(()=>{if(install())clearInterval(timer)},150);setTimeout(()=>clearInterval(timer),15000);}
})();
