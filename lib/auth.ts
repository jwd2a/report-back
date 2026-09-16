import { env } from "cloudflare:workers";
const COOKIE="__Host-commonplace";
const TTL=86400;
function secret(){const value=(env as unknown as {OWNER_SECRET?:string}).OWNER_SECRET;if(!value||!/^([a-f0-9]{64})$/i.test(value))throw new Error("Configure OWNER_SECRET with 32 random bytes encoded as hex");return value}
const enc=new TextEncoder();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function key(){return crypto.subtle.importKey("raw",enc.encode(secret()),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"])}
export async function validSecret(value:unknown){if(typeof value!=="string"||value.length!==64)return false;const expected=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(secret())));const actual=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value)));let diff=0;for(let i=0;i<expected.length;i++)diff|=expected[i]^actual[i];return diff===0}
export async function sessionCookie(req:Request){const expires=Math.floor(Date.now()/1000)+TTL;const payload=new URL(req.url).origin+"|"+expires;const sig=hex(await crypto.subtle.sign("HMAC",await key(),enc.encode(payload)));return `${COOKIE}=${expires}.${sig}; Path=/; Max-Age=${TTL}; Secure; HttpOnly; SameSite=Strict`}
export function clearCookie(){return `${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`}
export async function authenticatedOwner(req:Request){
 const parts=(req.headers.get("cookie")||"").split(";").map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+"="));if(parts.length!==1)return null;
 const match=parts[0].slice(COOKIE.length+1).match(/^(\d{10})\.([0-9a-f]{64})$/);if(!match)return null;
 const expires=Number(match[1]),now=Math.floor(Date.now()/1000);if(expires<=now||expires>now+TTL)return null;
 const signature=Uint8Array.from(match[2].match(/../g)!,s=>parseInt(s,16));
 if(!await crypto.subtle.verify("HMAC",await key(),signature,enc.encode(new URL(req.url).origin+"|"+expires)))return null;
 return (env as unknown as {OWNER_ID?:string}).OWNER_ID||"owner";
}
