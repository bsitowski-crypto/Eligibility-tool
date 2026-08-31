"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {parseTime,formatDuration,calculate}=require("../cooling-calculator.js");
const run=(death,initial,prep,intervals=[])=>calculate({death,initial,prep,intervals});
test("military time validation and duration formatting",()=>{
  assert.equal(parseTime("0000"),0);assert.equal(parseTime("23:59"),1439);assert.equal(parseTime(" 0630 "),390);
  for(const input of ["2400","1260","-100","1:30","6 PM","06000","","NaN"])assert.equal(parseTime(input),null,input);
  assert.equal(formatDuration(0),"0 h 00 min");assert.equal(formatDuration(1530),"25 h 30 min");assert.equal(formatDuration(null),"—");
});
test("initial cooling delay always counts even without removal intervals",()=>{
  const r=run("0600","0900","1800");assert.equal(r.valid,true);assert.equal(r.totalOut,180);assert.equal(r.deathToPrep,720);assert.deepEqual(r.alerts,[]);
});
test("approved preview example, midnight and final interval beside prep",()=>{
  const r=run("0600","1900","0430",[{out:"2030",in:"2230"},{out:"0230",untilPrep:true}]);
  assert.equal(r.initialDelay,780);assert.equal(r.deathToPrep,1350);assert.equal(r.totalOut,1020);
  assert.deepEqual(r.intervals.map(x=>x.minutes),[120,120]);assert.equal(r.alerts.length,2);
});
test("thresholds strictly greater than, with AND for late cooling and prep",()=>{
  assert.deepEqual(run("0600","1800","2200").alerts,[]); // exactly 12 h
  assert.deepEqual(run("0600","1801","2100").alerts,[]); // exactly 15 h
  assert.deepEqual(run("0600","1801","2101").alerts.map(a=>a.code),["late-cooling-and-prep"]);
  assert.deepEqual(run("0600","0700","2200",[{out:"0800",untilPrep:true}]).alerts,[]); // exactly 15 h out
  assert.deepEqual(run("0600","0700","2201",[{out:"0800",untilPrep:true}]).alerts.map(a=>a.code),["total-out"]);
});
test("no death-to-prep 24-hour check, even for a multi-rollover sequence",()=>{
  const r=run("0600","0700","0800",[{out:"0500",in:"0530"},{out:"0700",in:"0730"}]);
  assert.equal(r.deathToPrep,1560);assert.equal(r.totalOut,120);assert.deepEqual(r.alerts,[]);
});
test("return crossing midnight and equal times",()=>{
  const r=run("2100","2200","0600",[{out:"2300",in:"0100"},{out:"0300",in:"0300"}]);
  assert.equal(r.deathToPrep,540);assert.equal(r.totalOut,180);assert.deepEqual(r.intervals.map(x=>x.minutes),[120,0]);
});
test("missing and invalid times withhold totals and threshold conclusions",()=>{
  for(const data of [{death:"",initial:"0800",prep:"0900"},{death:"0600",initial:"2400",prep:"0900"},{death:"0600",initial:"0800",prep:""},{death:"0600",initial:"0800",prep:"1200",intervals:[{out:"0900",in:""}]}]){
    const r=calculate(data);assert.equal(r.valid,false);assert.equal(r.totalOut,null);assert.deepEqual(r.alerts,[]);assert.ok(r.errors.length);
  }
});
test("only final interval may remain out, ignoring hidden return value",()=>{
  assert.equal(run("0600","0700","1000",[{out:"0800",untilPrep:true},{out:"0900",in:"0930"}]).valid,false);
  const r=run("0600","0700","1000",[{out:"0800",in:"invalid",untilPrep:true}]);assert.equal(r.totalOut,180);
});
test("partition invariant over generated chronological minute sequences",()=>{
  const clock=n=>String(Math.floor((n%1440)/60)).padStart(2,"0")+String(n%60).padStart(2,"0");
  for(let start=0;start<1440;start+=29){
    const times=[start,start+75,start+130,start+271,start+400,start+502];
    const r=run(clock(times[0]),clock(times[1]),clock(times[5]),[{out:clock(times[2]),in:clock(times[3])},{out:clock(times[4]),untilPrep:true}]);
    assert.equal(r.valid,true);assert.equal(r.deathToPrep,502);assert.equal(r.totalOut,75+141+102);assert.ok(r.totalOut<=r.deathToPrep);
  }
});
test("tool integration includes scripts, offline shell, and header exemption",()=>{
  const fs=require("node:fs"),path=require("node:path");
  const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
  const index=read("index.html"),cache=read("sw.js"),ui=read("planner-tools.js");
  for(const file of ["cooling-calculator.js","planner-tools.js"]){assert.ok(index.includes(`${file}?v=9172`));assert.ok(cache.includes(`"./${file}"`));}
  assert.ok(index.indexOf("cooling-calculator.js")<index.indexOf("planner-tools.js"));
  assert.ok(read("compact-menu.js").includes('el.id==="plannerToolsButton"'));
  assert.ok(ui.includes('@media(max-width:700px)'));assert.ok(ui.includes('dialog.showModal()'));
  assert.ok(!ui.includes('type="date"'));assert.ok(!ui.includes('24-hour check'));
  assert.ok(!ui.includes('localStorage'));assert.ok(!ui.includes('fetch('));
});
