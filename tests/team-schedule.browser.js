'use strict';
// Run with `node tests/team-schedule.browser.js` in an environment with Playwright.
// Uses only an in-memory Firebase stand-in; never connects to production.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),zlib=require('node:zlib');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SCHEDULE_BROWSER_PATH?{executablePath:process.env.SCHEDULE_BROWSER_PATH,args:['--no-sandbox']}: {})});
 try {
  const page=await browser.newPage({viewport:{width:1100,height:1000},timezoneId:'America/Los_Angeles'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.clock.install({time:new Date('2026-10-08T17:00:00Z')});
  await page.setContent('<!doctype html><html><head><style>body{font-family:Arial;background:#f2f2f7;padding:24px}#homeView{max-width:1000px;margin:auto}</style></head><body><main id="homeView"><h1>PDX Recovery Planner</h1></main></body></html>');
  const root=path.join(__dirname,'..');
  const baseHTML=zlib.gunzipSync(Buffer.from([1,2,3].map(n=>fs.readFileSync(path.join(root,'app',`data-${n}.b64`),'utf8')).join(''),'base64')).toString();
  await page.addStyleTag({content:[...baseHTML.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n')});
  await page.evaluate(()=>{
   const common={body:'',time:'',unit:'month',every:1,until:'',index:0,completed:false,deleted:false,revision:1,lastCompletedDate:'',lastCompletedBy:'',lastCompletedAt:null};
   const records=new Map([
    ['cleaning',{...common,type:'task',title:'OR ceiling cleaning',date:'2026-10-07',boardLeadDays:6}],
    ['meeting',{...common,type:'event',title:'Staff meeting',date:'2026-09-17',time:'1400',monthlyMode:'weekday',boardLeadDays:7}]
   ]);let listener,serial=0;
   const emit=()=>listener?.({metadata:{fromCache:false},forEach:fn=>records.forEach((data,id)=>fn({id,data:()=>data}))});
   const db={collection(name){return {doc(id){return {id:id||'new-'+(++serial),onSnapshot(opts,cb){queueMicrotask(()=>cb({exists:true,data:()=>({approved:true}),metadata:{fromCache:false}}));return ()=>{};}};},where(){return {onSnapshot(opts,cb){listener=cb;queueMicrotask(emit);return ()=>{};}};}};},async runTransaction(fn){await fn({get:async ref=>({exists:records.has(ref.id),data:()=>records.get(ref.id)}),set:(ref,data)=>records.set(ref.id,data),update:(ref,patch)=>records.set(ref.id,{...records.get(ref.id),...patch})});emit();}};
   window.firebase={apps:[{}],auth:()=>({onAuthStateChanged(cb){cb({uid:'test-staff',email:'test@example.invalid'});}}),firestore:()=>db};window.firebase.firestore.FieldValue={serverTimestamp:()=> 'TEST_TIMESTAMP'};
   window.testRecords=records;
  });
  await page.addScriptTag({path:path.join(root,'team-board-model.js')});await page.addScriptTag({path:path.join(root,'team-board.js')});await page.addStyleTag({path:path.join(root,'schedule-calendar.css')});
  await page.getByText('Shared with approved planner users · Pacific time',{exact:true}).waitFor();
  assert.equal(await page.locator('#tb-list .tb-item-overdue h3').textContent(),'OR ceiling cleaning');
  await page.getByRole('button',{name:'Schedule',exact:true}).click();
  assert.equal(await page.locator('#tb-month-label').textContent(),'October 2026');
  await page.getByRole('button',{name:'10/15/2026, 1 scheduled item',exact:true}).click();
  assert.match(await page.locator('#tb-agenda').textContent(),/Staff meeting.*third Thursday/s);
  await page.getByRole('button',{name:'Next month',exact:true}).click();
  await page.getByRole('button',{name:'11/19/2026, 1 scheduled item',exact:true}).click();
  assert.match(await page.locator('#tb-agenda').textContent(),/Staff meeting/);
  await page.getByRole('button',{name:'+ Task',exact:true}).last().click();
  assert.equal(await page.locator('[name=date]').inputValue(),'2026-11-19');
  await page.locator('[name=title]').fill('Monthly supply audit');await page.locator('[name=date]').fill('2026-11-07');await page.locator('[name=unit]').selectOption('month');await page.locator('[name=boardVisibility]').selectOption('scheduled');await page.locator('[name=boardLeadDays]').fill('6');
  assert.match(await page.locator('#tb-display-help').textContent(),/11\/01\/2026/);
  await page.getByRole('button',{name:'Save for everyone'}).click();await page.locator('#teamBoardEditor').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>[...testRecords.values()].find(i=>i.title==='Monthly supply audit').boardLeadDays),6);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  assert.equal(await page.locator('#tb-list').getByText('Monthly supply audit',{exact:true}).count(),0);
  await page.locator('#tb-list .tb-item-overdue').getByRole('button',{name:'✓ Complete'}).click();
  assert.equal(await page.locator('#tb-list').getByText('OR ceiling cleaning',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>testRecords.get('cleaning').index),1);
  await page.getByRole('button',{name:'Schedule',exact:true}).click();
  await page.getByRole('button',{name:'11/07/2026, 2 scheduled items',exact:true}).click();
  await page.screenshot({path:'/tmp/team-schedule-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.querySelector('#teamSchedule').scrollWidth<=document.querySelector('#teamSchedule').clientWidth),true);
  await page.screenshot({path:'/tmp/team-schedule-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: calendar recurrence, editor save, visibility, completion, desktop/mobile layout; no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
