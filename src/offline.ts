import type { Project } from './types';
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export const pendingKey=(alias:string)=>`wenxu.pending.v1.${encodeURIComponent(alias)}`;
export function readPending(s:Store,alias:string):Project[]{try{const data=JSON.parse(s.getItem(pendingKey(alias))??'[]');return Array.isArray(data)?data.filter(p=>p&&typeof p.id==='string'&&Number.isInteger(p.version)):[]}catch{return []}}
export function writePending(s:Store,alias:string,p:Project){s.setItem(pendingKey(alias),JSON.stringify([...readPending(s,alias).filter(x=>x.id!==p.id),p]));}
export function clearPending(s:Store,alias:string,id:string,expected?:Project){const existing=readPending(s,alias).find(p=>p.id===id);if(expected&&existing&&JSON.stringify(existing)!==JSON.stringify(expected))return;s.setItem(pendingKey(alias),JSON.stringify(readPending(s,alias).filter(x=>x.id!==id)));}
