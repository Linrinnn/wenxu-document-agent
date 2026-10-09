import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>console.log('PAGE_ERROR '+e.message));
 await page.goto('http://127.0.0.1:4173/wenxu-document-agent/',{waitUntil:'networkidle'});
 function summarize(name){return page.evaluate(n=>{
  const selectors=['.bp-header','.bp-header-actions','.bp-mobile-tabs','.bp-workspace','.bp-paper','.bp-paper-toolbar','.bp-formatbar','.bp-canvas','.bp-document','.bp-chapters','.bp-assistant','.bp-tour-card'];
  const elements=Object.fromEntries(selectors.map(k=>{const el=document.querySelector(k);if(!el)return [k,null];const r=el.getBoundingClientRect();const s=getComputedStyle(el);return [k,{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),display:s.display,visibility:s.visibility,position:s.position,overflowX:s.overflowX,overflowY:s.overflowY}]}));
  return {name:n,width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,height:innerHeight,documentHeight:document.documentElement.scrollHeight,elements,visibleButtons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden').slice(0,30).map(e=>({name:e.getAttribute('aria-label')||e.innerText.slice(0,30),x:Math.round(e.getBoundingClientRect().x),y:Math.round(e.getBoundingClientRect().y),w:Math.round(e.getBoundingClientRect().width)}))};
 },name);}
 function picture(name){return page.screenshot({type:'jpeg',quality:65,fullPage:false}).then(buffer=>{const s=buffer.toString('base64');console.log('@@IMAGE_START '+name+' '+s.length);for(let i=0;i<s.length;i+=1200)console.log('@@IMAGE '+name+' '+s.slice(i,i+1200));console.log('@@IMAGE_END '+name);});}
 assert.equal(await page.locator('#bp-alias').count(),0,'Offline preview must not show unusable sign-in inputs');
 console.log('@@METRICS '+JSON.stringify(await summarize('login')));
 await picture('login');
 await page.getByRole('button',{name:'進入互動預覽'}).click();
 await page.getByRole('button',{name:'略過導覽'}).click();
 const nav=page.getByRole('navigation',{name:'工作區切換'});
 const bottom=await nav.boundingBox();assert(bottom&&bottom.y>700&&bottom.y+bottom.height<=845,'Mobile navigation must stay near bottom');
 console.log('@@METRICS '+JSON.stringify(await summarize('editor')));
 await picture('editor');
 await page.getByRole('navigation',{name:'工作區切換'}).getByRole('button',{name:'章節'}).click();
 console.log('@@METRICS '+JSON.stringify(await summarize('chapters')));
 await picture('chapters');
 await nav.getByRole('button',{name:'修改要求'}).click();
 console.log('@@METRICS '+JSON.stringify(await summarize('prompt')));
 await picture('prompt');
 await nav.getByRole('button',{name:'版本'}).click();
 assert.equal(await nav.getByRole('button',{name:'版本'}).getAttribute('aria-pressed'),'true','History should be the only selected nav action');
 await nav.getByRole('button',{name:'修改要求'}).click();
 assert.equal(await nav.getByRole('button',{name:'版本'}).getAttribute('aria-pressed'),'false','Switching back to prompt must deselect versions');
 await nav.getByRole('button',{name:'編輯'}).click();
 await page.getByRole('button',{name:'匯入原稿'}).click();
 const footer=await page.locator('.bp-import-dialog>footer').boundingBox();
 assert(footer&&footer.y>=0&&footer.y+footer.height<=844,'Import confirmation footer must fit in viewport');
 console.log('@@METRICS '+JSON.stringify(await summarize('import')));
 await picture('import');
}finally{await browser.close();}
