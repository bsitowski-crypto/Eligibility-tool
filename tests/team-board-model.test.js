'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../team-board-model');
const base=patch=>({type:'task',title:'Check supplies',body:'',date:'2026-01-31',time:'0600',unit:'month',every:1,until:'',index:0,completed:false,deleted:false,...patch});
test('monthly repeats retain original day after short months',()=>{
  const b=base();assert.equal(M.occurrence(b,1),'2026-02-28');assert.equal(M.occurrence(b,2),'2026-03-31');
  assert.equal(M.occurrence(base({date:'2028-01-31'}),1),'2028-02-29');
});
test('every two weeks and three days cross year boundaries',()=>{
  assert.equal(M.occurrence(base({date:'2026-12-25',unit:'week',every:2}),1),'2027-01-08');
  assert.equal(M.occurrence(base({date:'2026-12-31',unit:'day',every:3}),1),'2027-01-03');
});
test('end date is inclusive',()=>{
  const b=base({until:'2026-02-28'});assert.equal(M.occurrence(b,1),'2026-02-28');assert.equal(M.occurrence(b,2),null);
});
test('tasks do not silently skip overdue occurrences',()=>{
  const b=base({date:'2026-01-01',unit:'day'}),now={date:'2026-08-31',time:'1200'};
  assert.equal(M.due(b,now),'2026-01-01');assert.equal(M.status(b,now),'Overdue');
  const next={...b,...M.complete(b)};assert.equal(next.completed,false);assert.equal(M.due(next,now),'2026-01-02');
});
test('one-time and final recurring tasks complete without another occurrence',()=>{
  assert.deepEqual(M.complete(base({unit:'none'})),{index:0,completed:true});
  assert.deepEqual(M.complete(base({until:'2026-01-31'})),{index:0,completed:true});
});
test('untimed tasks and notes',()=>{
  const b=base({date:'',time:'',unit:'none'});M.validate(b);assert.equal(M.status(b),'No due date');assert.equal(M.complete(b).completed,true);
  const note={...b,type:'note'};assert.equal(M.status(note),'Note');assert.throws(()=>M.complete(note));
});
test('events select the next date, including today, without writing new records',()=>{
  const b=base({type:'event',date:'2026-01-01',unit:'week',every:2});
  assert.equal(M.due(b,{date:'2026-08-30',time:'1200'}),'2026-09-10');
  assert.equal(M.due(b,{date:'2026-08-27',time:'2300'}),'2026-08-27');
});
test('monthly events before/after clamped day and before starting',()=>{
  const b=base({type:'event'});
  assert.equal(M.due(b,{date:'2026-02-28',time:'1200'}),'2026-02-28');
  assert.equal(M.due(b,{date:'2026-03-01',time:'1200'}),'2026-03-31');
  assert.equal(M.due(b,{date:'2025-01-01',time:'1200'}),'2026-01-31');
});
test('ended recurring event is not mislabeled as unscheduled',()=>{
  assert.equal(M.status(base({type:'event',until:'2026-01-31'}),{date:'2026-03-01',time:'0600'}),'Series ended');
});
test('Pacific time is independent of viewer time zone and handles daylight saving',()=>{
  assert.deepEqual(M.today(new Date('2026-09-01T05:15:00Z')),{date:'2026-08-31',time:'2215'});
  assert.equal(M.today(new Date('2026-03-08T09:30:00Z')).time,'0130');
  assert.equal(M.today(new Date('2026-03-08T10:30:00Z')).time,'0330');
});
test('military time validation',()=>{
  for(const t of ['0000','2359','0600'])assert.equal(M.time(t),t);
  for(const t of ['2400','1260','6:00','6 PM',''])assert.equal(M.time(t),null);
  assert.equal(M.time('06:00'),'0600');
});
test('dates, schedule limits, and required fields reject invalid input',()=>{
  for(const patch of [{title:''},{title:'x'.repeat(121)},{body:'x'.repeat(5001)},{type:'bad'},{date:'2026-02-30'},{time:'2400'},{every:0},{every:1.5},{every:366},{unit:'bad'},{until:'2025-12-01'},{type:'event',date:''},{date:'',time:'',unit:'day'},{type:'note'},{index:-1},{index:Infinity}])assert.throws(()=>M.validate(base(patch)),JSON.stringify(patch));
  assert.doesNotThrow(()=>M.validate(base()));
});
test('past date, date-only today, and time-specific overdue statuses',()=>{
  const now={date:'2026-01-31',time:'0601'};
  assert.equal(M.status(base(),now),'Overdue');assert.equal(M.status(base({time:''}),now),'Today');
  assert.equal(M.status(base({type:'event',unit:'none'}),now),'Past');
});
test('trash and completion take precedence',()=>{
  assert.equal(M.status(base({deleted:true,completed:true})),'Trash');assert.equal(M.status(base({completed:true})),'Completed');
  assert.throws(()=>M.complete(base({deleted:true})));assert.throws(()=>M.complete(base({completed:true})));
});
test('undo completion restores exactly the previous occurrence',()=>{
  const b=base(),next={...b,...M.complete(b),lastCompletedDate:b.date};
  assert.equal(M.reopen(next).index,0);assert.equal(M.reopen(next).lastCompletedDate,'');
  const final={...base({unit:'none'}),completed:true,lastCompletedDate:b.date};assert.equal(M.reopen(final).completed,false);
});
test('model functions never mutate their input',()=>{
  const b=Object.freeze(base());M.validate(b);M.due(b);M.status(b);M.complete(b);assert.equal(b.index,0);
});
