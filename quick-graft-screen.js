(function(){
  "use strict";

  function defaultOca(age){
    if(!age)return "";
    const inRange=grafts.some(graft=>graft.oca&&
      (eligible(graft,"male",age.years)||eligible(graft,"female",age.years)));
    return inRange?"yes":"no";
  }

  // Unknown answers are evaluated across the planner's supported choices.
  // A graft that needs one of those answers stays in the review list.
  function screen(inputs){
    const age=parseAgeInput(inputs.age);
    const bmi=Number(inputs.bmi);
    const oca=inputs.oca||defaultOca(age);
    const yesNo=value=>value==="yes"||value==="no";
    if(!age||!Number.isFinite(bmi)||bmi<=0||
      !["male","female"].includes(inputs.sex)||!["after","no"].includes(inputs.autopsy)||
      ![oca,inputs.organDonor].every(yesNo)){
      return null;
    }

    const yesNoChoices=["yes","no"];
    const scenarioFields={
      funeral:["viewing","direct","uncertain"],
      international:yesNoChoices,
      forProfit:yesNoChoices,
      cosmetic:yesNoChoices,
      heartLungsTransplant:inputs.organDonor==="yes"?yesNoChoices:["no"]
    };
    let scenarios=[{...inputs,bmi,oca}];
    for(const [field,choices] of Object.entries(scenarioFields)){
      const answer=field==="heartLungsTransplant"&&inputs.organDonor==="no"?"no":inputs[field];
      const options=choices.includes(answer)?[answer]:choices;
      scenarios=scenarios.flatMap(context=>options.map(value=>({...context,[field]:value})));
    }

    const results=scenarios.map(context=>{
      const ruledOut=new Map();
      for(const graft of grafts){
        const reasons=evaluateGraftCriteria(graft,age.years,inputs.sex,context);
        const autopsyReason=window.PDXPostAutopsyRules.restrictionReason(graft.id,inputs.autopsy);
        if(autopsyReason)reasons.push(autopsyReason);
        if(reasons.length)ruledOut.set(graft.id,reasons);
      }
      for(const [id,{ids,message}] of Object.entries(graftCompanions)){
        if(!ruledOut.has(id)&&ids.every(companion=>ruledOut.has(companion))){
          ruledOut.set(id,[message]);
        }
      }
      return ruledOut;
    });

    const possible=[],review=[],excluded=[];
    for(const graft of grafts){
      const blocked=results.map(result=>result.get(graft.id)).filter(Boolean);
      const reasons=[...new Set(blocked.flat())];
      const item={name:graft.name,reasons};
      if(blocked.length===results.length){
        excluded.push(item);
        continue;
      }

      const companion=graftCompanions[graft.id];
      if(companion&&!reasons.includes(companion.message))reasons.push(companion.message);
      if(graft.oca)reasons.push("Confirm the OCA/JRF graft combination and side requirements in the full planner.");
      if(graft.id==="nerves"){
        if(age.years<14)reasons.push("Axogen consultation required at ages 12–13.");
        if(inputs.autopsy==="after")reasons.push("Review Axogen post-autopsy restrictions before considering nerves.");
      }
      if(graft.id==="hemi"&&inputs.autopsy==="after"){
        reasons.push("Confirm post-autopsy restrictions for hemi pelvis.");
      }
      if(graft.type==="heart"&&age.years<1)reasons.push("Confirm processor gestational-age criteria.");

      (reasons.length?review:possible).push(item);
    }
    return {possible,review,excluded};
  }

  const yesNo='<option value="">Select</option><option value="yes">Yes</option><option value="no">No</option>';
  const select=(name,label,options,required=true)=>
    '<label><span>'+label+'</span><select name="'+name+'"'+(required?' required':'')+'>'+options+'</select></label>';
  let dialog,form,trigger;

  function build(){
    const style=document.createElement("style");
    style.textContent=`
      #quickGraftScreen{width:min(880px,calc(100% - 24px));max-height:calc(100dvh - 24px);max-width:none;padding:0;border:0;border-radius:16px;background:#f2f4f8;color:#172a44;box-shadow:0 16px 60px #0005;text-align:left}
      #quickGraftScreen::backdrop{background:#071f3ecc}#quickGraftScreen *{box-sizing:border-box}#quickGraftScreen [hidden]{display:none!important}
      #quickGraftScreen .qgs-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;background:#183153;color:white}
      #quickGraftScreen h2{margin:0;font-size:21px;color:inherit}#quickGraftScreen button{width:auto;min-height:42px}
      #qgsClose,#qgsClear{border:1px solid #bcc9d9;background:white;color:#183153}
      #quickGraftScreen .qgs-body{padding:16px 18px}#quickGraftScreen p{margin:0 0 12px;line-height:1.4}
      #quickGraftScreen .qgs-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 14px}
      #quickGraftScreen label{display:grid;align-content:start;gap:5px;margin:0;font-size:14px;font-weight:700}
      #quickGraftScreen input,#quickGraftScreen select{width:100%;min-height:42px;margin:0;font-size:16px;border:1px solid #aabbd0;border-radius:8px;color:#172a44;background:white;padding:7px 9px}
      #quickGraftScreen details{margin-top:14px}#quickGraftScreen summary{color:#183153;font-weight:700;cursor:pointer;width:fit-content}
      #quickGraftScreen details .qgs-fields{margin-top:8px}#quickGraftScreen .qgs-actions{display:flex;gap:8px;margin-top:14px}
      #qgsResults{margin-top:16px}#qgsResults h3{margin:0;font-size:16px}#qgsResults ul{margin:6px 0 0;padding-left:22px}
      #qgsResults li{padding:3px 0}#qgsResults li span{display:block;font-size:14px;color:#425571}
      #qgsResults .qgs-results-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      #qgsResults section,#qgsResults details{padding:12px;background:#fff;border:1px solid #d4dce7;border-radius:10px}
      #qgsError{color:#922a3e}
      @media(max-width:600px){#quickGraftScreen .qgs-fields{grid-template-columns:repeat(2,minmax(0,1fr))}#qgsResults .qgs-results-grid{grid-template-columns:1fr}}
      @media print{#quickGraftScreen{display:none!important}}
    `;
    document.head.appendChild(style);

    dialog=document.createElement("dialog");
    dialog.id="quickGraftScreen";
    dialog.setAttribute("aria-labelledby","qgsTitle");
    const optionalYesNo=yesNo.replace("Select","Unknown");
    const defaultYes=optionalYesNo.replace('<option value="yes">','<option value="yes" selected>');
    const defaultNo=yesNo.replace('<option value="">Select</option>','')
      .replace('<option value="no">','<option value="no" selected>');
    dialog.innerHTML=
      '<div class="qgs-header"><h2 id="qgsTitle">Quick graft screen</h2><button type="button" id="qgsClose">Close</button></div>'+
      '<div class="qgs-body"><p>Preliminary screen for Portland. Complete the full donor and processor review before planning recovery.</p>'+
      '<form autocomplete="off"><div class="qgs-fields">'+
      '<label><span>Age</span><input name="age" type="text" placeholder="52 or 6m" required></label>'+
      select("sex","Sex",'<option value="">Select</option><option value="male">Male</option><option value="female">Female</option>')+
      select("oca","JRF/OCA eligible?",yesNo.replace('value=""','value="" disabled selected'))+
      select("autopsy","Post-autopsy?",defaultNo.replace('value="yes"','value="after"'))+
      select("organDonor","Post-organ recovery?",defaultNo)+
      '<label><span>BMI</span><input name="bmi" type="number" min="0" step="any" inputmode="decimal" required></label>'+
      select("funeral","Funeral plan",'<option value="">Unknown</option><option value="viewing">Viewing</option><option value="direct">Direct cremation</option><option value="uncertain">No viewing, cremation uncertain</option>',false)+
      '</div><details><summary>Additional details, if known</summary><div class="qgs-fields">'+
      select("international","International authorized?",defaultYes,false)+
      select("forProfit","For-profit authorized?",defaultYes,false)+
      select("cosmetic","Cosmetic authorized?",defaultYes,false)+
      select("heartLungsTransplant","Heart or lungs donated for transplant?",optionalYesNo,false)+
      '</div></details><div class="qgs-actions"><button type="submit">Screen grafts</button>'+
      '<button type="reset" id="qgsClear">Clear</button></div></form>'+
      '<div id="qgsResults" aria-live="polite"></div></div>';
    document.body.appendChild(dialog);
    form=dialog.querySelector("form");
    const results=dialog.querySelector("#qgsResults");
    const ageField=form.elements.namedItem("age");
    const ocaField=form.elements.namedItem("oca");
    const transplant=form.elements.namedItem("heartLungsTransplant");

    function syncTransplant(){
      const show=form.elements.namedItem("organDonor").value==="yes";
      transplant.disabled=!show;
      transplant.closest("label").hidden=!show;
      if(!show)transplant.value="";
    }

    dialog.querySelector("#qgsClose").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("close",()=>{
      form.reset();
      dialog.querySelector("details").open=false;
      trigger?.focus();
    });
    form.addEventListener("input",event=>{
      if(event.target===ageField)ocaField.value=defaultOca(parseAgeInput(ageField.value));
      syncTransplant();
      results.replaceChildren();
    });
    form.addEventListener("reset",()=>{
      results.replaceChildren();
      queueMicrotask(syncTransplant);
    });
    form.addEventListener("submit",event=>{
      event.preventDefault();
      const data=Object.fromEntries(new FormData(form));
      const screening=screen(data);
      if(!screening){
        const error=document.createElement("p");
        error.id="qgsError";
        error.textContent="Enter a valid age and a BMI greater than zero.";
        results.replaceChildren(error);
        return;
      }
      showResults(results,screening);
    });
    syncTransplant();
  }

  function graftList(items){
    if(!items.length){
      const empty=document.createElement("p");
      empty.textContent="None.";
      return empty;
    }
    const list=document.createElement("ul");
    for(const {name,reasons} of items){
      const row=document.createElement("li");
      row.textContent=name;
      if(reasons.length){
        const detail=document.createElement("span");
        detail.textContent=reasons.join(" ");
        row.append(detail);
      }
      list.append(row);
    }
    return list;
  }

  function showResults(host,{possible,review,excluded}){
    const grid=document.createElement("div");
    grid.className="qgs-results-grid";
    for(const [title,items] of [["Possible grafts",possible],["Needs confirmation",review]]){
      const section=document.createElement("section");
      const heading=document.createElement("h3");
      heading.textContent=title+" ("+items.length+")";
      section.append(heading,graftList(items));
      grid.append(section);
    }
    const ruledOut=document.createElement("details");
    const summary=document.createElement("summary");
    summary.textContent="Ruled out by this screen ("+excluded.length+")";
    ruledOut.append(summary,graftList(excluded));
    host.replaceChildren(grid,ruledOut);
  }

  window.PDXQuickGraftScreen={
    screen,
    open(from){
      if(!dialog)build();
      trigger=from;
      dialog.showModal();
      form.elements.namedItem("age").focus();
    }
  };
})();
