let expectedAlias:string|null=null;
export function setExpectedAlias(alias:string|null){expectedAlias=alias;}
import type { Project } from './types';
export class ApiError extends Error { constructor(message:string,public status:number,public project?:Project){super(message);} }
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const payload=body===undefined&&!['GET','HEAD'].includes(method)?{}:body;
 let response:Response;
 try{response=await fetch(`/api${path}`,{method,credentials:'same-origin',headers:{...(payload===undefined?{}:{'Content-Type':'application/json'}),...(expectedAlias&&path!=='/login'?{'X-Wenxu-Account':expectedAlias}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});}
 catch{throw new ApiError('連線中斷，草稿保留於本機；恢復網路後可繼續同步。',0);}
 const data:any=await response.json().catch(()=>({error:'伺服器回應無法讀取'}));
 if(!response.ok)throw new ApiError(data.error??'操作失敗',response.status,data.project);
 return data as T;
}
