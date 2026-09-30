(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function rule(w,h){const bmi=w>0&&h>0?w*703/(h*h):NaN;return {bmi,deferred:w>400,required:w<=400&&bmi>=55-1e-12,consult:w>=350&&w<=400&&bmi<55-1e-12};}
  function personnel(d=cur()){return d?.additionalPersonnel||[];}
  function info(p){return p.initials?techGloveInfo(p.initials):{surgical:p.surgicalGlove||'Not recorded',under:p.underGlove||'Not recorded',safety:p.safetyGlove||'Not recorded',note:p.name};}
  function label(p){const person=p.initials?staffByInitials(p.initials):null;return `${p.role==='tech'?'Tech':'Circulator'}: ${person?.name||p.name||p.initials||'Select staff'}${p.homeBranch?' ('+p.homeBranch+')':''}${p.training?' — Training':''}`;}
  function teamLabels(d){return personnel(d).map(label);}
  function sync(){
    const d=cur();if(!d)return;
    d.additionalPersonnel=personnel(d);const r=rule(lbs(),ins());
    if(r.required&&!d.thirdTechAutoCreated){if(!d.additionalPersonnel.some(p=>p.automatic))d.additionalPersonnel.push({id:'bmi-third-tech',role:'tech',initials:'',automatic:true});d.thirdTechAutoCreated=true;}
    const slot=personnel(d).find(p=>p.automatic);
    if(r.required&&slot&&!slot.initials&&!slot.manual){
      const now=new Date(),team=now.getHours()>=6&&now.getHours()<18?'24 Front':'24 Back';
      const first=window.StaffingScheduleParser?.caseTeamAssignment(window.StaffingSchedule?.getActive(),team,now)?.selected.tech1;
      if(first&&staffByInitials(first.initials)&&![tech1.value,tech2.value,circulator.value,...personnel(d).filter(p=>p!==slot).map(p=>p.initials)].includes(first.initials))slot.initials=first.initials;
    }
    if(!r.required)d.thirdTechAutoCreated=false;
    return r;
  }
  function render(){
    const host=$('additionalPersonnel');if(!host)return;const r=sync();
    $('staffingWeightAlert').innerHTML=r?.deferred?'<div class="result bad"><strong>Deferral: donor weight exceeds 400 lb.</strong></div>':r?.required?'<div class="result warn"><strong>3rd tech required: donor BMI is 55 or greater.</strong> Defaults to Tech 1 from 24 for the current shift. An additional tech must stay for the entire case. If unavailable, defer the case.</div>':r?.consult?'<div class="result warn">Large donor (350–400 lb): consider admin consult about adding a 3rd tech. This alert does not prevent processing.</div>':'';
    host.innerHTML=personnel().map(p=>{
      const staff=staffDirectory.filter(x=>p.role==='tech'?x.canTech:x.canCirculate);
      return `<fieldset data-person="${html(p.id)}" style="border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:12px 0"><legend>${p.automatic?'3rd Tech — BMI 55+':'Additional person'}</legend><div class="row3"><div class="fg"><label>Role</label><select data-field="role"><option value="tech" ${p.role==='tech'?'selected':''}>Tech</option><option value="circulator" ${p.role==='circulator'?'selected':''}>Circulator</option></select></div><div class="fg"><label>Person</label><select data-field="initials"><option value="">Other / Visiting Staff</option>${staff.map(x=>`<option value="${html(x.initials)}" ${p.initials===x.initials?'selected':''}>${html(x.name)} (${html(x.initials)})</option>`).join('')}</select></div><div class="fg"><label><input type="checkbox" data-field="training" ${p.training?'checked':''}> Training</label></div></div>${!p.initials?`<div class="row3"><div class="fg"><label>Name (required)</label><input data-field="name" value="${html(p.name)}"></div><div class="fg"><label>Home branch (optional)</label><input data-field="homeBranch" value="${html(p.homeBranch)}"></div><div class="fg"><label>Surgical glove size (required)</label><input data-field="surgicalGlove" value="${html(p.surgicalGlove)}" placeholder="e.g. 7.5"></div></div><div class="row"><div class="fg"><label>Under glove size (optional)</label><input data-field="underGlove" value="${html(p.underGlove)}"></div><div class="fg"><label>Safety glove size (optional)</label><input data-field="safetyGlove" value="${html(p.safetyGlove)}"></div></div>`:`<p class="small">Gloves: ${html(info(p).surgical)} · Under: ${html(info(p).under)} · Safety: ${html(info(p).safety)}</p>`}<button type="button" data-remove="${html(p.id)}">Remove person</button></fieldset>`;
    }).join('');
  }
  function errors(){
    sync();const r=rule(lbs(),ins()),out=[];if(r.deferred)out.push('Deferral: donor weight exceeds 400 lb.');
    if(r.required&&!personnel().some(p=>p.role==='tech'&&(p.initials||p.name?.trim())))out.push('BMI ≥55 requires an assigned 3rd tech. If unavailable, defer the case.');
    const seen=new Set([tech1.value,tech2.value,circulator.value].filter(Boolean));
    for(const p of personnel()){
      if(p.initials){if(seen.has(p.initials))out.push('Each person may only be assigned once: '+p.initials);seen.add(p.initials);}
      else if(!p.name?.trim()||!p.surgicalGlove?.trim())out.push('Visiting staff require a name and surgical glove size.');
      if(info(p).surgical==='Not recorded')out.push('Record a surgical glove size for '+label(p)+'.');
    }return out;
  }
  window.CasePersonnel={rule,personnel,info,label,teamLabels,sync,render,errors};
  const card=$('tech2')?.closest('.card');if(!card)return;
  const section=document.createElement('div');section.innerHTML='<div id="staffingWeightAlert" role="status"></div><div id="additionalPersonnel"></div><button type="button" id="addCasePerson">+ Add Person</button>';card.append(section);
  $('addCasePerson').onclick=()=>{const d=cur();if(!d)return;d.additionalPersonnel=personnel(d);d.additionalPersonnel.push({id:'extra-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),role:'tech',initials:''});render();invalidate();snapshot();};
  section.addEventListener('change',e=>{const key=e.target.dataset.field,fieldset=e.target.closest('[data-person]');if(!key||!fieldset)return;const p=personnel().find(x=>x.id===fieldset.dataset.person);if(!p)return;p[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;p.manual=true;if(key==='role')p.initials='';render();invalidate();snapshot();});
  section.addEventListener('click',e=>{const id=e.target.dataset.remove;if(!id)return;const d=cur();d.additionalPersonnel=personnel(d).filter(p=>p.id!==id);render();invalidate();snapshot();});
  function invalidate(){for(const id of ['validationCard','suppliesCard','printActions'])$(id)?.classList.add('hidden');}
  for(const id of ['weight','height','tech1','tech2','circulator'])$(id)?.addEventListener('change',()=>{render();invalidate();snapshot();});
  for(const id of ['weight','height'])$(id)?.addEventListener('input',()=>{render();invalidate();});
  setInterval(()=>{const p=personnel().find(p=>p.automatic&&!p.initials&&!p.manual);if(p&&rule(lbs(),ins()).required){sync();if(p.initials){render();snapshot();}}},2000);
  render();
})();
