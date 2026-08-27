(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.StaffingScheduleParser=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const MONTHS={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
  const LEFT_COLUMNS=[2,4,6,8,10,12,14];
  const ADMIN_NAMES={AEP:"Aaron P.",AEP2:"Aaron P.",JAH:"Jake H.",LSG:"Luke G."};
  const CUSTOM_NAMES={
    ...ADMIN_NAMES,
    BNS2:"Ben S.",DDER:"Des E.",LMC:"Linda C.",MCB3:"Cade B.",MD:"Malia D.",MMF:"McKenna F.",SCF:"Sari F."
  };
  const INACTIVE_CODES=new Set(["CMT3","MRH2"]);
  const ROLE_KEYS=["admin","coordinator","primaryCirculator","primaryTech1","primaryTech2","backupCirculator","backupTech1","backupTech2"];

  function xmlDecode(value){
    return String(value||"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
  }
  function attr(text,name){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const match=String(text||"").match(new RegExp("(?:^|\\s)"+escaped+'="([^"]*)"'));
    return match?xmlDecode(match[1]):"";
  }
  function textParts(xml){
    const out=[];String(xml||"").replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g,(_,value)=>{out.push(xmlDecode(value));return _});return out.join("");
  }
  function colNumber(ref){
    const letters=String(ref||"").match(/^[A-Z]+/i)?.[0]?.toUpperCase()||"";let value=0;
    for(const ch of letters)value=value*26+(ch.charCodeAt(0)-64);return value;
  }
  function rowNumber(ref){return Number(String(ref||"").match(/\d+/)?.[0]||0)}
  function dateKey(year,month,day){return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`}
  function validDate(year,month,day){const d=new Date(year,month,day);return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day}
  function resolveTarget(target){
    const clean=String(target||"").replace(/^\//,"");
    if(clean.startsWith("xl/"))return clean;
    return "xl/"+clean.replace(/^\.\//,"");
  }
  function shortName(name){
    const parts=String(name||"").trim().split(/\s+/).filter(Boolean);if(!parts.length)return"";
    if(parts.length===1)return parts[0];return `${parts[0]} ${parts[parts.length-1][0].toUpperCase()}.`;
  }
  function splitCodes(value){return String(value||"").match(/[A-Z][A-Z0-9]{1,5}/g)||[]}
  function splitPrimaryCirculator(value){
    const raw=String(value||"");
    if(!raw.includes("/")){const both=splitCodes(raw);return {day:both,night:both}}
    const halves=raw.split("/");return {day:splitCodes(halves[0]),night:splitCodes(halves.slice(1).join(" "))};
  }

  function parseSharedStrings(xml){
    const values=[];String(xml||"").replace(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g,(_,body)=>{values.push(textParts(body));return _});return values;
  }
  function parseWorksheet(xml,shared){
    const cells=new Map();
    String(xml||"").replace(/<c\b([^>]*[^/])>([\s\S]*?)<\/c>/g,(_,attrs,body)=>{
      const ref=attr(attrs,"r");if(!ref)return _;
      const type=attr(attrs,"t");let raw="";
      if(type==="inlineStr")raw=textParts(body);
      else raw=xmlDecode(body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1]||"");
      let value=raw;
      if(type==="s")value=shared[Number(raw)]??"";
      else if(type!=="str"&&type!=="inlineStr"&&raw!==""&&!Number.isNaN(Number(raw)))value=Number(raw);
      cells.set(ref.toUpperCase(),value);return _;
    });
    return {
      get(row,col){
        let n=col,letters="";while(n>0){n--;letters=String.fromCharCode(65+n%26)+letters;n=Math.floor(n/26)}
        return cells.get(letters+row);
      },
      entries(){return cells.entries()}
    };
  }
  function workbookParts(files,decode){
    const workbook=decode(files["xl/workbook.xml"]);const rels=decode(files["xl/_rels/workbook.xml.rels"]);
    const relationMap={};
    rels.replace(/<Relationship\b([^>]*)\/?\s*>/g,(_,attrs)=>{relationMap[attr(attrs,"Id")]=resolveTarget(attr(attrs,"Target"));return _});
    const sheets=[];
    workbook.replace(/<sheet\b([^>]*)\/?\s*>/g,(_,attrs)=>{sheets.push({name:attr(attrs,"name"),path:relationMap[attr(attrs,"r:id")]});return _});
    return sheets;
  }
  function sheetYear(sheet){
    const counts=new Map();
    for(const [ref,value] of sheet.entries()){
      if(rowNumber(ref)>7||colNumber(ref)>15)continue;
      const n=Number(value);if(Number.isInteger(n)&&n>=2020&&n<=2040)counts.set(n,(counts.get(n)||0)+1);
    }
    return [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  }
  function workbookNameMap(parsedSheets){
    const names={};
    for(const {sheet} of parsedSheets){
      for(let row=1;row<=80;row++){
        const full=sheet.get(row,17),initials=sheet.get(row,18);
        if(typeof full==="string"&&typeof initials==="string"&&/^[A-Z0-9]+$/.test(initials.trim()))names[initials.trim()]=shortName(full);
      }
    }
    return {...names,...CUSTOM_NAMES};
  }
  function displayPeople(codes,nameMap,unknown,inactive){
    return codes.map(code=>{
      if(INACTIVE_CODES.has(code))inactive.add(code);
      if(!nameMap[code]&&!INACTIVE_CODES.has(code))unknown.add(code);
      return {initials:code,name:nameMap[code]||code};
    });
  }
  function samePeople(a,b){return JSON.stringify(a||[])===JSON.stringify(b||[])}
  function role(day,night){return {day,night}}
  function operationalStart(now){const start=new Date(now);start.setHours(6,0,0,0);if(now<start)start.setDate(start.getDate()-1);return start}
  function timelineFor(schedule,now){
    const start=operationalStart(now),segments=[0,12,24].map(hours=>{
      const date=new Date(start.getTime()+hours*3600000),key=dateKey(date.getFullYear(),date.getMonth(),date.getDate()),half=date.getHours()>=18?"night":"day";
      return {date,key,half,roles:Object.fromEntries(ROLE_KEYS.map(roleKey=>[roleKey,schedule?.days?.[key]?.[roleKey]?.[half]||[]]))};
    });
    return {start,segments};
  }

  function parseWorkbook(arrayBuffer,unzipSync){
    if(typeof unzipSync!=="function")throw new Error("Excel decompression support is unavailable.");
    const files=unzipSync(new Uint8Array(arrayBuffer));const decoder=new TextDecoder("utf-8");
    const decode=file=>file?decoder.decode(file):"";
    if(!files["xl/workbook.xml"])throw new Error("This does not appear to be a valid Excel workbook.");
    const shared=parseSharedStrings(decode(files["xl/sharedStrings.xml"]));
    const parsedSheets=workbookParts(files,decode).filter(x=>x.path&&files[x.path]).map(item=>({...item,sheet:parseWorksheet(decode(files[item.path]),shared)}));
    const monthSheets=parsedSheets.map(item=>({...item,month:MONTHS[item.name.trim().toLowerCase()],year:sheetYear(item.sheet)})).filter(x=>Number.isInteger(x.month)&&x.year);
    if(!monthSheets.length)throw new Error("No monthly calendar sheets were found.");
    const yearCounts=new Map();for(const s of monthSheets)yearCounts.set(s.year,(yearCounts.get(s.year)||0)+1);
    const targetYear=[...yearCounts].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0][0];
    const nameMap=workbookNameMap(parsedSheets),unknown=new Set(),inactive=new Set(),days={};
    const notices=[];let duplicateDates=0;
    const ignoredMonths=monthSheets.filter(s=>s.year!==targetYear).map(s=>`${s.name} ${s.year}`);
    if(ignoredMonths.length)notices.push(`${ignoredMonths.join(" and ")} ${ignoredMonths.length===1?"is":"are"} outside ${targetYear} and will not replace that schedule.`);

    for(const item of monthSheets.filter(s=>s.year===targetYear)){
      const {sheet,month,year}=item;
      for(let row=1;row<=60;row++)for(const col of LEFT_COLUMNS){
        const header=sheet.get(row,col);if(typeof header!=="string"&&typeof header!=="number")continue;
        const headerText=String(header).trim();const match=headerText.match(/^(\d{1,2})(?:\s|$)/);if(!match)continue;
        const dayNumber=Number(match[1]);if(!validDate(year,month,dayNumber))continue;
        const key=dateKey(year,month,dayNumber);
        const adminCode=Object.keys(ADMIN_NAMES).find(code=>new RegExp(`(?:^|\\s)${code}(?:$|\\s|[.,])`).test(headerText));
        const coordinatorCodes=splitCodes(sheet.get(row+1,col));
        const primaryTech1Day=splitCodes(sheet.get(row+2,col)),primaryTech1Night=splitCodes(sheet.get(row+2,col+1));
        const primaryTech2Day=splitCodes(sheet.get(row+3,col)),primaryTech2Night=splitCodes(sheet.get(row+3,col+1));
        const primaryCirc=splitPrimaryCirculator(sheet.get(row+4,col)),backupCircCodes=splitCodes(sheet.get(row+4,col+1));
        const backupTech1Day=splitCodes(sheet.get(row+5,col)),backupTech1Night=splitCodes(sheet.get(row+5,col+1));
        const backupTech2Day=splitCodes(sheet.get(row+6,col)),backupTech2Night=splitCodes(sheet.get(row+6,col+1));
        const anyAssignment=[adminCode,...coordinatorCodes,...primaryTech1Day,...primaryTech1Night,...primaryTech2Day,...primaryTech2Night,...primaryCirc.day,...primaryCirc.night,...backupCircCodes,...backupTech1Day,...backupTech1Night,...backupTech2Day,...backupTech2Night].some(Boolean);
        if(!anyAssignment)continue;
        if(days[key]){duplicateDates++;continue}
        const adminPeople=displayPeople(adminCode?[adminCode]:[],nameMap,unknown,inactive);
        const coordinatorPeople=displayPeople(coordinatorCodes,nameMap,unknown,inactive);
        days[key]={
          admin:role(adminPeople,adminPeople),
          coordinator:role(coordinatorPeople,coordinatorPeople),
          primaryCirculator:role(displayPeople(primaryCirc.day,nameMap,unknown,inactive),displayPeople(primaryCirc.night,nameMap,unknown,inactive)),
          primaryTech1:role(displayPeople(primaryTech1Day,nameMap,unknown,inactive),displayPeople(primaryTech1Night,nameMap,unknown,inactive)),
          primaryTech2:role(displayPeople(primaryTech2Day,nameMap,unknown,inactive),displayPeople(primaryTech2Night,nameMap,unknown,inactive)),
          backupCirculator:role(displayPeople(backupCircCodes,nameMap,unknown,inactive),displayPeople(backupCircCodes,nameMap,unknown,inactive)),
          backupTech1:role(displayPeople(backupTech1Day,nameMap,unknown,inactive),displayPeople(backupTech1Night,nameMap,unknown,inactive)),
          backupTech2:role(displayPeople(backupTech2Day,nameMap,unknown,inactive),displayPeople(backupTech2Night,nameMap,unknown,inactive))
        };
      }
    }
    const keys=Object.keys(days).sort();if(!keys.length)throw new Error(`No ${targetYear} staffing dates were found.`);
    if(duplicateDates)notices.push(`${duplicateDates} duplicate calendar date${duplicateDates===1?" was":"s were"} ignored.`);
    if(inactive.size)notices.push(`Inactive historical initials found: ${[...inactive].sort().join(", ")}.`);
    if(unknown.size)notices.push(`Names are not mapped for: ${[...unknown].sort().join(", ")}. Initials will be shown.`);
    const missing=[];
    for(const key of keys){
      for(const roleKey of ROLE_KEYS){const value=days[key][roleKey];if(!(value.day.length||value.night.length))missing.push(`${key} ${roleKey}`)}
    }
    if(missing.length)notices.push(`${missing.length} empty role assignment${missing.length===1?"":"s"} found; blank tracker lanes will be shown.`);
    const months=[...new Set(keys.map(k=>Number(k.slice(5,7))))].sort((a,b)=>a-b);
    return {
      schemaVersion:1,targetYear,days,dateKeys:keys,
      firstDate:keys[0],lastDate:keys[keys.length-1],months,
      roleKeys:ROLE_KEYS.slice(),errors:[],notices,
      stats:{dayCount:keys.length,monthCount:months.length,unknownCount:unknown.size,inactiveCount:inactive.size,missingCount:missing.length},
      _debug:{nameMap}
    };
  }

  return {parseWorkbook,shortName,splitCodes,splitPrimaryCirculator,samePeople,operationalStart,timelineFor,ROLE_KEYS,ADMIN_NAMES,CUSTOM_NAMES};
});
