const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');
const {armConflictClearTargets,savedSideState}=require('../bilateral-recovery-ui');

const root=path.join(__dirname,'..');
const data=[1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join('');
const html=zlib.gunzipSync(Buffer.from(data,'base64')).toString();

test('Solvita arm en bloc is opt-in for male donors 14–55 on direct-cremation, non-OCA/JRF cases',()=>{
  const context=vm.createContext({
    cloneData:structuredClone, age:{value:'30'}, oca:{value:'no'}, funeral:{value:'direct'},
    organDonor:{value:'no'}, heartLungsTransplant:{value:'no'}
  });
  const run=code=>vm.runInContext(code,context);
  run(html.slice(html.indexOf('const GRAFTCRITERIAKEY='),html.indexOf('const funeralSeed=')));
  run(html.slice(html.indexOf('function graftRuleReasons('),html.indexOf('function screenDonor(')));
  run('loadGraftCriteria(); const arm=G("armEnBloc");');

  assert.equal(run('arm.group'), 'internal');
  assert.equal(run('arm.defaultChecked'), false);
  for(const sex of ['male','female']){
    for(const age of [13,14,30,55,56]){
      context.age.value=String(age);
      assert.equal(run(`graftRuleReasons(arm,${age},'${sex}').length===0`),sex==='male'&&age>=14&&age<=55);
    }
  }
  for(const funeral of ['viewing','unknown','']){
    context.funeral.value=funeral;
    assert.match(run('graftRuleReasons(arm,30,"male").join(" ")'),/direct cremation/);
  }
  context.funeral.value='direct';
  context.oca.value='yes';
  assert.match(run('graftRuleReasons(arm,30,"male").join(" ")'),/OCA\/JRF/);
  assert.equal(run('graftRuleReasons(G("silvieElbow"),30,"male").length'),0);
});

test('arm en bloc replaces overlapping grafts on the chosen side and restores that side independently',()=>{
  for(const side of ['left','right']){
    assert.deepEqual(armConflictClearTargets(`bilateral_armEnBloc_${side}`,true),
      ['humerus','radius','ulna','armBlock'].map(id=>`bilateral_${id}_${side}`));
    for(const id of ['humerus','radius','ulna','armBlock']){
      assert.ok(armConflictClearTargets(`bilateral_${id}_${side}`,true).includes(`bilateral_armEnBloc_${side}`));
    }
  }
  const saved={initialized:true,selected:['armEnBloc'],sides:['bilateral_armEnBloc_right']};
  assert.equal(savedSideState(saved,'armEnBloc','left',false),false);
  assert.equal(savedSideState(saved,'armEnBloc','right',false),true);
});
