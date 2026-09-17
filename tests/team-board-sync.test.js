'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const model=require('../team-board-model');
function harness(){
  const elements=new Map();
  function node(){return {textContent:'',disabled:false,open:false,children:[],dataset:{},append(...n){this.children.push(...n);},replaceChildren(){this.children=[];},addEventListener(){},querySelectorAll(){return [];},close(){this.open=false;},reset(){}};}
  const doc={readyState:'loading',addEventListener(){},createElement:node,getElementById(id){if(!elements.has(id))elements.set(id,node());return elements.get(id);}};
  const listeners={},writes=[],stop=[];let saved={revision:1},authCallback;
  const db={collection(name){return {doc(){return {onSnapshot(options,cb,error){listeners[name]={cb,error};return ()=>stop.push(name);}};},where(){return {onSnapshot(options,cb,error){listeners[name]={cb,error};return ()=>stop.push(name);}};}};},async runTransaction(fn){return fn({get:async()=>({exists:!!saved,data:()=>saved}),update:(ref,data)=>{writes.push(data);saved={...saved,...data};}});}};
  const firebase={apps:[{}],auth:()=>({onAuthStateChanged(cb){authCallback=cb;}}),firestore:()=>db};firebase.firestore.FieldValue={serverTimestamp:()=> 'SERVER_TIME'};
  const window={TeamBoardModel:model,firebase},context={window,document:doc,navigator:{onLine:true},firebase,setTimeout(){},setInterval(){},confirm:()=>true,console,Intl,Date};
  const expose=`window.testBoard={mutate,connect,revoke,canWrite,setup(){host=document.createElement('section');dialog=document.createElement('dialog');form=document.createElement('form');db=firebase.firestore();user={uid:'staff-a'};approved=true;online=true;},state(){return {approved,online,user,items};},open(){dialog.open=true;},isOpen(){return dialog.open;}};`;
  const source=fs.readFileSync(path.join(__dirname,'../team-board.js'),'utf8').replace("  if(document.readyState==='loading')",expose+"\n  if(document.readyState==='loading')");
  vm.runInNewContext(source,context);const api=window.testBoard;api.setup();
  return {api,writes,stop,db,doc,context,listeners,signIn:user=>authCallback(user),saved:value=>saved=value,status:()=>doc.getElementById('tb-status').textContent};
}
test('edits use a transaction, revision and authenticated editor',async()=>{
  const h=harness();assert.equal(await h.api.mutate({id:'a',revision:1},{title:'Changed'},'Saved'),true);
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].revision,2);assert.equal(h.writes[0].updatedBy,'staff-a');assert.equal(h.writes[0].updatedAt,'SERVER_TIME');assert.equal(h.status(),'Saved');
});
test('stale edits and missing records never overwrite current data',async()=>{
  const h=harness();h.saved({revision:2});assert.equal(await h.api.mutate({id:'a',revision:1},{title:'Old'},'Saved'),false);assert.equal(h.writes.length,0);assert.match(h.status(),/Someone changed/);
  h.saved(null);assert.equal(await h.api.mutate({id:'a',revision:1},{title:'Old'},'Saved'),false);assert.equal(h.writes.length,0);
});
test('permission failures report failure without claiming save',async()=>{
  const h=harness();h.db.runTransaction=async()=>{throw {code:'permission-denied'};};
  assert.equal(await h.api.mutate({id:'a',revision:1},{title:'Change'},'Saved'),false);assert.match(h.status(),/permission was denied/);assert.equal(h.writes.length,0);
});
test('offline and revoked sessions cannot initiate writes',async()=>{
  const h=harness();h.context.navigator.onLine=false;await h.api.mutate({id:'a',revision:1},{},'Saved');assert.equal(h.writes.length,0);
  h.context.navigator.onLine=true;h.api.revoke('Revoked');await h.api.mutate({id:'a',revision:1},{},'Saved');assert.equal(h.writes.length,0);
});
const approval=(data,fromCache=false)=>({exists:!!data,data:()=>data,metadata:{fromCache}});
test('approval must be server confirmed and password change complete',()=>{
  const h=harness();h.api.connect();h.signIn({uid:'a'});
  h.listeners.approvedUsers.cb(approval({approved:true},true));assert.equal(h.api.state().approved,false);assert.equal(h.listeners.teamBoardItems,undefined);
  h.listeners.approvedUsers.cb(approval({approved:true,mustResetPassword:true}));assert.equal(h.api.state().approved,false);
  h.listeners.approvedUsers.cb(approval({approved:true,mustResetPassword:false}));assert.equal(h.api.state().approved,true);assert.ok(h.listeners.teamBoardItems);
});
test('revocation clears data and closes an open editor',()=>{
  const h=harness();h.api.connect();h.signIn({uid:'a'});h.listeners.approvedUsers.cb(approval({approved:true}));h.api.open();
  h.listeners.approvedUsers.cb(approval({approved:false}));assert.equal(h.api.state().approved,false);assert.equal(h.api.state().items.length,0);assert.equal(h.api.isOpen(),false);assert.ok(h.stop.includes('teamBoardItems'));
});
test('late snapshots from previous account cannot re-enable access',()=>{
  const h=harness();h.api.connect();h.signIn({uid:'a'});const old=h.listeners.approvedUsers.cb;h.signIn(null);old(approval({approved:true}));assert.equal(h.api.state().approved,false);assert.equal(h.api.state().user,null);
});
test('integration is outside donor rendering, loaded in order, and cached',()=>{
  const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');const index=read('index.html'),sw=read('sw.js'),ui=read('team-board.js');
  for(const file of ['team-board-model.js','team-board.js']){assert.ok(index.includes(`${file}?v=9191`));assert.ok(sw.includes(`"./${file}"`));}
  assert.ok(index.indexOf('team-board-model.js')<index.indexOf('team-board.js'));assert.ok(ui.includes("const home=$('homeView')"));assert.ok(ui.includes('home.append(host)'));
  assert.ok(!ui.includes('localStorage'));assert.ok(!ui.includes('.innerHTML=item'));assert.ok(ui.includes("confirm(`Move"));assert.ok(ui.includes("{deleted:true}"));assert.ok(!ui.includes('.delete('));
});
