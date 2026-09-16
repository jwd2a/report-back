import { authenticatedOwner,validSecret,sessionCookie,clearCookie } from "@/lib/auth";
import {originCheck,body,json,error,fail} from "@/lib/store";
export const dynamic="force-dynamic";
export async function GET(req:Request){try{return json({authenticated:!!await authenticatedOwner(req)})}catch(e){return error(e)}}
export async function POST(req:Request){try{originCheck(req);const b=await body(req);if(!await validSecret(b.secret))fail(401,"Invalid owner key");const r=json({authenticated:true});r.headers.set("Set-Cookie",await sessionCookie(req));return r}catch(e){return error(e)}}
export async function DELETE(req:Request){try{originCheck(req);const r=json({authenticated:false});r.headers.set("Set-Cookie",clearCookie());return r}catch(e){return error(e)}}
