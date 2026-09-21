(function(){
  'use strict';
  const M=window.TeamBoardModel;if(!M)return;
  const COLLECTION='teamBoardItems';
  const ADMIN_EMAIL='bsitowski@gmail.com';
  let host,dialog,form,db,auth,user=null,approved=false,online=false,items=[],filter='open',editing=null,busy=false,epoch=0,stopItems=null,stopApproval=null;
  let calendar,calendarMonth=M.today().date.slice(0,7),selectedDate=M.today().date;
  const $=id=>document.getElementById(id);
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function action(label,fn){const b=el('button',label);b.type='button';b.addEventListener('click',fn);return b;}
  function message(text){$('tb-status').textContent=text;}
  function canWrite(){return approved&&online&&!busy&&user&&navigator.onLine;}
  function controls(){
    host.querySelectorAll('button[data-write]').forEach(b=>b.disabled=!canWrite());
    $('tb-save').disabled=!canWrite();$('tb-close').disabled=busy;
    calendar?.querySelectorAll('button[data-write]').forEach(b=>b.disabled=!canWrite());
  }
  function formatDate(date,clock){if(!date)return 'No due date';const [y,m,d]=date.split('-');return `${m}/${d}/${y}${clock?' · '+clock:''}`;}
  function render(){
    const list=$('tb-list');list.replaceChildren();controls();renderCalendar();if(!approved)return;
    const current=M.today();let shown=items.filter(i=>filter==='trash'?i.deleted:!i.deleted&&(filter==='all'||filter===i.type||(filter==='open'&&!['Completed','Past','Series ended'].includes(M.status(i,current)))));
    if(!['all','trash'].includes(filter))shown=shown.filter(i=>M.visible(i,current));
    shown.sort((a,b)=>(M.due(a,current)||'9999').localeCompare(M.due(b,current)||'9999')||a.title.localeCompare(b.title));
    if(!shown.length)list.append(el('p',filter==='trash'?'Trash is empty.':'No items here yet. Add a note, event, or task.','tb-muted'));
    for(const item of shown){
      const card=el('article',undefined,'tb-item'),content=el('div'),head=el('div',undefined,'tb-row');
      const kind=el('span',item.type==='note'?'NOTE':item.type==='event'?'EVENT':'TASK','tb-kind');head.append(kind,el('h3',item.title));content.append(head);
      if(item.body)content.append(el('p',item.body,'tb-detail'));
      const state=M.status(item,current),due=M.due(item,current);
      if(state==='Overdue')card.classList.add('tb-item-overdue');
      if(item.type!=='note')content.append(el('p',`${state} · ${formatDate(due,item.time)} · ${M.repeatLabel(item)}`,state==='Overdue'?'tb-overdue':'tb-muted'));
      if(M.boardDate(item,due))content.append(el('p',`On team board from ${formatDate(M.boardDate(item,due))}`,'tb-muted'));
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
  function renderCalendar(){
    if(!calendar||!calendar.open)return;
    const grid=$('tb-calendar-grid'),agenda=$('tb-agenda');grid.replaceChildren();agenda.replaceChildren();
    const start=new Date(calendarMonth+'-01T00:00:00Z'),last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).toISOString().slice(0,10);
    $('tb-month-label').textContent=start.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
    $('tb-selected-label').textContent=formatDate(selectedDate);
    const occurrences=approved?items.flatMap(i=>M.inRange(i,calendarMonth+'-01',last)):[];
    occurrences.sort((a,b)=>a.date.localeCompare(b.date)||(a.item.time||'').localeCompare(b.item.time||'')||a.item.title.localeCompare(b.item.title));
    for(const day of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])grid.append(el('div',day,'tb-weekday'));
    for(let n=0;n<start.getUTCDay();n++)grid.append(el('div',undefined,'tb-calendar-blank'));
    for(let day=1;day<=Number(last.slice(-2));day++){
      const date=calendarMonth+'-'+String(day).padStart(2,'0'),entries=occurrences.filter(o=>o.date===date),b=action('',()=>{selectedDate=date;renderCalendar();});
      b.className='tb-calendar-day';b.classList.toggle('tb-selected',date===selectedDate);b.classList.toggle('tb-today',date===M.today().date);
      b.setAttribute('aria-pressed',String(date===selectedDate));b.setAttribute('aria-label',`${formatDate(date)}, ${entries.length} scheduled item${entries.length===1?'':'s'}`);
      b.append(el('span',String(day),'tb-day-number'));
      for(const o of entries.slice(0,2))b.append(el('span',(o.completed?'✓ ':o.item.type==='task'?'□ ':'• ')+o.item.title,'tb-calendar-chip'+(o.completed?' tb-done':'')));
      if(entries.length>2)b.append(el('span',`+${entries.length-2} more`,'tb-calendar-chip'));
      grid.append(b);
    }
    const selected=occurrences.filter(o=>o.date===selectedDate);
    if(!approved)agenda.append(el('p','Sign in with an approved planner account to see the schedule.','tb-muted'));
    else if(!selected.length)agenda.append(el('p','Nothing scheduled. Add an event or task for this date.','tb-muted'));
    for(const o of selected){
      const row=el('article',undefined,'tb-agenda-item'),current=M.today(),overdue=o.item.type==='task'&&!o.completed&&(o.date<current.date||o.date===current.date&&o.item.time&&o.item.time<current.time);
      if(overdue)row.classList.add('tb-item-overdue');
      row.append(el('h3',o.item.title),el('p',`${o.item.type==='task'?'Task due':'Event'} · ${o.item.time||'All day'}${o.completed?' · Completed':overdue?' · Overdue':''}`),el('p',M.repeatLabel(o.item),'tb-muted'));
      if(o.item.body)row.append(el('p',o.item.body,'tb-detail'));
      row.append(el('p',M.boardDate(o.item,o.date)?`On team board from ${formatDate(M.boardDate(o.item,o.date))}`:'On team board immediately','tb-muted'));
      const edit=action(o.item.unit==='none'?'Edit':'Edit series',()=>openEditor(o.item));edit.dataset.write='';row.append(edit);
      if(o.item.type==='task'&&!o.completed&&o.index===(o.item.index||0)){
        const complete=action('✓ Complete',()=>finishTask(o.item));complete.dataset.write='';row.append(complete);
      }else if(o.item.type==='task'&&!o.completed)row.append(el('p','Complete earlier occurrences first.','tb-muted'));
      agenda.append(row);
    }
    controls();
  }
  function moveMonth(amount){
    const d=new Date(calendarMonth+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+amount);
    if(d.getUTCFullYear()<2000||d.getUTCFullYear()>2199)return;
    calendarMonth=d.toISOString().slice(0,7);selectedDate=calendarMonth+'-01';renderCalendar();
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
    $('tb-monthly-details').hidden=field('unit').value!=='month';
    field('monthlyMode').disabled=locked||note||field('unit').value!=='month';
    field('boardLeadDays').disabled=note||field('boardVisibility').value==='immediate';
    field('boardLeadDays').required=!field('boardLeadDays').disabled;
    field('date').required=field('date').required||!note&&field('boardVisibility').value==='scheduled';
    const date=field('date').value,mode=field('monthlyMode').value;
    $('tb-monthly-help').textContent=date&&mode!=='date'?`Repeats on the ${M.monthlyLabel({date,monthlyMode:mode})} of each selected month.`:'Repeats on the same date; shorter months use their last day.';
    const days=Number(field('boardLeadDays').value);
    $('tb-display-help').textContent=!note&&field('boardVisibility').value==='scheduled'&&M.parseDate(date)!==null&&Number.isInteger(days)&&days>=0&&days<=365?`First shown ${formatDate(M.boardDate({boardLeadDays:days},date))}. This lead time repeats for every occurrence.`:'Choose when each occurrence first appears on the team board.';
    $('tb-date-label').textContent=field('type').value==='task'?'First due date':'First event date';
    $('tb-edit-help').textContent=locked?'This task has completion history. You can edit its title, details, and board display timing. Create a new task to change the repeating schedule.':editing?.unit!=='none'&&editing?'Edits apply to the whole series.':'';
  }
  function openEditor(item=null,type='note',date=''){
    if(!canWrite())return;editing=item?{...item}:null;form.reset();$('tb-error').textContent='';
    const values=item||{type,title:'',body:'',date,time:'',unit:'none',every:1,until:''};
    for(const name of ['type','title','body','date','time','unit','every','until'])field(name).value=values[name];
    field('monthlyMode').value=values.monthlyMode||'date';field('boardVisibility').value=values.boardLeadDays==null?'immediate':'scheduled';field('boardLeadDays').value=values.boardLeadDays??0;
    $('tb-dialog-title').textContent=item?'Edit team item':'Add team item';scheduleControls();dialog.showModal();field('title').focus();
  }
  async function submit(event){
    event.preventDefault();if(!canWrite())return;$('tb-error').textContent='';
    const value=name=>field(name).value;
    const note=value('type')==='note',unit=note?'none':value('unit');
    const data={type:value('type'),title:value('title').trim(),body:value('body').trim(),date:note?'':value('date'),time:note?'':value('time').trim().replace(':',''),unit,every:unit==='none'?1:Number(value('every')),until:unit==='none'?'':value('until')};
    data.monthlyMode=unit==='month'?value('monthlyMode'):'date';
    data.boardLeadDays=note||value('boardVisibility')==='immediate'?null:Number(value('boardLeadDays'));
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
    if(calendar?.open){calendar.close();renderCalendar();}
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
  function installCalendar(home){
    const css=el('link');css.rel='stylesheet';css.href='./schedule-calendar.css?v=9191';document.head.append(css);
    const bar=el('div',undefined,'tb-home-schedule'),open=action('Schedule',()=>{calendar.showModal();renderCalendar();});
    open.id='tb-open-schedule';open.setAttribute('aria-haspopup','dialog');bar.append(open);home.prepend(bar);
    calendar=el('dialog');calendar.id='teamSchedule';calendar.setAttribute('aria-labelledby','tb-calendar-title');
    calendar.innerHTML='<header class="tb-calendar-header"><div><h2 id="tb-calendar-title">Team schedule</h2><p class="tb-muted">Events & tasks · Pacific time</p></div><button type="button" id="tb-calendar-close">Close</button></header><div class="tb-calendar-nav"><button type="button" id="tb-prev-month" aria-label="Previous month">←</button><h3 id="tb-month-label" aria-live="polite"></h3><button type="button" id="tb-next-month" aria-label="Next month">→</button><button type="button" id="tb-calendar-today">Today</button></div><div id="tb-calendar-grid" aria-label="Calendar dates"></div><section class="tb-calendar-agenda"><div class="tb-calendar-header"><h3 id="tb-selected-label"></h3><div class="tb-calendar-add"><button type="button" data-write id="tb-calendar-event">+ Event</button><button type="button" data-write id="tb-calendar-task">+ Task</button></div></div><div id="tb-agenda" aria-live="polite"></div></section>';
    document.body.append(calendar);
    $('tb-calendar-close').addEventListener('click',()=>calendar.close());
    $('tb-prev-month').addEventListener('click',()=>moveMonth(-1));$('tb-next-month').addEventListener('click',()=>moveMonth(1));
    $('tb-calendar-today').addEventListener('click',()=>{selectedDate=M.today().date;calendarMonth=selectedDate.slice(0,7);renderCalendar();});
    for(const type of ['event','task'])$('tb-calendar-'+type).addEventListener('click',()=>openEditor(null,type,selectedDate));
    dialog.addEventListener('close',renderCalendar);
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
    dialog.innerHTML='<form id="tb-form"><h2 id="tb-dialog-title">Add team item</h2><label>Type<select name="type"><option value="note">Note</option><option value="event">Event</option><option value="task">Task</option></select></label><label>Title<input name="title" required maxlength="120"></label><label>Details<textarea name="body" rows="3" maxlength="5000"></textarea></label><fieldset id="tb-schedule"><legend>Schedule · Pacific time</legend><div class="tb-pair"><label><span id="tb-date-label">First due date</span><input name="date" type="date" min="2000-01-01" max="2199-12-31"></label><label>Time (optional)<input name="time" inputmode="numeric" placeholder="1800" maxlength="5" pattern="([01][0-9]|2[0-3]):?[0-5][0-9]"></label></div><p class="tb-muted">Use military time, 0000–2359. Leave time blank for an all-day event or date-only task.</p><label>Repeat<select name="unit"><option value="none">Does not repeat</option><option value="day">Days</option><option value="week">Weeks</option><option value="month">Months</option></select></label><div id="tb-monthly-details"><label>Monthly pattern<select name="monthlyMode"><option value="date">Same date each month</option><option value="weekday">Same weekday and week (e.g. third Thursday)</option><option value="lastWeekday">Last weekday of the month</option></select></label><p id="tb-monthly-help" class="tb-muted"></p></div><div id="tb-repeat-details"><div class="tb-pair"><label>Every<input name="every" type="number" min="1" max="365" value="1" step="1"></label><label>End date (optional)<input name="until" type="date" min="2000-01-01" max="2199-12-31"></label></div><p class="tb-muted">Repeats from the first date at the same Pacific time. Monthly dates use the last day when a month is shorter. Tasks stay overdue until each occurrence is checked off.</p></div><label>Show on team board<select name="boardVisibility"><option value="immediate">Immediately</option><option value="scheduled">A set number of days before each occurrence</option></select></label><label>Days before due date or event<input name="boardLeadDays" type="number" min="0" max="365" step="1" value="0"></label><p id="tb-display-help" class="tb-muted"></p><p class="tb-muted">Example: ceiling cleaning due on the 7th, show 6 days before to appear on the 1st. An unfinished date-only task turns red and bold the day after its due date.</p></fieldset><p id="tb-edit-help" class="tb-muted"></p><p class="tb-muted">Shown in the planner only; no email or phone notifications.</p><p id="tb-error" role="alert"></p><div class="tb-footer"><button id="tb-close" type="button">Cancel</button><button id="tb-save" type="submit">Save for everyone</button></div></form>';
    document.body.append(dialog);form=$('tb-form');form.addEventListener('submit',submit);field('type').addEventListener('change',scheduleControls);for(const name of ['unit','date','monthlyMode','boardVisibility','boardLeadDays'])field(name).addEventListener('input',scheduleControls);$('tb-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    installCalendar(home);
    window.addEventListener('online',controls);window.addEventListener('offline',()=>{controls();message('Offline · reconnect to make changes.');});
    setInterval(()=>{if(!dialog.open)render();},60000);controls();connect();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
(function(){
  if(typeof document.querySelector!=='function')return;
  if(document.querySelector('script[data-desktop-home]'))return;
  const script=document.createElement('script');
  script.src='./desktop-home.js?v=9194';
  script.dataset.desktopHome='';
  document.head.append(script);
})();
