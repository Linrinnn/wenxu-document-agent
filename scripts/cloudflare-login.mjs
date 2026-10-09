import {mkdirSync,cpSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const config=resolve(root,'.wrangler/auth');
// Wrangler 的 Windows 憑證套件需位於自己的原生模組載入目錄。
const scope=join(config,'.wrangler/native/keyring/node_modules/@napi-rs');
mkdirSync(scope,{recursive:true});
for(const name of ['keyring','keyring-win32-x64-msvc']){
 const source=join(root,'node_modules/@napi-rs',name);
 if(!existsSync(source)){console.error('找不到 Windows 憑證模組，請先執行 npm ci。');process.exit(1);}
 cpSync(source,join(scope,name),{recursive:true});
}
const result=spawnSync(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),'login','--use-keyring','--scopes','account:read','user:read','workers:write','workers_scripts:write','d1:write','ai:write'],{cwd:root,env:{...process.env,XDG_CONFIG_HOME:config},stdio:'inherit'});
process.exitCode=result.status??1;
