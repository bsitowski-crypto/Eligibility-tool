const assert=require("assert");
const fs=require("fs");
const path=require("path");
const zlib=require("zlib");

const root=path.join(__dirname,"..");
const payload=["data-1.b64","data-2.b64","data-3.b64"]
  .map(name=>fs.readFileSync(path.join(root,"app",name),"utf8").replace(/\s+/g,""))
  .join("");
const planner=zlib.gunzipSync(Buffer.from(payload,"base64")).toString("utf8");
const collaboration=fs.readFileSync(path.join(root,"collaboration.js"),"utf8");

assert.match(planner,/initials:"JTJ"[^\n]+surgicalGlove:"8\.5"/);
assert.doesNotMatch(planner,/initials:"JTJ"[^\n]+surgicalGlove:"9\.5"/);
assert.match(planner,/person\.initials==="JTJ"[\s\S]+?surgicalGlove="8\.5"/);
assert.match(collaboration,/person\?\.initials==="JTJ"[\s\S]+?person\.surgicalGlove="8\.5"/);

console.log("Staff glove-size tests passed.");
