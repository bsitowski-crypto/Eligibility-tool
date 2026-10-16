const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function transport(file){
 const window={},document={addEventListener(){}};
 let source=fs.readFileSync(path.join(root,file),'utf8');
 source=source.replace('  let tries=0','  window.testClock={fmtClock'+(file==='transport-card.js'?',savedClock':'')+'};\n  let tries=0');
 vm.runInNewContext(source,{window,document,Date,setInterval(){},parseTod:(date,tod)=>new Date(date+'T'+tod.slice(0,2)+':'+tod.slice(2))});return window;
}
test('transport clocks always use four digits, including midnight',()=>{
 for(const file of ['transport-card.js','transport-planner.js']){
  const {testClock}=transport(file);
  assert.equal(testClock.fmtClock(new Date(2026,9,16,0,5)),'0005');
  assert.equal(testClock.fmtClock(new Date(2026,9,16,13,45)),'1345');
  assert.equal(testClock.fmtClock(new Date(2026,9,16,23,59)),'2359');
 }
 const {testClock}=transport('transport-card.js');
 assert.equal(testClock.savedClock(null,'1:45 PM'),'1345');assert.equal(testClock.savedClock(null,'12:05 AM'),'0005');assert.equal(testClock.savedClock(null,'12:05 PM'),'1205');
});
test('TOE accepts military times, rejects AM/PM and invalid hours, and infers next day',()=>{
 const api=transport('transport-planner.js').transportToeTiming,d={deathDate:'2026-10-16',tod:'2300'};
 for(const value of ['0005','00:05']){const toe=api.resolveToe(d,value);assert.equal(toe.getDate(),17);assert.equal(toe.getHours(),0);assert.equal(toe.getMinutes(),5);}
 for(const value of ['2400','2360','1:30 PM','123','abcd'])assert.throws(()=>api.resolveToe(d,value));
 const result=api.calculate(new Date(2026,9,16,23),10,20,'h',api.resolveToe(d,'0005'));
 assert.equal(result.departure.getHours(),0);assert.equal(result.departure.getMinutes(),35);assert.equal(result.arrival.getMinutes(),55);
});
test('ME date and military time fields round-trip existing ISO values',()=>{
 const nodes=new Map(),byId=id=>{if(!nodes.has(id))nodes.set(id,{value:''});return nodes.get(id);};
 const src=fs.readFileSync(path.join(root,'me-case-workflow.js'),'utf8');
 const context={byId};vm.createContext(context);
 vm.runInContext(src.slice(src.indexOf('  function value(id)'),src.indexOf('  function setChecked(')),context);
 for(const id of ['mePreDropoffDateTime','mePostConfirmationDateTime']){
  context.setValue(id,'2026-10-16T00:05');assert.equal(byId(id+'Time').value,'0005');assert.equal(context.value(id),'2026-10-16T00:05');
  byId(id+'Time').value='2359';assert.equal(context.value(id),'2026-10-16T23:59');
  byId(id+'Time').value='2400';assert.equal(context.value(id),'');
 }
});
test('time controls use military text entry and timestamps specify a 24-hour cycle',()=>{
 for(const file of ['transport-card.js','transport-planner.js','me-case-workflow.js'])assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/type="(?:time|datetime-local)"/);
 for(const file of ['collaboration.js','case-pdf.js','printable-form-fix.js'])assert.match(fs.readFileSync(path.join(root,file),'utf8'),/hourCycle:"h23"/);
});
