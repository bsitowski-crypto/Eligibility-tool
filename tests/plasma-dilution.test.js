"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const calc=require("../plasma-dilution-calculator.js");

const base=overrides=>({
  age:58,sex:"male",height:69,heightUnit:"in",weight:210,weightUnit:"lb",
  sampleDate:"2026-09-11",sampleTime:"1630",asystoleDate:"2026-09-11",asystoleTime:"1500",
  receivedInfusions:"yes",preInfusionSample:"no",bloodLoss:"no",entries:[],...overrides
});

test("military time and measurement conversion",()=>{
  assert.equal(calc.parseMilitaryTime("0000"),0);assert.equal(calc.parseMilitaryTime("23:59"),1439);
  for(const bad of ["2400","1260","1:30","6 PM",""])assert.equal(calc.parseMilitaryTime(bad),null);
  assert.deepEqual(calc.measurementValues({height:175.26,heightUnit:"cm",weight:95.45,weightUnit:"kg"}),{heightInputUnit:"cm",weightInputUnit:"kg",heightInches:69,heightCentimeters:175.26,weightPounds:209.99,weightKilograms:95.45});
  assert.deepEqual(calc.measurementValues({height:"175.26 cm",weight:"95.45kg"}),{heightInputUnit:"cm",weightInputUnit:"kg",heightInches:69,heightCentimeters:175.26,weightPounds:209.99,weightKilograms:95.45});
  assert.deepEqual(calc.measurementValues({height:"69",weight:"210"}),{heightInputUnit:"in",weightInputUnit:"lb",heightInches:69,heightCentimeters:175.26,weightPounds:210,weightKilograms:95.45});
});

test("Safari-formatted dates and military times are accepted",()=>{
  const iso=calc.parseDateTime("2026-07-18","2300"),safari=calc.parseDateTime("07/18/2026","2300");
  assert.equal(iso.getTime(),safari.getTime());
  assert.equal(calc.parseDateTime("7/18/2026","1615").getHours(),16);
  assert.equal(calc.parseDateTime("02/30/2026","1615"),null);
  const window=calc.assessmentWindow(base({sampleDate:"07/18/2026",sampleTime:"2300",asystoleDate:"07/18/2026",asystoleTime:"1615"}));
  assert.equal(window.errors.length,0);assert.equal(window.end.getHours(),16);assert.equal(window.start.getDate(),16);
});

test("approved weight formulas and rounding",()=>{
  const r=calc.calculateVolumes(base({}));
  assert.equal(r.bsa,2.15);assert.equal(r.weightKilograms,95.45);assert.equal(r.method,"weight");
  assert.equal(r.plasmaVolume,3818);assert.equal(r.bloodVolume,6364);
});

test("BSA formulas apply below 45 kg and above 100 kg",()=>{
  const r=calc.calculateVolumes({height:175,heightUnit:"cm",weight:110,weightUnit:"kg",sex:"male"});
  assert.equal(r.method,"bsa");assert.equal(r.bsa,2.31);assert.equal(r.plasmaVolume,3604);assert.equal(r.bloodVolume,6330);
});

test("assessment ends at earlier of sample draw and asystole",()=>{
  let r=calc.assessmentWindow(base({}));assert.equal(r.end.getHours(),15);assert.equal((r.end-r.start)/(60*60*1000),48);
  r=calc.assessmentWindow(base({sampleTime:"1400",asystoleTime:"1500"}));assert.equal(r.end.getHours(),14);
});

test("worst-case incomplete infusion uses minute plus one and bag cap",()=>{
  assert.equal(calc.calculateIncompleteVolume({access:"iv-18",minutes:4,bagVolume:1000}),525);
  assert.equal(calc.calculateIncompleteVolume({access:"iv-18",minutes:0,bagVolume:1000}),0);
  assert.equal(calc.calculateIncompleteVolume({access:"iv-18",minutes:10,bagVolume:1000}),1000);
  assert.equal(calc.calculateIncompleteVolume({access:"io-sternum",minutes:1,bagVolume:1000}),188);
});

test("component defaults and explicit volumes",()=>{
  assert.equal(calc.entryVolume({component:"prbc",quantity:2}),700);
  assert.equal(calc.entryVolume({component:"ffp"}),275);
  assert.equal(calc.entryVolume({component:"saline",volume:400}),400);
});

test("crystalloid choices include medications, sodium bicarbonate, and named other fluids",()=>{
  assert.equal(calc.COMPONENTS.medication.label,"Meds in Solution");
  assert.equal(calc.COMPONENTS.sodium_bicarbonate.label,"Sodium Bicarbonate");
  assert.equal(calc.COMPONENTS.medication.category,"medication");
  assert.equal(calc.COMPONENTS.sodium_bicarbonate.category,"medication");
  const unnamed=calc.calculate(base({entries:[{category:"crystalloid",component:"other_crystalloid",date:"2026-09-11",time:"1430",volume:100}]}));
  assert.ok(unnamed.errors.some(error=>error.message.includes("name the other crystalloid")));
  const named=calc.calculate(base({entries:[{category:"crystalloid",component:"other_crystalloid",customLabel:"Normosol",date:"2026-09-11",time:"1430",volume:100}]}));
  assert.equal(named.errors.length,0);assert.equal(named.totals.crystalloids,100);
});

test("medication components keep the 25 mL and 500 mL rules when selected from the crystalloid section",()=>{
  const r=calc.calculate(base({entries:[
    {category:"crystalloid",component:"other_colloid",date:"2026-09-11",time:"1300",volume:3318},
    {category:"crystalloid",component:"medication",date:"2026-09-11",time:"1430",volume:25}
  ]}));
  assert.equal(r.entries[1].category,"medication");assert.equal(r.totals.includeMedications,true);assert.equal(r.totals.crystalloids,25);
});

test("48-hour and one-hour windows plus 50 mL crystalloid threshold",()=>{
  const entries=[
    {component:"prbc",date:"2026-09-09",time:"1500"},
    {component:"ffp",date:"2026-09-09",time:"1459"},
    {component:"saline",date:"2026-09-11",time:"1400",volume:50},
    {component:"ringers_lactate",date:"2026-09-11",time:"1430",volume:49}
  ];
  const r=calc.calculate(base({entries}));
  assert.equal(r.valid,true);assert.deepEqual(r.totals,{blood:350,colloids:0,crystalloids:50,medications:0,within500:false,includeMedications:false});
  assert.deepEqual(r.entries.map(x=>x.included),[true,false,true,false]);
});

test("medications count only when total is at least 25 mL and qualified result is within 500 mL",()=>{
  const near=calc.calculate(base({entries:[
    {component:"other_colloid",date:"2026-09-11",time:"1300",volume:3318},
    {component:"medication",date:"2026-09-11",time:"1430",volume:25}
  ]}));
  assert.equal(near.totals.within500,true);assert.equal(near.totals.includeMedications,true);assert.equal(near.totals.crystalloids,25);
  const far=calc.calculate(base({entries:[{component:"medication",date:"2026-09-11",time:"1430",volume:100}]}));
  assert.equal(far.totals.within500,false);assert.equal(far.totals.crystalloids,0);
});

test("both worksheet comparisons must be no; equality does not exceed",()=>{
  let r=calc.calculate(base({entries:[{component:"other_colloid",date:"2026-09-11",time:"1300",volume:3818}]}));
  assert.equal(r.questions.q1Exceeded,false);assert.equal(r.acceptable,true);
  r=calc.calculate(base({entries:[{component:"other_colloid",date:"2026-09-11",time:"1300",volume:3819}]}));
  assert.equal(r.questions.q1Exceeded,true);assert.equal(r.acceptable,false);
  r=calc.calculate(base({entries:[{component:"other_blood",date:"2026-09-11",time:"1300",volume:6365}]}));
  assert.equal(r.questions.q2Exceeded,true);assert.equal(r.acceptable,false);
});

test("worksheet shortcuts do not require calculation inputs",()=>{
  const noInfusions=calc.calculate({receivedInfusions:"no",entries:[]});assert.equal(noInfusions.shortcut,"no-infusions");assert.equal(noInfusions.valid,true);assert.equal(noInfusions.acceptable,true);
  const preSample=calc.calculate({receivedInfusions:"yes",preInfusionSample:"yes",entries:[]});assert.equal(preSample.shortcut,"pre-infusion-sample");assert.equal(preSample.valid,true);assert.equal(preSample.acceptable,true);
});

test("clinical review and sample timing flags appear",()=>{
  const r=calc.calculate(base({age:12,bloodLoss:"yes",weight:110,weightUnit:"kg",sampleDate:"2026-09-13",sampleTime:"0400"}));
  assert.ok(r.flags.some(x=>x.includes("17 or younger")));assert.ok(r.flags.some(x=>x.includes("12 or younger")));assert.ok(r.flags.some(x=>x.includes("outside 45–100 kg")));assert.ok(r.flags.some(x=>x.includes("36 hours")));
});

test("published shell loads calculator engine before UI and caches both",()=>{
  const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8"),index=read("index.html"),cache=read("sw.js"),ui=read("plasma-dilution-tool.js");
  for(const file of ["plasma-dilution-calculator.js","plasma-dilution-tool.js"]){assert.ok(index.includes(`${file}?v=9185`));assert.ok(cache.includes(`"./${file}"`));}
  assert.ok(index.indexOf("plasma-dilution-calculator.js")<index.indexOf("plasma-dilution-tool.js"));
  assert.ok(index.indexOf("planner-tools.js")<index.indexOf("plasma-dilution-tool.js"));
  assert.ok(ui.includes("Plasma dilution calculator"));assert.ok(ui.includes("Inches by default"));assert.ok(ui.includes("add cm to convert"));assert.ok(ui.includes("Pounds by default"));assert.ok(ui.includes("add kg to convert"));
  assert.ok(ui.includes("sodium_bicarbonate"));assert.ok(ui.includes("Other crystalloid name"));assert.ok(ui.includes("pd-custom-component"));
});
