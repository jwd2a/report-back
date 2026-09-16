import {database,owner,owned,access,doc,put,token,hash,body,text,originCheck,json,error,fail} from "@/lib/store";
export const dynamic="force-dynamic";
async function handle(req:Request,ctx:any){try{
 originCheck(req);const {path=[]}=await ctx.params;const [id,action,scope]=path;const db=database();
 if(path.length>3)fail(404,"Not found");
 if(!id){
 if(req.method==="GET"){const {results}=await db.prepare("SELECT id,title,created FROM documents WHERE owner=? ORDER BY created DESC LIMIT 200").bind(await owner(req)).all();return json(results)}
 if(req.method==="POST"){
 const u=await owner(req),b=await body(req),title=text(b.title,"Title"),id=crypto.randomUUID();
 const scopes=b.scopes??[{scope:"personal",label:"Personal"},{scope:"work",label:"Work"},{scope:"madera",label:"Madera Labs"}];
 if(!Array.isArray(scopes)||!scopes.length||scopes.length>12)fail(400,"Provide 1–12 scopes");
 const seen=new Set();for(const s of scopes){if(!s||typeof s.scope!=="string"||!/^[a-z][a-z0-9-]{0,39}$/.test(s.scope)||seen.has(s.scope))fail(400,"Scopes must be unique lowercase slugs");text(s.label,"Scope label",80);seen.add(s.scope)}
 await db.batch([db.prepare("INSERT INTO documents(id,owner,title,created) VALUES (?,?,?,?)").bind(id,u,title,new Date().toISOString()),...scopes.map((s:any,i:number)=>db.prepare("INSERT INTO contributions(document_id,scope,label,position) VALUES (?,?,?,?)").bind(id,s.scope,s.label,i))]);return json(await doc(id),201)
 }fail(405,"Method not allowed");}
 const auth=await access(req,id);
 if(req.method==="GET"&&!action)return json(await doc(id,auth.scope));
 if(req.method==="GET"&&action==="markdown"){if(auth.scope)fail(403,"A reader key is required for the combined document");const d=await doc(id);return new Response(d.markdown,{headers:{"Content-Type":"text/markdown; charset=utf-8","Cache-Control":"no-store","Content-Disposition":`inline; filename="${id}.md"`,"X-Content-Type-Options":"nosniff"}})}
 if(action==="contributions"&&scope){if(!auth.admin&&auth.scope!==scope)fail(403,"This key cannot access that scope");if(req.method==="PUT")return json(await put(id,scope,await body(req),auth.actor));if(req.method==="GET")return json(await doc(id,scope));}
 if(action==="history"&&req.method==="GET"){if(!auth.admin)fail(403,"Owner access required");const {results}=await db.prepare("SELECT * FROM revisions WHERE document_id=? ORDER BY updated DESC LIMIT 100").bind(id).all();return json(results)}
 if(action==="keys"){
 if(!auth.admin)fail(403,"Owner access required");await owned(req,id);
 if(req.method==="GET"){const {results}=await db.prepare("SELECT id,scope,label,created,revoked FROM keys WHERE document_id=? ORDER BY created DESC").bind(id).all();return json(results)}
 if(req.method==="POST"){const b=await body(req),s=b.scope??null;if(s!==null&&!await db.prepare("SELECT scope FROM contributions WHERE document_id=? AND scope=?").bind(id,s).first())fail(400,"Unknown scope");const t=token(),kid=crypto.randomUUID();await db.prepare("INSERT INTO keys(id,document_id,scope,label,hash,created) VALUES (?,?,?,?,?,?)").bind(kid,id,s,text(b.label,"Key label",80),await hash(t),new Date().toISOString()).run();return json({id:kid,token:t,scope:s},201)}
 if(req.method==="DELETE"&&scope){await db.prepare("UPDATE keys SET revoked=1 WHERE id=? AND document_id=?").bind(scope,id).run();return json({revoked:true})}
 }
 fail(405,"Method not allowed");
 }catch(e){return error(e)}}
export const GET=handle;export const POST=handle;export const PUT=handle;export const DELETE=handle;
