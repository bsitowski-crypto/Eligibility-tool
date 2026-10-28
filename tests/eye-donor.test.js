const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');
const root=path.join(__dirname,'..');
const planner=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
const rules=require('../supply-rules.js');
const blood=rows=>rows.filter(row=>row.eyeDonorBlood);
const pairs=rows=>blood(rows).map(row=>[row.n,row.q]);
const defaultDraw=[['30 mL Sterile Syringe',1],['16G Sterile Needle',1],['Tiger-Top Blood Tube',1]];
const required=[['30 mL Sterile Syringe',1],['16G Sterile Needle',1],['Tiger-Top Blood Tube',2],['Red-Top Blood Tube',1]];
const sorted=rows=>rows.slice().sort((a,b)=>a[0].localeCompare(b[0]));
const assertDraw=(rows,expected)=>assert.deepEqual(sorted(pairs(rows)),sorted(expected));
test('all organ and eye donor combinations produce exact blood draw supplies without accumulation',()=>{
 for(const value of [undefined,'yes_eye_bank','','yes_we_send','no_we_send']){
  const expected=['yes_we_send','no_we_send'].includes(value)?required:defaultDraw;
  const once=rules.calculate([],[],{},value,'no');
  assertDraw(once,expected);assertDraw(rules.calculate(once,[],{},value,'no'),expected);
  assertDraw(rules.calculate(once,[],{},'yes_eye_bank','no'),defaultDraw);
  assertDraw(rules.calculate(once,[],{},value,'yes'),[]);
 }
});
test('ME blood requests are not mutated or counted toward the recovery tubes',()=>{
 const me=[{c:'ME Specimens',n:'Tiger-Top Blood Tube',q:4}];
 const before=JSON.stringify(me);
 const extra=rules.applyEyeDonorBlood(me,'no_we_send');
 assert.equal(extra[0].q,4);assert.equal(JSON.stringify(me),before);
 assert.equal(extra.reduce((n,row)=>n+(row.n==='Tiger-Top Blood Tube'?row.q:0),0),6);
 assertDraw(extra,required);
 assertDraw(rules.order.orderItems(extra),required);
 assert.deepEqual(rules.applyEyeDonorBlood(extra,'yes_eye_bank','yes'),me);
 assertDraw(rules.applyEyeDonorBlood(extra,'yes_eye_bank'),defaultDraw);
});
function setup(){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',innerHTML:'',checked:false,children:[],listeners:{},addEventListener(type,fn){this.listeners[type]=fn},classList:{contains:()=>false,remove(){}}});return nodes.get(id)};
 node('eyeDonor').value='yes_eye_bank';node('organDonor').value='no';node('oca').value='no';
 const donor={age:'',organDonor:'no',recovery:{selected:[],sides:[]}};
 const context={console,document:{getElementById:node,createElement:()=>({}),head:{appendChild(){}}},setInterval(){throw Error('Delayed installation')},clearInterval(){},cur:()=>donor,dynamic(){},screenDonor(){},updateStatus(){},updateTiming(){},staffByInitials:()=>null,save(){},getRecovery:()=>({selected:['adipose'],sides:[]})};
 context.supplies=node('supplies');context.suppliesCard=node('suppliesCard');context.oca=node('oca');context.techGloveInfo=()=>({surgical:'7.5',under:'',safety:'2XL'});
 context.window=context;context.authorizationComplete=node('authorizationComplete');context.medicalRecordsReviewed=node('medicalRecordsReviewed');
 for(const id of ['circulator','tech1','tech2'])context[id]=node(id);
 vm.createContext(context);
 vm.runInContext(planner.slice(planner.indexOf('const fields='),planner.indexOf('function saveHome()')),context);
 const seed=planner.slice(planner.indexOf('const graftMasterSeed='),planner.indexOf('let grafts=[];'));
 const core=planner.slice(planner.indexOf('function add(m,c,n,'),planner.indexOf('function printValue('));
 vm.runInContext(seed+'\nfunction G(id){return graftMasterSeed.find(g=>g.id===id)}\n'+core,context);
 vm.runInContext(fs.readFileSync(path.join(root,'supply-rules.js'),'utf8'),context);
 const start=planner.indexOf('for(const id of fields){const e=');
 const end=planner.indexOf('authorizationComplete.addEventListener',start);
 vm.runInContext(planner.slice(start,end),context);
 return {context,donor,node,rows:()=>JSON.parse(vm.runInContext('JSON.stringify(latestSupplyItems)',context))};
}
test('new and older cases default correctly and switching cases restores the saved choice',()=>{
 assert.match(planner,/organDonor:"no",eyeDonor:"yes_eye_bank"/);
 const h=setup();h.context.loadDonor(h.donor);assert.equal(h.node('eyeDonor').value,'yes_eye_bank');
 h.node('eyeDonor').value='no_we_send';h.context.snapshot();assert.equal(h.donor.eyeDonor,'no_we_send');
 h.context.loadDonor({age:'',eyeDonor:'yes_we_send'});assert.equal(h.node('eyeDonor').value,'yes_we_send');
 h.context.loadDonor({age:''});assert.equal(h.node('eyeDonor').value,'yes_eye_bank');
 h.context.loadDonor(h.donor);assert.equal(h.node('eyeDonor').value,'no_we_send');
});
test('changing a validated case immediately updates screen and print supplies without duplicates',()=>{
 const h=setup();
 h.node('eyeDonor').value='yes_we_send';h.context.buildSupplies(h.context.getRecovery());
 assertDraw(h.rows(),required);
 assert.match(h.node('supplies').innerHTML,/Tiger-Top Blood Tube/);
 for(const value of ['no_we_send','yes_we_send','yes_eye_bank']){
  h.node('eyeDonor').value=value;h.node('eyeDonor').listeners.change();
  const expected=value==='yes_eye_bank'?defaultDraw:required;
  assertDraw(h.rows(),expected);
  assertDraw(JSON.parse(JSON.stringify(h.context.orderedPrintableSupplies())),expected);
  assert.equal(h.donor.eyeDonor,value);
 }
});
test('changing organ donor removes recovery draw supplies and restores them when changed back',()=>{
 const h=setup();h.context.buildSupplies(h.context.getRecovery());assertDraw(h.rows(),defaultDraw);
 for(const value of ['yes_we_send','no_we_send','yes_eye_bank']){
  h.node('eyeDonor').value=value;
  h.node('organDonor').value='yes';h.node('organDonor').listeners.change();assertDraw(h.rows(),[]);
  h.node('organDonor').value='no';h.node('organDonor').listeners.change();
  const expected=value==='yes_eye_bank'?defaultDraw:required;
  assertDraw(h.rows(),expected);assertDraw(JSON.parse(JSON.stringify(h.context.orderedPrintableSupplies())),expected);
 }
});
test('the dropdown follows organ donor, has the exact three labels, and appears in printable case details',()=>{
 const match=planner.match(/<select id="eyeDonor">([\s\S]*?)<\/select>/);assert.ok(match);
 const labels=[...match[1].matchAll(/<option value="[^"]+">([^<]+)<\/option>/g)].map(m=>m[1]);
 assert.deepEqual(labels,['yes, eye bank sending blood','yes, we’re sending blood','no, we’re sending blood']);
 assert.match(planner,/<select id="organDonor">[\s\S]*?<label for="eyeDonor">Eye Donor\?<\/label>/);
 assert.equal((planner.match(/<strong>Eye Donor:<\/strong>/g)||[]).length,2);
 for(const m of planner.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
