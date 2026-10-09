
import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
import JSZip from 'jszip';
test.beforeAll(()=>{execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.jsonc','--command','DELETE FROM throttle;'],{stdio:'pipe',timeout:60000});});
async function login(page:Page,keepTour=false){await page.goto('/blue-preview');await page.getByLabel('使用者代號',{exact:true}).fill('demo');await page.getByLabel('密碼',{exact:true}).fill('local-demo-only');await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page.getByLabel('正文內容')).toBeVisible();if(!keepTour&&await page.getByRole('dialog',{name:'操作導覽'}).isVisible())await page.getByRole('button',{name:'略過導覽'}).click();}
async function sample(page:Page){await login(page);await page.getByRole('button',{name:'匯入原稿',exact:true}).click();await page.getByRole('button',{name:'使用示範原稿',exact:true}).click();await page.getByRole('button',{name:'確認匯入',exact:true}).click();await expect(page.getByLabel('正文內容')).toHaveValue(/閱讀/);}
test('登入直接進介面、原稿先確認、取消不覆寫、復原、續作與真正Word',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page);await expect(page.locator('.bp-guide')).toHaveCount(0);await expect(page.getByRole('button',{name:'匯出 Word',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'匯入原稿',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'自製原稿.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 背景\n原始中文內容\n第二章 方法\n第二章保留文字')});
 await expect(page.getByText('辨識到 2 個章節，請確認文字正確。')).toBeVisible();await expect(page.getByLabel('正文內容')).toHaveValue('');
 await page.getByRole('button',{name:'確認匯入',exact:true}).click();await expect(page.getByLabel('章節清單')).toBeVisible();await expect(page.getByLabel('修改工具')).toBeVisible();
 await page.getByLabel('正文內容').fill('人工編輯的中文正文');await page.getByLabel('提示詞').fill('調整成正式語氣');await page.getByRole('button',{name:'產生修改建議',exact:true}).click();await expect(page.getByRole('status')).toContainText('AI 尚未連線');await expect(page.getByLabel('正文內容')).toHaveValue('人工編輯的中文正文');
 await page.getByRole('button',{name:'復原上次修改',exact:true}).click();await expect(page.getByLabel('正文內容')).toHaveValue('原始中文內容');await page.getByLabel('正文內容').fill('重新編輯並保存的正文');
 await page.getByRole('button',{name:'匯入原稿',exact:true}).click();await page.getByRole('button',{name:'使用示範原稿'}).click();await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.getByLabel('正文內容')).toHaveValue('重新編輯並保存的正文');
 await page.reload();await expect(page.getByLabel('正文內容')).toHaveValue('重新編輯並保存的正文');await expect(page.getByRole('dialog',{name:'操作導覽'})).toHaveCount(0);
 await page.getByLabel('章節清單').getByRole('button',{name:/第二章 方法/}).click();await expect(page.getByLabel('正文內容')).toHaveValue('第二章保留文字');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'匯出 Word',exact:true}).click();const download=await pending;expect(await download.failure()).toBeNull();const zip=await JSZip.loadAsync(await readFile((await download.path())!));const xml=await zip.file('word/document.xml')!.async('string');expect(xml).toContain('重新編輯並保存的正文');expect(xml).toContain('第二章保留文字');
 await page.getByRole('button',{name:'登出',exact:true}).click();await expect(page.getByRole('heading',{name:'登入工作空間'})).toBeVisible();await expect(page.getByLabel('正文內容')).toHaveCount(0);await login(page);await expect(page.getByLabel('正文內容')).toHaveValue('重新編輯並保存的正文');expect(errors).toEqual([]);
});
test('未登入與錯誤密碼不可進入',async({page})=>{await page.goto('/blue-preview');await page.getByLabel('使用者代號').fill('demo');await page.getByLabel('密碼',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('正文內容')).toHaveCount(0);});
for(const width of [360,390,768,1440])test('箭頭導覽、彩色輸入與RWD '+width,async({page})=>{
 await page.setViewportSize({width,height:1000});await sample(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const label of ['正文內容','文稿標題']){expect(await page.getByLabel(label,{exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');expect(await page.getByLabel(label,{exact:true}).evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('1px');}
 await page.getByRole('button',{name:'操作導覽',exact:true}).click();
 for(let step=0;step<5;step++){const tour=page.getByRole('dialog',{name:'操作導覽'});await expect(tour).toContainText((step+1)+' / 5');await expect(page.locator('.bp-tour-spotlight')).toBeVisible();await expect(page.locator('.bp-tour-arrow')).toBeVisible();expect(await page.locator('.bp-tour-arrow path[marker-end]').evaluate(el=>(el as SVGPathElement).getTotalLength())).toBeGreaterThan(10);const b=await tour.boundingBox();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(width);if(step===3)await expect(page.getByLabel('提示詞')).toBeVisible();await tour.getByRole('button',{name:step===4?'開始使用':'下一步',exact:true}).click();}
 await expect(page.getByRole('dialog',{name:'操作導覽'})).toHaveCount(0);
 if(width<901){await page.getByRole('button',{name:'章節',exact:true}).click();await page.getByLabel('章節清單').getByRole('button',{name:/第二章 執行方式/}).click();await expect(page.getByLabel('正文內容')).toBeVisible();await page.getByRole('button',{name:'修改要求',exact:true}).click();expect(await page.getByLabel('提示詞').evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');await page.getByRole('navigation',{name:'工作區切換'}).getByRole('button',{name:'編輯',exact:true}).click();}
 await mkdir('.qa',{recursive:true});await page.screenshot({path:'.qa/blue-'+width+'.png',fullPage:true});
 if(width===1440){await page.getByRole('button',{name:'操作導覽'}).click();await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('button',{name:'下一步',exact:true}).click();await expect(page.getByRole('dialog',{name:'操作導覽'})).toContainText('在正文區');await page.screenshot({path:'.qa/tour.png',fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'操作導覽'})).toHaveCount(0);}
});
test('初次導覽可略過，匯入視窗可用鍵盤離開',async({page})=>{await login(page,true);await expect(page.getByRole('dialog',{name:'操作導覽'})).toBeVisible();await mkdir('.qa',{recursive:true});await page.screenshot({path:'.qa/first-tour.png',fullPage:true});await page.getByRole('button',{name:'略過導覽'}).click();await page.getByRole('button',{name:'匯入原稿',exact:true}).click();await expect(page.getByRole('dialog',{name:'匯入原稿',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'匯入原稿',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'匯入原稿',exact:true})).toBeFocused();});


test('文件工具列、預覽、建議比較採用、版本還原與過期建議保稿',async({page})=>{
 await sample(page);
 const body=page.getByLabel('正文內容',{exact:true});await body.fill('原始正文');
 await body.evaluate((el:HTMLTextAreaElement)=>{el.focus();el.setSelectionRange(0,4);});
 await page.getByRole('button',{name:'粗體',exact:true}).click();await expect(body).toHaveValue('**原始正文**');
 await page.getByRole('button',{name:'預覽',exact:true}).click();await expect(page.locator('.bp-rendered strong')).toHaveText('原始正文');await page.getByRole('button',{name:'編輯',exact:true}).click();
 await body.fill('原始正文');await page.getByLabel('提示詞').fill('調整成正式語氣');await page.getByRole('button',{name:'整個章節',exact:true}).click();
 await page.getByRole('button',{name:'貼上修改建議',exact:true}).click();await page.getByLabel('修改後文字').fill('使用者提供的修改稿');await page.getByRole('button',{name:'加入待確認建議',exact:true}).click();
 await expect(body).toHaveValue('原始正文');await expect(page.locator('.bp-suggestion')).toContainText('使用者貼上');await page.getByRole('button',{name:'比較原稿',exact:true}).click();await expect(page.locator('.bp-before')).toContainText('原始正文');await expect(page.locator('.bp-after')).toContainText('使用者提供的修改稿');
 await page.getByRole('button',{name:'採用這份建議',exact:true}).click();await expect(body).toHaveValue('使用者提供的修改稿');
 await page.getByRole('navigation',{name:'助手功能'}).getByRole('button',{name:/^版本/}).click();const saved=page.locator('.bp-version').filter({hasText:'採用建議前'}).first();await saved.getByRole('button',{name:'還原此版本'}).click();await expect(body).toHaveValue('原始正文');
 await page.getByRole('button',{name:'修改要求',exact:true}).click();await page.getByRole('button',{name:'整個章節',exact:true}).click();await page.getByRole('button',{name:'貼上修改建議',exact:true}).click();await page.getByLabel('修改後文字').fill('第二份建議');await page.getByRole('button',{name:'加入待確認建議'}).click();
 await body.fill('建議加入後人工新增的正文');await page.getByRole('button',{name:'採用',exact:true}).click();await expect(page.getByRole('status')).toContainText('正文已在建議加入後變更');await expect(body).toHaveValue('建議加入後人工新增的正文');
 await page.getByRole('navigation',{name:'助手功能'}).getByRole('button',{name:'修改要求',exact:true}).click();await body.fill('前段\n需要修改\n後段');await body.press('Control+Home');await body.press('ArrowDown');await body.press('Shift+End');await expect(page.locator('.bp-target-context')).toContainText('已選取 4 字');await page.getByRole('button',{name:'貼上修改建議',exact:true}).click();await page.getByLabel('修改後文字').fill('改好');await page.getByRole('button',{name:'加入待確認建議'}).click();await page.getByRole('button',{name:'採用',exact:true}).first().click();await expect(body).toHaveValue('前段\n改好\n後段');await page.reload();await expect(body).toHaveValue('前段\n改好\n後段');await page.getByRole('navigation',{name:'助手功能'}).getByRole('button',{name:/^版本/}).click();await expect(page.locator('.bp-version').filter({hasText:'採用建議前'})).toHaveCount(2);
});
test('產品畫面交付：成稿預覽與修改建議',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await sample(page);await page.getByRole('button',{name:'關閉訊息'}).click();await page.getByLabel('提示詞').fill('保留原意，調整為正式計畫書語氣。');
 await page.getByRole('button',{name:'貼上修改建議'}).click();await page.getByLabel('修改後文字').fill('本計畫以社區共讀為核心，邀請不同年齡的居民透過閱讀交流，分享生活經驗並增進對在地生活的理解。\n\n活動將以在地議題為主題，提供參與者分享故事與交換想法的空間，讓閱讀逐步融入日常生活。\n\n具體執行方式、參與人數及經費規劃，仍待補充。');await page.getByRole('button',{name:'加入待確認建議'}).click();await page.getByRole('button',{name:'關閉訊息'}).click();await page.getByRole('button',{name:'預覽',exact:true}).click();await mkdir('.qa',{recursive:true});await page.screenshot({path:'.qa/product.png',fullPage:true});
 await page.getByRole('button',{name:'比較原稿'}).click();await page.screenshot({path:'.qa/comparison.png',fullPage:true});
});
