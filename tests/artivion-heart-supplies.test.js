const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=zlib.gunzipSync(Buffer.from([1,2,3].map(i=>fs.readFileSync(path.join(root,`app/data-${i}.b64`),'utf8').trim()).join(''),'base64')).toString();
function supplies(selected){
 const context={oca:{value:'no'},G:id=>({id,group:'pfo'}),assignedGlovePulls:()=>[],supplies:{},suppliesCard:{classList:{remove(){}}}};
 vm.createContext(context);
 vm.runInContext(html.slice(html.indexOf('function add(m,c,n,'),html.indexOf('let latestSupplyItems='))+'let latestSupplyItems=[];'+html.slice(html.indexOf('function buildSupplies(r){'),html.indexOf('function printValue(')),context);
 context.buildSupplies({selected,sides:[]});return JSON.parse(vm.runInContext('JSON.stringify(latestSupplyItems)',context));
}
test('Artivion heart needs five sodium chloride bottles and other graft quantities remain additive',()=>{
 const nacl=ids=>supplies(ids).filter(x=>x.c==='Artivion'&&x.n==='NaCl').reduce((sum,x)=>sum+x.q,0);
 assert.equal(nacl(['heartArtivion']),5);assert.equal(nacl(['heartArtivion','saphArtivion']),7);
 assert.equal(nacl(['heartArtivion','aiArtivion']),7);assert.equal(nacl(['saphArtivion']),2);
 assert.equal(nacl(['heartLeMaitre']),0);
});
