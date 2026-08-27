const assert=require("assert");
const fs=require("fs");
const path=require("path");
const fflate=require("../vendor/fflate.min.js");
const parser=require("../staffing-schedule-parser.js");

const workbookPath=process.argv[2];
if(!workbookPath)throw new Error("Pass the schedule workbook path as the first argument.");
const bytes=fs.readFileSync(path.resolve(workbookPath));
const data=parser.parseWorkbook(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),fflate.unzipSync);

assert.strictEqual(data.targetYear,2026);
assert.strictEqual(data.stats.monthCount,9);
assert.strictEqual(data.stats.dayCount,273);
assert.strictEqual(data.firstDate,"2026-01-01");
assert.strictEqual(data.lastDate,"2026-09-30");
assert.strictEqual(data.stats.unknownCount,0);
assert.deepStrictEqual(data.days["2026-01-01"].admin.day.map(x=>x.name),["Aaron P."]);

const splitCirc=data.days["2026-08-04"].primaryCirculator;
assert.deepStrictEqual(splitCirc.day.map(x=>x.name),["Malia D."]);
assert.deepStrictEqual(splitCirc.night.map(x=>x.name),["Joy S."]);

const dualCoordinator=data.days["2026-08-08"].coordinator;
assert.deepStrictEqual(dualCoordinator.day.map(x=>x.name),["Sari F.","Ben S."]);
assert.deepStrictEqual(dualCoordinator.night.map(x=>x.name),["Sari F.","Ben S."]);

const aug27=data.days["2026-08-27"];
assert.deepStrictEqual(aug27.primaryTech1.day.map(x=>x.name),["Bri G."]);
assert.deepStrictEqual(aug27.primaryTech1.night.map(x=>x.name),["Eleanor F."]);
assert.deepStrictEqual(aug27.primaryTech2.day.map(x=>x.name),["Becca C."]);
assert.deepStrictEqual(aug27.primaryTech2.night.map(x=>x.name),["Katie H."]);
assert.deepStrictEqual(aug27.backupTech1.day.map(x=>x.name),["Bubba J."]);
assert.deepStrictEqual(aug27.backupTech1.night.map(x=>x.name),["Bubba J."]);
const timeline=parser.timelineFor(data,new Date(2026,7,27,14,42));
assert.strictEqual(timeline.start.getHours(),6);
assert.deepStrictEqual(timeline.segments.map(x=>`${x.key}:${x.half}`),["2026-08-27:day","2026-08-27:night","2026-08-28:day"]);
assert.deepStrictEqual(timeline.segments.map(x=>x.roles.primaryTech1.map(y=>y.name)),[["Bri G."],["Eleanor F."],["Tiana S."]]);

const aTeam=parser.caseTeamAssignment(data,"A Team",new Date(2026,7,27,14,42));
assert.strictEqual(aTeam.key,"2026-08-27");
assert.strictEqual(aTeam.half,"day");
assert.deepStrictEqual(Object.values(aTeam.selected).map(x=>x.initials),["TKS","BCJG","RKC"]);

const bTeam=parser.caseTeamAssignment(data,"B Team",new Date(2026,7,27,14,42));
assert.strictEqual(bTeam.key,"2026-08-27");
assert.strictEqual(bTeam.half,"night");
assert.deepStrictEqual(Object.values(bTeam.selected).map(x=>x.initials),["TKS","EMF","KLH3"]);

const front24=parser.caseTeamAssignment(data,"24 Front",new Date(2026,7,27,14,42));
assert.deepStrictEqual(Object.values(front24.selected).map(x=>x.initials),["KJ","JTJ","EMF"]);

const back24=parser.caseTeamAssignment(data,"24 Back",new Date(2026,7,27,3,0));
assert.strictEqual(back24.key,"2026-08-26");
assert.strictEqual(back24.half,"night");

const nextA=parser.caseTeamSlot("A Team",new Date(2026,7,27,19,0));
assert.strictEqual(nextA.key,"2026-08-28");
assert.strictEqual(nextA.shiftStart.getHours(),6);
assert.ok(data.notices.some(x=>x.includes("November 2025")&&x.includes("December 2025")));
assert.ok(data.notices.some(x=>x.includes("CMT3")));

console.log("Staffing schedule parser tests passed.");
