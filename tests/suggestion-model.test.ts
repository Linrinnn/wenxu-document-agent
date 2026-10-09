
import {describe,it,expect} from 'vitest';
import {resolveSuggestion,type Suggestion} from '../src/suggestion-model';
const chapter={id:'c1',title:'第一章',content:'前段\n需要修改\n後段'};
const suggestion:Suggestion={id:'s1',chapterId:'c1',original:chapter.content,replacement:'修改後',prompt:'改寫',status:'pending',createdAt:'2026-10-08T00:00:00Z'};
describe('採用修改建議的保稿規則',()=>{
 it('完整章節採用使用者文字',()=>expect(resolveSuggestion(chapter,suggestion)).toEqual({ok:true,content:'修改後'}));
 it('只替換反白區域，保留前後文',()=>expect(resolveSuggestion(chapter,{...suggestion,selection:{start:3,end:7}})).toEqual({ok:true,content:'前段\n修改後\n後段'}));
 it('正文變更後拒絕過期建議',()=>expect(resolveSuggestion({...chapter,content:'人工新增內容'},suggestion).ok).toBe(false));
 it('拒絕其他章節的建議',()=>expect(resolveSuggestion({...chapter,id:'c2'},suggestion).ok).toBe(false));
 it('拒絕已採用的建議',()=>expect(resolveSuggestion(chapter,{...suggestion,status:'applied'}).ok).toBe(false));
 it('拒絕失效選取範圍',()=>expect(resolveSuggestion(chapter,{...suggestion,selection:{start:-1,end:8}}).ok).toBe(false));
});
