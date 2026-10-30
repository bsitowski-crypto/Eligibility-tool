const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
const limits={antTib:69,postTib:69,gracilis:67,semitendinosus:67,peroneus:67};
function setup(saved){
  const values=new Map();if(saved)values.set('solvita_v990_graft_criteria',JSON.stringify(saved));
  const c={cloneData:x=>JSON.parse(JSON.stringify(x)),localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},age:{value:'75'},sex:{value:'male'},international:{value:'yes'},oca:{value:'no'},funeral:{value:'direct'},organDonor:{value:'no'},heartLungsTransplant:{value:'no'},forProfit:{value:'yes'}};
  vm.createContext(c);
  vm.runInContext(html.slice(html.indexOf('const GRAFTCRITERIAKEY='),html.indexOf('const funeralSeed=')),c);
  vm.runInContext(html.slice(html.indexOf('function graftRuleReasons('),html.indexOf('function screenDonor(')),c);
  vm.runInContext('loadGraftCriteria()',c);
  return {c,values,run:s=>vm.runInContext(s,c)};
}
test('five male tendons require international authorization above each former limit, through 75 only',()=>{
  const {c,run}=setup();
  for(const [id,limit] of Object.entries(limits))for(const auth of ['yes','no','']){
    c.international.value=auth;
    for(const age of [13,14,limit,limit+1,69,70,75,76]){
      c.age.value=String(age);
      const reasons=run(`graftRuleReasons(G('${id}'),${age},'male')`);
      assert.equal(reasons.length===0,age>=14&&age<=75&&(age<=limit||auth==='yes'),`${id}, ${age}, ${auth}`);
      if(age>limit&&age<=75&&auth!=='yes')assert.match(reasons.join(' '),/International authorization/);
    }
  }
});
test('female tendon limits and Achilles remain unchanged',()=>{
  const {c,run}=setup();
  for(const auth of ['yes','no']){
    c.international.value=auth;
    for(const [id,limit] of Object.entries(limits)){
      assert.equal(run(`graftRuleReasons(G('${id}'),${limit},'female').length`),0);
      assert.ok(run(`graftRuleReasons(G('${id}'),${limit+1},'female').length`));
    }
    assert.equal(run("graftRuleReasons(G('achilles'),80,'male').length"),0);
    assert.equal(run("G('achilles').female[1]"),72);
  }
});
test('saved former male limits migrate once without altering female ranges or custom criteria',()=>{
  const saved=Object.entries(limits).map(([id,limit])=>({id,male:[14,limit],female:[14,limit],criteriaNotes:'Saved notes'}));
  const {run,values}=setup(saved);
  for(const [id,limit] of Object.entries(limits)){
    assert.equal(run(`G('${id}').male[1]`),75);
    assert.equal(run(`G('${id}').female[1]`),limit);
    assert.equal(run(`G('${id}').criteriaNotes`),'Saved notes');
  }
  assert.equal(JSON.parse(values.get('solvita_v990_graft_criteria')).find(g=>g.id==='antTib').male[1],75);
  run("G('antTib').male[1]=65;saveGraftCriteria();loadGraftCriteria()");
  assert.equal(run("G('antTib').male[1]"),65);
  const custom=setup([{id:'antTib',male:[18,65],female:null}]);
  assert.equal(custom.run("G('antTib').male.join(',')"),'18,65');
  assert.equal(custom.run("G('antTib').female"),null);
});
test('existing selections are filtered before supply and print use, and authorization refresh preserves other selections',()=>{
  const {c,run}=setup();
  c.donorAgeYears=()=>75;
  c.document={querySelectorAll:q=>q==='.recovery-check:checked'?[{value:'antTib'},{value:'gracilis'},{value:'femur'}]:[],getElementById:()=>({classList:{add(){}}})};
  run(html.slice(html.indexOf('function getRecovery(){'),html.indexOf('function recChanged(')));
  assert.deepEqual(Array.from(run('getRecovery().selected')),['antTib','gracilis','femur']);
  c.international.value='no';
  assert.deepEqual(Array.from(run('getRecovery().selected')),['femur']);
  c.recoveryOptions={children:[{}]};
  c.screenDonor=r=>{c.restored=r;};
  run('let latestSupplyItems=[{}];');
  run(html.slice(html.indexOf('function refreshTendonAuthorization(){'),html.indexOf('function bind(){')));
  run('refreshTendonAuthorization()');
  assert.deepEqual(Array.from(c.restored.selected),['femur']);
  assert.equal(run('latestSupplyItems.length'),0);
  c.international.value='yes';run('refreshTendonAuthorization()');
  assert.equal(c.restored.initialized,true);
  for(const id of Object.keys(limits))assert.ok(c.restored.selected.includes(id));
  assert.ok(c.restored.selected.includes('femur'));
});
test('all inline application scripts parse',()=>{
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
