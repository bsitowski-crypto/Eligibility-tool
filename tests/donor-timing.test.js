"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../simple-status.js"),"utf8");
function harness(donors=[]){
  const board={innerHTML:""},window={};
  const document={getElementById:id=>id==="board"?board:null,querySelectorAll:()=>[]};
  const instrumented=source.replace('  let tries=0;', '  window.testTiming={cardHtml,timingBox,formatDeadline,renderSimpleBoard};\n  let tries=0;');
  vm.runInNewContext(instrumented,{window,document,Date,donors,filters:{},timing:d=>d.testTiming,setInterval(){},setTimeout(){}});
  return {...window.testTiming,board};
}
test("one timing box with timeout first and smaller start directly underneath",()=>{
  const h=harness(),timeout=new Date(2026,8,1,18,30),start=new Date(2026,8,1,16,30);
  const html=h.cardHtml({id:"sample",status:"active",testTiming:{timeout,start}});
  assert.equal((html.match(/class="priority-time timeout"/g)||[]).length,1);
  assert.ok(!html.includes('class="priority-time start"'));
  assert.match(html,/priority-time-value[^>]*>[^<]*1830<\/div><div class="priority-start-secondary">/);
  assert.match(html,/Suggested start by:[\s\S]*1630/);
  assert.ok(html.indexOf("priority-start-secondary")<html.indexOf("priority-time-relative"));
  assert.ok(html.includes(`data-deadline="${timeout.toISOString()}"`));
});
test("military time at midnight and late evening, retaining dates",()=>{
  const h=harness();assert.match(h.formatDeadline(new Date(2026,8,1,0,5)),/ · 0005$/);assert.match(h.formatDeadline(new Date(2026,8,2,23,59)),/ · 2359$/);
  assert.notEqual(h.formatDeadline(new Date(2026,8,1,6)),h.formatDeadline(new Date(2026,8,2,6)));
});
test("missing timing remains readable",()=>{const html=harness().timingBox(null);assert.equal((html.match(/Not entered/g)||[]).length,2);assert.ok(!html.includes('data-deadline='));assert.ok(!html.includes('Invalid Date'));});
test("sort remains earliest timeout first, unknown last",()=>{
  const donors=[{id:"later",status:"active",testTiming:{timeout:new Date(2026,8,2)}},{id:"missing",status:"pending"},{id:"earlier",status:"pending",testTiming:{timeout:new Date(2026,8,1)}}];
  const h=harness(donors);h.renderSimpleBoard();const html=h.board.innerHTML;
  assert.ok(html.indexOf('data-donor-id="earlier"')<html.indexOf('data-donor-id="later"'));assert.ok(html.indexOf('data-donor-id="later"')<html.indexOf('data-donor-id="missing"'));
});
test("timeout typography outweighs secondary start on desktop and phone",()=>{
  assert.match(source,/priority-time-value\{[^}]*font-size:18px/);assert.match(source,/priority-start-secondary\{[^}]*font-size:12px/);assert.match(source,/priority-time-value\{font-size:20px/);
});
test('home cards show full escaped case notes for pending and active donors',()=>{
  for(const status of ['pending','active']){
    const notes='Long note '.repeat(40)+'<script>bad</script>',h=harness([{id:'one',status,caseNotes:notes}]);
    h.renderSimpleBoard();assert.ok(h.board.innerHTML.includes('Long note '.repeat(40)));
    assert.ok(h.board.innerHTML.includes('&lt;script&gt;bad&lt;/script&gt;'));
    assert.ok(h.board.innerHTML.includes('data-edit-notes="one"'));
    assert.ok(h.board.innerHTML.includes('CASE NOTES'));
  }
});
test('medical notes appear in full beside case notes for pending, active and completed donors',()=>{
  for(const status of ['pending','active','complete']){
    const medical='Medical history line.\n'.repeat(35)+'<img src=x onerror=bad()>',caseNotes='Case notes stay editable',h=harness([{id:'one',status,medicalNotes:medical,caseNotes}]);
    h.renderSimpleBoard();const html=h.board.innerHTML;
    assert.match(html,/class="priority-notes-row"/);
    assert.ok(html.includes('Medical history line.\n'.repeat(35)));
    assert.ok(html.includes('&lt;img src=x onerror=bad()&gt;'));
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.indexOf('CASE NOTES')<html.indexOf('MEDICAL NOTES'));
    assert.ok(html.includes(caseNotes));assert.ok(html.includes('data-edit-notes="one"'));
    assert.equal((html.match(/MEDICAL NOTES/g)||[]).length,1);
  }
  assert.doesNotMatch(source,/notes\.slice\(0,220\)|-webkit-line-clamp/);
  assert.match(source,/priority-notes-row\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(source,/@media\(max-width:700px\)\{\.priority-notes-row\{grid-template-columns:minmax\(0,1fr\)/);
});
