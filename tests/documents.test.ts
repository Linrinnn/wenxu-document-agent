import { describe,it,expect,vi } from 'vitest';
import JSZip from 'jszip';
import { buildMarkdown,buildDocx,buildEpub,buildPdfDefinition,buildPdf,extractSource } from '../src/documents';
import type { Project } from '../src/types';
const project:Project={id:'test',title:'中文 & 文件',documentType:'report',requirements:'',audience:'',sources:[],chapters:[{id:'a',title:'第一章',content:'# 小節\n\n繁體**重點**與[來源](https://example.org)。\n\n| 項目 | 數值 |\n| --- | --- |\n| 測試 | 123 |\n\n> 引用內容\n\n- 清單一\n- 清單二',review:''},{id:'b',title:'第二章',content:'程式\n\n```js\nconst x = 1;\n```',review:''}],revisions:[],version:1,updatedAt:'2026-10-08'};
describe('文件匯出',()=>{
 it('Markdown 保存原始章節內容',()=>{const md=buildMarkdown(project);expect(md).toContain('# 中文 & 文件');expect(md).toContain('| 測試 | 123 |');expect(md).toContain('## 第二章');});
 it('DOCX 含多章中文、表格、引用及連結',async()=>{const zip=await JSZip.loadAsync(await buildDocx(project));const xml=await zip.file('word/document.xml')!.async('string');expect(xml).toContain('第一章');expect(xml).toContain('第二章');expect(xml).toContain('<w:tbl>');expect(xml).toContain('引用內容');expect(xml).toContain('w:hyperlink');});
 it('EPUB 有規範封裝和正確 XML escaping',async()=>{const bytes=await buildEpub(project);const zip=await JSZip.loadAsync(bytes);expect(await zip.file('mimetype')!.async('string')).toBe('application/epub+zip');expect(Object.keys(zip.files)[0]).toBe('mimetype');expect(await zip.file('OEBPS/content.opf')!.async('string')).toContain('中文 &amp; 文件');const html=await zip.file('OEBPS/chapter-1.xhtml')!.async('string');expect(html).toContain('<table>');expect(html).toContain('<blockquote>');expect(html).toContain('<strong>重點</strong>');expect(html).toContain('<a href="https://example.org">');});
 it('PDF 定義保存繁中與表格',()=>{const json=JSON.stringify(buildPdfDefinition(project));expect(json).toContain('第一章');expect(json).toContain('table');expect(json).toContain('繁體');});
 it('拒絕不支援格式及過大來源',async()=>{await expect(extractSource({name:'bad.exe',size:1} as File)).rejects.toThrow('支援');await expect(extractSource({name:'huge.txt',size:11*1024*1024} as File)).rejects.toThrow('10 MB');});
 it('以 UTF-8 讀取文字',async()=>{await expect(extractSource({name:'中文.md',size:10,text:async()=> '繁體中文'} as File)).resolves.toBe('繁體中文');});
});


it('實際 PDF 使用官方繁中字型產出可讀取多頁文件',async()=>{
 const {readFile}=await import('node:fs/promises');
 const font=await readFile(new URL('../public/fonts/NotoSansTC-Regular.otf',import.meta.url));
 const boldFont=await readFile(new URL('../public/fonts/NotoSansTC-Bold.otf',import.meta.url));
 vi.stubGlobal('fetch',async(url:string)=>new Response(url.includes('Bold')?boldFont:font));
 try{const blob=await buildPdf(project);const bytes=new Uint8Array(await blob.arrayBuffer());expect(new TextDecoder().decode(bytes.slice(0,5))).toBe('%PDF-');expect(bytes.length).toBeGreaterThan(10000);}finally{vi.unstubAllGlobals();}
},30000);

it('DOCX 可文字回讀而不傳送來源到外部',async()=>{
 const bytes=await buildDocx(project);
 const text=await extractSource({name:'測試.docx',size:bytes.length,arrayBuffer:async()=>bytes.buffer} as File);
 expect(text).toContain('中文 & 文件');expect(text).toContain('第一章');expect(text).toContain('引用內容');expect(text).toContain('123');
});

it('四種輸出保留穩定來源ID對照但不匯出來源原文',async()=>{
 const withSources:Project={...project,sources:[{id:'aaa-111',name:'官方 & 文件.pdf',text:'私人原文不應匯出',createdAt:'2026-10-08'},{id:'bbb-222',name:'另一個來源.md',text:'機密來源文字',createdAt:'2026-10-08'}]};
 const docx=await JSZip.loadAsync(await buildDocx(withSources));
 const epub=await JSZip.loadAsync(await buildEpub(withSources));
 const outputs=[buildMarkdown(withSources),await docx.file('word/document.xml')!.async('string'),JSON.stringify(buildPdfDefinition(withSources)),(await Promise.all(Object.values(epub.files).filter(f=>f.name.endsWith('.xhtml')).map(f=>f.async('string')))).join('\n')];
 for(const text of outputs){expect(text).toContain('來源對照');expect(text).toContain('[S-aaa-111]');expect(text).toContain('[S-bbb-222]');expect(text).toContain('來源由使用者提供；未進行外部事實查核。');expect(text).not.toContain('私人原文不應匯出');expect(text).not.toContain('機密來源文字');}
 const reversed=buildMarkdown({...withSources,sources:[...withSources.sources].reverse()});expect(reversed).toContain('[S-aaa-111] 官方 & 文件.pdf');expect(reversed).toContain('[S-bbb-222] 另一個來源.md');
});

it('DOCX 在不支援 Node buffer 的瀏覽器平台仍可匯出',async()=>{
 const {Packer}=await import('docx');
 const unavailable=vi.spyOn(Packer,'toBuffer').mockRejectedValue(new Error('nodebuffer is not supported by this platform'));
 try{const bytes=await buildDocx(project);const zip=await JSZip.loadAsync(bytes);expect(zip.file('word/document.xml')).not.toBeNull();}finally{unavailable.mockRestore();}
});
