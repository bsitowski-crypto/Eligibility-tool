const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const zlib=require('node:zlib');
const path=require('node:path');
const root=path.join(__dirname,'..');
const planner=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
const seed=planner.slice(planner.indexOf('const graftMasterSeed='),planner.indexOf('let grafts=[];'));
const seedContext={};vm.createContext(seedContext);vm.runInContext(seed+';this.seed=graftMasterSeed;',seedContext);
const grafts=JSON.parse(JSON.stringify(seedContext.seed));
const ms=grafts.filter(g=>g.group==='internal'&&!g.skin);
const msIds=new Set(ms.map(g=>g.id));
function setup({age=35,sex='male',hardware=['rodLower'],hips=0,knees=0}={}){
 const nodes=new Map(),inputs=[],timers=[];
 const node=id=>{
  if(!nodes.has(id)){
   const classes=new Set();
   nodes.set(id,{id,value:'',checked:false,disabled:false,dataset:{},children:[],listeners:{},innerHTML:'',textContent:'',
    classList:{add:x=>classes.add(x),contains:x=>classes.has(x),toggle(x,force){const on=force??!classes.has(x);if(on)classes.add(x);else classes.delete(x)}},
    addEventListener(type,fn){this.listeners[type]=fn},insertBefore(child){nodes.set(child.id,child);this.children.push(child)},remove(){nodes.delete(this.id)}});
  }
  return nodes.get(id);
 };
 for(const id of ['jointHardwareScreening','jointHardwareResult','jhHas','jhHips','jhKnees','jhAnkle','jhShoulder','jhDetails','recoveryCard','validationCard','suppliesCard','printActions','age','sex'])node(id);
 node('jhHas').value='yes';node('jhHips').value=String(hips);node('jhKnees').value=String(knees);node('sex').value=sex;
 const hardwareInputs=['rodLower','pins','orifFemur'].map(value=>({value,checked:hardware.includes(value)}));
 for(const g of grafts){
  const base=node('recover_'+g.id);base.value=g.id;base.checked=true;inputs.push(base);
  if(msIds.has(g.id))for(const prefix of ['', 'bilateral_','ocaStd_'])for(const side of ['left','right']){
   const input=node(prefix+g.id+'_'+side);input.checked=true;input.value='on';inputs.push(input);
  }
 }
 let current={sex,jointHardware:{has:'yes',hips,knees,hardware},recovery:{selected:grafts.map(g=>g.id),sides:inputs.filter(x=>!x.id.startsWith('recover_')).map(x=>x.id),initialized:true}};
 let snapshots=0,validations=0;
 const document={getElementById:id=>nodes.get(id)||null,createElement:()=>({remove(){nodes.delete(this.id)}}),querySelectorAll(selector){
  if(selector==='#recoveryOptions input')return inputs;
  if(selector.startsWith('[data-jh-hardware]'))return hardwareInputs.filter(x=>!selector.endsWith(':checked')||x.checked);
  return [];
 }};
 const context={console,document,grafts,cur:()=>current,donorAgeYears:()=>age,lastRuledOut:[],latestSupplyItems:[{n:'Old MS supplies',q:1}],
  setInterval:fn=>{timers.push(fn);return timers.length},clearInterval(){},setTimeout:fn=>fn(),save(){},updateTiming(){},renderRuledOut(){},
  getRecovery(){return {selected:inputs.filter(x=>x.checked&&x.id.startsWith('recover_')).map(x=>x.value),sides:inputs.filter(x=>x.checked&&!x.id.startsWith('recover_')).map(x=>x.id)}},
  graftRuleReasons(){return []},validateRecovery(){validations++;return context.getRecovery()},
  snapshot(){snapshots++;current.recovery={...context.getRecovery(),initialized:true}},
  loadDonor(d){current=d;inputs.forEach(x=>{x.checked=x.id.startsWith('recover_')?(d.recovery.selected||[]).includes(x.value):(d.recovery.sides||[]).includes(x.id)})},
  screenDonor(){inputs.forEach(x=>{const id=x.id.replace(/^recover_/,'').replace(/^(bilateral_|ocaStd_)/,'').replace(/_(left|right)$/,'');x.checked=context.graftRuleReasons(grafts.find(g=>g.id===id)).length===0})}
 };
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'joint-hardware-screening.js'),'utf8'),context);timers[0]();
 const clean=value=>JSON.parse(JSON.stringify(value));
 return {context,node,inputs,api:context.JointHardwareScreening,current:()=>current,counts:()=>({snapshots,validations}),get:()=>clean(context.getRecovery())};
}
function assertMsCleared(h){
 for(const input of h.inputs){const id=input.id.replace(/^recover_/,'').replace(/^(bilateral_|ocaStd_)/,'').replace(/_(left|right)$/,'');if(msIds.has(id)){assert.equal(input.checked,false,input.id);assert.equal(input.disabled,true,input.id)}}
 assert.ok(h.get().selected.every(id=>!msIds.has(id)));
 assert.ok(h.current().recovery.selected.every(id=>!msIds.has(id)));
 assert.deepEqual(JSON.parse(JSON.stringify(h.current().recovery.sides)),[]);
}
test('a DEFER MS result immediately clears standard, hidden, left/right and OCA controls plus saved selections',()=>{
 const h=setup();h.api.applyRestriction();assertMsCleared(h);
 for(const id of ['anteriorSkin','heartArtivion','nerves','adipose'])assert.equal(h.node('recover_'+id).checked,true,id);
 assert.equal(h.context.latestSupplyItems.length,0);
 for(const id of ['validationCard','suppliesCard','printActions'])assert.equal(h.node(id).classList.contains('hidden'),true,id);
 assert.ok(h.counts().snapshots>0);
});
test('OCA is ruled out at age 40 and below when hardware triggers DEFER MS',()=>{
 for(const age of [12,35,40]){
  const h=setup({age});h.api.applyRestriction();assertMsCleared(h);
  for(const g of ms.filter(g=>g.oca))assert.ok(h.context.graftRuleReasons(g).length>0,g.id);
  assert.doesNotMatch(h.api.evaluate().text,/may still be evaluated for OCA/);
 }
});
test('hardware changes apply immediately, and refresh or reopen cannot restore deferred grafts',()=>{
 const h=setup({hardware:[]});h.api.applyRestriction();assert.equal(h.node('recover_humerus').checked,true);
 // The lower-extremity rod checkbox is changed in the screening form.
 h.context.document.querySelectorAll('[data-jh-hardware]').find(x=>x.value==='rodLower').checked=true;
 h.api.saveState();assertMsCleared(h);
 h.context.screenDonor();h.api.applyRestriction();assertMsCleared(h);
 const saved=JSON.parse(JSON.stringify(h.current()));saved.recovery.selected.push('freshKnee','femur');saved.recovery.sides.push('freshKnee_left','bilateral_femur_right');
 h.context.loadDonor(saved);assertMsCleared(h);
});
test('validation clears attempted rechecks and returns only permitted grafts',()=>{
 const h=setup();h.api.applyRestriction();h.node('bilateral_femur_left').checked=true;h.node('recover_femur').checked=true;h.node('freshKnee_left').checked=true;
 assert.ok(h.get().selected.every(id=>!msIds.has(id)));
 const result=JSON.parse(JSON.stringify(h.context.validateRecovery()));assert.ok(result.selected.every(id=>!msIds.has(id)));assertMsCleared(h);assert.equal(h.counts().validations,1);
});
test('ACCEPT and CONSULT keep selections; clearing the rule-out enables controls without automatically selecting them',()=>{
 for(const options of [{hardware:['pins']},{age:35,sex:'female',hardware:[],hips:1}]){
  const h=setup(options);h.api.applyRestriction();assert.equal(h.node('recover_humerus').checked,true);assert.equal(h.node('recover_humerus').disabled,false);
 }
 const h=setup();h.api.applyRestriction();h.node('jhHas').value='no';h.api.saveState();assert.equal(h.node('recover_femur').disabled,false);assert.equal(h.node('recover_femur').checked,false);
 h.context.screenDonor();assert.equal(h.node('recover_femur').checked,true);
});
test('hip replacement deferrals clear MS grafts and repeat enforcement does not duplicate rule-out reasons',()=>{
 for(const options of [{age:41,sex:'female',hips:1,hardware:[]},{age:66,hips:1,hardware:[]},{age:50,hips:1,knees:1,hardware:[]}]){
  const h=setup(options);h.api.applyRestriction();h.api.applyRestriction();assertMsCleared(h);assert.equal(h.context.lastRuledOut.length,ms.length);
 }
});
