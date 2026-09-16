import {spawnSync} from "node:child_process";
import {readFileSync,existsSync} from "node:fs";
const config=JSON.parse(readFileSync("wrangler.jsonc","utf8"));
if(!config.account_id||config.d1_databases[0].database_id==="00000000-0000-4000-8000-000000000000")throw new Error("Configure your account and D1 database first; see DEPLOY-CLOUDFLARE.md");
function run(args,input){const r=spawnSync(process.execPath,args,{stdio:input===undefined?"inherit":["pipe","inherit","inherit"],input});if(r.status!==0)process.exit(r.status??1)}
const wrangler="node_modules/wrangler/bin/wrangler.js";
run(["scripts/build-cloudflare.mjs"]);
run([wrangler,"d1","migrations","apply","DB","--remote","--config","wrangler.jsonc"],"y\n");
run([wrangler,"deploy","--config","dist/server/wrangler.json"]);
console.log("Deployment finished. On first deploy, set OWNER_SECRET as described in DEPLOY-CLOUDFLARE.md before signing in. Owner endpoints fail closed until configured.");
