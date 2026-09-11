(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.PlasmaDilutionCalculator=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  const MINUTE_MS=60*1000;
  const HOUR_MS=60*MINUTE_MS;
  const BLOOD_COLLOID_WINDOW_MS=48*HOUR_MS;
  const CRYSTALLOID_WINDOW_MS=HOUR_MS;

  const FLOW_RATES=Object.freeze({
    "iv-22":35,
    "iv-20":65,
    "iv-18":105,
    "iv-16":220,
    "io-tibia":31,
    "io-humerus":57,
    "io-sternum":94
  });

  const COMPONENTS=Object.freeze({
    prbc:{label:"Packed red blood cells",category:"blood",volume:350},
    whole_blood:{label:"Whole blood",category:"blood",volume:500},
    ffp:{label:"Fresh frozen plasma",category:"colloid",volume:275},
    albumin_5_250:{label:"5% albumin · 250 mL",category:"colloid",volume:250},
    albumin_5_500:{label:"5% albumin · 500 mL",category:"colloid",volume:500},
    albumin_25_20:{label:"25% albumin · 20 mL",category:"colloid",volume:20},
    albumin_25_50:{label:"25% albumin · 50 mL",category:"colloid",volume:50},
    albumin_25_100:{label:"25% albumin · 100 mL",category:"colloid",volume:100},
    platelets_5_pack:{label:"5-pack platelet concentrate",category:"colloid",volume:500},
    platelets_apheresis:{label:"Apheresis platelets",category:"colloid",volume:300},
    cryo_10_pack:{label:"10-pack cryoprecipitate",category:"colloid",volume:70},
    hespan:{label:"Hespan / hetastarch / dextran",category:"colloid",volume:500},
    polyheme:{label:"PolyHeme",category:"colloid",volume:500},
    saline:{label:"Saline",category:"crystalloid",volume:null},
    ringers_lactate:{label:"Ringer's lactate",category:"crystalloid",volume:null},
    dextrose:{label:"Dextrose in water",category:"crystalloid",volume:null},
    balanced_electrolyte:{label:"Balanced electrolyte solution",category:"crystalloid",volume:null},
    tpn:{label:"Total parenteral nutrition (TPN)",category:"crystalloid",volume:null},
    medication:{label:"Meds in Solution",category:"medication",volume:null},
    sodium_bicarbonate:{label:"Sodium Bicarbonate",category:"medication",volume:null},
    other_blood:{label:"Other blood product",category:"blood",volume:null},
    other_colloid:{label:"Other colloid",category:"colloid",volume:null},
    other_crystalloid:{label:"Other",category:"crystalloid",volume:null}
  });

  function finiteNumber(value){
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function roundHundredth(value){return Math.round((value+Number.EPSILON)*100)/100;}

  function parseMilitaryTime(value){
    const match=String(value??"").trim().match(/^(\d{2}):?(\d{2})$/);
    if(!match)return null;
    const hours=Number(match[1]),minutes=Number(match[2]);
    return hours<24&&minutes<60?hours*60+minutes:null;
  }

  function parseDate(value){
    const text=String(value??"").trim();
    let match=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/),year,month,day;
    if(match){year=Number(match[1]);month=Number(match[2]);day=Number(match[3]);}
    else{
      match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if(!match)return null;
      month=Number(match[1]);day=Number(match[2]);year=Number(match[3]);
    }
    const date=new Date(year,month-1,day);
    return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;
  }

  function parseDateTime(dateValue,timeValue){
    const date=parseDate(dateValue),minutes=parseMilitaryTime(timeValue);
    if(!date||minutes===null)return null;
    date.setHours(Math.floor(minutes/60),minutes%60,0,0);
    return date;
  }

  function parseMeasurement(value,defaultUnit,allowedUnits){
    if(typeof value==="number")return Number.isFinite(value)?{value,unit:defaultUnit}:null;
    const match=String(value??"").trim().toLowerCase().match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-z]+)?$/);
    if(!match)return null;
    const number=Number(match[1]),suffix=match[2]||"";
    const unit=suffix?allowedUnits[suffix]:defaultUnit;
    return Number.isFinite(number)&&unit?{value:number,unit}:null;
  }

  function measurementValues(data){
    const height=parseMeasurement(data.height,data.heightUnit==="cm"?"cm":"in",{in:"in",inch:"in",inches:"in",cm:"cm"});
    const weight=parseMeasurement(data.weight,data.weightUnit==="kg"?"kg":"lb",{lb:"lb",lbs:"lb",pound:"lb",pounds:"lb",kg:"kg"});
    const heightInches=height===null?null:height.unit==="cm"?height.value/2.54:height.value;
    const weightPounds=weight===null?null:weight.unit==="kg"?weight.value*2.2:weight.value;
    return {
      heightInputUnit:height?.unit??null,
      weightInputUnit:weight?.unit??null,
      heightInches:heightInches===null?null:roundHundredth(heightInches),
      heightCentimeters:heightInches===null?null:roundHundredth(heightInches*2.54),
      weightPounds:weightPounds===null?null:roundHundredth(weightPounds),
      weightKilograms:weightPounds===null?null:roundHundredth(weightPounds/2.2)
    };
  }

  function calculateVolumes(data){
    const measurements=measurementValues(data);
    const {heightInches,weightPounds,weightKilograms}=measurements;
    const sex=String(data.sex||"").toLowerCase();
    const errors=[];
    if(!(heightInches>0))errors.push({field:"height",message:"Enter a height greater than zero."});
    if(!(weightPounds>0))errors.push({field:"weight",message:"Enter a weight greater than zero."});
    if(!["male","female"].includes(sex))errors.push({field:"sex",message:"Select male or female for the approved formula."});
    if(errors.length)return {...measurements,bsa:null,plasmaVolume:null,bloodVolume:null,method:null,errors};

    const bsa=roundHundredth(Math.sqrt((heightInches*weightPounds)/3131));
    const useWeight=weightKilograms>=45&&weightKilograms<=100;
    const plasmaVolume=Math.ceil(useWeight
      ? weightKilograms/0.025
      : bsa*(sex==="male"?1560:1410));
    const bloodVolume=Math.ceil(useWeight
      ? weightKilograms/0.015
      : bsa*(sex==="male"?2740:2370));
    return {...measurements,bsa,plasmaVolume,bloodVolume,method:useWeight?"weight":"bsa",errors};
  }

  function assessmentWindow(data){
    const sample=parseDateTime(data.sampleDate,data.sampleTime);
    const asystole=parseDateTime(data.asystoleDate,data.asystoleTime);
    if(!sample||!asystole)return {sample,asystole,end:null,start:null,errors:[{field:"assessment",message:"Enter valid sample-draw and cardiac-asystole dates and military times."}]};
    const end=new Date(Math.min(sample.getTime(),asystole.getTime()));
    return {sample,asystole,end,start:new Date(end.getTime()-BLOOD_COLLOID_WINDOW_MS),errors:[]};
  }

  function calculateIncompleteVolume(data){
    const rate=FLOW_RATES[data.access];
    const minutes=finiteNumber(data.minutes),bagVolume=finiteNumber(data.bagVolume);
    if(!rate||minutes===null||minutes<0)return null;
    if(minutes===0)return 0;
    const calculated=rate*(Math.floor(minutes)+1);
    return bagVolume!==null&&bagVolume>=0?Math.min(calculated,bagVolume):calculated;
  }

  function entryVolume(entry){
    if(entry.incomplete){
      const start=parseDateTime(entry.date,entry.time);
      const end=parseDateTime(entry.endDate,entry.endTime);
      if(!start||!end||end<start)return null;
      return calculateIncompleteVolume({
        access:entry.access,
        minutes:(end-start)/MINUTE_MS,
        bagVolume:entry.bagVolume
      });
    }
    const explicit=finiteNumber(entry.volume);
    if(explicit!==null&&explicit>=0)return explicit;
    const component=COMPONENTS[entry.component];
    const quantity=Math.max(1,Math.floor(finiteNumber(entry.quantity)||1));
    return component&&component.volume!==null?component.volume*quantity:null;
  }

  function normalizeEntry(entry,index,window){
    const component=COMPONENTS[entry.component]||null;
    const category=component?.category||entry.category||null;
    const started=parseDateTime(entry.date,entry.time);
    const volume=entryVolume(entry);
    const errors=[];
    if(!category)errors.push({field:`entry-${index}`,message:`Fluid ${index+1}: select a category or component.`});
    if(entry.component==="other_crystalloid"&&!String(entry.customLabel||"").trim())errors.push({field:`entry-${index}`,message:`Fluid ${index+1}: name the other crystalloid.`});
    if(!started)errors.push({field:`entry-${index}`,message:`Fluid ${index+1}: enter a valid start date and military time.`});
    if(volume===null||volume<0)errors.push({field:`entry-${index}`,message:`Fluid ${index+1}: enter a valid volume.`});
    let inWindow=false;
    if(started&&window.end){
      const lookback=category==="blood"||category==="colloid"?BLOOD_COLLOID_WINDOW_MS:CRYSTALLOID_WINDOW_MS;
      inWindow=started.getTime()>=window.end.getTime()-lookback&&started.getTime()<=window.end.getTime();
    }
    return {index,component:entry.component,category,started,volume,inWindow,included:false,reason:"",errors,source:entry};
  }

  function calculate(data){
    const volumes=calculateVolumes(data);
    const window=assessmentWindow(data);
    const errors=[...volumes.errors,...window.errors];
    const shortcut=data.receivedInfusions===false||data.receivedInfusions==="no"
      ? "no-infusions"
      : data.preInfusionSample===true||data.preInfusionSample==="yes"
        ? "pre-infusion-sample"
        : null;
    const entries=(Array.isArray(data.entries)?data.entries:[]).map((entry,index)=>normalizeEntry(entry,index,window));
    entries.forEach(entry=>errors.push(...entry.errors));
    if(![true,false,"yes","no"].includes(data.receivedInfusions))errors.push({field:"receivedInfusions",message:"Indicate whether the donor received transfusions or infusions."});
    if((data.receivedInfusions===true||data.receivedInfusions==="yes")&&![true,false,"yes","no"].includes(data.preInfusionSample))errors.push({field:"preInfusionSample",message:"Indicate whether a pre-transfusion/infusion sample was obtained."});
    if(shortcut)errors.length=0;

    let blood=0,colloids=0,crystalloids=0,medications=0;
    for(const entry of entries){
      if(entry.errors.length||!entry.inWindow){entry.reason=entry.errors.length?"Incomplete entry":"Outside assessment window";continue;}
      if(entry.category==="crystalloid"&&entry.volume<50){entry.reason="Crystalloid under 50 mL";continue;}
      if(entry.category==="medication"){medications+=entry.volume;entry.reason="Pending 500 mL proximity check";continue;}
      entry.included=true;entry.reason="Included";
      if(entry.category==="blood")blood+=entry.volume;
      if(entry.category==="colloid")colloids+=entry.volume;
      if(entry.category==="crystalloid")crystalloids+=entry.volume;
    }

    const canCompare=volumes.plasmaVolume!==null&&volumes.bloodVolume!==null;
    const baselineQ1=canCompare?colloids+crystalloids:null;
    const baselineQ2=canCompare?blood+colloids+crystalloids:null;
    const plasmaRemaining=canCompare?volumes.plasmaVolume-baselineQ1:null;
    const bloodRemaining=canCompare?volumes.bloodVolume-baselineQ2:null;
    const within500=canCompare&&(
      (plasmaRemaining>=0&&plasmaRemaining<=500)||
      (bloodRemaining>=0&&bloodRemaining<=500)
    );
    const includeMedications=within500&&medications>=25;
    if(includeMedications){
      crystalloids+=medications;
      entries.filter(entry=>entry.category==="medication"&&entry.inWindow&&!entry.errors.length).forEach(entry=>{entry.included=true;entry.reason="Included: calculation within 500 mL and medications total at least 25 mL";});
    }else{
      entries.filter(entry=>entry.category==="medication"&&entry.inWindow&&!entry.errors.length).forEach(entry=>{entry.reason=medications<25?"Medication total under 25 mL":"Not within 500 mL of a limit";});
    }

    const q1Total=canCompare?colloids+crystalloids:null;
    const q2Total=canCompare?blood+colloids+crystalloids:null;
    const q1Exceeded=canCompare?q1Total>volumes.plasmaVolume:null;
    const q2Exceeded=canCompare?q2Total>volumes.bloodVolume:null;
    const acceptable=shortcut?true:errors.length===0&&canCompare&&!q1Exceeded&&!q2Exceeded;
    const flags=[];
    const age=finiteNumber(data.age);
    if(data.bloodLoss==="yes"||data.bloodLoss===true)flags.push("Known or suspected blood loss: follow the applicable branch pathway and consult management when records are incomplete.");
    if(age!==null&&age<=17&&(data.bloodLoss==="yes"||data.bloodLoss===true))flags.push("Donor is 17 or younger with blood loss: apply the CTS algorithm per TR-502-WI-01.");
    if(age!==null&&age<=12)flags.push("Donor is 12 or younger: verify the recovery-partner pediatric pathway.");
    if(volumes.weightKilograms!==null&&(volumes.weightKilograms<45||volumes.weightKilograms>100))flags.push("Weight is outside 45–100 kg: BSA method used and Medical Director consultation is required.");
    if(data.obese===true||data.largeInfusions===true)flags.push("Special circumstance: Medical Director consultation is required to determine whether the CTS calculation applies.");
    if(window.sample&&window.asystole){
      const after=(window.sample-window.asystole)/HOUR_MS;
      if(after>36)flags.push("Sample draw is more than 36 hours after cardiac asystole.");
      if(after<-(7*24))flags.push("Sample draw is more than 7 days before cardiac asystole.");
    }
    return {
      valid:errors.length===0,
      errors,flags,shortcut,volumes,window,entries,
      totals:{blood,colloids,crystalloids,medications,within500,includeMedications},
      questions:{q1Total,q2Total,q1Exceeded,q2Exceeded},
      acceptable
    };
  }

  return {
    FLOW_RATES,COMPONENTS,parseMilitaryTime,parseDateTime,parseMeasurement,measurementValues,
    calculateVolumes,assessmentWindow,calculateIncompleteVolume,entryVolume,calculate
  };
});
