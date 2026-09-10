const test=require('node:test');
const assert=require('node:assert/strict');
const {applyNonBoneSupplyRules:apply}=require('../supply-order-fix.js');
const zones=['anteriorSkin','posteriorSkin','legSkin'];
const base=[{n:'Gown',q:1},{n:'OR Towels',q:2},{n:'CHG',q:3}];
test('non-bone configurations without heart omit gowns and OR towels',()=>{
  for(const id of ['nerves','adipose','saphLeMaitre','femVeinArtivion','fascia','pericardium',...zones]){
    assert.deepEqual(apply(base,[id]),[{n:'CHG',q:3}]);
  }
  assert.equal(base.length,3);
});
test('either heart processor without Solvita grafts gets exact setup quantities',()=>{
  for(const heart of ['heartArtivion','heartLeMaitre']){
    for(const other of [[],['nerves','adipose','saphLeMaitre']]){
      const selected=[heart,...other];
      const result=apply([...base,{n:'U-Drapes',q:7},{n:'Sterile Tray',q:3}],selected);
      for(const [name,qty] of [['Gown',1],['U-Drapes',2],['Sterile Tray',1]]){
        assert.deepEqual(result.filter(x=>x.n===name).map(x=>x.q),[qty]);
      }
      assert.equal(result.some(x=>x.n==='OR Towels'),false);
      assert.deepEqual(apply(result,selected),result);
    }
  }
});
test('Solvita grafts and side-specific bones prevent the heart setup exception',()=>{
  for(const id of [...zones,'fascia','pericardium','cartilage','femur','achilles']){
    const result=apply(base,['heartArtivion',id]);
    assert.equal(result.some(x=>x.n==='U-Drapes'||x.n==='Sterile Tray'),false);
  }
  const result=apply(base,{selected:['heartLeMaitre'],sides:['ocaStd_femur_left']});
  assert.deepEqual(result,base);
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
