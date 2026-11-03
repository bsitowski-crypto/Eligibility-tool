const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
test('pericardium age 60 inclusive for both sexes, including legacy devices',()=>{
 const c={cloneData:x=>JSON.parse(JSON.stringify(x)),localStorage:{getItem:()=>JSON.stringify([{id:'pericardium',male:[14,80],female:[14,72]}])},age:{value:'60'},organDonor:{value:'no'},heartLungsTransplant:{value:'no'},forProfit:{value:'yes'},oca:{value:'no'}};
 vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('const GRAFTCRITERIAKEY='),html.indexOf('const funeralSeed=')),c);
 vm.runInContext(html.slice(html.indexOf('function otherEligibleChestGrafts('),html.indexOf('function screenDonor(')),c);
 const run=s=>vm.runInContext(s,c);run('loadGraftCriteria()');
 for(const sex of ['male','female']){
  for(const age of [13,14,59,60,61,72,80]){
   c.age.value=String(age);
   assert.equal(run(`graftRuleReasons(G('pericardium'),${age},'${sex}').length===0`),age>=14&&age<=60,`${sex} age ${age}`);
  }
  c.organDonor.value='yes';c.heartLungsTransplant.value='yes';
  assert.match(run(`graftRuleReasons(G('pericardium'),60,'${sex}').join(' ')`),/other eligible chest graft/);
  c.organDonor.value='no';c.heartLungsTransplant.value='no';
  assert.equal(run(`eligible(G('heartLeMaitre'),'${sex}',65)`),true);
  assert.equal(run(`eligible(G('heartArtivion'),'${sex}',64)`),true);
 }
 assert.equal(run('CRITERIA_VERSION'),JSON.parse(fs.readFileSync(path.join(root,'criteria-version.json'),'utf8')).version);
});
