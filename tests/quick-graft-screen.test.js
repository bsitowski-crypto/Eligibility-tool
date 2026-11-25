const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const zlib=require("node:zlib");

const read=file=>fs.readFileSync(require.resolve("../"+file),"utf8");
const html=zlib.gunzipSync(Buffer.from([1,2,3].map(n=>read("app/data-"+n+".b64").trim()).join(""),"base64")).toString();
const context=vm.createContext({window:{},setInterval:()=>1,cloneData:structuredClone});
const section=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end));
vm.runInContext(section("const GRAFTCRITERIAKEY=","const funeralSeed="),context);
vm.runInContext(section("function parseAgeInput(","function donorAgeYears("),context);
vm.runInContext(section("function otherEligibleChestGrafts(","function screenDonor("),context);
vm.runInContext("loadGraftCriteria()",context);
vm.runInContext(read("post-autopsy-rules.js"),context);
vm.runInContext(read("quick-graft-screen.js"),context);

const defaults={
  location:"portland",age:"52",sex:"male",international:"yes",forProfit:"yes",
  oca:"no",autopsy:"no",organDonor:"no",bmi:"28.1"
};
const screen=overrides=>context.window.PDXQuickGraftScreen.screen({...defaults,...overrides});
const has=(result,name)=>result.some(item=>item.name===name);

test("the pictured inputs screen independently of any open donor",()=>{
  const result=screen();
  assert.ok(has(result.possible,"Heart — Artivion"));
  assert.ok(has(result.possible,"Heart — LeMaitre"));
  assert.ok(has(result.possible,"Anterior Trunk Skin"));
  assert.ok(has(result.review,"Leg Skin"));
  assert.ok(has(result.review,"Pericardium"));
  assert.ok(has(result.excluded,"Adipose"));
  assert.ok(has(result.excluded,"Knee Block (Fresh)"));
});

test("post-organ recovery alone leaves heart and lung transplant status unknown",()=>{
  assert.ok(has(screen({organDonor:"yes"}).review,"Heart — Artivion"));
  assert.ok(has(screen({organDonor:"yes",heartLungsTransplant:"yes"}).excluded,"Heart — Artivion"));
  assert.ok(has(screen({organDonor:"yes",heartLungsTransplant:"no"}).possible,"Heart — Artivion"));
  assert.ok(has(screen({organDonor:"no",heartLungsTransplant:"yes"}).possible,"Heart — Artivion"));
  assert.ok(has(screen({autopsy:"after"}).excluded,"Heart — Artivion"));
  assert.ok(has(screen({autopsy:"after"}).excluded,"Pericardium"));
});

test("authorization, age boundaries, and the entered BMI control the same graft rules",()=>{
  assert.ok(has(screen({bmi:"32",cosmetic:"yes"}).possible,"Adipose"));
  assert.ok(has(screen({bmi:"31.99",cosmetic:"yes"}).excluded,"Adipose"));
  assert.ok(has(screen({bmi:"32"}).review,"Adipose"));
  assert.ok(has(screen({bmi:"32",cosmetic:"yes",forProfit:"no"}).excluded,"Adipose"));
  assert.ok(has(screen({age:"75"}).possible,"Anterior Tibialis"));
  assert.ok(has(screen({age:"75",international:"no"}).excluded,"Anterior Tibialis"));
  assert.ok(has(screen({age:"76"}).excluded,"Anterior Tibialis"));
  assert.ok(has(screen({age:"30",oca:"yes"}).excluded,"Pericardium"));
});

test("missing or unsupported inputs produce no result",()=>{
  for(const overrides of [{age:""},{age:"invalid"},{bmi:""},{bmi:"0"},{forProfit:""},{location:"dayton"}]){
    assert.equal(screen(overrides),null);
  }
});

test("the loader and offline cache include the same version of the quick screen",()=>{
  const script=read("index.html").match(/quick-graft-screen\.js\?v=\d+/)?.[0];
  assert.ok(script);
  assert.ok(read("sw.js").includes('"./'+script+'"'));
});
