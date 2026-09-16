import { authenticatedOwner } from "@/lib/auth";
import { env } from "cloudflare:workers";
export function database(): D1Database { const db = (env as unknown as {DB:D1Database}).DB; if(!db) throw new Error("Database unavailable"); return db; }
export class ApiError extends Error { constructor(public status:number,message:string){super(message)} }
export const fail=(status:number,message:string):never=>{throw new ApiError(status,message)};
export async function hash(token:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("")}
export function token(){return "cp_"+Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join("")}
export function text(value:unknown,name:string,max=200){if(typeof value!=="string"||!value.trim()||value.length>max)fail(400,`${name} must be 1–${max} characters`);return (value as string).trim()}
export async function body(req:Request){if(!req.headers.get("content-type")?.includes("application/json"))fail(415,"Use application/json");const raw=await req.text();if(raw.length>110000)fail(413,"Request too large");try{const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))fail(400,"Expected a JSON object");return parsed}catch{fail(400,"Invalid JSON object")}}
export function originCheck(req:Request){const o=req.headers.get("origin");if(o&&o!==new URL(req.url).origin)fail(403,"Origin not allowed")}
export async function owner(req:Request){const id=await authenticatedOwner(req);if(!id)fail(401,"Sign in to manage documents");return id!}
export async function owned(req:Request,id:string){const d=await database().prepare("SELECT * FROM documents WHERE id=? AND owner=?").bind(id,await owner(req)).first();if(!d)fail(404,"Document not found");return d!}
export async function access(req:Request,id:string){
 const a=req.headers.get("authorization");if(a){const k=await database().prepare("SELECT * FROM keys WHERE hash=? AND revoked=0 AND document_id=?").bind(await hash(a.replace(/^Bearer /i,"")),id).first();if(!k)fail(401,"Invalid or revoked agent key");return {scope:k!.scope as string|null,actor:k!.id as string,admin:false}}
 await owned(req,id);return {scope:null,actor:"owner",admin:true};
}
export async function doc(id:string,scope:string|null=null){
 const d=await database().prepare("SELECT id,title,created FROM documents WHERE id=?").bind(id).first();if(!d)fail(404,"Document not found");
 const q=scope?database().prepare("SELECT * FROM contributions WHERE document_id=? AND scope=? ORDER BY position").bind(id,scope):database().prepare("SELECT * FROM contributions WHERE document_id=? ORDER BY position").bind(id);
 const {results}=await q.all();return {...d,contributions:results,markdown:compose(d!,results)};
}
export function compose(d:any,rows:any[]){return `# ${d.title}\n\n`+rows.map(c=>`## ${c.label}\n\n${c.markdown||"_Awaiting contribution._"}`).join("\n\n---\n\n")+"\n"}
export async function put(id:string,scope:string,data:any,actor:string){
 if(typeof data.markdown!=="string"||data.markdown.length>100000)fail(400,"markdown must be a string under 100,000 characters");
 if(!Number.isInteger(data.expected_revision)||data.expected_revision<0)fail(400,"expected_revision must be a nonnegative integer; read the contribution first");
 const time=new Date().toISOString(),db=database();
 // D1 batch is transactional. The history row is inserted only for a matching revision;
 // the following update sees the same serialized transaction, preventing lost updates.
 const result=await db.batch([
 db.prepare("INSERT INTO revisions (document_id,scope,revision,markdown,updated,actor) SELECT document_id,scope,revision+1,?,?,? FROM contributions WHERE document_id=? AND scope=? AND revision=?").bind(data.markdown,time,actor,id,scope,data.expected_revision),
 db.prepare("UPDATE contributions SET markdown=?,revision=revision+1,updated=? WHERE document_id=? AND scope=? AND revision=?").bind(data.markdown,time,id,scope,data.expected_revision)
 ]);
 if(!result[1].meta.changes)fail(409,"Revision conflict or missing scope. Read the current contribution and retry with its revision.");
 return {scope,revision:data.expected_revision+1,updated:time};
}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
export function error(e:unknown){if(e instanceof ApiError)return json({error:e.message},e.status);console.error("Commonplace request failed",e);return json({error:"The service is unavailable. Your input has not been cleared; please retry."},503)}
