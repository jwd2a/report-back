import {readFileSync,writeFileSync} from "node:fs";
const [account,database,name="commonplace"]=process.argv.slice(2);
if(!/^[a-f0-9]{32}$/i.test(account||"")||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(database||"")||database==="00000000-0000-4000-8000-000000000000"||!/^[a-z][a-z0-9-]{0,62}$/.test(name))throw new Error("Usage: node scripts/configure-cloudflare.mjs ACCOUNT_ID D1_DATABASE_ID [WORKER_NAME]");
const c=JSON.parse(readFileSync("wrangler.jsonc","utf8"));c.account_id=account;c.name=name;c.d1_databases[0].database_id=database;writeFileSync("wrangler.jsonc",JSON.stringify(c,null,2)+"\n");console.log("Cloudflare account and database configured. Rebuild before deployment.");
