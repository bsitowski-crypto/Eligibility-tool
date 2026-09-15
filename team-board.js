(function(){
  'use strict';
  const M=window.TeamBoardModel;if(!M)return;
  const COLLECTION='teamBoardItems';
  const ADMIN_EMAIL='bsitowski@gmail.com';
  let host,dialog,form,db,auth,user=null,approved=false,online=false,items=[],filter='open',editing=null,busy=false,epoch=0,stopItems=null,stopApproval=null;
  const $=id=>document.getElementById(id);
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function action(label,fn){const b=el('button',label);b.type='button';b.addEventListener('click',fn);return b;}
  function message(text){$('tb-status').textContent=text;}
  function canWrite(){return approved&&online&&!busy&&user&&navigator.onLine;}
  function controls(){
    host.querySelectorAll('button[data-write]').forEach(b=>b.disabled=!canWrite());
    $('tb-save').disabled=!canWrite();$('tb-close').disabled=busy;
  }
  function formatDate(date,clock){if(!date)return 'No due date';const [y,m,d]=date.split('-');return `${m}/${d}/${y}${clock?' · '+clock:''}`;}
  function render(){
    const list=$('tb-list');list.replaceChildren();controls();if(!approved)return;
    const current=M.today();let shown=items.filter(i=>filter==='trash'?i.deleted:!i.deleted&&(filter==='all'||filter===i.type||(filter==='open'&&!['Completed','Past','Series ended'].includes(M.status(i,current)))));
    shown.sort((a,b)=>(M.due(a,current)||'9999').localeCompare(M.due(b,current)||'9999')||a.title.localeCompare(b.title));
    if(!shown.length)list.append(el('p',filter==='trash'?'Trash is empty.':'No items here yet. Add a note, event, or task.','tb-muted'));
    for(const item of shown){
      const card=el('article',undefined,'tb-item'),content=el('div'),head=el('div',undefined,'tb-row');
      const kind=el('span',item.type==='note'?'NOTE':item.type==='event'?'EVENT':'TASK','tb-kind');head.append(kind,el('h3',item.title));content.append(head);
      if(item.body)content.append(el('p',item.body,'tb-detail'));
      const state=M.status(item,current),due=M.due(item,current);
      if(item.type!=='note')content.append(el('p',`${state} · ${formatDate(due,item.time)} · ${M.repeatLabel(item)}`,state==='Overdue'?'tb-overdue':'tb-muted'));
      if(item.lastCompletedDate)content.append(el('p',`Last checked off: ${formatDate(item.lastCompletedDate,item.time)}${item.unit!=='none'&&!item.completed?' · Next occurrence shown above':''}`,'tb-muted'));
      const buttons=el('div',undefined,'tb-actions');
      function add(label,fn){const b=action(label,fn);b.dataset.write='';b.disabled=!canWrite();buttons.append(b);}
      if(item.deleted)add('Restore',()=>mutate(item,{deleted:false},'Item restored.'));
      else{
        if(item.type==='task'&&!item.completed)add('✓ Complete',()=>finishTask(item));
        if(item.type==='task'&&item.lastCompletedDate)add('Undo last check-off',()=>{
          if(confirm('Undo the most recent check-off for this task?'))mutate(item,M.reopen(item),'Last check-off undone.');
        });
        add(item.unit==='none'?'Edit':'Edit series',()=>openEditor(item));
        add(item.unit==='none'?'Delete':'Delete series',()=>{
          if(confirm(`Move “${item.title}”${item.unit==='none'?'':' and its repeating schedule'} to Trash? Anyone on the team can restore it.`))mutate(item,{deleted:true},'Moved to Trash.');
        });
      }
      card.append(content,buttons);list.append(card);
    }
  }
  function errorText(error){
    if(error.code==='permission-denied')return 'Team board permission was denied. Nothing was saved. Ask an administrator to check its shared-data permissions.';
    if(error.code==='unavailable')return 'The team board is offline. Nothing was saved; reconnect and try again.';
    return error.message||'Could not save. Please try again.';
  }
  async function mutate(item,patch,success){
    if(!canWrite())return;busy=true;controls();const uid=user.uid,token=epoch;
    try{
      const ref=db.collection(COLLECTION).doc(item.id);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);
        if(token!==epoch||!approved)throw Error('Your access changed. Please sign in again.');
        if(!snap.exists||snap.data().revision!==item.revision)throw Error('Someone changed this item. Review the latest version and try again.');
        tx.update(ref,{...patch,revision:item.revision+1,updatedBy:uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      if(token===epoch){message(success);return true;}
    }catch(error){if(token===epoch){message(errorText(error));if(dialog.open)$('tb-error').textContent=errorText(error);}}
    finally{busy=false;controls();}
    return false;
  }
  async function finishTask(item){
    const due=M.due(item);
    if(!confirm(`Complete “${item.title}”${due?' for '+formatDate(due,item.time):''}?${item.unit!=='none'?' Only this occurrence will be checked off.':''}`))return;
    await mutate(item,{...M.complete(item),lastCompletedDate:due||M.today().date,lastCompletedBy:user.uid,lastCompletedAt:firebase.firestore.FieldValue.serverTimestamp()},'Task occurrence completed.');
  }
  function field(name){return form.elements.namedItem(name);}
  function scheduleControls(){
    const note=field('type').value==='note',repeat=field('unit').value!=='none';
    $('tb-schedule').hidden=note;$('tb-repeat-details').hidden=!repeat;
    field('date').required=field('type').value==='event'||repeat;
    // Once tasks have been checked off, preserve their schedule identity/history.
    const locked=!!editing?.lastCompletedDate;
    field('type').disabled=locked;
    for(const name of ['date','time','unit'])field(name).disabled=locked||note;
    for(const name of ['every','until'])field(name).disabled=locked||note||!repeat;
    $('tb-edit-help').textContent=locked?'This task has completion history. You can edit its title and details. Create a new task to change the repeating schedule.':editing?.unit!=='none'&&editing?'Edits apply to the whole series.':'';
  }
  function openEditor(item=null,type='note'){
    if(!canWrite())return;editing=item?{...item}:null;form.reset();$('tb-error').textContent='';
    const values=item||{type,title:'',body:'',date:'',time:'',unit:'none',every:1,until:''};
    for(const name of ['type','title','body','date','time','unit','every','until'])field(name).value=values[name];
    $('tb-dialog-title').textContent=item?'Edit team item':'Add team item';scheduleControls();dialog.showModal();field('title').focus();
  }
  async function submit(event){
    event.preventDefault();if(!canWrite())return;$('tb-error').textContent='';
    const value=name=>field(name).value;
    const note=value('type')==='note',unit=note?'none':value('unit');
    const data={type:value('type'),title:value('title').trim(),body:value('body').trim(),date:note?'':value('date'),time:note?'':value('time').trim().replace(':',''),unit,every:unit==='none'?1:Number(value('every')),until:unit==='none'?'':value('until')};
    try{M.validate(data);}catch(error){$('tb-error').textContent=error.message;return;}
    if(editing){if(await mutate(editing,data,'Item updated.'))dialog.close();return;}
    const token=epoch,uid=user.uid;busy=true;controls();
    try{
      // A transaction requires connectivity and never leaves an invisible offline write queued.
      const ref=db.collection(COLLECTION).doc();
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(snap.exists)throw Error('Please try saving again.');
        if(token!==epoch||!approved)throw Error('Your access changed. Please sign in again.');
        const stamp=firebase.firestore.FieldValue.serverTimestamp();
        tx.set(ref,{...data,branchId:'pdx',index:0,completed:false,deleted:false,revision:1,createdBy:uid,createdAt:stamp,updatedBy:uid,updatedAt:stamp,lastCompletedDate:'',lastCompletedBy:'',lastCompletedAt:null});
      });
      if(token===epoch){dialog.close();message('Item saved and shared with the team.');}
    }catch(error){if(token===epoch)$('tb-error').textContent=errorText(error);}
    finally{busy=false;controls();}
  }
  function revoke(text){
    approved=false;online=false;items=[];stopItems?.();stopItems=null;
    if(dialog.open)dialog.close();form.reset();editing=null;render();message(text);
  }
  function connect(){
    if(!window.firebase?.apps?.length||!firebase.firestore||!firebase.auth){setTimeout(connect,500);return;}
    db=firebase.firestore();auth=firebase.auth();
    auth.onAuthStateChanged(next=>{
      const token=++epoch;stopApproval?.();stopApproval=null;revoke('Sign in with an approved planner account to use the team board.');user=next;if(!next)return;
      message('Checking team board access…');
      stopApproval=db.collection('approvedUsers').doc(next.uid).onSnapshot({includeMetadataChanges:true},snapshot=>{
        if(token!==epoch)return;
        const data=snapshot.data(),isAdmin=String(next.email||'').toLowerCase()===ADMIN_EMAIL;
        if(!isAdmin&&(!snapshot.exists||data.approved!==true||data.mustResetPassword===true)){revoke('An approved account with a completed password change is required.');return;}
        // Do not use a cached approval as authority after a reload/sign-in.
        if(!isAdmin&&snapshot.metadata.fromCache&&!approved){message('Connect to the internet to verify team board access.');return;}
        approved=true;
        if(!stopItems)stopItems=db.collection(COLLECTION).where('branchId','==','pdx').onSnapshot({includeMetadataChanges:true},result=>{
          if(token!==epoch||!approved)return;online=!result.metadata.fromCache;
          items=[];let invalid=0;result.forEach(doc=>{const data=doc.data();try{M.validate(data);items.push({...data,id:doc.id});}catch{invalid++;}});
          render();message(invalid?`${invalid} item(s) could not be read. Ask an administrator to check them.`:online?'Shared with approved planner users · Pacific time':'Offline view · reconnect to make changes.');
        },error=>{if(token===epoch)revoke(errorText(error));});
      },error=>{if(token===epoch)revoke(errorText(error));});
    });
  }
  function install(){
    const home=$('homeView');if(!home)return;
    const style=el('style');style.textContent=`
#teamBoard{margin-top:20px;padding:20px;background:#fff;border:1px solid #d6dfe9;border-radius:14px;color:#183153;text-align:left}#teamBoard * ,#teamBoardEditor *{box-sizing:border-box}#teamBoard [hidden],#teamBoardEditor [hidden]{display:none!important}
#teamBoard h2{margin:0;font-size:22px}#teamBoard h3{margin:0;font-size:16px;overflow-wrap:anywhere}#teamBoard .tb-head,#teamBoard .tb-toolbar,#teamBoard .tb-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}#teamBoard .tb-head{justify-content:space-between}#teamBoard .tb-toolbar{margin:14px 0}#teamBoard button,#teamBoardEditor button{min-height:40px;border:1px solid #bccbda;border-radius:8px;padding:8px 12px;background:#edf3fa;color:#183153;font:inherit;font-size:14px;font-weight:650;cursor:pointer}#teamBoard button:disabled,#teamBoardEditor button:disabled{opacity:.5;cursor:not-allowed}#teamBoard button:focus-visible,#teamBoardEditor :focus-visible{outline:3px solid #428bc5;outline-offset:2px}
#teamBoard .tb-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:16px 0;border-top:1px solid #e0e6ee}#teamBoard .tb-kind{padding:4px 7px;background:#eaf0f8;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:.06em}#teamBoard .tb-actions{display:flex;align-items:start;gap:6px;flex-wrap:wrap}#teamBoard .tb-muted,#teamBoardEditor .tb-muted{color:#596b7f;font-size:13px;line-height:1.5;margin:6px 0}#teamBoard .tb-detail{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0;font-size:14px;line-height:1.5}#teamBoard .tb-overdue{color:#a32b3e;font-size:13px;font-weight:700;margin:6px 0}#teamBoard select{width:auto;padding:8px;border-radius:7px;font:inherit;min-height:40px}
#teamBoardEditor{width:min(600px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:22px;background:white;color:#183153;border:0;border-radius:14px;text-align:left;font-family:inherit}#teamBoardEditor::backdrop{background:#071f3ebb}#teamBoardEditor h2{margin:0 0 16px;font-size:22px}#teamBoardEditor label{display:block;font-size:14px;font-weight:650;margin:12px 0}#teamBoardEditor input,#teamBoardEditor select,#teamBoardEditor textarea{display:block;width:100%;margin-top:6px;padding:10px;min-height:44px;border:1px solid #a9bacd;border-radius:7px;font:inherit;color:#183153;background:#fff}#teamBoardEditor textarea{resize:vertical}#teamBoardEditor .tb-pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}#teamBoardEditor .tb-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}#tb-error{color:#a32b3e}#teamBoardEditor fieldset{border:0;margin:0;padding:0;min-width:0}
@media(max-width:700px){#teamBoard{padding:14px}#teamBoard .tb-item{grid-template-columns:1fr;gap:10px}#teamBoard .tb-actions button{min-height:44px}#teamBoardEditor .tb-pair{grid-template-columns:1fr;gap:0}}
@media print{#teamBoard,#teamBoardEditor{display:none!important}}`;
    document.head.append(style);host=el('section');host.id='teamBoard';host.setAttribute('aria-labelledby','tb-title');
    host.innerHTML='<div class="tb-head"><div><h2 id="tb-title">Team board</h2><p class="tb-muted">Notes, events & tasks · Shared with your team</p></div><div id="tb-add" class="tb-actions"></div></div><div class="tb-toolbar"><label for="tb-filter">Show</label><select id="tb-filter"><option value="open">Open & upcoming</option><option value="note">Notes</option><option value="event">Events</option><option value="task">Tasks</option><option value="all">All items</option><option value="trash">Trash</option></select></div><p id="tb-status" class="tb-muted" role="status">Connecting to team board…</p><div id="tb-list"></div>';
    home.append(host);for(const type of ['note','event','task']){const b=action('+ '+type[0].toUpperCase()+type.slice(1),()=>openEditor(null,type));b.dataset.write='';$('tb-add').append(b);}
    $('tb-filter').addEventListener('change',event=>{filter=event.target.value;render();});
    dialog=el('dialog');dialog.id='teamBoardEditor';dialog.setAttribute('aria-labelledby','tb-dialog-title');
    dialog.innerHTML='<form id="tb-form"><h2 id="tb-dialog-title">Add team item</h2><label>Type<select name="type"><option value="note">Note</option><option value="event">Event</option><option value="task">Task</option></select></label><label>Title<input name="title" required maxlength="120"></label><label>Details<textarea name="body" rows="3" maxlength="5000"></textarea></label><fieldset id="tb-schedule"><legend>Schedule · Pacific time</legend><div class="tb-pair"><label>Date<input name="date" type="date" min="2000-01-01" max="2199-12-31"></label><label>Time (optional)<input name="time" inputmode="numeric" placeholder="1800" maxlength="5" pattern="([01][0-9]|2[0-3]):?[0-5][0-9]"></label></div><p class="tb-muted">Use military time, 0000–2359. Leave time blank for an all-day event or date-only task.</p><label>Repeat<select name="unit"><option value="none">Does not repeat</option><option value="day">Days</option><option value="week">Weeks</option><option value="month">Months</option></select></label><div id="tb-repeat-details"><div class="tb-pair"><label>Every<input name="every" type="number" min="1" max="365" value="1" step="1"></label><label>End date (optional)<input name="until" type="date" min="2000-01-01" max="2199-12-31"></label></div><p class="tb-muted">Repeats from the first date at the same Pacific time. Monthly dates use the last day when a month is shorter. Tasks stay overdue until each occurrence is checked off.</p></div></fieldset><p id="tb-edit-help" class="tb-muted"></p><p class="tb-muted">Shown in the planner only; no email or phone notifications.</p><p id="tb-error" role="alert"></p><div class="tb-footer"><button id="tb-close" type="button">Cancel</button><button id="tb-save" type="submit">Save for everyone</button></div></form>';
    document.body.append(dialog);form=$('tb-form');form.addEventListener('submit',submit);field('type').addEventListener('change',scheduleControls);field('unit').addEventListener('change',scheduleControls);$('tb-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    window.addEventListener('online',controls);window.addEventListener('offline',()=>{controls();message('Offline · reconnect to make changes.');});
    setInterval(()=>{if(!dialog.open)render();},60000);controls();connect();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
