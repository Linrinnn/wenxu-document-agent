import { describe, it, expect } from 'vitest';
import { pendingKey, writePending, readPending, clearPending } from '../src/offline';
import type { Project } from '../src/types';
const storage = () => { const map=new Map<string,string>(); return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)},removeItem:(k:string)=>{map.delete(k)}}; };
const project={id:'p1',title:'草稿',version:2} as Project;
describe('帳號隔離的待同步草稿',()=>{
 it('不同代號的鍵不相同',()=>expect(pendingKey('甲')).not.toBe(pendingKey('乙')));
 it('個別專案保存及清除不影響其他草稿',()=>{const s=storage();writePending(s,'甲',project);writePending(s,'甲',{...project,id:'p2'});clearPending(s,'甲','p1');expect(readPending(s,'甲').map(p=>p.id)).toEqual(['p2']);expect(readPending(s,'乙')).toEqual([])});
 it('損壞資料不讓應用程式崩潰',()=>{const s=storage();s.setItem(pendingKey('甲'),'{broken');expect(readPending(s,'甲')).toEqual([])});
});
it('舊分頁保存成功不清除更新的本機草稿',()=>{const s=storage();writePending(s,'甲',project);const newer={...project,title:'另一分頁的新內容'};writePending(s,'甲',newer);clearPending(s,'甲',project.id,project);expect(readPending(s,'甲')).toEqual([newer]);clearPending(s,'甲',project.id,newer);expect(readPending(s,'甲')).toEqual([])});
