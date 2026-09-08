'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function snapshot(rows){return {forEach(fn){rows.forEach(row=>fn({id:row.id,data:()=>row}));}};}
function harness(){
  const nodes=new Map(),writes=[],reads=[],listeners=[],storage=new Map();
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){}},textContent:''});return nodes.get(id);}};
  let response=Promise.resolve(snapshot([]));
  const auth={currentUser:{uid:'admin',email:'bsitowski@gmail.com'}};
  const db={collection(){return {get(options){reads.push(options);return response;},doc(){return {set(data){writes.push(data);}};},onSnapshot(cb,error){listeners.push({cb,error});return ()=>{};}};}};
  const context={document,window:{},donors:[{id:'deleted',name:'Synthetic cached case'}],APPKEY:'donors',localStorage:{setItem(k,v){storage.set(k,v);}},renderBoard(){},save(){},init(){},clearTimeout(){},setTimeout(){},console:{error(){},warn(){}}};
  const source=fs.readFileSync(require.resolve('../cloud-sync.js'),'utf8').replace('  const originalSave=save;',`  window.testSync={startCloudDonorSync,stopCloudListeners,handleAuthenticatedUser,setup(a,d){cloudAuth=a;cloudDb=d;},state(){return {ready:cloudReady,donors};}};\n  const originalSave=save;`);
  vm.runInNewContext(source,context);const api=context.window.testSync;api.setup(auth,db);
  return {api,auth,writes,reads,listeners,storage,context,respond(p){response=p;}};
}
test('sign-in never resurrects cached donors missing from the server',async()=>{
  const h=harness();await h.api.startCloudDonorSync(h.auth.currentUser);
  assert.equal(h.writes.length,0);assert.equal(h.api.state().donors.length,0);
  assert.equal(h.reads[0].source,'server');assert.equal(h.reads.length,1);assert.equal(h.api.state().ready,true);
});
test('server records replace stale browser values at sign-in',async()=>{
  const h=harness();h.respond(Promise.resolve(snapshot([{id:'remote',name:'Synthetic current case'}])));
  await h.api.startCloudDonorSync(h.auth.currentUser);
  assert.equal(h.api.state().donors[0].id,'remote');assert.equal(h.writes.length,0);
  assert.equal(JSON.parse(h.storage.get('donors'))[0].id,'remote');
});
test('failed server read keeps sync disabled and does not upload or replace cache',async()=>{
  const h=harness();h.respond(Promise.reject(Error('offline')));await h.api.startCloudDonorSync(h.auth.currentUser);
  assert.equal(h.api.state().ready,false);assert.equal(h.writes.length,0);assert.equal(h.storage.size,0);
});
test('sign-out invalidates an in-flight startup',async()=>{
  const h=harness();let resolve;h.respond(new Promise(r=>resolve=r));const pending=h.api.startCloudDonorSync(h.auth.currentUser);
  h.auth.currentUser=null;h.api.stopCloudListeners();resolve(snapshot([{id:'late'}]));await pending;
  assert.equal(h.api.state().ready,false);assert.equal(h.listeners.length,0);assert.equal(h.storage.size,0);
});
test('late donor snapshots from an old session cannot replace current data',async()=>{
  const h=harness();await h.api.startCloudDonorSync(h.auth.currentUser);const old=h.listeners[0];
  h.respond(Promise.resolve(snapshot([{id:'new'}])));await h.api.startCloudDonorSync(h.auth.currentUser);
  old.cb(snapshot([{id:'old'}]));old.error({code:'permission-denied'});
  assert.equal(h.api.state().donors[0].id,'new');assert.equal(h.api.state().ready,true);
});
