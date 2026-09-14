(function(){
  "use strict";
  const engine=window.PlasmaDilutionCalculator;
  if(!engine)return;
  let dialog,menuButton,rowSequence=0;

  const groups={
    blood:["prbc","whole_blood","other_blood"],
    colloid:["ffp","albumin_5_250","albumin_5_500","albumin_25_20","albumin_25_50","albumin_25_100","platelets_5_pack","platelets_apheresis","cryo_10_pack","hespan","polyheme","other_colloid"],
    crystalloid:["saline","ringers_lactate","dextrose","balanced_electrolyte","tpn","medication","sodium_bicarbonate","other_crystalloid"]
  };

  function addStyles(){
    if(document.getElementById("plasmaDilutionToolStyle"))return;
    const style=document.createElement("style");style.id="plasmaDilutionToolStyle";
    style.textContent=`
#plasmaDilutionTool{width:min(1220px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);padding:0;border:0;border-radius:16px;background:#f2f4f8;color:#172a44;box-shadow:0 16px 60px #0005;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left}
#plasmaDilutionTool::backdrop{background:#071f3ecc}#plasmaDilutionTool *{box-sizing:border-box}#plasmaDilutionTool [hidden]{display:none!important}
#plasmaDilutionTool .pd-head{display:flex;align-items:center;gap:12px;padding:12px 18px;background:#183153;color:#fff}#plasmaDilutionTool .pd-head>div{margin-right:auto}#plasmaDilutionTool h2{font-size:22px;margin:0;color:inherit}#plasmaDilutionTool .pd-head span{font-size:12px;color:#d8e2ef}#plasmaDilutionTool .pd-head button{background:transparent;border:1px solid #ffffff88;color:#fff;border-radius:8px;padding:9px 12px;font:inherit;min-height:44px}
#plasmaDilutionTool .pd-caution{margin:12px 16px 0;padding:9px 12px;border-left:4px solid #c59419;background:#fff7d8;color:#5b470e;font-size:13px;line-height:1.4}
#plasmaDilutionTool .pd-body{padding:12px 16px 16px}.pd-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:12px;align-items:start}.pd-main{display:grid;gap:10px}.pd-box,.pd-results{background:#fff;border:1px solid #d4dce7;border-radius:10px;min-width:0}.pd-title{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #dce3ec}.pd-title h3{font-size:17px;margin:0 auto 0 0}.pd-step{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#183153;color:#fff;font-size:12px;font-weight:800}
#plasmaDilutionTool .pd-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px 12px}.pd-span-2{grid-column:span 2}.pd-span-all{grid-column:1/-1}#plasmaDilutionTool label{display:block;font-size:12px;font-weight:700;color:#42536b}#plasmaDilutionTool input,#plasmaDilutionTool select{display:block;width:100%;height:38px;margin-top:4px;border:1px solid #aebdd0;border-radius:7px;background:#fff;color:#172a44;padding:7px 8px;font:inherit;font-size:16px;font-variant-numeric:tabular-nums}#plasmaDilutionTool input[aria-invalid=true],#plasmaDilutionTool select[aria-invalid=true]{border:2px solid #a32a3e}.pd-conversion{display:block;margin-top:4px;color:#5c6d83;font-size:11px;font-weight:500}.pd-window{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;background:#eaf1f9;border-radius:7px;font-size:13px}.pd-window strong{font-variant-numeric:tabular-nums}
.pd-flags{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:0 12px 11px}.pd-check{display:flex!important;align-items:center;gap:7px;font-size:12px!important;font-weight:600!important}.pd-check input{width:18px!important;height:18px!important;margin:0!important;flex:0 0 auto}
.pd-fluid-groups{padding:4px 12px 12px}.pd-fluid-group+.pd-fluid-group{border-top:1px solid #dce3ec;margin-top:8px;padding-top:8px}.pd-fluid-heading{display:flex;align-items:center;gap:8px}.pd-fluid-heading strong{font-size:14px}.pd-fluid-heading span{margin-right:auto;color:#5c6d83;font-size:11px}.pd-add{border:1px solid #b9c8da;background:#e8f0fa;color:#183153;border-radius:7px;padding:7px 9px;font:inherit;font-size:12px;font-weight:750;min-height:36px}.pd-empty{margin:8px 0 2px;color:#6b788a;font-size:12px}.pd-fluid-row{margin-top:8px;padding:9px;background:#f5f7fa;border-radius:8px}.pd-fluid-line{display:grid;grid-template-columns:minmax(150px,1.4fr) 120px 72px 58px 82px 36px;gap:6px;align-items:end}.pd-fluid-line button{height:38px;border:0;background:transparent;color:#8a293a;font-size:22px}.pd-custom-component-wrap{margin-top:7px}.pd-entry-note{margin-top:5px;color:#5c6d83;font-size:11px}.pd-incomplete-toggle{margin-top:7px}.pd-incomplete-fields{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:7px;padding-top:7px;border-top:1px solid #d7e0ea}
.pd-results{overflow:hidden}.pd-results-title{padding:11px 12px;background:#183153;color:#fff;font-weight:800}.pd-results-body{padding:11px 12px}.pd-stats{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pd-stat{padding:8px;background:#eef3f8;border-radius:7px}.pd-stat span{display:block;color:#5c6d83;font-size:11px}.pd-stat strong{font-size:16px;font-variant-numeric:tabular-nums}.pd-equation{padding:10px 0;border-top:1px solid #dce3ec;font-size:12px}.pd-equation:first-of-type{margin-top:10px}.pd-equation-line{display:flex;justify-content:space-between;gap:8px;margin-top:3px}.pd-pass{color:#17663d;font-weight:800}.pd-fail{color:#9b2437;font-weight:800}.pd-final{padding:13px 9px;text-align:center;border-radius:8px;background:#dcf3e6;color:#145432}.pd-final.fail{background:#fde5e8;color:#8f2134}.pd-final.pending{background:#eef1f5;color:#4d5b6d}.pd-final strong{display:block}.pd-final span{font-size:11px}.pd-message{margin:8px 0 0;padding-left:18px;color:#7d2637;font-size:12px;line-height:1.4}.pd-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.pd-actions button{min-height:40px;border:1px solid #aebdd0;border-radius:7px;background:#fff;color:#172a44;font:inherit;font-weight:750}.pd-actions .pd-save{grid-column:1/-1;background:#183153;color:#fff;border-color:#183153}.pd-save-note{margin-top:6px;color:#5c6d83;font-size:11px;min-height:15px}
@media(max-width:900px){#plasmaDilutionTool .pd-layout{grid-template-columns:1fr}.pd-results{order:-1}}
@media(max-width:650px){#plasmaDilutionTool{width:calc(100vw - 12px);max-height:calc(100dvh - 12px)}#plasmaDilutionTool .pd-head{padding:10px 12px}#plasmaDilutionTool h2{font-size:18px}#plasmaDilutionTool .pd-head span{display:none}#plasmaDilutionTool .pd-caution{margin:8px 9px 0}#plasmaDilutionTool .pd-body{padding:8px 9px 12px}#plasmaDilutionTool .pd-fields{grid-template-columns:1fr 1fr}.pd-span-2{grid-column:span 2}.pd-flags{grid-template-columns:1fr}.pd-fluid-line{grid-template-columns:minmax(0,1fr) 78px 36px}.pd-component-wrap{grid-column:1/3}.pd-date-wrap{grid-column:1}.pd-time-wrap{grid-column:2}.pd-units-wrap{grid-column:1}.pd-volume-wrap{grid-column:2}.pd-units-wrap[hidden]+.pd-volume-wrap{grid-column:1/3}.pd-fluid-line button{grid-column:3;grid-row:1}.pd-incomplete-fields{grid-template-columns:1fr 1fr}.pd-incomplete-fields label:last-child{grid-column:1/-1}.pd-window{display:block}.pd-window strong{display:block;margin-top:3px}}
@media print{body>*:not(#plasmaDilutionTool){display:none!important}#plasmaDilutionTool{display:block!important;position:static;width:100%;max-height:none;box-shadow:none}.pd-head button,.pd-actions,#plannerToolsPanel{display:none!important}.pd-layout{grid-template-columns:1fr 280px!important}}
`;
    document.head.appendChild(style);
  }

  function componentOptions(category){
    return groups[category].map(key=>{const item=engine.COMPONENTS[key];return `<option value="${key}">${item.label}${item.volume!==null?` · ${item.volume} mL`:""}</option>`;}).join("");
  }

  function today(){
    const d=new Date(),pad=n=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function buildDialog(){
    dialog=document.createElement("dialog");dialog.id="plasmaDilutionTool";dialog.setAttribute("aria-labelledby","pd-title");
    dialog.innerHTML=`
      <div class="pd-head"><div><h2 id="pd-title">Plasma dilution calculator</h2><span>TR-502 screening calculation</span></div><button type="button" id="pd-close">Close</button></div>
      <div class="pd-caution"><strong>Screening aid:</strong> Verify the final calculation against the approved worksheet and follow Medical Director consultation requirements.</div>
      <div class="pd-body"><div class="pd-layout"><main class="pd-main">
        <section class="pd-box"><div class="pd-title"><span class="pd-step">1</span><h3>Donor and sample</h3></div>
          <div class="pd-fields">
            <label class="pd-span-2">Donor ID<input id="pd-donor-id" autocomplete="off"></label>
            <label>Age<input id="pd-age" inputmode="numeric"></label>
            <label>Sex<select id="pd-sex"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></label>
            <label class="pd-span-2">Height<input id="pd-height" autocomplete="off" placeholder="72 or 183 cm"><span class="pd-conversion" id="pd-height-conversion">Inches by default · add cm to convert</span></label>
            <label class="pd-span-2">Weight<input id="pd-weight" autocomplete="off" placeholder="160 or 72.6 kg"><span class="pd-conversion" id="pd-weight-conversion">Pounds by default · add kg to convert</span></label>
            <label>Date of death<input id="pd-asystole-date" type="date"></label><label>Time of death<input id="pd-asystole-time" inputmode="numeric" maxlength="5" placeholder="HHMM"></label>
            <label>Sample draw date<input id="pd-sample-date" type="date" data-death-default="true"></label><label>Sample draw time<input id="pd-sample-time" inputmode="numeric" maxlength="5" placeholder="HHMM"></label>
            <label class="pd-span-2">Any transfusions or infusions?<select id="pd-received"><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label class="pd-span-2">Pre-transfusion/infusion sample obtained?<select id="pd-pre-sample"><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label class="pd-span-2">Known or suspected blood loss?<select id="pd-blood-loss"><option value="no">No</option><option value="yes">Yes</option><option value="unknown">Unknown</option></select></label>
            <div class="pd-window pd-span-2"><span>Assessment window</span><strong id="pd-window">Enter sample and asystole times</strong></div>
          </div>
          <div class="pd-flags"><label class="pd-check"><input id="pd-obese" type="checkbox"> Donor identified as obese</label><label class="pd-check"><input id="pd-large-infusions" type="checkbox"> Large infusions may affect results</label></div>
        </section>
        <section class="pd-box"><div class="pd-title"><span class="pd-step">2</span><h3>Fluids in the assessment window</h3></div><div class="pd-fluid-groups">
          ${fluidGroup("blood","A · Blood","Counted within 48 hours")}
          ${fluidGroup("colloid","B · Colloids","Counted within 48 hours")}
          ${fluidGroup("crystalloid","C · Crystalloids and medications","Counted in the final 1 hour")}
        </div></section>
      </main><aside class="pd-results" aria-live="polite"><div class="pd-results-title">Live calculation</div><div class="pd-results-body">
        <div class="pd-stats"><div class="pd-stat"><span>BSA</span><strong id="pd-bsa">—</strong></div><div class="pd-stat"><span>Plasma volume</span><strong id="pd-pv">—</strong></div><div class="pd-stat"><span>Blood volume</span><strong id="pd-bv">—</strong></div><div class="pd-stat"><span>Method</span><strong id="pd-method">—</strong></div></div>
        <div class="pd-equation"><strong>Question 1</strong><div class="pd-equation-line"><span id="pd-q1-total">B + C = —</span><span id="pd-q1-answer">—</span></div><div id="pd-q1-limit">Greater than PV?</div></div>
        <div class="pd-equation"><strong>Question 2</strong><div class="pd-equation-line"><span id="pd-q2-total">A + B + C = —</span><span id="pd-q2-answer">—</span></div><div id="pd-q2-limit">Greater than BV?</div></div>
        <div class="pd-final pending" id="pd-final"><strong>ENTER REQUIRED INFORMATION</strong><span>Results update automatically</span></div><ul class="pd-message" id="pd-messages"></ul>
        <div class="pd-actions"><button type="button" id="pd-clear">Clear</button><button type="button" id="pd-print">Print</button><button type="button" class="pd-save" id="pd-save">Save to donor</button></div><div class="pd-save-note" id="pd-save-note"></div>
      </div></aside></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector("#pd-close").addEventListener("click",()=>dialog.close());
    dialog.querySelector("#pd-print").addEventListener("click",()=>window.print());
    dialog.querySelector("#pd-clear").addEventListener("click",clear);
    dialog.querySelector("#pd-save").addEventListener("click",saveToDonor);
    dialog.addEventListener("input",update);
    dialog.addEventListener("change",event=>{if(event.target.id==="pd-asystole-date")defaultDatesFromDeath();else if(event.target.matches("#pd-sample-date,.pd-entry-date,.pd-entry-end-date"))event.target.dataset.deathDefault="false";update();});
    dialog.addEventListener("focusout",event=>{if(event.target.matches("[id$='-time'],.pd-entry-time,.pd-entry-end-time")&&engine.parseMilitaryTime(event.target.value)!==null)event.target.value=event.target.value.trim().replace(":","");});
    dialog.querySelectorAll(".pd-add").forEach(button=>button.addEventListener("click",()=>addFluid(button.dataset.category)));
    ensureEmptyLabels();update();
  }

  function fluidGroup(category,title,note){
    return `<section class="pd-fluid-group" data-fluid-group="${category}"><div class="pd-fluid-heading"><strong>${title}</strong><span>${note}</span><button type="button" class="pd-add" data-category="${category}">+ Add</button></div><div class="pd-fluid-rows"></div></section>`;
  }

  function defaultDatesFromDeath(){
    const death=dialog.querySelector("#pd-asystole-date"),next=death.value,previous=death.dataset.previousValue||"";
    dialog.querySelectorAll("#pd-sample-date,.pd-entry-date,.pd-entry-end-date").forEach(field=>{
      if(!field.value||field.dataset.deathDefault==="true"||field.value===previous){field.value=next;field.dataset.deathDefault="true";}
    });
    death.dataset.previousValue=next;
  }

  function defaultDate(){return dialog?.querySelector("#pd-asystole-date")?.value||today();}

  function addFluid(category,focus=true){
    const id=++rowSequence,row=document.createElement("div");row.className="pd-fluid-row";row.dataset.category=category;row.dataset.row=String(id);
    const date=defaultDate();
    row.innerHTML=`<div class="pd-fluid-line"><label class="pd-component-wrap">Component<select class="pd-component">${componentOptions(category)}</select></label><label class="pd-date-wrap">Start date<input class="pd-entry-date" type="date" value="${date}" data-death-default="true"></label><label class="pd-time-wrap">Time<input class="pd-entry-time" inputmode="numeric" maxlength="5" placeholder="HHMM"></label><label class="pd-units-wrap">Units<input class="pd-entry-quantity" type="number" inputmode="numeric" min="1" step="1" value="1"></label><label class="pd-volume-wrap">Volume (mL)<input class="pd-entry-volume" inputmode="decimal"></label><button type="button" class="pd-remove" aria-label="Remove fluid">×</button></div><label class="pd-custom-component-wrap" hidden>Other crystalloid name<input class="pd-custom-component" autocomplete="off" placeholder="Enter fluid name"></label><label class="pd-check pd-incomplete-toggle"><input class="pd-incomplete" type="checkbox"> Volume unknown or infusion incomplete at death</label><div class="pd-incomplete-fields" hidden><label>Access<select class="pd-access"><option value="iv-22">22g IV · 35 mL/min</option><option value="iv-20">20g IV · 65 mL/min</option><option value="iv-18" selected>18g IV · 105 mL/min</option><option value="iv-16">16g IV · 220 mL/min</option><option value="io-tibia">Tibial IO · 31 mL/min</option><option value="io-humerus">Humeral IO · 57 mL/min</option><option value="io-sternum">Sternal IO · 94 mL/min</option></select></label><label>End date<input class="pd-entry-end-date" type="date" value="${date}" data-death-default="true"></label><label>End time<input class="pd-entry-end-time" inputmode="numeric" maxlength="5" placeholder="HHMM"></label><label>Bag volume (mL)<input class="pd-bag-volume" inputmode="decimal" value="1000"></label><label>Calculated maximum<input class="pd-calculated" readonly value="—"></label></div><div class="pd-entry-note">Enter a documented volume or use worst-case mode.</div>`;
    const component=row.querySelector(".pd-component"),volume=row.querySelector(".pd-entry-volume"),quantity=row.querySelector(".pd-entry-quantity"),unitsWrap=row.querySelector(".pd-units-wrap");
    function applyUnitVolume(){const standard=engine.COMPONENTS[component.value]?.volume,units=Number(quantity.value);volume.value=standard!==null&&Number.isInteger(units)&&units>=1?String(standard*units):"";}
    function applyDefault(){const item=engine.COMPONENTS[component.value],custom=row.querySelector(".pd-custom-component-wrap"),usesUnits=category!=="crystalloid"&&item?.volume!==null;unitsWrap.hidden=!usesUnits;if(usesUnits)applyUnitVolume();else volume.value="";custom.hidden=component.value!=="other_crystalloid";update();}
    component.addEventListener("change",applyDefault);
    quantity.addEventListener("input",()=>{applyUnitVolume();update();});
    row.querySelector(".pd-remove").addEventListener("click",()=>{row.remove();ensureEmptyLabels();update();});
    row.querySelector(".pd-incomplete").addEventListener("change",event=>{row.querySelector(".pd-incomplete-fields").hidden=!event.target.checked;volume.disabled=event.target.checked;quantity.disabled=event.target.checked;update();});
    dialog.querySelector(`[data-fluid-group="${category}"] .pd-fluid-rows`).appendChild(row);applyDefault();ensureEmptyLabels();if(focus)component.focus();
  }

  function ensureEmptyLabels(){
    dialog.querySelectorAll(".pd-fluid-group").forEach(group=>{
      let empty=group.querySelector(".pd-empty");const has=!!group.querySelector(".pd-fluid-row");
      if(!has&&!empty){empty=document.createElement("p");empty.className="pd-empty";empty.textContent="No entries added.";group.querySelector(".pd-fluid-rows").appendChild(empty);}
      if(has&&empty)empty.remove();
    });
  }

  function collect(){
    const value=id=>dialog.querySelector(id).value;
    return {
      donorId:value("#pd-donor-id"),age:value("#pd-age"),sex:value("#pd-sex"),height:value("#pd-height"),heightUnit:"in",weight:value("#pd-weight"),weightUnit:"lb",
      sampleDate:value("#pd-sample-date"),sampleTime:value("#pd-sample-time"),asystoleDate:value("#pd-asystole-date"),asystoleTime:value("#pd-asystole-time"),receivedInfusions:value("#pd-received"),preInfusionSample:value("#pd-pre-sample"),bloodLoss:value("#pd-blood-loss"),obese:dialog.querySelector("#pd-obese").checked,largeInfusions:dialog.querySelector("#pd-large-infusions").checked,
      entries:[...dialog.querySelectorAll(".pd-fluid-row")].map(row=>{const component=row.querySelector(".pd-component").value;return {category:engine.COMPONENTS[component]?.category||row.dataset.category,component,customLabel:row.querySelector(".pd-custom-component").value,quantity:row.querySelector(".pd-entry-quantity").value,date:row.querySelector(".pd-entry-date").value,time:row.querySelector(".pd-entry-time").value,volume:row.querySelector(".pd-entry-volume").value,incomplete:row.querySelector(".pd-incomplete").checked,access:row.querySelector(".pd-access").value,endDate:row.querySelector(".pd-entry-end-date").value,endTime:row.querySelector(".pd-entry-end-time").value,bagVolume:row.querySelector(".pd-bag-volume").value};})
    };
  }

  function fmtMl(value){return Number.isFinite(value)?`${Math.ceil(value).toLocaleString("en-US")} mL`:"—";}
  function fmtDateTime(date){if(!(date instanceof Date))return"—";const pad=n=>String(n).padStart(2,"0");return`${pad(date.getMonth()+1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}${pad(date.getMinutes())}`;}

  function update(){
    if(!dialog)return;const data=collect(),result=engine.calculate(data),m=result.volumes;
    dialog.querySelector("#pd-height-conversion").textContent=m.heightInches?m.heightInputUnit==="cm"?`Converted: ${m.heightInches.toFixed(2)} in`:`${m.heightInches.toFixed(2)} in · ${m.heightCentimeters.toFixed(2)} cm`:"Inches by default · add cm to convert";
    dialog.querySelector("#pd-weight-conversion").textContent=m.weightPounds?m.weightInputUnit==="kg"?`Converted: ${m.weightPounds.toFixed(2)} lb`:`${m.weightPounds.toFixed(2)} lb · ${m.weightKilograms.toFixed(2)} kg`:"Pounds by default · add kg to convert";
    dialog.querySelector("#pd-window").textContent=result.window.start?`${fmtDateTime(result.window.start)} → ${fmtDateTime(result.window.end)}`:"Enter sample and asystole times";
    dialog.querySelector("#pd-bsa").textContent=m.bsa!==null?`${m.bsa.toFixed(2)} m²`:"—";dialog.querySelector("#pd-pv").textContent=fmtMl(m.plasmaVolume);dialog.querySelector("#pd-bv").textContent=fmtMl(m.bloodVolume);dialog.querySelector("#pd-method").textContent=m.method==="weight"?"Weight":m.method==="bsa"?"BSA":"—";
    dialog.querySelector("#pd-q1-total").textContent=`B + C = ${fmtMl(result.questions.q1Total)}`;dialog.querySelector("#pd-q2-total").textContent=`A + B + C = ${fmtMl(result.questions.q2Total)}`;dialog.querySelector("#pd-q1-limit").textContent=`Greater than PV ${fmtMl(m.plasmaVolume)}?`;dialog.querySelector("#pd-q2-limit").textContent=`Greater than BV ${fmtMl(m.bloodVolume)}?`;
    setAnswer("#pd-q1-answer",result.questions.q1Exceeded);setAnswer("#pd-q2-answer",result.questions.q2Exceeded);
    const fluidRows=[...dialog.querySelectorAll(".pd-fluid-row")];result.entries.forEach((entry,index)=>{const row=fluidRows[index];if(!row)return;const calc=row.querySelector(".pd-calculated"),note=row.querySelector(".pd-entry-note");if(calc)calc.value=entry.source.incomplete?fmtMl(entry.volume):"—";note.textContent=entry.reason||"Enter a documented volume or use worst-case mode.";});
    const final=dialog.querySelector("#pd-final"),strong=final.querySelector("strong"),small=final.querySelector("span");final.className="pd-final";
    if(result.shortcut){strong.textContent="SAMPLE IS ACCEPTABLE";small.textContent=result.shortcut==="no-infusions"?"No transfusions or infusions reported":"Pre-transfusion/infusion sample obtained";}
    else if(!result.valid){final.classList.add("pending");strong.textContent="ENTER REQUIRED INFORMATION";small.textContent="Results update automatically";}
    else if(result.acceptable){strong.textContent="SAMPLE IS ACCEPTABLE";small.textContent="Both worksheet questions are “No”";}
    else{final.classList.add("fail");strong.textContent="SAMPLE IS NOT ACCEPTABLE";small.textContent="One or both worksheet limits are exceeded";}
    const messages=dialog.querySelector("#pd-messages");messages.replaceChildren();[...result.errors.map(x=>x.message),...result.flags].forEach(message=>{const li=document.createElement("li");li.textContent=message;messages.appendChild(li);});
  }

  function setAnswer(selector,value){const el=dialog.querySelector(selector);el.className=value===null?"":value?"pd-fail":"pd-pass";el.textContent=value===null?"—":value?"YES • FAIL":"NO • PASS";}

  function clear(){
    if(!window.confirm("Clear this plasma dilution calculation?"))return;
    dialog.querySelectorAll("input").forEach(input=>{if(input.type==="checkbox")input.checked=false;else input.value="";});
    dialog.querySelectorAll("select").forEach(select=>select.selectedIndex=0);
    dialog.querySelector("#pd-blood-loss").value="no";
    dialog.querySelector("#pd-asystole-date").dataset.previousValue="";dialog.querySelector("#pd-sample-date").dataset.deathDefault="true";
    dialog.querySelectorAll(".pd-fluid-row").forEach(row=>row.remove());ensureEmptyLabels();dialog.querySelector("#pd-save-note").textContent="";update();dialog.querySelector("#pd-donor-id").focus();
  }

  function currentDonor(){try{return typeof window.cur==="function"?window.cur():typeof cur==="function"?cur():null}catch{return null;}}
  function saveToDonor(){
    const donor=currentDonor(),note=dialog.querySelector("#pd-save-note");
    if(!donor){note.textContent="Open a donor first to save this calculation.";return;}
    const data=collect(),result=engine.calculate(data);
    if(!result.valid&&!result.shortcut){note.textContent="Complete the required information before saving.";return;}
    donor.plasmaDilution={...data,calculatedAt:new Date().toISOString(),result:{acceptable:result.acceptable,shortcut:result.shortcut,bsa:result.volumes.bsa,plasmaVolume:result.volumes.plasmaVolume,bloodVolume:result.volumes.bloodVolume,blood:result.totals.blood,colloids:result.totals.colloids,crystalloids:result.totals.crystalloids,q1Exceeded:result.questions.q1Exceeded,q2Exceeded:result.questions.q2Exceeded,flags:result.flags}};
    try{if(typeof window.save==="function")window.save();else if(typeof save==="function")save();note.textContent="Saved to the open donor.";}catch(error){console.error(error);note.textContent="Unable to save. Try again after reopening the donor.";}
  }

  function preloadCurrentDonor(){
    const donor=currentDonor();if(!donor)return;const id=donor.id||donor.donorId||donor.name||"";dialog.querySelector("#pd-donor-id").value=id;
  }

  function install(){
    const panel=document.getElementById("plannerToolsPanel");if(!panel)return false;if(document.getElementById("plasmaDilutionToolButton"))return true;
    addStyles();buildDialog();menuButton=document.createElement("button");menuButton.id="plasmaDilutionToolButton";menuButton.type="button";menuButton.textContent="Plasma dilution calculator";panel.appendChild(menuButton);
    menuButton.addEventListener("click",()=>{panel.hidden=true;document.getElementById("plannerToolsButton")?.setAttribute("aria-expanded","false");preloadCurrentDonor();dialog.showModal();dialog.querySelector("#pd-height").focus();});
    dialog.addEventListener("close",()=>document.getElementById("plannerToolsButton")?.focus());return true;
  }
  if(!install()){const timer=setInterval(()=>{if(install())clearInterval(timer)},150);setTimeout(()=>clearInterval(timer),15000);}
})();
