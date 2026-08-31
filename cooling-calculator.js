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
    const rows=Array.isArray(data.intervals)?data.intervals:[];
    let finalOut=null;
    rows.forEach((row,i)=>{
      const out=record(row.out,`out-${i}`,`Interval ${i+1} removal time`);
      if(row.untilPrep){
        if(i!==rows.length-1)errors.push({key:`out-${i}`,message:"Only the final interval can remain out until prep."});
        finalOut=out;intervals.push({minutes:null,untilPrep:true});
      }else{
        const back=record(row.in,`in-${i}`,`Interval ${i+1} return time`);
        intervals.push({minutes:out===null||back===null?null:back-out,untilPrep:false});
      }
    });
    const prep=record(data.prep,"prep","Prep time");
    if(errors.length)return {valid:false,errors,intervals:[],initialDelay:null,deathToPrep:null,totalOut:null,alerts:[],timeline:[]};
    if(rows.length&&rows[rows.length-1].untilPrep)intervals[intervals.length-1].minutes=prep-finalOut;
    const initialDelay=initial-death,deathToPrep=prep-death;
    const totalOut=initialDelay+intervals.reduce((sum,row)=>sum+row.minutes,0);
    const alerts=[];
    if(initialDelay>720&&deathToPrep>900)alerts.push({code:"late-cooling-and-prep",title:"Late cooling AND late prep",detail:`Initial cooling: ${formatDuration(initialDelay)}. Death to prep: ${formatDuration(deathToPrep)}. Both the 12-hour and 15-hour limits are exceeded.`});
    if(totalOut>900)alerts.push({code:"total-out",title:"Total out of cooling exceeds 15 hours",detail:`Calculated: ${formatDuration(totalOut)}.`});
    return {valid:true,errors,intervals,initialDelay,deathToPrep,totalOut,alerts,timeline};
  }
  return {parseTime,formatDuration,calculate};
});
