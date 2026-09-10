const test=require('node:test');
const assert=require('node:assert/strict');
const {applyNonBoneSupplyRules:apply}=require('../supply-order-fix.js');
const zones=['anteriorSkin','posteriorSkin','legSkin'];
const base=[{n:'Gown',q:1},{n:'OR Towels',q:2},{n:'CHG',q:3}];
test('all non-bone configurations omit gowns and OR towels',()=>{
  for(const id of ['heartArtivion','heartLeMaitre','nerves','adipose','saphLeMaitre','femVeinArtivion','fascia','pericardium',...zones]){
    assert.deepEqual(apply(base,[id]),[{n:'CHG',q:3}]);
  }
  assert.equal(base.length,3);
});
test('bones, tendons and cartilage with sternum retain existing supplies',()=>{
  for(const id of ['femur','achilles','cartilage','freshKnee','hemi']){
    assert.deepEqual(apply(base,[...zones,id]),base);
  }
  assert.deepEqual(apply(base,{selected:zones,sides:['bilateral_antTib_left']}),base);
  assert.deepEqual(apply(base,{selected:zones,sides:['freshKnee_right']}),base);
});
test('three skin zones plus any non-bone graft add exactly one pack',()=>{
  for(const other of [[],['adipose'],['nerves','heartLeMaitre']]){
    const selected=[...zones,...other];
    const result=apply([...base,{n:'Sterile Bags',q:2}],selected);
    const bags=result.filter(x=>x.n==='Sterile Bags');
    assert.equal(bags.length,1);assert.equal(bags[0].q,1);assert.match(bags[0].note,/1 pack/);
    assert.deepEqual(apply(result,selected),result);
  }
});
test('one or two skin zones do not trigger a bag pack',()=>{
  for(const selected of [[],zones.slice(0,1),zones.slice(0,2)]){
    assert.equal(apply(base,[...selected,'adipose']).some(x=>x.n==='Sterile Bags'),false);
  }
});
