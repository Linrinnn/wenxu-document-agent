import {SignJWT,jwtVerify} from 'jose';
import type {Project} from '../src/types';
import {validateProject,buildPrompt} from '../src/model';
interface Env{DB:D1Database;ASSETS?:Fetcher;AI?:Ai;AI_MODEL?:string;LOCAL_DEV?:string;SESSION_SECRET?:string;ACCOUNTS_JSON?:string}
const encoder=new TextEncoder();const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
const unhex=(s:string)=>new Uint8Array(s.match(/.{2}/g)!.map(v=>parseInt(v,16)));
export async function hashPassword(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)).buffer),iterations=100000){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const hash=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations},key,256);return {salt,hash:hex(hash),iterations};}
const response=(body:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
function local(req:Request,env:Env){return env.LOCAL_DEV==='true'&&['localhost','127.0.0.1','[::1]'].includes(new URL(req.url).hostname);}
function secret(req:Request,env:Env){const s=env.SESSION_SECRET||(local(req,env)?'local-only-session-secret-do-not-deploy':'' );if(s.length<32)throw new Error('登入服務尚未設定');return encoder.encode(s);}
async function accounts(req:Request,env:Env){if(env.ACCOUNTS_JSON){const a=JSON.parse(env.ACCOUNTS_JSON);if(!Array.isArray(a))throw new Error('帳號設定不正確');return a as {alias:string;salt:string;hash:string;iterations:number}[];}if(local(req,env))return [{alias:'demo',...await hashPassword('local-demo-only','00112233445566778899aabbccddeeff',100000)}];throw new Error('登入服務尚未設定');}
async function identity(req:Request,env:Env){const match=req.headers.get('cookie')?.match(/(?:^|;\s*)wenxu_session=([^;]+)/);if(!match)return null;try{const {payload}=await jwtVerify(match[1],secret(req,env),{algorithms:['HS256'],issuer:'wenxu',audience:'wenxu-web'});if(typeof payload.sub!=='string')return null;const a=await accounts(req,env);return a.some(x=>x.alias===payload.sub)?payload.sub:null;}catch{return null;}}
async function limited(env:Env,key:string,limit:number,seconds:number){const now=Math.floor(Date.now()/1000);const r=await env.DB.prepare('INSERT INTO throttle(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<=? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING count').bind(key,now+seconds,now,now).first<{count:number}>();return !r||r.count>limit;}
async function body(req:Request){const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>1900000)throw new Error('請求超過容量限制');return JSON.parse(raw);}
async function row(env:Env,id:string,owner:string){return env.DB.prepare('SELECT * FROM projects WHERE id=? AND owner=?').bind(id,owner).first<{id:string;owner:string;version:number;body:string}>();}
function secureHeaders(r:Response){const out=new Response(r.body,r);out.headers.set('X-Content-Type-Options','nosniff');out.headers.set('Referrer-Policy','same-origin');out.headers.set('X-Frame-Options','DENY');out.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");return out;}
export default {
 async fetch(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url);if(!url.pathname.startsWith('/api/')){if(!env.ASSETS)return response({error:'網站尚未建置'},404);return secureHeaders(await env.ASSETS.fetch(req));}
 try{
 if(!['GET','HEAD'].includes(req.method)){
 const origin=req.headers.get('origin');const allowed=new Set([url.origin]);if(local(req,env)){allowed.add('http://127.0.0.1:5173');allowed.add('http://localhost:5173');}
 if(!origin||!allowed.has(origin))return response({error:'不接受跨站請求'},403);
 if(!req.headers.get('content-type')?.startsWith('application/json'))return response({error:'只接受JSON請求'},415);
 }
 if(url.pathname==='/api/login'&&req.method==='POST'){
 const {alias,password}=await body(req);if(typeof alias!=='string'||typeof password!=='string'||alias.length>64||password.length>256)return response({error:'帳號或密碼不正確'},401);
 const ip=req.headers.get('CF-Connecting-IP')||'local';if(await limited(env,'login:'+ip,12,300))return response({error:'登入嘗試太頻繁，請五分鐘後再試'},429);
 const a=(await accounts(req,env)).find(x=>x.alias===alias);
 const actual=await hashPassword(password,a?.salt||'00112233445566778899aabbccddeeff',a?.iterations||100000);
 let diff=0;const expected=a?.hash||'0'.repeat(64);for(let i=0;i<64;i++)diff|=(actual.hash.charCodeAt(i)^expected.charCodeAt(i));
 if(!a||diff!==0)return response({error:'帳號或密碼不正確'},401);
 const token=await new SignJWT({}).setProtectedHeader({alg:'HS256'}).setSubject(alias).setIssuer('wenxu').setAudience('wenxu-web').setIssuedAt().setExpirationTime('8h').sign(secret(req,env));
 return response({alias,mode:local(req,env)?'local':'cloud'},200,{'Set-Cookie':'wenxu_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800'+(url.protocol==='https:'?'; Secure':'')});
 }
 
 const owner=await identity(req,env);if(!owner)return response({error:'請先登入',code:'UNAUTHORIZED'},401);
 if(url.pathname!=='/api/me'&&req.headers.get('X-Wenxu-Account')!==owner)return response({error:'登入帳號已在其他分頁變更，草稿保留於原帳號本機；請重新整理並登入。'},401);
 if(url.pathname==='/api/me'&&req.method==='GET')return response({alias:owner,mode:local(req,env)?'local':'cloud'});
 if(url.pathname==='/api/logout'&&req.method==='POST')return response({ok:true},200,{'Set-Cookie':'wenxu_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(url.protocol==='https:'?'; Secure':'')});
 if(url.pathname==='/api/projects'){
 if(req.method==='GET'){const result=await env.DB.prepare('SELECT body FROM projects WHERE owner=? ORDER BY updated_at DESC').bind(owner).all<{body:string}>();return response(result.results.map(x=>JSON.parse(x.body)));}
 if(req.method==='POST'){
 const p=await body(req);validateProject(p);const next={...p,version:1,updatedAt:new Date().toISOString()};
 const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM projects WHERE owner=?').bind(owner).first<{n:number}>();if((count?.n||0)>=50)return response({error:'第一版每個帳號最多50份文件'},422);
 try{await env.DB.prepare('INSERT INTO projects(id,owner,version,body,updated_at) VALUES(?,?,?,?,?)').bind(next.id,owner,1,JSON.stringify(next),next.updatedAt).run();}catch(error){if(/UNIQUE|PRIMARY KEY/i.test(String(error)))return response({error:'文件識別碼已存在'},409);return response({error:'資料庫暫時無法保存，草稿已保留，請稍後再試'},503);}
 return response(next,201);
 }}
 const match=url.pathname.match(/^\/api\/projects\/([-\w]{1,64})(\/ai)?$/);if(!match)return response({error:'找不到API'},404);
 const current=await row(env,match[1],owner);if(!current)return response({error:'找不到文件'},404);const p=JSON.parse(current.body) as Project;
 if(match[2]==='/ai'&&req.method==='POST'){
 const input=await body(req);if(!['outline','chapter','review'].includes(input.action))return response({error:'不支援的生成動作'},400);
 if(input.projectVersion!==p.version)return response({error:'文件版本已更新，請先同步',project:p},409);
 if(!p.sources.length)return response({error:'請先加入並確認來源資料'},422);
 if(await limited(env,'ai:'+owner,8,60))return response({error:'生成太頻繁，請稍後再試',code:'RATE_LIMIT'},429);
 if(!env.AI)return response({error:'AI尚未連接，請完成Cloudflare登入；稿件與匯出仍可使用',code:'AI_UNAVAILABLE'},503);
 const prompt=buildPrompt(p,input.action,input.chapterId);const model=env.AI_MODEL||'@cf/qwen/qwen3-30b-a3b-fp8';
 if(model!=='@cf/qwen/qwen3-30b-a3b-fp8')return response({error:'第一版只啟用指定免費額度模型'},503);
 try{
 const result=await env.AI.run(model as any,{messages:[{role:'system',content:prompt.system},{role:'user',content:prompt.user}],max_tokens:input.action==='outline'?1200:3200,temperature:0.4});
 let text=typeof result==='string'?result:(result as any).response||(result as any).choices?.[0]?.message?.content;
 if(typeof text!=='string'||!text.trim())return response({error:'AI未回傳有效內容，原稿已保留'},502);
 text=text.replace(/<think>[\s\S]*?<\/think>/g,'').trim();if(!text)return response({error:'AI未回傳正文，原稿已保留'},502);
 return response({text});
 }catch(error){const m=String(error);if(/quota|neuron|limit|429|exceed/i.test(m))return response({error:'免費額度或生成頻率已達限制，稿件已保留，請稍後再試',code:'AI_QUOTA'},429);return response({error:'AI服務暫時無法使用，原稿已保留',code:'AI_FAILED'},502);}
 }
 if(match[2])return response({error:'不支援的操作'},405);
 if(req.method==='GET')return response(p);
 if(req.method==='PUT'){
 const next=await body(req);validateProject(next);if(next.id!==p.id)return response({error:'文件識別碼不符'},400);if(next.version!==p.version)return response({error:'另一個裝置已更新文件',code:'CONFLICT',project:p},409);
 next.version=p.version+1;next.updatedAt=new Date().toISOString();
 const result=await env.DB.prepare('UPDATE projects SET version=?,body=?,updated_at=? WHERE id=? AND owner=? AND version=?').bind(next.version,JSON.stringify(next),next.updatedAt,p.id,owner,p.version).run();
 if(result.meta.changes!==1){const latest=await row(env,p.id,owner);return response({error:'另一個裝置已更新文件',code:'CONFLICT',project:latest?JSON.parse(latest.body):p},409);}
 return response(next);
 }
 return response({error:'不支援的操作'},405);
 }catch(error){const m=error instanceof Error?error.message:'';if(m.includes('登入服務')||m.includes('帳號設定'))return response({error:m},503);if(error instanceof SyntaxError)return response({error:'JSON格式不正確'},400);return response({error:m||'請求無法處理'},422);}
 }
};
