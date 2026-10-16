(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.PendingCLA=api;if(typeof document!=='undefined')api.install();}
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const organNames=['Heart','Lungs','Liver','Kidneys','Pancreas'];
  const defaults=()=>({enabled:false,authorizationAcceptable:false,seros:'pending',drai:'pending',donationType:'unknown',meRelease:'pending',organs:[],orStatus:'pending',orDate:'',orTime:'',orOther:''});
  function normalize(raw){
    const c={...defaults(),...(raw&&typeof raw==='object'?raw:{})};
    c.enabled=c.enabled===true;c.authorizationAcceptable=c.authorizationAcceptable===true;
    for(const key of ['seros','drai'])if(!['pending','acceptable'].includes(c[key]))c[key]='pending';
    if(!['unknown','dcd','brain_dead'].includes(c.donationType))c.donationType='unknown';
    if(!['pending','released'].includes(c.meRelease))c.meRelease='pending';
    if(!['pending','scheduled','other'].includes(c.orStatus))c.orStatus='pending';
    c.organs=organNames.filter(n=>Array.isArray(c.organs)&&c.organs.includes(n.toLowerCase()));
    c.organs=c.organs.map(n=>n.toLowerCase());
    for(const key of ['orDate','orTime','orOther'])c[key]=String(c[key]||'');
    return c;
  }
  function isPending(d){return !!(d?.status==='pending'&&d.cla?.enabled);}
  function validDeath(date,time){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))||!/^([01]\d|2[0-3])[0-5]\d$/.test(String(time||'')))return false;
    const [y,m,day]=date.split('-').map(Number),d=new Date(y,m-1,day);
    return d.getFullYear()===y&&d.getMonth()===m-1&&d.getDate()===day;
  }
  function canTransition(d,next,date=d?.deathDate,time=d?.tod){
    return !d?.cla?.enabled||!['active','planning','in_progress'].includes(next)||validDeath(date,time);
  }
  function orText(d){
    const c=normalize(d?.cla);
    if(c.orStatus==='other')return c.orOther.trim()||'Estimate not entered';
    if(c.orStatus==='scheduled'){
      const date=/^\d{4}-\d{2}-\d{2}$/.test(c.orDate)?c.orDate.split('-').slice(1).concat(c.orDate.slice(0,4)).join('/'):'Date pending';
      return date+' · '+(c.orTime||'Time pending');
    }
    return 'Pending';
  }
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function cardHtml(d){
    const c=normalize(d?.cla),kind={unknown:'Unknown',dcd:'DCD',brain_dead:'Brain Dead'}[c.donationType];
    return `<div class="priority-time priority-cla-time"><div class="priority-time-label">PENDING CLA</div><div class="priority-time-value">TOD pending</div><div class="priority-start-secondary">${esc(kind)} · OR: ${esc(orText(d))}</div></div>`;
  }
  let installed=false,loadedId=null,enteringTod=false;
  const byId=id=>document.getElementById(id);
  function current(){try{return typeof cur==='function'?cur():null}catch{return null}}
  function persist(){if(typeof save==='function')save();}
  const controlIds=['claEnabled','claAuthorization','claSeros','claDrai','claDonationType','claMERelease','claOrStatus','claOrDate','claOrTime','claOrOther'];
  function capture(d){
    if(!installed||!d||loadedId!==d.id)return;
    d.cla=normalize({...d.cla,enabled:byId('claEnabled').checked,authorizationAcceptable:byId('claAuthorization').checked,
      seros:byId('claSeros').value,drai:byId('claDrai').value,donationType:byId('claDonationType').value,
      meRelease:byId('claMERelease').value,orStatus:byId('claOrStatus').value,orDate:byId('claOrDate').value,
      orTime:byId('claOrTime').value,orOther:byId('claOrOther').value,
      organs:organNames.filter(n=>byId('claOrgan'+n).checked).map(n=>n.toLowerCase())});
  }
  function load(d){
    if(!installed)return;
    loadedId=d?.id||null;enteringTod=false;
    const c=normalize(d?.cla);
    byId('claEnabled').checked=c.enabled;byId('claAuthorization').checked=c.authorizationAcceptable;
    for(const [id,key] of [['claSeros','seros'],['claDrai','drai'],['claDonationType','donationType'],['claMERelease','meRelease'],['claOrStatus','orStatus'],['claOrDate','orDate'],['claOrTime','orTime'],['claOrOther','orOther']])byId(id).value=c[key];
    for(const n of organNames)byId('claOrgan'+n).checked=c.organs.includes(n.toLowerCase());
    byId('claActivationError').textContent='';render();
  }
  function render(){
    if(!installed)return;
    const d=current();if((d?.id||null)!==loadedId){load(d);return;}
    const enabled=byId('claEnabled').checked,pending=enabled&&byId('status').value==='pending';
    byId('claFollowup').hidden=!enabled;
    byId('claTodPending').hidden=!pending;
    byId('claActualEntry').hidden=!pending||!enteringTod;
    byId('claEnterTod').hidden=enteringTod;
    byId('deathDate').disabled=pending&&!enteringTod;
    byId('tod').hidden=pending&&!enteringTod;byId('tod').disabled=pending&&!enteringTod;
    const label=byId('tod').closest('.fg')?.querySelector('label');if(label)label.hidden=pending&&!enteringTod;
    const timing=byId('timingCard').querySelector('.timing');if(timing)timing.hidden=pending||byId('status').value==='complete';
    byId('claOrScheduled').hidden=byId('claOrStatus').value!=='scheduled';
    byId('claOrOtherWrap').hidden=byId('claOrStatus').value!=='other';
    if(!pending)byId('claActivationError').textContent='';
    if(enabled)byId('timingCard').classList.remove('hidden');
  }
  function beginTodEntry(){
    enteringTod=true;render();
    byId('claActivationError').textContent='Enter the actual date of death and TOD before making this case active.';
    byId('timingCard').scrollIntoView?.({block:'start',behavior:'smooth'});
    (byId('deathDate').value?byId('tod'):byId('deathDate')).focus();
  }
  function requestActivation(d,next='active'){
    if(canTransition(d,next))return true;
    if(current()?.id!==d.id||byId('plannerView').classList.contains('hidden')){
      if(typeof openDonor==='function')openDonor(d.id);
    }
    beginTodEntry();return false;
  }
  function activate(){
    const d=current();if(!d)return;
    if(!validDeath(byId('deathDate').value,byId('tod').value)){beginTodEntry();return;}
    d.deathDate=byId('deathDate').value;d.tod=byId('tod').value;capture(d);
    byId('claActivationError').textContent='';
    byId('status').value='active';byId('status').dispatchEvent(new Event('change',{bubbles:true}));
  }
  function install(){
    if(installed)return;
    if(!byId('deathDate')||!byId('timingCard')){document.addEventListener('DOMContentLoaded',install,{once:true});return;}
    const check=document.createElement('label');check.className='check cla-toggle';
    check.innerHTML='<input id="claEnabled" type="checkbox"> CLA case';byId('deathDate').after(check);
    const waiting=document.createElement('div');waiting.id='claTodPending';waiting.hidden=true;
    waiting.innerHTML='<div class="cla-waiting"><strong>CLA — TOD pending</strong><div class="small">Recovery timing starts after the actual date and TOD are entered and this case is made active.</div></div><button id="claEnterTod" class="btn gray" type="button">ENTER ACTUAL DATE / TOD</button>';
    byId('tod').after(waiting);
    const panel=document.createElement('section');panel.id='claFollowup';panel.hidden=true;
    panel.innerHTML=`<h3>CLA follow-up</h3><div class="row"><div class="fg"><label class="check"><input id="claAuthorization" type="checkbox"> Authorization acceptable</label></div><div class="fg"><label for="claSeros">Seros</label><select id="claSeros"><option value="pending">Pending</option><option value="acceptable">Acceptable</option></select></div></div>
      <div class="row"><div class="fg"><label for="claDrai">DRAI</label><select id="claDrai"><option value="pending">Pending</option><option value="acceptable">Acceptable</option></select></div><div class="fg"><label for="claDonationType">Donation type</label><select id="claDonationType"><option value="unknown">Unknown</option><option value="dcd">DCD</option><option value="brain_dead">Brain Dead</option></select></div></div>
      <div class="fg"><label for="claMERelease">ME release for donation</label><select id="claMERelease"><option value="pending">Pending</option><option value="released">Released</option></select></div>
      <fieldset class="cla-organs"><legend>Organs being placed</legend><div>${organNames.map(n=>`<label class="check"><input id="claOrgan${n}" type="checkbox"> ${n}</label>`).join('')}</div></fieldset>
      <div class="fg"><label for="claOrStatus">OR timing</label><select id="claOrStatus"><option value="pending">Pending</option><option value="scheduled">Scheduled date and time</option><option value="other">Other / estimated</option></select></div>
      <div id="claOrScheduled" class="row" hidden><div class="fg"><label for="claOrDate">OR date</label><input id="claOrDate" type="date"></div><div class="fg"><label for="claOrTime">OR time — military</label><input id="claOrTime" type="text" inputmode="numeric" maxlength="4" placeholder="HHMM" pattern="([01][0-9]|2[0-3])[0-5][0-9]"></div></div>
      <div id="claOrOtherWrap" class="fg" hidden><label for="claOrOther">Other / estimated date or time</label><textarea id="claOrOther" rows="2" maxlength="1000" placeholder="e.g. Tomorrow afternoon; estimated 1800"></textarea></div>
      <div id="claActualEntry" hidden><p class="small">Actual date of death and TOD can now be entered above.</p><button id="claActivate" class="btn" type="button">MAKE ACTIVE WITH ACTUAL TOD</button></div><div id="claActivationError" role="alert"></div>`;
    const timing=byId('timingCard').querySelector('.timing');timing.before(panel);
    const style=document.createElement('style');style.textContent='.cla-toggle{margin-top:8px;min-height:44px}.cla-waiting{background:#f7efff;border-left:4px solid #7b4ab8;padding:12px;border-radius:8px;margin:4px 0 10px}#claFollowup{border-top:1px solid var(--bd);margin-top:16px;padding-top:12px}#claFollowup h3{margin:0 0 14px}.cla-organs{border:0;padding:0;margin:12px 0}.cla-organs legend{font-size:14px;font-weight:750;margin-bottom:8px}.cla-organs>div{display:flex;flex-wrap:wrap;gap:6px 22px}.cla-organs .check{min-height:44px}#claActivationError{color:#a52b2b;margin-top:10px}.priority-cla-time{background:#f7efff;border-color:#d7c4e8}#claFollowup[hidden],#claOrScheduled[hidden],#claOrOtherWrap[hidden],#claActualEntry[hidden],#claTodPending[hidden],#claEnterTod[hidden],#tod[hidden]{display:none!important}';document.head.appendChild(style);
    installed=true;load(current());
    const ids=controlIds.concat(organNames.map(n=>'claOrgan'+n));
    for(const id of ids)byId(id).addEventListener('change',()=>{capture(current());render();persist();if(typeof updateTiming==='function')updateTiming();});
    for(const id of ['claOrTime','claOrOther'])byId(id).addEventListener('input',()=>{if(id==='claOrTime')byId(id).value=byId(id).value.replace(/\D/g,'').slice(0,4);capture(current());persist();});
    byId('claEnterTod').onclick=beginTodEntry;byId('claActivate').onclick=activate;
    // Run before base form autosave and the simplified status handler.
    document.addEventListener('change',event=>{
      if(event.target.id!=='status')return;
      const d=current();if(!d)return;
      if(!canTransition(d,event.target.value,byId('deathDate').value,byId('tod').value)){
        event.stopImmediatePropagation();event.preventDefault();event.target.value=d.status;beginTodEntry();
      }
    },true);
  }
  return {defaults,normalize,isPending,validDeath,canTransition,orText,cardHtml,capture,load,render,requestActivation,install};
});
