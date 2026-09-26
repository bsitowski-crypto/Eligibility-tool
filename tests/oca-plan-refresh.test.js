"use strict";

const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

test("switching OCA/JRF rebuilds the available grafts and invalidates the old result",()=>{
  let change, screens=0, snapshots=0;
  const hidden=new Set();
  const elements={
    age:{value:"30"},
    oca:{value:"no",addEventListener(type,fn){if(type==="change")change=fn}},
    validationCard:{classList:{add:()=>hidden.add("validationCard")}},
    suppliesCard:{classList:{add:()=>hidden.add("suppliesCard")}},
    printActions:{classList:{add:()=>hidden.add("printActions")}}
  };
  const context={
    document:{getElementById:id=>elements[id]||null},
    screenDonor(){screens++},
    snapshot(){snapshots++}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../oca-plan-refresh.js"),"utf8"),context);

  elements.oca.value="yes";
  change();
  assert.equal(screens,1);
  assert.equal(snapshots,1);
  assert.deepEqual([...hidden].sort(),["printActions","suppliesCard","validationCard"]);

  elements.oca.value="no";
  change();
  assert.equal(screens,2,"switching back removes OCA choices too");
});
