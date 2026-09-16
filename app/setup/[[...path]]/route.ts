import {database,fail,error} from "@/lib/store";
import {setupGuide} from "@/lib/setup";
export const dynamic="force-dynamic";
// Public on purpose: agents fetch this before they have a key. It contains no secrets.
export async function GET(req:Request,ctx:any){try{
 const {path=[]}=await ctx.params;const [id,slug]=path;if(!id||path.length>2)fail(404,"Not found");
 const db=database(),d=await db.prepare("SELECT id,title FROM documents WHERE id=?").bind(id).first<{id:string;title:string}>();if(!d)fail(404,"Document not found");
 const scope=slug?await db.prepare("SELECT scope,label FROM contributions WHERE document_id=? AND scope=?").bind(id,slug).first<{scope:string;label:string}>():null;if(slug&&!scope)fail(404,"Scope not found");
 return new Response(setupGuide({origin:new URL(req.url).origin,id:d!.id,title:d!.title,scope}),{headers:{"Content-Type":"text/markdown; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex"}});
 }catch(e){return error(e)}}
