"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const rules=fs.readFileSync(path.join(__dirname,"../firestore.rules"),"utf8");

test("complete rules preserve every existing collection",()=>{
  for(const collection of ["donors","approvedUsers","activityLogs","editing","masterSettings"]){
    assert.match(rules,new RegExp(`match /${collection.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}/`));
  }
  assert.match(rules,/match \/teamBoardItems\/\{itemId\}/);
  assert.match(rules,/match \/\{document=\*\*\}/);
});

test("team board access requires an active approval and completed password change",()=>{
  const start=rules.indexOf("function isTeamBoardApproved()"),end=rules.indexOf("function teamBoardValid",start),block=rules.slice(start,end);
  assert.match(block,/\.data\.get\('approved', false\) == true/);
  assert.match(block,/\.data\.get\('mustResetPassword', false\) == false/);
  assert.match(block,/isAdmin\(\)/);
  assert.doesNotMatch(block,/\|\| exists\([\s\S]*?\)\s*\);/);
});

test("team board is PDX-scoped, fully shaped, recoverably deleted, and revision guarded",()=>{
  const start=rules.indexOf("function teamBoardValid"),block=rules.slice(start);
  assert.match(block,/d\.branchId == 'pdx'/);
  assert.match(block,/d\.keys\(\)\.hasAll/);assert.match(block,/d\.keys\(\)\.hasOnly/);
  assert.match(block,/allow list:[\s\S]*resource\.data\.branchId == 'pdx'/);
  assert.match(block,/request\.resource\.data\.revision == resource\.data\.revision \+ 1/);
  assert.match(block,/request\.resource\.data\.createdBy == resource\.data\.createdBy/);
  assert.match(block,/d\.updatedBy == request\.auth\.uid/);
  assert.match(block,/allow delete: if false/);
});

test("new team items cannot forge authorship or initial history",()=>{
  const start=rules.indexOf("allow create: if isTeamBoardApproved()",rules.indexOf("match /teamBoardItems")),end=rules.indexOf("allow update:",start),block=rules.slice(start,end);
  assert.match(block,/createdBy == request\.auth\.uid/);assert.match(block,/createdAt == request\.time/);
  assert.match(block,/revision == 1/);assert.match(block,/index == 0/);
  assert.match(block,/completed == false/);assert.match(block,/deleted == false/);
  assert.match(block,/lastCompletedDate == ''/);assert.match(block,/lastCompletedBy == ''/);assert.match(block,/lastCompletedAt == null/);
});

 test("non-board access preserves the owner-supplied live approval helper",()=>{
  const block=rules.slice(rules.indexOf('function isApproved()'),rules.indexOf('function isTeamBoardApproved()'));
  assert.match(block,/exists\(/);
  assert.doesNotMatch(block,/\.data\.get/);
  const board=rules.slice(rules.indexOf('match /teamBoardItems/'),rules.indexOf('match /{document=**}'));
  assert.equal((board.match(/if isTeamBoardApproved\(\)/g)||[]).length,4);
 });
