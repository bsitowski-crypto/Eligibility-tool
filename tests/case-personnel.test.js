'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),path=require('node:path');
const root=path.join(__dirname,'..');
const planner=zlib.gunzipSync(Buffer.from([1,2,3].map(n=>fs.readFileSync(path.join(root,'app',`data-${n}.b64`),'utf8')).join(''),'base64')).toString();
function setup(){
 const donor={additionalPersonnel:[]};let weight=300,height=60;
 const staff={AA:{name:'A',initials:'AA',surgicalGlove:'7.5'},BB:{name:'B',initials:'BB',surgicalGlove:'8'},CC:{name:'C',initials:'CC',surgicalGlove:'8.5',underGlove:'8',safetyGlove:'L'}};
 const context={window:{},document:{getElementById:()=>({closest:()=>null})},cur:()=>donor,lbs:()=>weight,ins:()=>height,tech1:{value:'AA'},tech2:{value:'BB'},circulator:{value:''},staffByInitials:id=>staff[id],techGloveInfo:id=>({surgical:staff[id]?.surgicalGlove||'Not recorded',under:staff[id]?.underGlove||'Not recorded',safety:staff[id]?.safetyGlove||'Not recorded'}),setInterval:()=>{},Date};
 context.window.StaffingSchedule={getActive:()=>({})};context.window.StaffingScheduleParser={caseTeamAssignment:()=>({selected:{tech1:{initials:'CC'}}})};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'case-personnel.js'),'utf8'),context);
 const api=context.window.CasePersonnel;return {api,donor,context,setWeight:w=>weight=w,setHeight:h=>height=h};
}
test('BMI and weight rules use exact boundaries',()=>{
 const {api}=setup();assert.equal(api.rule(400,80).deferred,false);assert.equal(api.rule(400.01,80).deferred,true);assert.equal(api.rule(350,80).consult,true);assert.equal(api.rule(349.99,80).consult,false);
 const exact=55*60*60/703;assert.equal(api.rule(exact,60).required,true);assert.equal(api.rule(exact-.001,60).required,false);assert.equal(api.rule(401,60).required,false);
});
test('BMI defaults to 24 tech 1 once and preserves edits and removal across saves',()=>{
 const t=setup();t.api.sync();assert.equal(t.donor.additionalPersonnel.length,1);assert.equal(t.donor.additionalPersonnel[0].initials,'CC');t.api.sync();assert.equal(t.donor.additionalPersonnel.length,1);
 t.donor.additionalPersonnel[0].initials='AA';t.donor.additionalPersonnel[0].manual=true;t.api.sync();assert.equal(t.donor.additionalPersonnel[0].initials,'AA');
 t.donor.additionalPersonnel=[];t.api.sync();assert.equal(t.donor.additionalPersonnel.length,0);assert.match(t.api.errors().join(),/3rd tech/);
});
test('final 108 lb and 69 inch inputs remove a transient automatic tech',()=>{const t=setup();t.api.sync();assert.equal(t.donor.additionalPersonnel.length,1);t.setWeight(108);t.setHeight(69);t.api.sync();assert.equal(t.donor.additionalPersonnel.length,0);assert.equal(t.donor.thirdTechAutoCreated,false);assert.equal(t.api.teamLabels(t.donor).length,0);assert.equal(t.api.errors().length,0)});
test('crossing BMI threshold again creates exactly one automatic person',()=>{const t=setup();t.api.sync();t.setWeight(200);t.api.sync();assert.equal(t.donor.additionalPersonnel.length,0);t.setWeight(300);t.api.sync();t.api.sync();assert.equal(t.donor.additionalPersonnel.length,1)});
test('manual additions and edited automatic techs survive a BMI decrease',()=>{const t=setup();t.api.sync();const edited=t.donor.additionalPersonnel[0];edited.manual=true;const visitor={role:'tech',name:'Visitor',surgicalGlove:'7'};t.donor.additionalPersonnel.push(visitor);t.setWeight(108);t.setHeight(69);t.api.sync();assert.equal(t.donor.additionalPersonnel.length,2);assert.equal(t.donor.additionalPersonnel[0],edited);assert.equal(t.donor.additionalPersonnel[1],visitor);t.setHeight(60);t.setWeight(300);t.api.sync();assert.equal(t.donor.additionalPersonnel.length,2)});
test('opening a saved low BMI case clears stale automatic assignments only',()=>{const t=setup();t.setWeight(108);t.setHeight(69);t.donor.additionalPersonnel=[{id:'bmi-third-tech',role:'tech',initials:'CC',automatic:true},{role:'circulator',name:'Visitor',surgicalGlove:'7'}];t.donor.thirdTechAutoCreated=true;t.api.sync();assert.equal(t.donor.additionalPersonnel.length,1);assert.equal(t.donor.additionalPersonnel[0].name,'Visitor')});
test('missing height and weights over 400 remove untouched automatic techs',()=>{for(const change of [t=>t.setHeight(0),t=>t.setWeight(401)]){const t=setup();t.api.sync();change(t);t.api.sync();assert.equal(t.donor.additionalPersonnel.length,0)}});
test('visiting staff require name and gloves; repeated staff are rejected',()=>{const t=setup();t.setWeight(200);t.donor.additionalPersonnel=[{role:'tech',name:'Visitor'}];assert.match(t.api.errors().join(),/glove size/);t.donor.additionalPersonnel[0].surgicalGlove='7';assert.equal(t.api.errors().length,0);t.donor.additionalPersonnel=[{role:'tech',initials:'AA'}];assert.match(t.api.errors().join(),/only be assigned once/)});
test('extras receive tech, under and safety gloves or 12 circulator pairs',()=>{
 const t=setup();t.api.sync();t.donor.additionalPersonnel.push({role:'circulator',name:'Visiting circ',surgicalGlove:'7'});
 const source=planner.slice(planner.indexOf('function assignedGlovePulls('),planner.indexOf('function buildSupplies('));vm.runInContext(source,t.context);
 const pulls=t.context.assignedGlovePulls(15);assert.equal(pulls.find(p=>p.initials==='CC'&&p.type==='surgical').pairs,13);assert.equal(pulls.find(p=>p.initials==='CC'&&p.type==='under').pairs,2);assert.equal(pulls.find(p=>p.initials==='CC'&&p.type==='safety').packages,1);assert.equal(pulls.find(p=>p.initials==='Visiting circ').pairs,12);
});
test('planner and offline shell load personnel after staffing; printable team includes extras',()=>{const index=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(index.indexOf('case-personnel.js')>index.indexOf('staffing-schedule.js'));assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/case-personnel\.js\?v=9204/);assert.match(planner,/CasePersonnel\?\.teamLabels\(cur\(\)\)/);for(const m of planner.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);});
