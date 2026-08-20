(function(){
  "use strict";

  const root=typeof window!=="undefined"?window:globalThis;
  const KEY="pdx_medical_examiners_v1";
  const DEFAULTS=[
    {name:"Benton County ME",morgue:"No",phone:"541-766-6815",notes:""},
    {name:"Clackamas County ME",morgue:"Yes",phone:"503-655-8380",notes:""},
    {name:"Clark County ME",morgue:"Yes",phone:"564-397-8405",notes:""},
    {name:"Clatsop County ME",morgue:"No",phone:"503-325-8635",notes:""},
    {name:"Columbia County ME",morgue:"No",phone:"503-366-4611",notes:""},
    {name:"Cowlitz County ME",morgue:"Yes",phone:"360-577-3079",notes:""},
    {name:"Crook County ME",morgue:"Yes",phone:"541-447-6263",notes:""},
    {name:"Deschutes County ME",morgue:"",phone:"541-388-9883",notes:""},
    {name:"Douglas County ME",morgue:"",phone:"541-440-4453",notes:""},
    {name:"Jackson County ME",morgue:"",phone:"541-472-7188",notes:""},
    {name:"Josephine County ME",morgue:"",phone:"541-472-7188",notes:""},
    {name:"Klamath County ME",morgue:"",phone:"",notes:""},
    {name:"Lane County ME",morgue:"",phone:"541-682-4363",notes:""},
    {name:"Lincoln County ME",morgue:"No",phone:"541-265-0425",notes:""},
    {name:"Linn County ME",morgue:"",phone:"541-967-3836",notes:""},
    {name:"Marion County ME",morgue:"",phone:"503-588-5530",notes:""},
    {name:"Multnomah County ME",morgue:"Yes",phone:"503-988-0055",notes:""},
    {name:"Polk County ME",morgue:"",phone:"503-932-6140",notes:""},
    {name:"Tillamook Co ME",morgue:"No",phone:"503-842-3410",notes:""},
    {name:"Umatilla County ME",morgue:"",phone:"541-276-5951",notes:""},
    {name:"Union County ME",morgue:"",phone:"541-786-0317",notes:""},
    {name:"Wasco - Sherman County ME",morgue:"No",phone:"",notes:""},
    {name:"Washington County ME",morgue:"",phone:"503-846-3575",notes:""},
    {name:"Yamhill Co ME",morgue:"No",phone:"",notes:""}
  ];

  let view=null;
  let editingId=null;

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,char=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[char]));
  }

  function idFor(name,index){
    const slug=String(name||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
    return "me_seed_"+(slug||index);
  }

  function defaultRecords(){
    return DEFAULTS.map((record,index)=>({id:idFor(record.name,index),...record}));
  }

  function notify(records){
    if(typeof root.dispatchEvent!=="function"||typeof root.CustomEvent!=="function")return;
    root.dispatchEvent(new root.CustomEvent("pdx:me-directory-changed",{
      detail:{records:records.map(record=>({...record}))}
    }));
  }

  // Seed only on the first run. Re-adding every missing default made renames
  // and deletions appear to work briefly, then silently restored the old row.
  function seed(){
    try{
      if(root.localStorage.getItem(KEY)!==null)return;
      root.localStorage.setItem(KEY,JSON.stringify(defaultRecords()));
    }catch{}
  }

  function normalizeRecords(records){
    return (Array.isArray(records)?records:[])
      .filter(record=>record&&typeof record==="object"&&String(record.name||"").trim())
      .map((record,index)=>({
        id:String(record.id||("me_legacy_"+index+"_"+Date.now().toString(36))),
        name:String(record.name||"").trim(),
        phone:String(record.phone||"").trim(),
        morgue:String(record.morgue||"").trim(),
        notes:String(record.notes||"").trim()
      }));
  }

  function load(){
    seed();
    try{
      const raw=root.localStorage.getItem(KEY);
      const parsed=JSON.parse(raw||"[]");
      const records=normalizeRecords(parsed);
      if(JSON.stringify(parsed)!==JSON.stringify(records)){
        root.localStorage.setItem(KEY,JSON.stringify(records));
      }
      return records;
    }catch{
      return defaultRecords();
    }
  }

  function store(records){
    const normalized=normalizeRecords(records);
    try{
      root.localStorage.setItem(KEY,JSON.stringify(normalized));
      notify(normalized);
      return true;
    }catch{
      return false;
    }
  }

  function upsertRecord(records,data,id){
    const output=normalizeRecords(records);
    const record={
      name:String(data?.name||"").trim(),
      phone:String(data?.phone||"").trim(),
      morgue:String(data?.morgue||"").trim(),
      notes:String(data?.notes||"").trim()
    };
    if(id){
      const index=output.findIndex(item=>String(item.id)===String(id));
      if(index>=0)output[index]={...output[index],...record};
    }else{
      output.push({id:"me_"+Date.now().toString(36),...record});
    }
    return output;
  }

  function removeRecord(records,id){
    return normalizeRecords(records).filter(record=>String(record.id)!==String(id));
  }

  function addStyle(){
    if(document.getElementById("meStyle"))return;
    const style=document.createElement("style");
    style.id="meStyle";
    style.textContent=`
      #meView{position:fixed;inset:0;z-index:1800;background:#f2f2f7;overflow:auto;color:#071f3e}
      #meView.hidden{display:none}
      .meHead{position:sticky;top:0;z-index:1;background:#08264b;color:white;padding:18px;display:flex;justify-content:space-between;align-items:center;gap:12px}
      .meHead h1{margin:0;font-size:24px}
      .meWrap{max-width:760px;margin:auto;padding:16px}
      .meCard{background:#fff;border-radius:16px;padding:16px;margin-bottom:14px}
      .meDirectoryIntro{margin:0 0 12px;color:#52606f;font-size:14px}
      .meToolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .meToolbar .meInput{flex:1;min-width:210px}
      .meCount{font-size:13px;color:#687386;white-space:nowrap}
      .meInput,.meText{width:100%;box-sizing:border-box;padding:11px;border:1px solid #cbd5e1;border-radius:10px;font:inherit}
      .meText{min-height:90px;resize:vertical}
      #meNotes{min-height:130px}
      .meField{margin-top:12px}
      .meField label{display:block;font-size:12px;font-weight:800;margin-bottom:5px}
      .meHelp{font-size:12px;color:#687386;margin-top:5px}
      .meForm{display:none;margin-top:14px;padding-top:14px;border-top:1px solid #e5e7eb}
      .meForm.open{display:block}
      .meFormTitle{font-size:17px;font-weight:850;margin-bottom:4px}
      .meGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .meRow{padding:14px 0;border-top:1px solid #e5e7eb}
      .meRow:first-child{border-top:0}
      .meName{font-size:18px;font-weight:850}
      .meMeta{margin-top:5px;font-size:14px;color:#52606f}
      .meNotes{white-space:pre-wrap;background:#f7f9fc;border-radius:9px;padding:9px}
      .meBtn{border:0;border-radius:10px;padding:11px 13px;font-weight:800;cursor:pointer}
      .mePrimary{background:#0b63ce;color:#fff}
      .meGray{background:#747b84;color:#fff}
      .meEdit{background:#eaf2fb;color:#0b4f9c}
      .meDanger{background:#fff0f0;color:#a51f1f}
      .meActions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
      @media(max-width:600px){.meGrid{grid-template-columns:1fr}.meHead h1{font-size:21px}.meActions .meBtn{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function ensure(){
    if(view)return;
    addStyle();
    view=document.createElement("div");
    view.id="meView";
    view.className="hidden";
    view.innerHTML=`
      <div class="meHead"><h1>Medical Examiner Directory</h1><button id="meClose" class="meBtn meGray">CLOSE</button></div>
      <div class="meWrap">
        <div class="meCard">
          <p class="meDirectoryIntro">Add or update office phone numbers, morgue information, and reference notes. Changes are saved on this device.</p>
          <div class="meToolbar"><input id="meSearch" class="meInput" type="search" placeholder="Search offices or notes…"><span id="meCount" class="meCount"></span></div>
        </div>
        <div class="meCard">
          <button id="meAdd" class="meBtn mePrimary">+ ADD ME OFFICE</button>
          <div id="meForm" class="meForm">
            <div id="meFormTitle" class="meFormTitle">Add ME office</div>
            <div class="meGrid">
              <div class="meField"><label for="meName">OFFICE NAME</label><input id="meName" class="meInput" autocomplete="off"></div>
              <div class="meField"><label for="mePhone">PHONE NUMBER</label><input id="mePhone" class="meInput" type="tel"></div>
            </div>
            <div class="meField"><label for="meMorgue">MORGUE INFORMATION (OPTIONAL)</label><textarea id="meMorgue" class="meText"></textarea></div>
            <div class="meField"><label for="meNotes">DIRECTORY NOTES (OPTIONAL)</label><textarea id="meNotes" class="meText" placeholder="Add investigator contacts, hours, procedures, pickup instructions, or other helpful notes."></textarea><div class="meHelp">These notes appear when this ME office is selected on a donor case.</div></div>
            <div class="meActions"><button id="meSave" class="meBtn mePrimary">SAVE ENTRY</button><button id="meCancel" class="meBtn meGray">CANCEL</button></div>
          </div>
        </div>
        <div id="meList" class="meCard"></div>
      </div>`;
    document.body.appendChild(view);
    view.querySelector("#meClose").onclick=()=>{view.classList.add("hidden");closeForm()};
    view.querySelector("#meAdd").onclick=()=>openForm();
    view.querySelector("#meCancel").onclick=closeForm;
    view.querySelector("#meSave").onclick=saveForm;
    view.querySelector("#meSearch").oninput=render;
    view.onclick=event=>{
      const edit=event.target.closest("[data-me-edit]");
      if(edit)openForm(edit.dataset.meEdit);
      const remove=event.target.closest("[data-me-remove]");
      if(remove)removeItem(remove.dataset.meRemove);
    };
  }

  function openView(){
    ensure();
    view.classList.remove("hidden");
    render();
  }

  function openForm(id){
    editingId=id||null;
    const record=id?load().find(item=>String(item.id)===String(id))||{}:{};
    for(const [field,value] of [
      ["meName",record.name],["mePhone",record.phone],
      ["meMorgue",record.morgue],["meNotes",record.notes]
    ]){
      view.querySelector("#"+field).value=value||"";
    }
    view.querySelector("#meFormTitle").textContent=id?"Edit ME office":"Add ME office";
    view.querySelector("#meForm").classList.add("open");
    view.querySelector("#meAdd").style.display="none";
    view.querySelector("#meName").focus();
  }

  function closeForm(){
    if(!view)return;
    editingId=null;
    view.querySelector("#meForm").classList.remove("open");
    view.querySelector("#meAdd").style.display="block";
  }

  function saveForm(){
    const name=view.querySelector("#meName").value.trim();
    if(!name){root.alert("Enter the Medical Examiner office name.");return}
    const records=load();
    const duplicate=records.find(record=>
      String(record.id)!==String(editingId||"")&&
      String(record.name||"").trim().toLowerCase()===name.toLowerCase()
    );
    if(duplicate){root.alert("An ME directory entry with that name already exists.");return}
    const next=upsertRecord(records,{
      name,
      phone:view.querySelector("#mePhone").value,
      morgue:view.querySelector("#meMorgue").value,
      notes:view.querySelector("#meNotes").value
    },editingId);
    if(!store(next)){root.alert("The ME directory entry could not be saved on this device.");return}
    closeForm();
    render();
  }

  function removeItem(id){
    const records=load();
    const record=records.find(item=>String(item.id)===String(id));
    if(!record)return;
    if(typeof root.confirm==="function"&&!root.confirm(`Remove ${record.name} from the ME directory?`))return;
    if(!store(removeRecord(records,id))){
      root.alert("The ME directory entry could not be removed from this device.");
      return;
    }
    render();
  }

  function render(){
    if(!view)return;
    const query=view.querySelector("#meSearch").value.trim().toLowerCase();
    const all=load().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    const records=all.filter(record=>!query||
      [record.name,record.phone,record.morgue,record.notes]
        .some(value=>String(value||"").toLowerCase().includes(query))
    );
    view.querySelector("#meCount").textContent=query?
      `${records.length} of ${all.length} entries`:`${all.length} entries`;
    view.querySelector("#meList").innerHTML=records.length?records.map(record=>`
      <div class="meRow">
        <div class="meName">${escapeHtml(record.name)}</div>
        ${record.phone?`<div class="meMeta"><b>Phone:</b> ${escapeHtml(record.phone)}</div>`:""}
        ${record.morgue?`<div class="meMeta"><b>Morgue:</b> ${escapeHtml(record.morgue)}</div>`:""}
        ${record.notes?`<div class="meMeta meNotes"><b>Notes:</b> ${escapeHtml(record.notes)}</div>`:""}
        <div class="meActions"><button class="meBtn meEdit" data-me-edit="${escapeHtml(record.id)}">EDIT</button><button class="meBtn meDanger" data-me-remove="${escapeHtml(record.id)}">REMOVE</button></div>
      </div>`).join(""):'<div class="meMeta">No matching Medical Examiner offices.</div>';
  }

  function placeInDirectories(){
    const button=document.getElementById("medicalExaminerBtn");
    const host=document.querySelector('[data-menu-section="directories"]');
    if(button&&host&&button.parentElement!==host)host.appendChild(button);
  }

  function install(){
    seed();
    const head=document.querySelector("header .head")||document.querySelector("header");
    if(!head)return false;
    if(document.getElementById("medicalExaminerBtn")){
      placeInDirectories();
      return true;
    }
    const button=document.createElement("button");
    button.id="medicalExaminerBtn";
    button.type="button";
    button.textContent="MEDICAL EXAMINERS";
    button.onclick=openView;
    head.appendChild(button);
    setTimeout(placeInDirectories,300);
    setTimeout(placeInDirectories,1200);
    return true;
  }

  const api={
    key:KEY,
    defaults:defaultRecords,
    load,
    store,
    upsertRecord,
    removeRecord,
    open:openView
  };
  root.PDXMedicalExaminerDirectory=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;

  if(typeof window!=="undefined"&&typeof document!=="undefined"){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(install()||attempts>80)clearInterval(timer);
    },200);
    setInterval(placeInDirectories,1500);
    window.addEventListener("storage",event=>{
      if(event.key===KEY&&view&&!view.classList.contains("hidden"))render();
    });
  }
})();
