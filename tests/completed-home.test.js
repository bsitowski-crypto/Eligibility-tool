const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../simple-status.js'),'utf8');
function setup(donors,filters={}){
  let saves=0;const board={innerHTML:''},window={},status={value:''};
  const document={getElementById:id=>id==='board'?board:id==='status'?status:null,querySelectorAll:()=>[]};
  const instrumented=source.replace('  let tries=0;','  window.test={setCompleted,migrate,renderSimpleBoard,cardHtml,simplifySelect};\n  let tries=0;');
  vm.runInNewContext(instrumented,{window,document,donors,filters,Date,cur:()=>donors[0],save:()=>saves++,setInterval(){}});
  return {...window.test,board,status,saves:()=>saves};
}
test('checkbox completes, timestamps and saves, and completed cards sort above live cases',()=>{
  const donors=[{id:'later',status:'active'},{id:'early',status:'pending'},{id:'archived',status:'archived'}],filters={complete:false},h=setup(donors,filters);
  h.setCompleted('later',true);
  assert.equal(donors[0].status,'complete');assert.ok(Date.parse(donors[0].completedAt));assert.equal(filters.complete,true);assert.equal(h.saves(),1);
  assert.equal(h.status.value,'complete');
  assert.ok(h.board.innerHTML.indexOf('data-donor-id="later"')<h.board.innerHTML.indexOf('data-donor-id="early"'));
  assert.match(h.board.innerHTML,/data-donor-completed="later" checked/);
  assert.match(h.board.innerHTML,/donor complete priority-card/);assert.ok(!h.board.innerHTML.includes('data-donor-id="archived"'));
});
test('completion survives status migration and donor form reopening',()=>{
  const donors=[{id:'done',status:'complete',completedAt:new Date().toISOString()},{id:'old',status:'planning'}],h=setup(donors);
  h.migrate();assert.equal(donors[0].status,'complete');assert.equal(donors[1].status,'active');
  h.simplifySelect();assert.equal(h.status.value,'complete');assert.match(h.status.innerHTML,/value="complete"/);
});
test('unchecking restores pending or active, clears completion time, and preserves case details',()=>{
  for(const before of ['pending','active']){
    const donor={id:'one',status:before,actualStart:'2026-10-16T08:00:00Z',caseNotes:'Keep notes'},h=setup([donor]);
    h.setCompleted('one',true);const stamp=donor.completedAt;
    h.setCompleted('one',true);assert.equal(donor.completedAt,stamp);assert.equal(h.saves(),1);
    h.setCompleted('one',false);assert.equal(donor.status,before);assert.equal(donor.completedAt,null);
    assert.equal(donor.actualStart,'2026-10-16T08:00:00Z');assert.equal(donor.caseNotes,'Keep notes');
  }
});
test('completed filter works and archived donors cannot be checked off',()=>{
  const donors=[{id:'done',status:'complete'},{id:'live',status:'active'},{id:'archive',status:'archived'}],h=setup(donors,{complete:false});
  h.renderSimpleBoard();assert.ok(!h.board.innerHTML.includes('data-donor-id="done"'));assert.ok(h.board.innerHTML.includes('data-donor-id="live"'));
  h.setCompleted('archive',true);assert.equal(donors[2].status,'archived');assert.equal(h.saves(),0);
});
