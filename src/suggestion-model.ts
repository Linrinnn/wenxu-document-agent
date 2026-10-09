
import type {PreviewChapter} from './preview-text';
export interface Suggestion{id:string;chapterId:string;original:string;replacement:string;selection?:{start:number;end:number};prompt:string;status:'pending'|'applied'|'dismissed';createdAt:string}
export interface SavedVersion{id:string;chapterId:string;title:string;content:string;reason:string;createdAt:string}
export function resolveSuggestion(chapter:PreviewChapter,s:Suggestion):{ok:true;content:string}|{ok:false;error:string}{
 if(s.status!=='pending')return {ok:false,error:'這份建議已處理，不能再次採用。'};
 if(chapter.id!==s.chapterId)return {ok:false,error:'請先切換到這份建議所屬的章節。'};
 if(chapter.content!==s.original)return {ok:false,error:'正文已在建議加入後變更。請重新比較並加入新版建議，避免覆寫你的修改。'};
 if(s.selection){const {start,end}=s.selection;if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>s.original.length)return {ok:false,error:'選取範圍已失效，請重新選取。'};return {ok:true,content:s.original.slice(0,start)+s.replacement+s.original.slice(end)};}
 return {ok:true,content:s.replacement};
}
