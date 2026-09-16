import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,rm} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {build}=require(require.resolve('esbuild',{paths:[require.resolve('vite')]}));
const {Miniflare}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]}));
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB'],compatibilityDate:'2026-05-01'});
try{
 const db=await mf.getD1Database('DB');
 globalThis.__testEnv={DB:db,OWNER_SECRET:"a".repeat(64),OWNER_ID:"owner-a"};
 const sql=await readFile('drizzle/0000_needy_tattoo.sql','utf8');
 for(const statement of sql.split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
 await mkdir('.sites-runtime/tests',{recursive:true});
 await build({entryPoints:['app/api/docs/[[...path]]/route.ts','app/mcp/[id]/route.ts','app/api/session/route.ts'],outdir:'.sites-runtime/tests',outbase:'app',bundle:true,platform:'node',format:'esm',plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.__testEnv;',loader:'js'}))}}]});
 const session=await import('../.sites-runtime/tests/api/session/route.js');
 const login=async(secret,origin='https://example.test')=>session.POST(new Request('https://example.test/api/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({secret})}));
 assert.equal((await login('b'.repeat(64))).status,401);
 assert.equal((await login('a'.repeat(64),'https://evil.test')).status,403);
 const signedIn=await login('a'.repeat(64));assert.equal(signedIn.status,200);
 const cookie=signedIn.headers.get('Set-Cookie').split(';')[0];
 assert.ok(signedIn.headers.get('Set-Cookie').includes('Secure; HttpOnly; SameSite=Strict'));
 const api=await import('../.sites-runtime/tests/api/docs/[[...path]]/route.js');
 const mcp=await import('../.sites-runtime/tests/mcp/[id]/route.js');
 async function call(path=[],method='GET',data,auth='owner-a'){
  const headers={'content-type':'application/json'};
  if(auth?.startsWith('cp_'))headers.authorization='Bearer '+auth;else if(auth==='owner-a')headers.cookie=cookie;else if(auth)headers['oai-authenticated-user-id']=auth;
  const req=new Request('https://example.test/api/docs/'+path.join('/'),{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
  const r=await api[method](req,{params:Promise.resolve({path})});
  return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()};
 }
 assert.equal((await call([], 'GET',undefined,null)).status,401);
 const created=await call([],'POST',{title:'Test agenda'});assert.equal(created.status,201);const id=created.data.id;
 assert.equal((await call([id],'GET',undefined,'owner-b')).status,401); // Untrusted identity headers must never grant ownership.
 const other=await call([],'POST',{title:'Another document'});
 const key=async(scope)=> (await call([id,'keys'],'POST',{label:scope||'Reader',scope})).data.token;
 const personal=await key('personal'),work=await key('work'),reader=await key(null);
 assert.equal((await call([id,'contributions','work'],'PUT',{markdown:'forbidden',expected_revision:0},personal)).status,403);
 assert.equal((await call([id,'contributions','personal'],'PUT',{markdown:'forbidden',expected_revision:0},reader)).status,403);
 assert.equal((await call([other.data.id],'GET',undefined,personal)).status,401);
 const writes=await Promise.all([call([id,'contributions','personal'],'PUT',{markdown:'Personal first',expected_revision:0},personal),call([id,'contributions','personal'],'PUT',{markdown:'Personal second',expected_revision:0},personal)]);
 assert.deepEqual(writes.map(x=>x.status).sort(),[200,409]);
 assert.equal((await call([id,'contributions','work'],'PUT',{markdown:'Work secret',expected_revision:0},work)).status,200);
 const scoped=await call([id],'GET',undefined,personal);assert.equal(scoped.data.contributions.length,1);assert.ok(!scoped.data.markdown.includes('Work secret'));
 assert.equal((await call([id,'markdown'],'GET',undefined,personal)).status,403);
 const assembled=await call([id,'markdown'],'GET',undefined,reader);assert.equal(assembled.status,200);assert.ok(assembled.data.includes('Work secret'));assert.ok(assembled.data.includes('Personal '));
 assert.equal((await call([id,'history'])).data.length,2);
 assert.equal((await call([id,'contributions','work'],'PUT',{markdown:'lost update',expected_revision:0},work)).status,409);
 assert.equal((await call([id,'contributions','work'],'PUT',{markdown:'Missing revision'},work)).status,400);
 async function rpc(name,args={},t=personal,extra={}){const r=await mcp.POST(new Request('https://example.test/mcp/'+id,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t,...extra},body:JSON.stringify({jsonrpc:'2.0',id:1,method:name,params:args})}),{params:Promise.resolve({id})});return {status:r.status,data:await r.json()}}
 assert.equal((await rpc('initialize',{protocolVersion:'2025-11-25'})).data.result.protocolVersion,'2025-11-25');
 assert.deepEqual((await rpc('tools/list')).data.result.tools.map(t=>t.name),['read_contribution','write_contribution']);
 assert.deepEqual((await rpc('tools/list',{},reader)).data.result.tools.map(t=>t.name),['read_document']);
 assert.ok((await rpc('tools/call',{name:'read_document'})).data.error);
 assert.equal((await rpc('tools/call',{name:'write_contribution',arguments:{markdown:'Personal updated',expected_revision:1}})).data.result.isError,undefined);
 assert.equal((await rpc('tools/call',{name:'write_contribution',arguments:{markdown:'stale',expected_revision:1}})).data.result.isError,true);
 assert.equal((await rpc('tools/list',{},personal,{Origin:'https://evil.test'})).status,403);
 assert.equal((await rpc('tools/list',{},personal,{'MCP-Protocol-Version':'unsupported'})).status,400);
 const issued=(await call([id,'keys'])).data;assert.ok(issued.every(k=>!k.hash&&!k.token));
 const pk=issued.find(k=>k.scope==='personal');await call([id,'keys',pk.id],'DELETE');assert.equal((await call([id],'GET',undefined,personal)).status,401);
 assert.equal((await call([id,'history'])).data.length,3);
 const tampered=await session.GET(new Request('https://example.test/api/session',{headers:{Cookie:cookie+'0'}}));assert.equal((await tampered.json()).authenticated,false);
 const crossHost=await session.GET(new Request('https://other.test/api/session',{headers:{Cookie:cookie}}));assert.equal((await crossHost.json()).authenticated,false);
 globalThis.__testEnv.OWNER_SECRET='c'.repeat(64);
 assert.equal((await call([])).status,401); // Secret rotation invalidates old sessions.
 console.log('PASS: standalone owner login, forged identity-header rejection, signed cookie flags, tampered/cross-host cookies, secret rotation; real D1 migration, owner and document isolation, scope isolation, concurrent revision conflict, combined Markdown, revision history, read-only keys, MCP initialize/tools/read/write/errors, origin validation, protocol validation, key revocation.');
}finally{await mf.dispose()}
