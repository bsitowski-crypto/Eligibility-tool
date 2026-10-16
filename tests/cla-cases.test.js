const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const CLA=require('../cla-cases.js');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'cla-cases.js'),'utf8');
const html=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
test('CLA defaults leave every follow-up pending or unknown, without presumed approval',()=>{
 const c=CLA.defaults();assert.equal(c.enabled,false);assert.equal(c.authorizationAcceptable,false);
 assert.equal(c.seros,'pending');assert.equal(c.drai,'pending');assert.equal(c.donationType,'unknown');assert.equal(c.meRelease,'pending');assert.equal(c.orStatus,'pending');assert.deepEqual(c.organs,[]);
 assert.equal(CLA.normalize({meRelease:'not_applicable'}).meRelease,'pending');
});
test('normalization retains all follow-up answers, scheduled OR dates, and free text estimates',()=>{
 const raw={enabled:true,authorizationAcceptable:true,seros:'acceptable',drai:'acceptable',donationType:'brain_dead',meRelease:'released',organs:['heart','kidneys','pancreas'],orStatus:'scheduled',orDate:'2026-10-17',orTime:'1800',orOther:'Tomorrow afternoon'};
 const copy=JSON.parse(JSON.stringify(CLA.normalize(raw)));assert.deepEqual(copy,raw);
 assert.equal(CLA.orText({cla:copy}),'10/17/2026 · 1800');
 copy.orStatus='other';assert.equal(CLA.orText({cla:copy}),'Tomorrow afternoon');
 copy.orStatus='pending';assert.equal(CLA.orText({cla:copy}),'Pending');
 assert.deepEqual(raw.organs,['heart','kidneys','pancreas']);
});
test('CLA activation requires an actual valid date and military TOD, never an OR estimate',()=>{
 const d={status:'pending',cla:{enabled:true,orStatus:'scheduled',orDate:'2026-10-17',orTime:'1800'}};
 for(const status of ['active','planning','in_progress']){
  assert.equal(CLA.canTransition(d,status),false);
  assert.equal(CLA.canTransition(d,status,'2026-10-16','2359'),true);
  for(const [date,tod] of [['','1800'],['2026-10-16',''],['2026-02-30','1800'],['2026-10-16','2400'],['2026-10-16','1260'],['2026-10-16','1:30 PM']])assert.equal(CLA.canTransition(d,status,date,tod),false);
 }
 assert.equal(CLA.canTransition(d,'pending'),true);assert.equal(CLA.canTransition({status:'pending'},'active'),true);
 assert.equal(CLA.validDeath('2028-02-29','0000'),true);assert.equal(CLA.validDeath('2026-02-29','0000'),false);
});
test('pending CLA has no recovery countdown even if a stale TOD was saved',()=>{
 const c={parseTod:()=>new Date(2026,9,16,8),offset:()=>({m:60,r:[]}),Date};vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('function timing(d){'),html.indexOf('function updateTiming(){')),c);
 const d={status:'pending',deathDate:'2026-10-16',tod:'0800',cla:{enabled:true}};
 assert.equal(c.timing(d),null);assert.ok(c.timing({...d,status:'active'}));
 assert.ok(c.timing({...d,cla:{enabled:false}}));assert.equal(CLA.isPending(d),true);
 assert.equal(CLA.isPending({...d,status:'active'}),false);
});
test('pending Home cards show CLA and safely escaped OR text in place of timing',()=>{
 const window={PendingCLA:CLA},document={getElementById:()=>null};
 const simple=fs.readFileSync(path.join(root,'simple-status.js'),'utf8').replace('  let tries=0;','  window.test={cardHtml};\n  let tries=0;');
 vm.runInNewContext(simple,{window,document,Date,setInterval(){}});
 const card=window.test.cardHtml({id:'cla',status:'pending',cla:{enabled:true,donationType:'dcd',orStatus:'other',orOther:'Tomorrow <script>alert(1)</script>'}});
 assert.match(card,/PENDING CLA/);assert.match(card,/TOD pending/);assert.match(card,/DCD/);assert.match(card,/&lt;script&gt;/);
 assert.ok(!card.includes('TIME OUT'));assert.ok(!card.includes('Add date and TOD'));
});
test('planner saves and loads CLA details and starts its script before status handlers',()=>{
 assert.match(html,/window\.PendingCLA\?\.capture\(d\)/);assert.match(html,/window\.PendingCLA\?\.load\(d\)/);assert.match(html,/window\.PendingCLA\?\.render\(\)/);
 const loader=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(loader.indexOf('cla-cases.js?v=')>=0);
 assert.ok(loader.indexOf('cla-cases.js?v=')<loader.indexOf('simple-status.js?v='));
 assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/cla-cases\.js\?v=9207/);
 const simple=fs.readFileSync(path.join(root,'simple-status.js'),'utf8');assert.match(simple,/requestActivation\(d,status\)/);
 assert.match(source,/stopImmediatePropagation/);assert.doesNotMatch(source,/type="time"|type="datetime-local"/);
});
function formHarness(initial=null){
 const nodes=new Map(),docListeners=new Map();let donor=initial,saves=0;
 function node(id=''){
  const events=new Map(),classes=new Set();let markup='';
  const n={id,value:'',checked:false,hidden:false,disabled:false,textContent:'',dataset:{},
   classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},
   addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);},
   after(child){if(child.id)nodes.set(child.id,child);},before(child){if(child.id)nodes.set(child.id,child);},appendChild(child){if(child.id)nodes.set(child.id,child);},scrollIntoView(){},focus(){},
   closest(){return {querySelector:()=>node()};},querySelector:selector=>selector==='.timing'?timing:null,
   dispatchEvent(e){e.target=n;for(const fn of docListeners.get(e.type)||[]){fn(e);if(e.stopped)return false;}for(const fn of events.get(e.type)||[])fn(e);return true;},
   get innerHTML(){return markup;},set innerHTML(value){markup=value;for(const m of value.matchAll(/id="([^"]+)"/g))if(!nodes.has(m[1]))nodes.set(m[1],node(m[1]));}};
  return n;
 }
 const timing=node();
 for(const id of ['deathDate','tod','status','timingCard','plannerView'])nodes.set(id,node(id));
 const document={getElementById:id=>nodes.get(id)||null,createElement:()=>node(),head:node(),
  addEventListener(type,fn){if(!docListeners.has(type))docListeners.set(type,[]);docListeners.get(type).push(fn);}};
 nodes.get('status').value=donor?.status||'pending';
 const window={},context={window,document,Date,cur:()=>donor,save:()=>saves++,Event:class{constructor(type){this.type=type;}stopImmediatePropagation(){this.stopped=true;}preventDefault(){}}};
 vm.runInNewContext(source,context);
 const setDonor=next=>{donor=next;nodes.get('status').value=next.status;window.PendingCLA.load(next);};
 return {api:window.PendingCLA,nodes,timing,context,setDonor,saves:()=>saves,change(id){nodes.get(id).dispatchEvent(new context.Event('change'));}};
}
test('form installs safely before any donor exists and separates records when switching donors',()=>{
 const h=formHarness();assert.ok(h.nodes.has('claEnabled'));
 const one={id:'one',status:'pending',cla:{enabled:true,seros:'acceptable',organs:['lungs'],orStatus:'other',orOther:'Tomorrow afternoon'}};
 h.setDonor(one);assert.equal(h.nodes.get('claEnabled').checked,true);assert.equal(h.nodes.get('deathDate').disabled,true);assert.equal(h.nodes.get('tod').hidden,true);assert.equal(h.timing.hidden,true);
 assert.equal(h.nodes.get('claSeros').value,'acceptable');assert.equal(h.nodes.get('claOrganLungs').checked,true);
 h.nodes.get('claDrai').value='acceptable';h.change('claDrai');assert.equal(one.cla.drai,'acceptable');assert.ok(h.saves()>0);
 h.setDonor({id:'two',status:'pending'});assert.equal(h.nodes.get('claEnabled').checked,false);assert.equal(h.nodes.get('claSeros').value,'pending');assert.equal(h.nodes.get('claOrganLungs').checked,false);assert.equal(h.nodes.get('deathDate').disabled,false);
 h.setDonor(one);assert.equal(h.nodes.get('claOrOther').value,'Tomorrow afternoon');assert.equal(h.nodes.get('claDrai').value,'acceptable');
});
test('activation is intercepted before autosave and entering actual TOD enables the Active transition',()=>{
 const d={id:'one',status:'pending',cla:{enabled:true}},h=formHarness(d),status=h.nodes.get('status');
 status.value='active';assert.equal(status.dispatchEvent(new h.context.Event('change')),false);assert.equal(status.value,'pending');assert.equal(d.status,'pending');
 assert.equal(h.nodes.get('tod').hidden,false);assert.equal(h.nodes.get('deathDate').disabled,false);assert.equal(h.nodes.get('claActualEntry').hidden,false);
 h.nodes.get('deathDate').value='2026-10-16';h.nodes.get('tod').value='0005';
 status.value='active';assert.equal(status.dispatchEvent(new h.context.Event('change')),true);
 d.status='active';h.api.render();assert.equal(h.timing.hidden,false);assert.equal(h.nodes.get('claFollowup').hidden,false);
});
test('OR modes expose date plus military time or free-text estimates, retaining both across toggles',()=>{
 const d={id:'one',status:'pending',cla:{enabled:true}},h=formHarness(d);
 h.nodes.get('claOrStatus').value='scheduled';h.change('claOrStatus');assert.equal(h.nodes.get('claOrScheduled').hidden,false);assert.equal(h.nodes.get('claOrOtherWrap').hidden,true);
 h.nodes.get('claOrDate').value='2026-10-17';h.nodes.get('claOrTime').value='1800';h.change('claOrTime');
 h.nodes.get('claOrStatus').value='other';h.nodes.get('claOrOther').value='Estimated tomorrow afternoon';h.change('claOrStatus');
 assert.equal(h.nodes.get('claOrOtherWrap').hidden,false);assert.equal(d.cla.orOther,'Estimated tomorrow afternoon');assert.equal(d.cla.orDate,'2026-10-17');
 h.nodes.get('claEnabled').checked=false;h.change('claEnabled');assert.equal(d.cla.orOther,'Estimated tomorrow afternoon');assert.equal(h.nodes.get('claFollowup').hidden,true);
});
