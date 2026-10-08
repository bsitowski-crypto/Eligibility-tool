const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const encoded=[1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join('');
const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString();
function supplies(selected,sides=[],oca='no'){
  const context={oca:{value:oca},G:id=>({id,group:'internal',culture:'LR'}),
    assignedGlovePulls:()=>[],supplies:{},suppliesCard:{classList:{remove(){}}}};
  vm.createContext(context);
  vm.runInContext(html.slice(html.indexOf('function add(m,c,n,'),html.indexOf('let latestSupplyItems='))+
    'let latestSupplyItems=[];'+html.slice(html.indexOf('function buildSupplies(r){'),html.indexOf('function printValue(')),context);
  context.buildSupplies({selected,sides});
  return JSON.parse(vm.runInContext('JSON.stringify(latestSupplyItems)',context));
}
function blockSet(items){return items.filter(x=>/Gigli|Lactated Ringers/.test(x.n)).map(({n,q})=>({n,q}));}
test('Solvita knee blocks receive the full OCA/JRF block supply set without OCA enabled',()=>{
  const oca=blockSet(supplies(['freshKnee'],['freshKnee_left','freshKnee_right'],'yes'));
  assert.deepEqual(blockSet(supplies(['kneeBlock'])),oca);
  assert.equal(oca.find(x=>x.n==='Gigli Blades').q,2);
  assert.equal(oca.find(x=>x.n==='Gigli Handle').q,1);
  assert.equal(oca.find(x=>x.n==='Lactated Ringers (LR)').q,1);
  assert.match(supplies(['kneeBlock']).find(x=>x.n==='Gigli Handle').note,/1 package \(1 pair \/ 2 handles\)/);
});
test('single-sided Solvita knee blocks receive the same supplies',()=>{
  for(const side of ['left','right'])assert.deepEqual(blockSet(supplies([],[`bilateral_kneeBlock_${side}`])),blockSet(supplies(['kneeBlock'])));
});
test('Solvita and OCA/JRF together share one set and LR remains additive with other recovery',()=>{
  assert.deepEqual(blockSet(supplies(['kneeBlock','freshKnee'],['freshKnee_left'],'yes')),blockSet(supplies(['kneeBlock'])));
  assert.equal(supplies(['kneeBlock','nerves']).find(x=>x.n==='Lactated Ringers (LR)').q,3);
});
test('unrelated grafts and unselected OCA blocks do not pull Gigli supplies',()=>{
  for(const ids of [[],['femur'],['armBlock'],['freshKnee']])assert.deepEqual(blockSet(supplies(ids)),[]);
});
