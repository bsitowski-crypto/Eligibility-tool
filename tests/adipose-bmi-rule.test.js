"use strict";

const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const rule=require("../adipose-bmi-rule.js");

function planner(weightPounds){
  const events={};
  const elements={
    weight:{value:String(weightPounds),addEventListener(type,fn){(events[type]??=[]).push(fn)}},
    height:{value:"70",addEventListener(type,fn){(events[type]??=[]).push(fn)}},
    age:{value:"30"},sex:{value:"male"},bmi:{textContent:""},
    recoveryOptions:{children:[{}]},recover_adipose:{},
    validationCard:{classList:{add(value){this[value]=true}}},
    suppliesCard:{classList:{add(value){this[value]=true}}},
    printActions:{classList:{add(value){this[value]=true}}}
  };
  const document={getElementById:id=>elements[id]||null};
  let selected=["femur","adipose"],screens=0,snapshots=0;
  const root={
    lbs:()=>Number(elements.weight.value),ins:()=>Number(elements.height.value),
    calcBMI(){elements.bmi.textContent=rule.measuredBMI(this.lbs(),this.ins()).toFixed(1)},
    G:id=>({id}),donorAgeYears:()=>30,
    graftRuleReasons(graft){
      return graft.id==="adipose"&&parseFloat(elements.bmi.textContent)<32
        ?["Adipose requires BMI ≥ 32."]:[];
    },
    getRecovery:()=>({selected:[...selected],sides:["bilateral_femur_left"]}),
    screenDonor(restore){
      screens++;
      const available=this.graftRuleReasons({id:"adipose"},30,"male").length===0;
      if(available)elements.recover_adipose={};
      else delete elements.recover_adipose;
      selected=(restore?.selected||[]).filter(id=>id!=="adipose"||available);
    },
    validateRecovery(){return this.getRecovery()},
    snapshot(){snapshots++}
  };
  root.calcBMI();
  assert.equal(rule.install(root,document),true);
  return {elements,root,events,get screens(){return screens},get snapshots(){return snapshots}};
}

test("full precision BMI enforces 32 even when the display rounds up",()=>{
  const threshold=32*70*70/703;
  assert.ok(rule.measuredBMI(threshold-0.05,70)<32);
  assert.ok(rule.measuredBMI(threshold,70)>=32);
  assert.ok(Number.isNaN(rule.measuredBMI(null,70)));

  const app=planner(threshold-0.05);
  assert.equal(app.elements.bmi.textContent,"32.0");
  app.root.calcBMI();
  assert.equal(app.elements.bmi.textContent,"<32.0");
  assert.deepEqual(app.root.graftRuleReasons({id:"adipose"},30,"male"),["Adipose requires BMI ≥ 32."]);
  assert.deepEqual(app.root.getRecovery().selected,["femur"]);
  app.elements.weight.value=String(threshold);
  app.root.calcBMI();
  assert.deepEqual(app.root.graftRuleReasons({id:"adipose"},30,"male"),[]);
});

test("changing weight removes adipose from an existing plan and invalidates its printout",()=>{
  const app=planner(230);
  app.elements.weight.value="220";
  app.root.calcBMI();
  app.events.input.forEach(fn=>fn());

  assert.equal(app.elements.recover_adipose,undefined);
  assert.deepEqual(app.root.getRecovery(),{
    selected:["femur"],sides:["bilateral_femur_left"]
  });
  assert.equal(app.screens,1);
  assert.equal(app.snapshots,1);
  for(const id of ["validationCard","suppliesCard","printActions"]){
    assert.equal(app.elements[id].classList.hidden,true);
  }
  assert.deepEqual(app.root.validateRecovery().selected,["femur"]);

  app.elements.weight.value="230";
  app.root.calcBMI();
  app.events.input.forEach(fn=>fn());
  assert.ok(app.elements.recover_adipose,"adipose becomes available at BMI 32 or higher");
  assert.deepEqual(app.root.getRecovery().selected,["femur"],"other selections stay intact");
});

test("the live script can read the planner's lexical graft lookup",()=>{
  const events=[];
  const elements={
    recoveryOptions:{children:[{}]},age:{value:"30"},sex:{value:"male"},
    recover_adipose:{},weight:{addEventListener(type,fn){if(type==="input")events.push(fn)}},
    height:{addEventListener(){}},bmi:{textContent:"31.6"}
  };
  const context={
    document:{getElementById:id=>elements[id]||null},
    lbs:()=>220,ins:()=>70,calcBMI(){},donorAgeYears:()=>30,
    graftRuleReasons:()=>[],getRecovery:()=>({selected:["adipose"],sides:[]}),
    screenDonor(){delete elements.recover_adipose},snapshot(){}
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext("const G = id => ({id});",context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../adipose-bmi-rule.js"),"utf8"),context);
  assert.equal(context.__pdxAdiposeBmiRule,true);
  events[0]();
  assert.equal(elements.recover_adipose,undefined);
});

test("the planner loads the rule and caches it for offline use",()=>{
  const root=path.join(__dirname,"..");
  assert.match(fs.readFileSync(path.join(root,"index.html"),"utf8"),/adipose-bmi-rule\.js\?v=9200/);
  assert.match(fs.readFileSync(path.join(root,"sw.js"),"utf8"),/adipose-bmi-rule\.js\?v=9200/);
});
