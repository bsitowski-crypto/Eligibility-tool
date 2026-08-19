(function(){
  "use strict";

  const DIRECTORY_KEY="pdx_medical_examiners_v1";
  const CHEST_GRAFTS=new Set([
    "heartArtivion","heartLeMaitre","pericardium","aiArtivion",
    "aiLeMaitre","dta","cartilage"
  ]);
  const SKIN_GRAFTS=new Set(["anteriorSkin","posteriorSkin","legSkin"]);
  const RESTRICTION_INPUTS=new Set([
    "meIsCase","meJurisdiction","meClearance","meRestrictChest","meRestrictSkin"
  ]);

  function defaults(){
    return {
      isCase:"",
      officeName:"",
      officeSnapshot:null,
      jurisdiction:"",
      clearance:"",
      restrictions:{chest:false,skin:false,other:false,otherText:""},
      specimens:{
        required:"",
        urine:false,
        urineQty:"",
        blood:false,
        tubes:{
          grey:{selected:false,qty:""},
          tiger:{selected:false,qty:""},
          purple:{selected:false,qty:""},
          green:{selected:false,qty:""}
        },
        vitreous:false,
        heartPathology:"",
        heartSlides:"",
        heartTissueReturned:"",
        photos:false,
        serology:false,
        physicalAssessment:false,
        tr200:false,
        drai:false,
        cultures:false,
        other:false,
        otherText:""
      },
      documentation:{investigatorNarrative:false,commLog:false},
      stickerComplete:"",
      preAutopsy:{
        pickupConfirmed:"",
        pickupLocation:"",
        documented:"",
        dropoffConfirmed:"",
        dropoffDateTime:""
      },
      postAutopsy:{
        readyConfirmed:"",
        confirmationContact:"",
        confirmationDateTime:""
      },
      decline:{reason:"",changePossible:""}
    };
  }

  function clone(value){
    return value==null?value:JSON.parse(JSON.stringify(value));
  }

  function merge(target,source){
    if(!source||typeof source!=="object")return target;
    for(const [key,value] of Object.entries(source)){
      if(value&&typeof value==="object"&&!Array.isArray(value)){
        if(!target[key]||typeof target[key]!=="object"||Array.isArray(target[key]))target[key]={};
        merge(target[key],value);
      }else{
        target[key]=value;
      }
    }
    return target;
  }

  function normalizeData(value){
    return merge(defaults(),value||{});
  }

  function byId(id){return document.getElementById(id)}
  function value(id){return String(byId(id)?.value||"").trim()}
  function checked(id){return !!byId(id)?.checked}
  function setValue(id,next){const node=byId(id);if(node)node.value=next??""}
  function setChecked(id,next){const node=byId(id);if(node)node.checked=!!next}
  function show(id,visible){byId(id)?.classList.toggle("hidden",!visible)}
  function escapeHtml(input){
    return String(input??"").replace(/[&<>"']/g,char=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[char]));
  }

  function currentDonor(){
    try{return typeof cur==="function"?cur():null}catch{return null}
  }

  function directory(){
    try{
      const records=JSON.parse(localStorage.getItem(DIRECTORY_KEY)||"[]");
      return Array.isArray(records)?records:[];
    }catch{return[]}
  }

  function directoryMatch(name){
    const key=String(name||"").trim().toLowerCase();
    return directory().find(item=>String(item?.name||"").trim().toLowerCase()===key)||null;
  }

  function officeSnapshot(name,existing){
    const match=directoryMatch(name);
    if(match){
      return {
        id:String(match.id||""),
        name:String(match.name||name),
        phone:String(match.phone||""),
        morgue:String(match.morgue||""),
        notes:String(match.notes||"")
      };
    }
    if(existing&&String(existing.name||"").trim().toLowerCase()===String(name||"").trim().toLowerCase()){
      return clone(existing);
    }
    return name?{id:"",name:String(name),phone:"",morgue:"",notes:""}:null;
  }

  function collect(){
    if(!byId("meCaseWorkflow"))return normalizeData(currentDonor()?.meCase);
    const old=currentDonor()?.meCase||{};
    const officeName=value("meOffice");
    return normalizeData({
      isCase:value("meIsCase"),
      officeName,
      officeSnapshot:officeSnapshot(officeName,old.officeSnapshot),
      jurisdiction:value("meJurisdiction"),
      clearance:value("meClearance"),
      restrictions:{
        chest:checked("meRestrictChest"),
        skin:checked("meRestrictSkin"),
        other:checked("meRestrictOther"),
        otherText:value("meRestrictionOther")
      },
      specimens:{
        required:value("meSpecimenRequired"),
        urine:checked("meSpecUrine"),
        urineQty:value("meSpecUrineQty"),
        blood:checked("meSpecBlood"),
        tubes:{
          grey:{selected:checked("meTubeGrey"),qty:value("meTubeGreyQty")},
          tiger:{selected:checked("meTubeTiger"),qty:value("meTubeTigerQty")},
          purple:{selected:checked("meTubePurple"),qty:value("meTubePurpleQty")},
          green:{selected:checked("meTubeGreen"),qty:value("meTubeGreenQty")}
        },
        vitreous:checked("meSpecVitreous"),
        heartPathology:value("meHeartPathology"),
        heartSlides:value("meHeartSlides"),
        heartTissueReturned:value("meHeartTissueReturned"),
        photos:checked("meSpecPhotos"),
        serology:checked("meSpecSerology"),
        physicalAssessment:checked("meSpecPhysicalAssessment"),
        tr200:checked("meSpecTR200"),
        drai:checked("meSpecDRAI"),
        cultures:checked("meSpecCultures"),
        other:checked("meSpecOther"),
        otherText:value("meSpecOtherText")
      },
      documentation:{
        investigatorNarrative:checked("meDocIN"),
        commLog:checked("meDocCL")
      },
      stickerComplete:value("meStickerComplete"),
      preAutopsy:{
        pickupConfirmed:value("mePrePickupConfirmed"),
        pickupLocation:value("mePrePickupLocation"),
        documented:value("mePreDocumented"),
        dropoffConfirmed:value("mePreDropoffConfirmed"),
        dropoffDateTime:value("mePreDropoffDateTime")
      },
      postAutopsy:{
        readyConfirmed:value("mePostReadyConfirmed"),
        confirmationContact:value("mePostContact"),
        confirmationDateTime:value("mePostConfirmationDateTime")
      },
      decline:{
        reason:value("meDeclineReason"),
        changePossible:value("meChangePossible")
      }
    });
  }

  function populate(source){
    const data=normalizeData(source);
    setValue("meIsCase",data.isCase);
    setValue("meOffice",data.officeName);
    setValue("meJurisdiction",data.jurisdiction);
    setValue("meClearance",data.clearance);
    setChecked("meRestrictChest",data.restrictions.chest);
    setChecked("meRestrictSkin",data.restrictions.skin);
    setChecked("meRestrictOther",data.restrictions.other);
    setValue("meRestrictionOther",data.restrictions.otherText);
    setValue("meSpecimenRequired",data.specimens.required);
    setChecked("meSpecUrine",data.specimens.urine);
    setValue("meSpecUrineQty",data.specimens.urineQty);
    setChecked("meSpecBlood",data.specimens.blood);
    for(const color of ["Grey","Tiger","Purple","Green"]){
      const key=color.toLowerCase();
      setChecked("meTube"+color,data.specimens.tubes[key].selected);
      setValue("meTube"+color+"Qty",data.specimens.tubes[key].qty);
    }
    setChecked("meSpecVitreous",data.specimens.vitreous);
    setValue("meHeartPathology",data.specimens.heartPathology);
    setValue("meHeartSlides",data.specimens.heartSlides);
    setValue("meHeartTissueReturned",data.specimens.heartTissueReturned);
    setChecked("meSpecPhotos",data.specimens.photos);
    setChecked("meSpecSerology",data.specimens.serology);
    setChecked("meSpecPhysicalAssessment",data.specimens.physicalAssessment);
    setChecked("meSpecTR200",data.specimens.tr200);
    setChecked("meSpecDRAI",data.specimens.drai);
    setChecked("meSpecCultures",data.specimens.cultures);
    setChecked("meSpecOther",data.specimens.other);
    setValue("meSpecOtherText",data.specimens.otherText);
    setChecked("meDocIN",data.documentation.investigatorNarrative);
    setChecked("meDocCL",data.documentation.commLog);
    setValue("meStickerComplete",data.stickerComplete);
    setValue("mePrePickupConfirmed",data.preAutopsy.pickupConfirmed);
    setValue("mePrePickupLocation",data.preAutopsy.pickupLocation);
    setValue("mePreDocumented",data.preAutopsy.documented);
    setValue("mePreDropoffConfirmed",data.preAutopsy.dropoffConfirmed);
    setValue("mePreDropoffDateTime",data.preAutopsy.dropoffDateTime);
    setValue("mePostReadyConfirmed",data.postAutopsy.readyConfirmed);
    setValue("mePostContact",data.postAutopsy.confirmationContact);
    setValue("mePostConfirmationDateTime",data.postAutopsy.confirmationDateTime);
    setValue("meDeclineReason",data.decline.reason);
    setValue("meChangePossible",data.decline.changePossible);
    render(data);
  }

  function yesNoOptions(){
    return '<option value="">Select...</option><option value="yes">Yes</option><option value="no">No</option>';
  }

  function addStyle(){
    if(byId("meCaseWorkflowStyle"))return;
    const style=document.createElement("style");
    style.id="meCaseWorkflowStyle";
    style.textContent=`
      #meCaseWorkflow{margin:12px 0 16px;padding:14px;border:1px solid #bfd2e8;border-radius:14px;background:#f5f9ff}
      #meCaseWorkflow .me-case-title{font-size:16px;font-weight:850;color:#071f3e;margin-bottom:10px}
      #meCaseWorkflow .me-subsection{margin-top:14px;padding-top:12px;border-top:1px solid #d6e1ee}
      #meCaseWorkflow .me-subtitle{font-weight:850;margin-bottom:8px;color:#0b4f9c}
      #meCaseWorkflow .me-contact{padding:10px;border-radius:10px;background:#eaf2fb;margin-top:8px;font-size:13px;white-space:pre-wrap}
      #meCaseWorkflow .me-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #meCaseWorkflow .me-choice-grid .check{margin:0}
      #meCaseWorkflow .me-tube-row{display:grid;grid-template-columns:minmax(150px,1fr) 100px;gap:8px;align-items:center;margin:7px 0}
      #meCaseWorkflow .me-tube-row input[type=number]{width:100%}
      #meCaseWorkflow fieldset{border:0;padding:0;margin:0;min-width:0}
      #meCaseWorkflow .hidden{display:none!important}
      @media(max-width:600px){#meCaseWorkflow .me-choice-grid{grid-template-columns:1fr}#meCaseWorkflow .me-tube-row{grid-template-columns:1fr 92px}}
    `;
    document.head.appendChild(style);
  }

  function ensureUI(){
    if(byId("meCaseWorkflow"))return true;
    const heading=[...document.querySelectorAll("#plannerView .card h2")]
      .find(node=>node.textContent.trim()==="Donor Information / Screening");
    if(!heading)return false;

    addStyle();
    const panel=document.createElement("div");
    panel.id="meCaseWorkflow";
    panel.innerHTML=`
      <div class="me-case-title">Medical Examiner Case</div>
      <div class="row">
        <div class="fg">
          <label for="meIsCase">Is this a Medical Examiner (ME) case?</label>
          <select id="meIsCase"><option value="">Select...</option><option value="yes">Yes</option><option value="no">No</option></select>
        </div>
      </div>

      <div id="meFollowup" class="hidden">
        <div class="row">
          <div class="fg">
            <label for="meOffice">Medical Examiner office</label>
            <input id="meOffice" list="meOfficeList" autocomplete="off" placeholder="Start typing an ME office...">
            <datalist id="meOfficeList"></datalist>
            <div id="meOfficeInfo" class="me-contact hidden"></div>
          </div>
          <div class="fg">
            <label for="meJurisdiction">Jurisdiction status</label>
            <select id="meJurisdiction">
              <option value="">Select...</option>
              <option value="pcp">Jurisdiction declined / PCP signs DC / no autopsy</option>
              <option value="county">County ME signs DC / released to funeral home</option>
              <option value="state">State ME signs DC / sent to autopsy facility</option>
              <option value="missing">Missing or unknown</option>
            </select>
          </div>
        </div>
        <div id="meJurisdictionAlert" class="result warn hidden"></div>

        <div id="meClearanceWrap" class="me-subsection hidden">
          <div class="row">
            <div class="fg">
              <label for="meClearance">Has the ME/C cleared the case for donation?</label>
              <select id="meClearance">
                <option value="">Select...</option>
                <option value="with_restrictions">Yes — with restrictions</option>
                <option value="without_restrictions">Yes — without restrictions</option>
                <option value="declined">No — ME/C declined</option>
                <option value="pending">Pending or unknown</option>
              </select>
            </div>
          </div>
          <div id="meClearanceAlert" class="result warn hidden"></div>
        </div>

        <div id="meRestrictionsWrap" class="me-subsection hidden">
          <div class="me-subtitle">ME/C recovery restrictions</div>
          <div class="me-choice-grid">
            <div class="check"><input id="meRestrictChest" type="checkbox"><label for="meRestrictChest">Stay out of chest</label></div>
            <div class="check"><input id="meRestrictSkin" type="checkbox"><label for="meRestrictSkin">Don't recover skin</label></div>
            <div class="check"><input id="meRestrictOther" type="checkbox"><label for="meRestrictOther">Other restriction</label></div>
          </div>
          <div id="meRestrictionOtherWrap" class="fg hidden" style="margin-top:9px">
            <label for="meRestrictionOther">Other restriction</label>
            <textarea id="meRestrictionOther" placeholder="Describe the ME/C restriction"></textarea>
          </div>
          <div class="small" style="margin-top:8px">Stay out of chest removes Heart, Pericardium, AI, DTA, and Cartilage with Sternum. Don't recover skin removes all skin grafts.</div>
        </div>

        <div id="meSpecimenWrap" class="me-subsection hidden">
          <div class="me-subtitle">ME specimens and documentation</div>
          <div class="row">
            <div class="fg">
              <label for="meSpecimenRequired">Are ME specimens or documentation required?</label>
              <select id="meSpecimenRequired">
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Unknown — contact investigator</option>
              </select>
            </div>
          </div>

          <div id="meSpecimenChecklist" class="hidden">
            <div class="me-choice-grid">
              <div class="check"><input id="meSpecUrine" type="checkbox"><label for="meSpecUrine">Urine — red tube</label></div>
              <div class="check"><input id="meSpecBlood" type="checkbox"><label for="meSpecBlood">Blood</label></div>
              <div class="check"><input id="meSpecVitreous" type="checkbox"><label for="meSpecVitreous">Vitreous</label></div>
              <div class="check"><input id="meSpecPhotos" type="checkbox"><label for="meSpecPhotos">Photos</label></div>
              <div class="check"><input id="meSpecSerology" type="checkbox"><label for="meSpecSerology">Serology results</label></div>
              <div class="check"><input id="meSpecPhysicalAssessment" type="checkbox"><label for="meSpecPhysicalAssessment">Physical Assessment</label></div>
              <div class="check"><input id="meSpecTR200" type="checkbox"><label for="meSpecTR200">TR 200 form</label></div>
              <div class="check"><input id="meSpecDRAI" type="checkbox"><label for="meSpecDRAI">DRAI</label></div>
              <div class="check"><input id="meSpecCultures" type="checkbox"><label for="meSpecCultures">Cultures</label></div>
              <div class="check"><input id="meSpecOther" type="checkbox"><label for="meSpecOther">Other</label></div>
            </div>

            <div id="meUrineQtyWrap" class="fg hidden" style="margin-top:9px;max-width:180px">
              <label for="meSpecUrineQty">Red urine tubes — quantity</label>
              <input id="meSpecUrineQty" type="number" min="1" step="1" inputmode="numeric">
            </div>

            <fieldset id="meBloodWrap" class="me-subsection hidden">
              <div class="me-subtitle">Blood tube colors and quantities</div>
              <div class="me-tube-row"><div class="check"><input id="meTubeGrey" type="checkbox"><label for="meTubeGrey">Grey-top</label></div><input id="meTubeGreyQty" type="number" min="1" step="1" inputmode="numeric" placeholder="Qty"></div>
              <div class="me-tube-row"><div class="check"><input id="meTubeTiger" type="checkbox"><label for="meTubeTiger">Tiger-top</label></div><input id="meTubeTigerQty" type="number" min="1" step="1" inputmode="numeric" placeholder="Qty"></div>
              <div class="me-tube-row"><div class="check"><input id="meTubePurple" type="checkbox"><label for="meTubePurple">Purple-top</label></div><input id="meTubePurpleQty" type="number" min="1" step="1" inputmode="numeric" placeholder="Qty"></div>
              <div class="me-tube-row"><div class="check"><input id="meTubeGreen" type="checkbox"><label for="meTubeGreen">Green-top</label></div><input id="meTubeGreenQty" type="number" min="1" step="1" inputmode="numeric" placeholder="Qty"></div>
            </fieldset>

            <div class="me-subsection">
              <div class="row3">
                <div class="fg"><label for="meHeartPathology">Heart pathology required?</label><select id="meHeartPathology">${yesNoOptions()}</select></div>
                <div class="fg"><label for="meHeartSlides">Heart slides required?</label><select id="meHeartSlides">${yesNoOptions()}</select></div>
                <div class="fg"><label for="meHeartTissueReturned">Heart tissue returned?</label><select id="meHeartTissueReturned">${yesNoOptions()}</select></div>
              </div>
            </div>

            <div id="meSpecOtherWrap" class="fg hidden" style="margin-top:9px">
              <label for="meSpecOtherText">Other specimen or documentation</label>
              <textarea id="meSpecOtherText"></textarea>
            </div>
          </div>

          <div class="me-subsection">
            <div class="me-subtitle">Where is the ME information documented?</div>
            <div class="me-choice-grid">
              <div class="check"><input id="meDocIN" type="checkbox"><label for="meDocIN">Investigator Narrative</label></div>
              <div class="check"><input id="meDocCL" type="checkbox"><label for="meDocCL">Comm Log</label></div>
            </div>
          </div>

          <div class="row" style="margin-top:10px">
            <div class="fg"><label for="meStickerComplete">Has the ME sticker been completed?</label><select id="meStickerComplete">${yesNoOptions()}</select></div>
          </div>
        </div>

        <div id="meLogisticsWrap" class="me-subsection hidden">
          <div class="me-subtitle">Autopsy pickup and return</div>
          <div class="small">This section follows the existing Autopsy / Recovery Status selection above.</div>

          <div id="mePreAutopsyWrap" class="hidden">
            <div class="row">
              <div class="fg"><label for="mePrePickupConfirmed">Pickup location confirmed with investigator?</label><select id="mePrePickupConfirmed">${yesNoOptions()}</select></div>
              <div class="fg"><label for="mePrePickupLocation">Pickup location</label><input id="mePrePickupLocation"></div>
            </div>
            <div class="row">
              <div class="fg"><label for="mePreDocumented">Confirmation documented in Investigator Narrative/Comm Log?</label><select id="mePreDocumented">${yesNoOptions()}</select></div>
              <div class="fg"><label for="mePreDropoffConfirmed">Drop-off time confirmed with SMEO?</label><select id="mePreDropoffConfirmed">${yesNoOptions()}</select></div>
            </div>
            <div class="fg"><label for="mePreDropoffDateTime">Confirmed drop-off date and time</label><input id="mePreDropoffDateTime" type="datetime-local"></div>
          </div>

          <div id="mePostAutopsyWrap" class="hidden">
            <div class="row">
              <div class="fg"><label for="mePostReadyConfirmed">Has SMEO confirmed the decedent is ready for pickup?</label><select id="mePostReadyConfirmed">${yesNoOptions()}</select></div>
              <div class="fg"><label for="mePostContact">Confirmation contact</label><input id="mePostContact"></div>
            </div>
            <div class="fg"><label for="mePostConfirmationDateTime">Confirmation date and time</label><input id="mePostConfirmationDateTime" type="datetime-local"></div>
          </div>
        </div>

        <div id="meDeclineWrap" class="me-subsection hidden">
          <div class="me-subtitle">ME/C declined donation clearance</div>
          <div class="fg"><label for="meDeclineReason">Reason clearance was declined</label><textarea id="meDeclineReason"></textarea></div>
          <div class="fg" style="margin-top:9px"><label for="meChangePossible">Could the clearance status change?</label><select id="meChangePossible">${yesNoOptions()}</select></div>
          <div class="small" style="margin-top:8px">If the status changes, update the clearance answer above. Validation remains blocked while clearance is declined.</div>
        </div>

        <div id="meWorkflowStatus" class="result hidden" style="margin-top:12px"></div>
      </div>`;

    heading.insertAdjacentElement("afterend",panel);
    refreshDirectoryOptions();
    panel.addEventListener("change",handleChange,true);
    panel.addEventListener("input",handleInput,true);
    byId("meOffice")?.addEventListener("focus",refreshDirectoryOptions);
    byId("autopsy")?.addEventListener("change",function(){
      captureCurrent(false);
      render(collect());
      invalidateValidation();
    });
    return true;
  }

  function refreshDirectoryOptions(){
    const list=byId("meOfficeList");
    if(!list)return;
    list.innerHTML=directory()
      .slice()
      .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")))
      .map(item=>`<option value="${escapeHtml(item.name)}"></option>`)
      .join("");
  }

  function renderOffice(data){
    const box=byId("meOfficeInfo");
    if(!box)return;
    const live=directoryMatch(data.officeName);
    const info=live||data.officeSnapshot;
    if(!data.officeName||!info){
      box.classList.add("hidden");
      box.textContent="";
      return;
    }
    const lines=[String(info.name||data.officeName)];
    if(info.phone)lines.push("Phone: "+info.phone);
    if(info.morgue)lines.push("Morgue: "+info.morgue);
    if(info.notes)lines.push("Notes: "+info.notes);
    box.textContent=lines.join("\n");
    box.classList.remove("hidden");
  }

  function render(source){
    const data=normalizeData(source);
    const isME=data.isCase==="yes";
    show("meFollowup",isME);
    if(!isME)return;

    renderOffice(data);
    const jurisdictionKnown=["pcp","county","state"].includes(data.jurisdiction);
    const needsClearance=["county","state"].includes(data.jurisdiction);
    show("meClearanceWrap",needsClearance);

    const jurisdictionAlert=byId("meJurisdictionAlert");
    if(data.jurisdiction==="missing"){
      const phone=(directoryMatch(data.officeName)||data.officeSnapshot)?.phone||"";
      jurisdictionAlert.textContent="ME jurisdiction information is missing. Contact the investigator or office"+(phone?" at "+phone:"")+" before validation.";
      jurisdictionAlert.classList.remove("hidden");
    }else{
      jurisdictionAlert.classList.add("hidden");
      jurisdictionAlert.textContent="";
    }

    const cleared=["with_restrictions","without_restrictions"].includes(data.clearance);
    show("meRestrictionsWrap",needsClearance&&data.clearance==="with_restrictions");
    show("meRestrictionOtherWrap",needsClearance&&data.clearance==="with_restrictions"&&data.restrictions.other);
    show("meSpecimenWrap",needsClearance&&cleared);
    show("meSpecimenChecklist",needsClearance&&cleared&&data.specimens.required==="yes");
    show("meUrineQtyWrap",data.specimens.required==="yes"&&data.specimens.urine);
    show("meBloodWrap",data.specimens.required==="yes"&&data.specimens.blood);
    show("meSpecOtherWrap",data.specimens.required==="yes"&&data.specimens.other);
    show("meDeclineWrap",needsClearance&&data.clearance==="declined");
    show("meLogisticsWrap",needsClearance&&cleared);

    const autopsy=value("autopsy");
    show("mePreAutopsyWrap",needsClearance&&cleared&&autopsy==="before");
    show("mePostAutopsyWrap",needsClearance&&cleared&&autopsy==="after");

    const clearanceAlert=byId("meClearanceAlert");
    if(needsClearance&&data.clearance==="pending"){
      clearanceAlert.textContent="ME clearance is pending. Recovery-plan validation is blocked.";
      clearanceAlert.classList.remove("hidden");
    }else{
      clearanceAlert.classList.add("hidden");
      clearanceAlert.textContent="";
    }

    const status=byId("meWorkflowStatus");
    if(!jurisdictionKnown){
      status.className="result warn";
      status.textContent="ME status: jurisdiction information required.";
    }else if(data.jurisdiction==="pcp"){
      status.className="result good";
      status.textContent="ME status: Cleared without restrictions — MDI contact complete.";
    }else if(data.clearance==="with_restrictions"){
      status.className="result warn";
      status.textContent="ME status: Cleared with restrictions — complete all required ME details before validation.";
    }else if(data.clearance==="without_restrictions"){
      status.className="result good";
      status.textContent="ME status: Cleared without restrictions — complete all required ME details before validation.";
    }else if(data.clearance==="declined"){
      status.className="result bad";
      status.textContent="ME status: ME/C declined — validation blocked.";
    }else if(data.clearance==="pending"){
      status.className="result warn";
      status.textContent="ME status: Clearance pending — validation blocked.";
    }else{
      status.className="result warn";
      status.textContent="ME status: Donation clearance required.";
    }
    status.classList.remove("hidden");
  }

  function positiveInteger(input){
    return /^\d+$/.test(String(input||"").trim())&&Number(input)>0;
  }

  function specimenSelected(data){
    const s=data.specimens;
    return s.urine||s.blood||s.vitreous||s.heartPathology==="yes"||
      s.heartSlides==="yes"||s.heartTissueReturned==="yes"||s.photos||
      s.serology||s.physicalAssessment||s.tr200||s.drai||s.cultures||s.other;
  }

  function validateData(source,autopsyStatus){
    const data=normalizeData(source);
    const errors=[];
    if(!data.isCase){
      errors.push("Answer whether this is a Medical Examiner case.");
      return errors;
    }
    if(data.isCase==="no")return errors;

    if(!data.officeName)errors.push("Select or enter the Medical Examiner office.");
    if(!data.jurisdiction)errors.push("Select the ME jurisdiction status.");
    if(data.jurisdiction==="missing")errors.push("ME jurisdiction information is missing; contact the investigator or office.");
    if(data.jurisdiction==="pcp")return errors;
    if(!["county","state"].includes(data.jurisdiction))return errors;

    if(!data.clearance)errors.push("Record whether the ME/C cleared the case for donation.");
    if(data.clearance==="pending")errors.push("ME/C donation clearance is still pending or unknown.");
    if(data.clearance==="declined"){
      if(!data.decline.reason)errors.push("Enter the reason ME/C clearance was declined.");
      if(!data.decline.changePossible)errors.push("Record whether the ME/C clearance status could change.");
      errors.push("ME/C has not cleared the case for donation.");
      return errors;
    }
    if(!["with_restrictions","without_restrictions"].includes(data.clearance))return errors;

    if(data.clearance==="with_restrictions"){
      if(!data.restrictions.chest&&!data.restrictions.skin&&!data.restrictions.other){
        errors.push("Select at least one ME/C recovery restriction.");
      }
      if(data.restrictions.other&&!data.restrictions.otherText){
        errors.push("Describe the other ME/C recovery restriction.");
      }
    }

    if(!data.specimens.required)errors.push("Record whether ME specimens or documentation are required.");
    if(data.specimens.required==="unknown")errors.push("ME specimen requirements are unknown; contact the investigator.");
    if(data.specimens.required==="yes"){
      if(!specimenSelected(data))errors.push("Select at least one required ME specimen or document.");
      if(data.specimens.urine&&!positiveInteger(data.specimens.urineQty)){
        errors.push("Enter the number of red urine tubes required.");
      }
      if(data.specimens.blood){
        const selected=Object.entries(data.specimens.tubes).filter(([,tube])=>tube.selected);
        if(!selected.length)errors.push("Select at least one required blood tube color.");
        for(const [color,tube] of selected){
          if(!positiveInteger(tube.qty))errors.push("Enter the quantity for "+color+"-top blood tubes.");
        }
      }
      if(!data.specimens.heartPathology)errors.push("Answer whether heart pathology is required.");
      if(!data.specimens.heartSlides)errors.push("Answer whether heart slides are required.");
      if(!data.specimens.heartTissueReturned)errors.push("Answer whether heart tissue is returned.");
      if(data.specimens.other&&!data.specimens.otherText){
        errors.push("Describe the other required ME specimen or document.");
      }
    }

    if(!data.documentation.investigatorNarrative&&!data.documentation.commLog){
      errors.push("Select where the ME information is documented.");
    }
    if(data.stickerComplete!=="yes")errors.push("Complete the ME sticker before validation.");

    if(autopsyStatus==="before"){
      if(data.preAutopsy.pickupConfirmed!=="yes")errors.push("Confirm the pre-autopsy pickup location with the investigator.");
      if(!data.preAutopsy.pickupLocation)errors.push("Enter the pre-autopsy pickup location.");
      if(data.preAutopsy.documented!=="yes")errors.push("Document the pickup confirmation in the Investigator Narrative or Comm Log.");
      if(data.preAutopsy.dropoffConfirmed!=="yes")errors.push("Confirm the drop-off time with SMEO.");
      if(!data.preAutopsy.dropoffDateTime)errors.push("Enter the confirmed SMEO drop-off date and time.");
    }else if(autopsyStatus==="after"){
      if(data.postAutopsy.readyConfirmed!=="yes")errors.push("Confirm with SMEO that the decedent is ready for pickup.");
      if(!data.postAutopsy.confirmationContact)errors.push("Enter the SMEO confirmation contact.");
      if(!data.postAutopsy.confirmationDateTime)errors.push("Enter the SMEO confirmation date and time.");
    }else{
      errors.push("For a cleared County or State ME case, select Recovery Before Autopsy or Recovery After Autopsy.");
    }
    return errors;
  }

  function restrictionReason(graftId,source){
    const data=normalizeData(source);
    if(data.isCase!=="yes"||!["county","state"].includes(data.jurisdiction)||data.clearance!=="with_restrictions")return "";
    if(data.restrictions.chest&&CHEST_GRAFTS.has(graftId))return "ME/C restriction: Stay out of chest.";
    if(data.restrictions.skin&&SKIN_GRAFTS.has(graftId))return "ME/C restriction: Don't recover skin.";
    return "";
  }

  function specimenSupplies(source){
    const data=normalizeData(source);
    if(data.isCase!=="yes"||!["county","state"].includes(data.jurisdiction)||
      !["with_restrictions","without_restrictions"].includes(data.clearance)||
      data.specimens.required!=="yes")return [];
    const rows=[];
    if(data.specimens.urine&&positiveInteger(data.specimens.urineQty)){
      rows.push({c:"ME Specimens",n:"Red Tube (Urine)",q:Number(data.specimens.urineQty),note:"ME specimen requirement"});
    }
    const labels={grey:"Grey-Top Blood Tube",tiger:"Tiger-Top Blood Tube",purple:"Purple-Top Blood Tube",green:"Green-Top Blood Tube"};
    if(data.specimens.blood){
      for(const [color,tube] of Object.entries(data.specimens.tubes)){
        if(tube.selected&&positiveInteger(tube.qty))rows.push({c:"ME Specimens",n:labels[color],q:Number(tube.qty),note:"ME specimen requirement"});
      }
    }
    return rows;
  }

  function jurisdictionLabel(value){
    return {
      pcp:"Jurisdiction declined / PCP signs DC / no autopsy",
      county:"County ME signs DC / released to funeral home",
      state:"State ME signs DC / sent to autopsy facility",
      missing:"Missing or unknown"
    }[value]||"Not recorded";
  }

  function clearanceLabel(data){
    if(data.jurisdiction==="pcp")return "Cleared without restrictions";
    return {
      with_restrictions:"Cleared with restrictions",
      without_restrictions:"Cleared without restrictions",
      declined:"ME/C declined",
      pending:"Pending or unknown"
    }[data.clearance]||"Not recorded";
  }

  function restrictionLabels(data){
    const labels=[];
    if(data.restrictions.chest)labels.push("Stay out of chest");
    if(data.restrictions.skin)labels.push("Don't recover skin");
    if(data.restrictions.other&&data.restrictions.otherText)labels.push(data.restrictions.otherText);
    return labels;
  }

  function specimenLabels(data){
    const s=data.specimens;
    if(s.required==="no")return ["None required"];
    if(s.required!=="yes")return ["Requirements not confirmed"];
    const labels=[];
    if(s.urine)labels.push("Urine: "+s.urineQty+" red tube"+(Number(s.urineQty)===1?"":"s"));
    if(s.blood){
      for(const [color,tube] of Object.entries(s.tubes))if(tube.selected)labels.push(color+"-top blood: "+tube.qty);
    }
    if(s.vitreous)labels.push("Vitreous");
    labels.push("Heart pathology required: "+(s.heartPathology==="yes"?"Yes":"No"));
    labels.push("Heart slides required: "+(s.heartSlides==="yes"?"Yes":"No"));
    labels.push("Heart tissue returned: "+(s.heartTissueReturned==="yes"?"Yes":"No"));
    if(s.photos)labels.push("Photos");
    if(s.serology)labels.push("Serology results");
    if(s.physicalAssessment)labels.push("Physical Assessment");
    if(s.tr200)labels.push("TR 200 form");
    if(s.drai)labels.push("DRAI");
    if(s.cultures)labels.push("Cultures");
    if(s.other&&s.otherText)labels.push(s.otherText);
    return labels;
  }

  function summaryRows(source,autopsyStatus){
    const data=normalizeData(source);
    if(data.isCase==="no")return ["ME Case: No"];
    if(data.isCase!=="yes")return ["ME Case: Not recorded"];
    const rows=[
      "ME Case: Yes",
      "ME Office: "+(data.officeName||"Not recorded"),
      "Jurisdiction: "+jurisdictionLabel(data.jurisdiction),
      "Clearance: "+clearanceLabel(data)
    ];
    const restrictions=restrictionLabels(data);
    if(restrictions.length)rows.push("Restrictions: "+restrictions.join("; "));
    if(["with_restrictions","without_restrictions"].includes(data.clearance)){
      rows.push("ME specimens/documents: "+specimenLabels(data).join("; "));
      const sources=[];
      if(data.documentation.investigatorNarrative)sources.push("Investigator Narrative");
      if(data.documentation.commLog)sources.push("Comm Log");
      rows.push("ME documentation: "+sources.join(" + "));
      rows.push("ME sticker: "+(data.stickerComplete==="yes"?"Complete":"Incomplete"));
      if(autopsyStatus==="before"){
        rows.push("Pre-autopsy pickup: "+data.preAutopsy.pickupLocation);
        rows.push("SMEO drop-off: "+data.preAutopsy.dropoffDateTime);
      }else if(autopsyStatus==="after"){
        rows.push("Post-autopsy pickup confirmed by: "+data.postAutopsy.confirmationContact);
        rows.push("SMEO confirmation: "+data.postAutopsy.confirmationDateTime);
      }
    }
    if(data.clearance==="declined"){
      rows.push("Decline reason: "+data.decline.reason);
      rows.push("Clearance could change: "+(data.decline.changePossible==="yes"?"Yes":"No"));
    }
    return rows;
  }

  function captureCurrent(persist){
    const donor=currentDonor();
    if(!donor||!byId("meCaseWorkflow"))return;
    donor.meCase=collect();
    if(persist){
      try{if(typeof save==="function")save()}catch(err){console.warn("Save ME case",err)}
    }
  }

  function activeData(){
    const donor=currentDonor();
    // During loadDonor(), the previous donor's form values can still be on
    // screen while the new donor is being screened. A new/legacy donor with
    // no ME data must therefore use clean defaults, not the stale form.
    return donor?normalizeData(donor.meCase):collect();
  }

  function invalidateValidation(){
    byId("validationCard")?.classList.add("hidden");
    byId("suppliesCard")?.classList.add("hidden");
    byId("printActions")?.classList.add("hidden");
    try{if(typeof latestSupplyItems!=="undefined")latestSupplyItems=[]}catch{}
  }

  function refreshRecoveryPreservingSelections(){
    const options=byId("recoveryOptions");
    const card=byId("recoveryCard");
    if(!options?.children.length||card?.classList.contains("hidden"))return;
    try{
      if(typeof getRecovery==="function"&&typeof screenDonor==="function"){
        const recovery=getRecovery();
        screenDonor({...recovery,initialized:true});
      }
    }catch(err){console.warn("Refresh ME restrictions",err)}
  }

  function handleChange(event){
    const restrictionChanged=RESTRICTION_INPUTS.has(event.target.id);
    captureCurrent(true);
    render(collect());
    if(restrictionChanged)refreshRecoveryPreservingSelections();
    invalidateValidation();
  }

  let inputTimer=null;
  function handleInput(){
    clearTimeout(inputTimer);
    inputTimer=setTimeout(function(){
      captureCurrent(true);
      render(collect());
      invalidateValidation();
    },180);
  }

  function renderSupplyList(items){
    const host=byId("supplies");
    if(!host)return;
    host.innerHTML=`<div class="supply">${items.map(item=>`<div class="srow">
      <div><strong>${escapeHtml(item.n)}</strong>${item.note?`<div class="small">${escapeHtml(item.note)}</div>`:""}</div>
      <strong>${escapeHtml(item.q)}</strong>
    </div>`).join("")}</div>`;
  }

  function appendSpecimenSupplies(){
    let items;
    try{items=latestSupplyItems}catch{return}
    if(!Array.isArray(items))return;
    const additions=specimenSupplies(activeData());
    if(!additions.length)return;
    for(const item of additions){
      const previous=items.find(row=>String(row.n||"").trim().toLowerCase()===item.n.toLowerCase());
      if(previous&&Number.isFinite(Number(previous.q))){
        previous.q=Number(previous.q)+Number(item.q);
        if(!previous.note)previous.note=item.note;
      }else{
        items.push(item);
      }
    }
    items.sort((a,b)=>String(a.n||"").localeCompare(String(b.n||"")));
    renderSupplyList(items);
  }

  function injectPrintSection(){
    const sheet=byId("printSheet");
    const left=sheet?.querySelector(".print-case-left");
    if(!left)return;
    left.querySelector("[data-me-case-print]")?.remove();
    const section=document.createElement("div");
    section.className="print-section";
    section.dataset.meCasePrint="1";
    const rows=summaryRows(activeData(),value("autopsy"));
    section.innerHTML=`<h3>Medical Examiner Case</h3><div class="print-info">${rows.map(row=>`<div>${escapeHtml(row)}</div>`).join("")}</div>`;
    left.insertBefore(section,left.children[1]||null);
  }

  function installWrappers(){
    if(typeof window.snapshot==="function"&&!window.snapshot.__pdxMeCase){
      const original=window.snapshot;
      const wrapped=function(){captureCurrent(false);return original.apply(this,arguments)};
      wrapped.__pdxMeCase=true;
      window.snapshot=wrapped;
    }

    if(typeof window.loadDonor==="function"&&!window.loadDonor.__pdxMeCase){
      const original=window.loadDonor;
      const wrapped=function(donor){
        const result=original.apply(this,arguments);
        refreshDirectoryOptions();
        populate(donor?.meCase);
        return result;
      };
      wrapped.__pdxMeCase=true;
      window.loadDonor=wrapped;
    }

    if(typeof window.graftRuleReasons==="function"&&!window.graftRuleReasons.__pdxMeCase){
      const original=window.graftRuleReasons;
      const wrapped=function(graft){
        const reasons=original.apply(this,arguments);
        const reason=restrictionReason(graft?.id,activeData());
        if(reason&&!reasons.includes(reason))reasons.push(reason);
        return reasons;
      };
      wrapped.__pdxMeCase=true;
      window.graftRuleReasons=wrapped;
    }

    if(typeof window.buildSupplies==="function"&&!window.buildSupplies.__pdxMeCase){
      const original=window.buildSupplies;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        appendSpecimenSupplies();
        return result;
      };
      wrapped.__pdxMeCase=true;
      window.buildSupplies=wrapped;
    }

    if(typeof window.validateRecovery==="function"&&!window.validateRecovery.__pdxMeCase){
      const original=window.validateRecovery;
      const wrapped=function(){
        captureCurrent(true);
        const result=original.apply(this,arguments);
        const errors=validateData(activeData(),value("autopsy"));
        const box=byId("validation");
        if(errors.length){
          box?.querySelectorAll(".result.good").forEach(node=>node.remove());
          const html=errors.map(message=>`<div class="result bad"><strong>ME VALIDATION:</strong> ${escapeHtml(message)}</div>`).join("");
          if(box)box.innerHTML=html+(box.innerHTML||"");
          byId("validationCard")?.classList.remove("hidden");
          byId("printActions")?.classList.add("hidden");
          byId("suppliesCard")?.classList.add("hidden");
          try{latestSupplyItems=[]}catch{}
        }else if(activeData().isCase==="yes"&&box){
          box.innerHTML='<div class="result good"><strong>✓ ME workflow is complete</strong></div>'+box.innerHTML;
        }
        return result;
      };
      wrapped.__pdxMeCase=true;
      window.validateRecovery=wrapped;
    }
  }

  function installPrintHook(){
    const original=window.printNow;
    if(typeof original!=="function"||!original.__pdxPdfShare||original.__pdxMeCase)return false;
    const wrapped=function(){injectPrintSection();return original.apply(this,arguments)};
    wrapped.__pdxPdfShare=true;
    wrapped.__pdxMeCase=true;
    window.printNow=wrapped;
    return true;
  }

  function install(){
    if(!ensureUI())return false;
    installWrappers();
    const donor=currentDonor();
    populate(donor?.meCase);
    if(!installPrintHook()){
      let attempts=0;
      const timer=setInterval(function(){
        attempts++;
        if(installPrintHook()||attempts>80)clearInterval(timer);
      },200);
    }
    return true;
  }

  window.PDXMECaseWorkflow={
    defaults,
    normalizeData,
    validateData,
    restrictionReason,
    specimenSupplies,
    summaryRows
  };

  let tries=0;
  const timer=setInterval(function(){
    tries++;
    if(install()||tries>80)clearInterval(timer);
  },200);
})();
