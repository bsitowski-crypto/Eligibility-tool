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
