import {webcrypto,randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import readline from 'node:readline/promises';
import {Writable} from 'node:stream';
import {spawnSync} from 'node:child_process';
let hidden=false;
const output=new Writable({write(chunk,encoding,callback){if(!hidden)process.stdout.write(chunk,encoding);callback();}});
const r=readline.createInterface({input:process.stdin,output,terminal:process.stdin.isTTY});
async function password(question){process.stdout.write(question);hidden=true;const answer=await r.question('');hidden=false;process.stdout.write('\n');return answer;}
if(!process.stdin.isTTY){console.error('請在私人互動式終端機執行，密碼不寫入聊天或命令列。');process.exit(1);}
console.log('建立兩組代號與密碼。輸入密碼不顯示；僅保存加鹽雜湊。');
const accounts=[];
try{
for(let i=0;i<2;i++){
 const alias=(await r.question('第'+(i+1)+'組代號（英數、底線或連字號）：')).trim();
 const value=await password('密碼（至少12字元）：');const confirm=await password('再次輸入密碼：');
 if(!/^[-a-zA-Z0-9_]{1,64}$/.test(alias)||accounts.some(a=>a.alias===alias)||value.length<12||value!==confirm)throw new Error('代號重複、格式不正確、密碼太短或兩次不一致。');
 const salt=webcrypto.getRandomValues(new Uint8Array(16));const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);const hash=await webcrypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},key,256);
 accounts.push({alias,salt:Buffer.from(salt).toString('hex'),hash:Buffer.from(hash).toString('hex'),iterations:100000});
}
r.close();
const session=randomBytes(48).toString('base64url');
if(process.argv.includes('--cloud')){
 const root=fileURLToPath(new URL('../',import.meta.url));
 for(const [name,value]of [['ACCOUNTS_JSON',JSON.stringify(accounts)],['SESSION_SECRET',session]]){
 const result=spawnSync(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),'secret','put',name],{cwd:root,env:{...process.env,XDG_CONFIG_HOME:join(root,'.wrangler/auth')},input:value,encoding:'utf8',stdio:['pipe','inherit','inherit']});if(result.status!==0)throw new Error('雲端秘密設定未完成，請確認Cloudflare登入與Worker已建立。');
 }
 console.log('雲端兩組帳號已設定；既有登入工作階段會失效。');
}else{
 writeFileSync(new URL('../.dev.vars',import.meta.url),'LOCAL_DEV=true\nSESSION_SECRET='+session+'\nACCOUNTS_JSON='+JSON.stringify(accounts)+'\n',{encoding:'utf8',mode:0o600});
 console.log('兩組本地帳號已設定，請重新啟動後端。此檔已排除Git。');
}
}catch(e){r.close();console.error(e.message);process.exitCode=1;}

