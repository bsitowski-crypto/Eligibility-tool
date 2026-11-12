const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const zlib=require('node:zlib');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
const context=vm.createContext({localStorage:{getItem:()=>null,setItem:()=>{}},console});
vm.runInContext('const STAFFKEY="staff";'+html.slice(html.indexOf('const staffSeed=['),html.indexOf('function buildStaff(')),context);
const run=code=>JSON.parse(JSON.stringify(vm.runInContext(code,context)));
run('loadStaffDirectory();staffDirectory');
const expected={MDB3:['DTA'],RKC:['DTA','Knee Block (non-JRF)','Circ PFO Modules'],EMF:['DTA','Knee Block (non-JRF)'],ALF4:['Heart Prep and Drape','DTA','AI','Femoral Veins'],BCJG:['DTA','AI','Saph','Femoral Veins','Knee Block (non-JRF)'],KLH3:['DTA'],JTJ:['Arm Block','Knee Block (non-JRF)','DTA','Femoral Veins','Circ PFO Modules'],ZKJ:['DTA','AI'],TKS:['Femorals (as Circulator)'],JDS3:['DTA','AI']};
for(const staff of run('staffDirectory'))assert.deepEqual(staff.notSignedOff,expected[staff.initials]||[]);
const legacy=run('staffDirectory').map(x=>({...x,tmRevision:undefined,phone:'preserved',notSignedOff:['AI','OCA/JRF']}));
context.localStorage.getItem=()=>JSON.stringify([...legacy,{initials:'VISITOR',notSignedOff:['Heart']}]);
run('loadStaffDirectory();staffDirectory');
assert.deepEqual(run('staffByInitials("KLH3").notSignedOff'),['DTA']);
assert.equal(run('staffByInitials("KLH3").phone'),'preserved');
assert.deepEqual(run('staffByInitials("KLB4").notSignedOff'),[]);
assert.deepEqual(run('staffByInitials("VISITOR").notSignedOff'),['Heart']);
const edited=run('staffDirectory');edited.find(x=>x.initials==='JTJ').notSignedOff=[];
context.localStorage.getItem=()=>JSON.stringify(edited);
run('loadStaffDirectory();staffDirectory');
assert.deepEqual(run('staffByInitials("JTJ").notSignedOff'),[]);
// Exercise actual TM alert code with tech, circulator, extra staff, and graft selections.
const alertsCode=html.slice(html.indexOf('  // Outstanding TM alerts come directly'),html.indexOf('\n  let out="";',html.indexOf('  // Outstanding TM alerts come directly')));
function alerts(selected,tech='',circ='',extras=[]){
 context.selected=selected;context.extraPeople=extras;
 context.tech1={value:tech};context.tech2={value:''};context.circulator={value:circ};context.oca={value:'no'};context.window={CasePersonnel:{personnel:()=>extras}};
 return run(`(()=>{const alerts=[],s=selected,grafts=[{id:'dta',group:'pfo'},{id:'femVeinArtivion',group:'pfo'}];${alertsCode}return alerts})()`);
}
// Restore the dated master for alert scenarios.
context.localStorage.getItem=()=>null;run('loadStaffDirectory();staffDirectory');
assert(alerts(['heartArtivion'],'ALF4').some(x=>x.includes('Heart Prep and Drape')));
assert(alerts(['kneeBlock'],'RKC').some(x=>x.includes('non-JRF')));
assert.equal(alerts(['freshKnee'],'RKC').length,0);
assert(alerts(['armBlock'],'JTJ').some(x=>x.includes('Arm Block')));
assert(alerts(['dta'],'','RKC').some(x=>x.includes('Circ PFO')));
assert(alerts(['femVeinArtivion'],'','TKS').some(x=>x.includes('as Circulator')));
assert.equal(alerts(['femVeinArtivion'],'TKS').length,0);
assert(alerts(['dta'],'','',[{role:'circulator',initials:'JTJ'}]).some(x=>x.includes('Circ PFO')));
assert.equal(alerts(['aiArtivion'],'KLH3').length,0);
console.log('Outstanding training matrix, migration, and role-specific alerts passed.');
