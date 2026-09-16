import {randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,chmodSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
if(!config.account_id||!existsSync('dist/server/wrangler.json'))throw new Error('Configure and deploy first; see DEPLOY-CLOUDFLARE.md');
const path='.owner-key.txt';
const key=existsSync(path)?readFileSync(path,'utf8').trim():randomBytes(32).toString('hex');
if(!/^[a-f0-9]{64}$/.test(key))throw new Error('The owner-key file must contain exactly 64 lowercase hexadecimal characters');
writeFileSync(path,key+'\n',{mode:0o600});chmodSync(path,0o600);
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','put','OWNER_SECRET','--config','dist/server/wrangler.json'],{input:key+'\n',stdio:['pipe','inherit','inherit']});
if(result.status!==0){console.error('Secret upload did not complete. Your owner key is retained locally for retry.');process.exit(result.status??1)}
console.log('Owner key configured. Open .owner-key.txt locally and save its value in your password manager. Use it to sign in. Never commit this file.');
