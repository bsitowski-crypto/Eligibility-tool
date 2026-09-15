(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TeamBoardModel=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const ZONE='America/Los_Angeles',DAY=86400000;
  function parseDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
    const [y,m,d]=value.split('-').map(Number),n=Date.UTC(y,m-1,d),dt=new Date(n);
    return y>=2000&&y<=2199&&dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?n:null;
  }
  function time(value){const s=String(value||'').replace(':','');return /^([01]\d|2[0-3])[0-5]\d$/.test(s)?s:null;}
  function today(now=new Date()){
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
    return {date:`${p.year}-${p.month}-${p.day}`,time:p.hour+p.minute};
  }
  function validate(item){
    if(!['note','event','task'].includes(item.type))throw Error('Choose a note, event, or task.');
    if(typeof item.title!=='string'||!item.title.trim()||item.title.trim().length>120)throw Error('Enter a title of 1–120 characters.');
    if(typeof item.body!=='string'||item.body.length>5000)throw Error('Details must be 5,000 characters or fewer.');
    if(!['none','day','week','month'].includes(item.unit))throw Error('Choose a valid repeat interval.');
    if(!Number.isInteger(item.every)||item.every<1||item.every>365)throw Error('Repeat every 1–365 days, weeks, or months.');
    if(item.type==='note'&&(item.date||item.time||item.unit!=='none'))throw Error('Notes do not have a schedule.');
    if(item.date&&parseDate(item.date)===null)throw Error('Enter a valid date between 2000 and 2199.');
    if(item.time&&time(item.time)!==item.time)throw Error('Use military time, 0000–2359.');
    if((item.type==='event'||item.unit!=='none'||item.time)&&!item.date)throw Error('Enter a date for this schedule.');
    if(item.until&&(parseDate(item.until)===null||item.until<item.date))throw Error('Repeat end date must be on or after the first date.');
    if(item.unit==='none'&&item.until)throw Error('A repeat end date requires a repeating schedule.');
    if(item.index!==undefined&&(!Number.isInteger(item.index)||item.index<0||item.index>73050))throw Error('Invalid occurrence number.');
    return item;
  }
  // Anchor monthly repeats to the original day, clamping only short months.
  function occurrence(item,index=0){
    if(!item.date)return null;
    const start=parseDate(item.date);if(start===null||!Number.isInteger(index)||index<0)throw Error('Invalid schedule.');
    if(item.unit==='none'&&index>0)return null;
    const d=new Date(start),step=index*item.every;
    if(item.unit==='day'||item.unit==='week')d.setUTCDate(d.getUTCDate()+step*(item.unit==='week'?7:1));
    else if(item.unit==='month'){
      const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+step);
      const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));
    }
    if(!Number.isFinite(d.getTime())||d.getUTCFullYear()>2199)return null;
    const date=d.toISOString().slice(0,10);return item.until&&date>item.until?null:date;
  }
  function eventIndex(item,current=today()){
    if(item.unit==='none'||!item.date)return 0;
    const [y,m]=current.date.split('-').map(Number),s=new Date(parseDate(item.date));
    const gap=item.unit==='month'?(y-s.getUTCFullYear())*12+m-s.getUTCMonth()-1:(parseDate(current.date)-parseDate(item.date))/DAY/(item.unit==='week'?7:1);
    let n=Math.max(0,Math.floor(gap/item.every));
    // Keep today's occurrence visible for the whole day; roll it over tomorrow.
    while(occurrence(item,n)&&occurrence(item,n)<current.date)n++;
    return n;
  }
  function due(item,current=today()){return occurrence(item,item.type==='event'?eventIndex(item,current):(item.index||0));}
  function status(item,current=today()){
    if(item.deleted)return 'Trash';if(item.completed)return 'Completed';if(item.type==='note')return 'Note';
    const date=due(item,current);if(!date)return item.date?'Series ended':'No due date';
    if(date<current.date||(date===current.date&&item.time&&item.time<current.time))return item.type==='task'?'Overdue':'Past';
    return date===current.date?'Today':'Upcoming';
  }
  function complete(item){
    if(item.type!=='task'||item.deleted||item.completed)throw Error('This task cannot be completed.');
    const next=(item.index||0)+1;
    return item.unit!=='none'&&occurrence(item,next)?{index:next,completed:false}:{index:item.index||0,completed:true};
  }
  function reopen(item){
    if(item.type!=='task'||item.deleted||!item.lastCompletedDate)throw Error('There is no completion to undo.');
    return {index:item.completed?item.index:Math.max(0,item.index-1),completed:false,lastCompletedDate:'',lastCompletedBy:'',lastCompletedAt:null};
  }
  function repeatLabel(item){return item.unit==='none'?'Does not repeat':`Every ${item.every} ${item.unit}${item.every===1?'':'s'}${item.until?' · until '+item.until:''}`;}
  return {ZONE,parseDate,time,today,validate,occurrence,eventIndex,due,status,complete,reopen,repeatLabel};
});
