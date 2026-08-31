"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../compact-menu.js"),"utf8");
function setup(width=1440,height=900){
  const window={innerWidth:width,innerHeight:height};
  vm.runInNewContext(source,{window,document:{documentElement:{clientWidth:width}},setInterval(){},setTimeout(){}});
  const panel={style:{},getBoundingClientRect:()=>({width:Math.min(330,width-16)})};
  const button={getBoundingClientRect:()=>({left:420,bottom:70})};
  return {window,panel,button,position:()=>window.positionPlannerDropdown(button,panel)};
}
test("desktop dropdown anchors below button, not screen right",()=>{const x=setup();x.position();assert.equal(x.panel.style.left,"420px");assert.equal(x.panel.style.top,"76px");assert.equal(x.panel.style.right,"auto");});
test("right-edge button keeps dropdown on screen",()=>{const x=setup();x.button.getBoundingClientRect=()=>({left:1360,bottom:70});x.position();assert.equal(x.panel.style.left,"1102px");});
test("phone dropdown is bounded and tracks lower header",()=>{const x=setup(390,844);x.button.getBoundingClientRect=()=>({left:16,bottom:140});x.position();assert.equal(x.panel.style.left,"16px");assert.equal(x.panel.style.top,"146px");assert.equal(x.panel.style.maxHeight,"690px");});
test("tools gets its own button position",()=>{const x=setup();x.panel.getBoundingClientRect=()=>({width:300});x.button.getBoundingClientRect=()=>({left:524,bottom:70});x.position();assert.equal(x.panel.style.left,"524px");});
test("scroll/resize recomputes position and available height",()=>{const x=setup();x.position();x.button.getBoundingClientRect=()=>({left:20,bottom:100});x.window.innerHeight=500;x.position();assert.equal(x.panel.style.top,"106px");assert.equal(x.panel.style.left,"20px");assert.equal(x.panel.style.maxHeight,"386px");});
test("zoomed visual viewport keeps panel inside visible area",()=>{const x=setup();x.window.visualViewport={offsetLeft:50,offsetTop:30,width:400,height:500};x.position();assert.equal(x.panel.style.left,"112px");assert.equal(x.panel.style.maxWidth,"384px");assert.equal(x.panel.style.maxHeight,"446px");});
