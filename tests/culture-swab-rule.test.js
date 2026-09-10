const test=require("node:test");
const assert=require("node:assert/strict");

global.G=id=>({
  anteriorSkin:{id:"anteriorSkin",skin:1,culture:"M"},
  posteriorSkin:{id:"posteriorSkin",skin:1,culture:"M"},
  adipose:{id:"adipose",processor:"RegenTX",culture:"M4"},
  femur:{id:"femur",culture:"LR"},
  nerves:{id:"nerves",processor:"Axogen"}
}[id]||{id});

const rules=require("../blade-culture-quantity-fix.js");

function recovery(selected){return {selected,sides:[]}}

test("skin plus adipose without bone or tendon pulls four culture swabs",()=>{
  const current=recovery(["anteriorSkin","adipose"]);
  assert.equal(rules.cultureSwabCount(current),4);
  const swabs=rules.correctedItems([],current).filter(item=>item.n==="Culture Swabs");
  assert.equal(swabs.length,1);
  assert.equal(swabs[0].q,4);
});

test("multiple skin zones plus adipose still pull exactly four culture swabs",()=>{
  const current=recovery(["anteriorSkin","posteriorSkin","adipose"]);
  assert.equal(rules.cultureSwabCount(current),4);
});

test("bone or tendon recovery removes the special culture-swab pull",()=>{
  const current=recovery(["anteriorSkin","adipose","femur"]);
  assert.equal(rules.cultureSwabCount(current),0);
  assert.equal(rules.correctedItems([],current).some(item=>item.n==="Culture Swabs"),false);
});

test("skin-only and adipose-only cases do not use the combination rule",()=>{
  assert.equal(rules.cultureSwabCount(recovery(["anteriorSkin"])),0);
  assert.equal(rules.cultureSwabCount(recovery(["adipose"])),0);
});

test("the combination rule remains active with non-bone, non-tendon grafts",()=>{
  assert.equal(rules.cultureSwabCount(recovery(["anteriorSkin","adipose","nerves"])),4);
});

test("an existing culture-swab row is replaced instead of duplicated",()=>{
  const current=recovery(["anteriorSkin","adipose"]);
  const items=rules.correctedItems([{c:"Core",n:"Culture Swabs",q:2}],current)
    .filter(item=>item.n==="Culture Swabs");
  assert.deepEqual(items.map(item=>item.q),[4]);
});
