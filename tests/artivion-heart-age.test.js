const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
function setup(saved){
  const values=new Map();
  if(saved)values.set('solvita_v990_graft_criteria',JSON.stringify(saved));
  const context={cloneData:x=>JSON.parse(JSON.stringify(x)),localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};
  vm.createContext(context);
  vm.runInContext(html.slice(html.indexOf('const GRAFTCRITERIAKEY='),html.indexOf('const funeralSeed=')),context);
  vm.runInContext('loadGraftCriteria()',context);
  return {context,values,run:s=>vm.runInContext(s,context)};
}
test('Artivion hearts include ages 60 through 64 for both sexes and exclude 65',()=>{
  const {run}=setup();
  for(const sex of ['male','female']){
    for(const age of [0,60,61,62,63,64])assert.equal(run(`eligible(G('heartArtivion'),'${sex}',${age})`),true);
    assert.equal(run(`eligible(G('heartArtivion'),'${sex}',65)`),false);
  }
  assert.equal(run("G('heartLeMaitre').male[1]"),65);
  assert.equal(run("G('heartLeMaitre').female[1]"),65);
});
test('LeMaitre hearts include 62F and age 65 for both sexes, and exclude 66',()=>{
  const {run}=setup();
  for(const sex of ['male','female'])for(const age of [55,56,62,64,65,66]){
    assert.equal(run(`eligible(G('heartLeMaitre'),'${sex}',${age})`),age<=65);
  }
});
test('every device uses the same master despite stale, customized, disabled or malformed saved rules',()=>{
  const fresh=setup();
  const seed=JSON.parse(fresh.run('JSON.stringify(graftMasterSeed)'));
  const stale=seed.map(g=>({...g,male:[99,100],female:null,active:false,processor:'Old processor',oca:1,defaultChecked:false,criteriaNotes:'Local rules'}));
  for(const saved of [stale,[{id:'heartLeMaitre',female:[0,55]}],{},'bad data']){
    const device=setup(saved);
    assert.equal(device.run('JSON.stringify(grafts)'),fresh.run('JSON.stringify(grafts)'));
    for(const g of seed)for(const sex of ['male','female'])for(const age of [0,14,40,55,62,64,65,70,75,80,99]){
      const expression=`eligible(G('${g.id}'),'${sex}',${age})`;
      assert.equal(device.run(expression),fresh.run(expression),`${g.id} ${sex} ${age}`);
    }
    // Imported backup data and legacy edit calls cannot alter the active rules.
    device.values.set('solvita_v990_graft_criteria',JSON.stringify(stale));
    device.run("G('heartLeMaitre').female=[0,55];saveGraftCriteria();loadGraftCriteria()");
    assert.equal(device.run('JSON.stringify(grafts)'),fresh.run('JSON.stringify(grafts)'));
  }
});
