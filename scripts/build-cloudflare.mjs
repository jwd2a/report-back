import {spawnSync} from "node:child_process";
import {readFileSync,writeFileSync} from "node:fs";
const result=spawnSync(process.execPath,["node_modules/vinext/dist/cli.js","build"],{stdio:"inherit"});if(result.status!==0)process.exit(result.status??1);
// Keep generated module rules and asset layout, apply the account's deployment configuration.
const generated=JSON.parse(readFileSync("dist/server/wrangler.json","utf8"));
const source=JSON.parse(readFileSync("wrangler.jsonc","utf8"));
generated.name=source.name;if(generated.compatibility_flags)generated.compatibility_flags=[...new Set(generated.compatibility_flags)];generated.workers_dev=source.workers_dev;generated.d1_databases=source.d1_databases.map(d=>({...d,migrations_dir:"../../drizzle"}));generated.vars=source.vars;
if(source.account_id)generated.account_id=source.account_id;
if(source.routes)generated.routes=source.routes;
writeFileSync("dist/server/wrangler.json",JSON.stringify(generated,null,2)+"\n");
