export interface PreviewChapter {id:string;title:string;content:string}
export function splitImportedText(text:string):PreviewChapter[]{
 const chapters:PreviewChapter[]=[];let title='前言',lines:string[]=[];
 const flush=()=>{if(lines.join('\n').trim()||title!=='前言')chapters.push({id:crypto.randomUUID(),title,content:lines.join('\n').trim()});lines=[];};
 for(const line of text.replace(/\r\n?/g,'\n').split('\n')){const heading=line.match(/^#{1,3}\s+(.+)$/)||line.match(/^(第[一二三四五六七八九十百零〇\d]+[章節](?:\s.*|[：:].*)?)\s*$/);if(heading){flush();title=heading[1].trim();}else lines.push(line);}
 flush();if(chapters.length===1&&chapters[0].title==='前言')chapters[0].title='全文';return chapters;
}