const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');
const root=path.join(__dirname,'..');
const html=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
const seed=html.slice(html.indexOf('const graftMasterSeed='),html.indexOf('let grafts=[];'));
const core=html.slice(html.indexOf('function add(m,c,n,'),html.indexOf('function printValue('));
const allSkin=['anteriorSkin','posteriorSkin','legSkin'];
const bone=['humerus','radius','ulna','fascia','femur','tibia','fibula','achilles','hemi'];
const pictured={selected:[...bone,...allSkin,'adipose'],sides:[]};
function harness(legacy=false,additional=[]){
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',innerHTML:'',classList:{remove(){}}});return nodes.get(id);};
  node('tech1').value='T1';node('tech2').value='T2';node('circulator').value='C';node('oca').value='yes';
  const context={console,setInterval(){throw Error('Unexpected delayed installation');},clearInterval(){},
    document:{getElementById:id=>id==='pdxCultureSupplyStyles'?null:node(id),createElement:()=>({}),head:{appendChild(){}}},
    tech1:node('tech1'),tech2:node('tech2'),circulator:node('circulator'),oca:node('oca'),
    supplies:node('supplies'),suppliesCard:node('suppliesCard'),
    techGloveInfo:()=>({surgical:'7.5',under:'',safety:'2XL'}),
    CasePersonnel:{personnel:()=>additional,info:p=>({surgical:p.surgicalGlove||'7.5',under:'',safety:'2XL'})}
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(seed+'\nfunction G(id){return graftMasterSeed.find(g=>g.id===id)}\n'+core,context);
  for(const file of legacy?['supply-name-fix.js','blade-culture-quantity-fix.js','glove-quantity-fix.js','supply-order-fix.js']:['supply-rules.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  function build(recovery){context.buildSupplies(recovery);return JSON.parse(vm.runInContext('JSON.stringify(latestSupplyItems)',context));}
  return {context,nodes,build};
}
const quantities=items=>Object.fromEntries(items.map(i=>[i.n,i.q]));
test('pictured case has corrected cultures, four swabs and unchanged blades/gloves/kits',()=>{
  const h=harness(),items=h.build(pictured),q=quantities(items);
  assert.equal(q.TSB,'9/6/9');assert.equal(q.Thio,'9/6/9');assert.equal(q.RPMI,3);
  assert.equal(q['Culture Swabs'],4);assert.equal(q['Scalpel Blades'],42);
  assert.equal(q['Adipose Recovery Kit'],2);assert.equal(q['Cord Clamps'],4);assert.equal(q['Bone Kit'],1);
  assert.equal(q['T1 — Size 7.5'],23);assert.equal(q['C — Size 7.5'],12);
  assert.deepEqual(h.build(pictured),items,'Rebuilding must not accumulate quantities');
  assert.deepEqual(JSON.parse(JSON.stringify(h.context.orderedPrintableSupplies())),items);
  assert.match(h.nodes.get('supplies').innerHTML,/Culture Swabs/);
  assert.match(h.nodes.get('supplies').innerHTML,/pdx-culture-value">6</);
});
test('skin and adipose swabs survive adding bone/tendon grafts',()=>{
  const h=harness();
  for(const selected of [[...allSkin,'adipose'],[...allSkin,'adipose','humerus'],['anteriorSkin','adipose','achilles']])assert.equal(quantities(h.build({selected,sides:[]}))['Culture Swabs'],4);
  assert.equal(quantities(h.build({selected:['adipose'],sides:[]})).TSB,'0/3/0');
  assert.equal(quantities(h.build({selected:allSkin,sides:[]}))['Culture Swabs'],undefined);
});
test('representative cases retain established quantities apart from the two corrections',()=>{
  const cases=[[],allSkin,['humerus','fascia'],['heartArtivion'],['heartLeMaitre'],['nerves'],['nerves','saphLeMaitre'],['saphLeMaitre'],['heartLeMaitre','saphLeMaitre','femVeinLeMaitre','aiLeMaitre'],['cartilage','pericardium'],['kneeBlock'],['armBlock'],['adipose'],[...allSkin,'adipose'],pictured.selected,[...allSkin,'nerves','heartArtivion']];
  for(const selected of cases){
    const r={selected,sides:[]},old=quantities(harness(true).build(r)),actual=quantities(harness().build(r));
    if(selected.includes('adipose')){
      for(const name of ['TSB','Thio']){const parts=old[name].split('/').map(Number);parts[1]--;old[name]=parts.join('/');}
      if(selected.some(id=>allSkin.includes(id)))old['Culture Swabs']=4;
    }
    assert.deepEqual(actual,old,selected.join(','));
  }
});
test('unilateral recovery and processor exclusions retain culture accounting',()=>{
  const h=harness();
  const q=quantities(h.build({selected:['humerus','freshKnee','heartArtivion','saphLeMaitre','nerves'],sides:['bilateral_humerus_left','freshKnee_right']}));
  assert.equal(q.TSB,'1/0/1');assert.equal(q.Thio,'1/0/1');
  assert.equal(q['Scalpel Blades'],7); // two arms + two legs + one chest + two graft blades
});
test('additional techs receive nerve and heart glove extras once on each build',()=>{
  const h=harness(false,[{role:'tech',name:'Visitor',surgicalGlove:'8'}]);
  const r={selected:['humerus','nerves','heartArtivion'],sides:[]};
  for(let i=0;i<2;i++){
    const q=quantities(h.build(r));
    assert.equal(q['T1 — Size 7.5'],28);assert.equal(q['T2 — Size 7.5'],28);
    assert.equal(q['Visitor — Size 8'],28);assert.equal(q['C — Size 7.5'],12);
  }
});
test('loader activates only the consolidated supply rules',()=>{
  const loader=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.equal((loader.match(/supply-rules\.js\?v=9211/g)||[]).length,1);
  for(const name of ['supply-name-fix','blade-culture-quantity-fix','glove-quantity-fix','supply-order-fix'])assert.ok(!loader.includes(name+'.js'));
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.ok(sw.includes('./supply-rules.js?v=9211'));
});
