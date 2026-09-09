'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),z=require('node:zlib');
const read=p=>fs.readFileSync(require.resolve('../'+p),'utf8');
const base=z.gunzipSync(Buffer.from([1,2,3].map(n=>read(`app/data-${n}.b64`).trim()).join(''),'base64')).toString();
test('external-only option exists before donor loading and has a readable print label',()=>{
  const loader=read('index.html');
  const transform=loader.match(/html=html\.replace\('<option value="after"[^;]+;/)[0];
  const context={html:base};vm.runInNewContext(transform,context);
  assert.match(context.html,/<option value="external_only">External only<\/option>/);
  const start=base.indexOf('function titleCaseValue('),end=base.indexOf('\nfunction ',start+10);
  vm.runInNewContext(base.slice(start,end),context);
  assert.equal(context.titleCaseValue('external_only'),'External Only');
  assert.match(base,/const fields=\[[^\n]*"autopsy"/);
});
test('external-only adds no graft exclusions and preserves unrelated eligibility reasons',()=>{
  const aut={value:'external_only',addEventListener(){}},context={window:{graftRuleReasons:()=>['Existing age restriction']},document:{getElementById:()=>aut},setInterval(fn){thisTick=fn;return 1;},clearInterval(){}};
  let thisTick;vm.runInNewContext(read('post-autopsy-rules.js'),context);thisTick();
  for(const id of ['heartArtivion','heartLeMaitre','aiArtivion','aiLeMaitre','dta','cartilage','pericardium','nerves','hemi','anteriorSkin']){
    assert.deepEqual(Array.from(context.window.graftRuleReasons({id},30,'male')),['Existing age restriction']);
  }
  aut.value='after';assert.equal(context.window.graftRuleReasons({id:'heartArtivion'},30,'male').length,2);
});
test('ME validation accepts external-only but retains clearance and other requirements',()=>{
  const context={window:{},setInterval(){return 1;},clearInterval(){}};
  vm.runInNewContext(read('me-case-workflow.js'),context);
  const api=context.window.PDXMECaseWorkflow,data={...api.defaults(),isCase:'yes',jurisdiction:'county',clearance:'without_restrictions'};
  const external=Array.from(api.validateData(data,'external_only'));
  assert.ok(external.length>0,'Other missing ME details must still be reported');
  assert.ok(!external.some(e=>/select Recovery|pre-autopsy|SMEO/.test(e)));
  assert.ok(api.validateData(data,'none').some(e=>/select Recovery/.test(e)));
  assert.ok(api.validateData(data,'after').some(e=>/ready for pickup/.test(e)));
  assert.ok(api.validateData({...data,clearance:'pending'},'external_only').some(e=>/pending/.test(e)));
});
test('ME sticker is required only before autopsy and optional summaries say so',()=>{
  const context={window:{},setInterval(){return 1;},clearInterval(){}};
  vm.runInNewContext(read('me-case-workflow.js'),context);
  const api=context.window.PDXMECaseWorkflow;
  for(const stickerComplete of ['', 'no', 'yes']){
    const data={...api.defaults(),isCase:'yes',jurisdiction:'county',clearance:'without_restrictions',stickerComplete};
    for(const status of ['before','after','external_only','none']){
      const errors=api.validateData(data,status);
      assert.equal(errors.some(e=>/ME sticker/.test(e)),status==='before'&&stickerComplete!=='yes');
      const row=api.summaryRows(data,status).find(r=>r.startsWith('ME sticker:'));
      if(stickerComplete==='yes')assert.equal(row,'ME sticker: Complete');
      else if(status==='before')assert.equal(row,'ME sticker: Incomplete');
      else assert.match(row,/Optional/);
    }
  }
});
