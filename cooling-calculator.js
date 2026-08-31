(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.CoolingCalculator=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  function parseTime(value){
    const match=String(value??"").trim().match(/^(\d{2}):?(\d{2})$/);
    if(!match)return null;
    const h=Number(match[1]),m=Number(match[2]);
    return h<24&&m<60?h*60+m:null;
  }
  function formatDuration(minutes){
    return Number.isInteger(minutes)&&minutes>=0?`${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,"0")} min`:"—";
  }
  // Time-only inputs are chronological: a lower clock time means next day.
  // Equal times mean zero elapsed; full-day gaps cannot be inferred.
  function calculate(data){
    const errors=[],intervals=[],timeline=[];
    const present=value=>String(value??"").trim()!=="";
    const duration=(from,to)=>{const a=parseTime(from),b=parseTime(to);return a===null||b===null?null:(b-a+1440)%1440;};
    const rows=Array.isArray(data.intervals)?data.intervals:[];
    const used=row=>present(row.out)||(!row.untilPrep&&present(row.in))||!!row.untilPrep;
    const lastUsed=rows.reduce((last,row,i)=>used(row)?i:last,-1);
    const initialDelay=duration(data.death,data.initial);
    const finalIndex=rows.findIndex((row,i)=>row.untilPrep&&i===lastUsed);
    rows.forEach((row,i)=>{
      const active=used(row);
      const minutes=!active?null:row.untilPrep?(i===lastUsed?duration(row.out,data.prep):null):duration(row.out,row.in);
      intervals.push({minutes,untilPrep:!!row.untilPrep,used:active});
    });
    const known=[initialDelay,...intervals.map(row=>row.minutes)].filter(value=>value!==null);
    const totalOut=known.length?known.reduce((sum,n)=>sum+n,0):null;
    let previous=null;
    function record(value,key,label){
      const clock=parseTime(value);
      if(clock===null){errors.push({key,message:String(value??"").trim()?`${label}: use 0000–2359 (for example, 0630).`:`Enter ${label.toLowerCase()}.`});return null;}
      let absolute=previous===null?clock:Math.floor(previous/1440)*1440+clock;
      if(previous!==null&&absolute<previous)absolute+=1440;
      previous=absolute;timeline.push({key,absolute});return absolute;
    }
    const death=record(data.death,"death","Time of death");
    const initial=record(data.initial,"initial","Initial cooling time");
    rows.forEach((row,i)=>{
      if(!used(row))return;
      record(row.out,`out-${i}`,`Interval ${i+1} removal time`);
      if(row.untilPrep){
        if(i!==lastUsed)errors.push({key:`out-${i}`,message:"Only the final used interval can remain out until prep."});
      }else{
        record(row.in,`in-${i}`,`Interval ${i+1} return time`);
      }
    });
    const prep=record(data.prep,"prep","Prep time");
    const valid=errors.length===0;
    const deathToPrep=valid?prep-death:null;
    const alerts=[];
    if(initialDelay>720&&deathToPrep>900)alerts.push({code:"late-cooling-and-prep",title:"Late cooling AND late prep",detail:`Initial cooling: ${formatDuration(initialDelay)}. Death to prep: ${formatDuration(deathToPrep)}. Both the 12-hour and 15-hour limits are exceeded.`});
    if(totalOut>900)alerts.push({code:"total-out",title:"Total out of cooling exceeds 15 hours",detail:`Calculated: ${formatDuration(totalOut)}.`});
    return {valid,errors,intervals,initialDelay,deathToPrep,totalOut,alerts,timeline:valid?timeline:[],totalIsPartial:!valid,finalIndex};
  }
  return {parseTime,formatDuration,calculate};
});
