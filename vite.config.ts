import vinext from "vinext";
import {defineConfig} from "vite";
import {readFileSync} from "node:fs";
export default defineConfig(async()=>{
 process.env.CLOUDFLARE_CF_FETCH_ENABLED??="false";
 process.env.WRANGLER_SEND_METRICS??="false";
 const {cloudflare}=await import("@cloudflare/vite-plugin");
 const config=JSON.parse(readFileSync(new URL("./wrangler.jsonc",import.meta.url),"utf8"));
 return {plugins:[vinext(),cloudflare({viteEnvironment:{name:"rsc",childEnvironments:["ssr"]},inspectorPort:false,config:{...config,main:"vinext/server/fetch-handler",assets:undefined}})]};
});
