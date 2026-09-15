const test=require("node:test");
const assert=require("node:assert/strict");
const {applyBoneKitTrayRule:apply}=require("../supply-order-fix.js");

const existing=[
  {c:"Recovery Kits",n:"Bone Tray",q:2},
  {c:"Recovery Kits",n:"Bone Kit",q:1},
  {c:"Recovery Kits",n:"Vein Kit",q:1}
];
const setupNames=items=>items
  .filter(item=>item.n==="Bone Tray"||item.n==="Bone Kit")
  .map(item=>[item.n,item.q]);

test("bone and bone-tendon recoveries use one bone kit regardless of skin",()=>{
  for(const selected of [
    ["femur"],
    ["femur","achilles"],
    ["anteriorSkin","posteriorSkin","legSkin","femur","achilles"],
    ["cartilage"]
  ]){
    assert.deepEqual(setupNames(apply(existing,selected)),[["Bone Kit",1]]);
  }
});

test("nerves plus at least one saphenous or femoral vein use one bone tray",()=>{
  for(const vein of ["saphArtivion","saphLeMaitre","femVeinArtivion","femVeinLeMaitre"]){
    assert.deepEqual(setupNames(apply(existing,["nerves",vein])),[["Bone Tray",1]]);
    assert.deepEqual(setupNames(apply(existing,["nerves",vein,"femur","anteriorSkin"])),[["Bone Tray",1]]);
  }
});

test("skin, nerves alone, veins alone, and two veins without nerves use neither",()=>{
  for(const selected of [
    ["anteriorSkin","posteriorSkin"],
    ["nerves"],
    ["saphLeMaitre"],
    ["femVeinArtivion"],
    ["saphLeMaitre","femVeinArtivion"],
    ["anteriorSkin","adipose"]
  ]){
    assert.deepEqual(setupNames(apply(existing,selected)),[]);
  }
});

test("side-specific bone selections also receive a bone kit",()=>{
  assert.deepEqual(setupNames(apply(existing,{selected:["anteriorSkin"],sides:["bilateral_femur_left"]})),[["Bone Kit",1]]);
});
