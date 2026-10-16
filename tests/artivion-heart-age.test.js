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
  assert.equal(run("G('heartLeMaitre').female[1]"),55);
});
test('saved former limits migrate and persist without changing other criteria',()=>{
  const {run,values}=setup([{id:'heartArtivion',male:[0,60],female:[0,60],criteriaNotes:'Saved notes'},{id:'heartLeMaitre',male:[0,63]}]);
  for(const sex of ['male','female'])assert.equal(run(`G('heartArtivion').${sex}[1]`),64);
  assert.equal(run("G('heartArtivion').criteriaNotes"),'Saved notes');
  assert.equal(run("G('heartLeMaitre').male[1]"),63);
  assert.equal(JSON.parse(values.get('solvita_v990_graft_criteria')).find(x=>x.id==='heartArtivion').male[1],64);
  run("G('heartArtivion').male[1]=60;saveGraftCriteria();loadGraftCriteria()");
  assert.equal(run("G('heartArtivion').male[1]"),60);
});
test('migration preserves customized ranges and excluded sexes',()=>{
  const {run}=setup([{id:'heartArtivion',male:[5,62],female:null}]);
  assert.equal(run("G('heartArtivion').male.join(',')"),'5,62');
  assert.equal(run("G('heartArtivion').female"),null);
});
