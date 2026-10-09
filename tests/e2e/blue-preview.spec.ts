import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
import JSZip from 'jszip';

test.beforeAll(()=>{
  execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.jsonc','--command','DELETE FROM throttle;'],{stdio:'pipe',timeout:60000});
});

async function signIn(page:Page,keepTour=false){
  await page.goto('/blue-preview');
  await page.getByLabel('使用者代號',{exact:true}).fill('demo');
  await page.getByLabel('密碼',{exact:true}).fill('local-demo-only');
  await page.getByRole('button',{name:'登入',exact:true}).click();
  await expect(page.getByLabel('正文內容')).toBeVisible();
  if(!keepTour && await page.getByRole('dialog',{name:'操作導覽'}).isVisible()){
    await page.getByRole('button',{name:'略過導覽'}).click();
  }
}
async function importSample(page:Page){
  await page.getByRole('button',{name:'匯入原稿',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'匯入原稿'})).toBeVisible();
  await expect(page.locator('.bp-import-steps')).toContainText('檢查章節');
  await page.getByRole('button',{name:'使用示範原稿',exact:true}).click();
  await expect(page.locator('.bp-import-chapter-list')).toContainText('執行方式');
  await page.getByRole('button',{name:'確認匯入',exact:true}).click();
  await expect(page.getByLabel('正文內容')).toHaveValue(/閱讀/);
}
async function showChapters(page:Page,mobile=false){
  if(mobile)await page.getByRole('navigation',{name:'工作區切換'}).getByRole('button',{name:'章節',exact:true}).click();
  else await page.getByRole('button',{name:'章節導覽',exact:true}).click();
  await expect(page.getByLabel('章節清單')).toBeVisible();
}
async function showAssistant(page:Page,mobile=false){
  if(mobile)await page.getByRole('navigation',{name:'工作區切換'}).getByRole('button',{name:'修改要求',exact:true}).click();
  else await page.getByRole('button',{name:'修改工具',exact:true}).click();
  await expect(page.getByLabel('提示詞')).toBeVisible();
}

test('新版登入為單欄設計，不顯示虛構同步功能',async({page})=>{
  await page.goto('/blue-preview');
  await expect(page.getByRole('heading',{name:'歡迎回到文序'})).toBeVisible();
  await expect(page.locator('.bp-login-intro')).toHaveCount(0);
  await expect(page.locator('.bp-login-layout')).toHaveCSS('display','block');
  await expect(page.locator('.bp-login-privacy')).toContainText('草稿儲存在這台裝置');
  await page.getByLabel('使用者代號').fill('demo');
  await page.getByLabel('密碼',{exact:true}).fill('wrong-password');
  await page.getByRole('button',{name:'登入',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('正文內容')).toHaveCount(0);
});

test('沉浸式編輯、抽屜章節、原稿確認、復原、登出與Word匯出',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await signIn(page);
  await expect(page.locator('.bp-icon-rail')).toBeVisible();
  await expect(page.locator('.bp-chapters')).toBeHidden();
  await expect(page.locator('.bp-assistant')).toBeHidden();
  await expect(page.getByRole('button',{name:'匯出 Word',exact:true})).toBeDisabled();

  await page.getByRole('button',{name:'匯入原稿',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'自製原稿.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 背景\n原始中文內容\n第二章 方法\n第二章保留文字')});
  await expect(page.locator('.bp-import-chapter-list')).toContainText('第二章 方法');
  await page.getByRole('button',{name:'確認匯入',exact:true}).click();
  const body=page.getByLabel('正文內容');
  await body.fill('人工編輯的中文正文');await body.blur();

  await showAssistant(page);
  await page.getByLabel('提示詞').fill('調整成正式語氣');
  await page.getByRole('button',{name:'產生修改建議',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('AI 尚未連線');
  await page.getByRole('button',{name:'關閉修改工具'}).click();
  await expect(body).toHaveValue('人工編輯的中文正文');
  await page.getByRole('button',{name:'復原上次修改'}).click();
  await expect(body).toHaveValue('原始中文內容');

  await body.fill('重新編輯並保存的正文');await body.blur();
  await page.getByRole('button',{name:'匯入原稿',exact:true}).click();
  await page.getByRole('button',{name:'使用示範原稿'}).click();
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await expect(body).toHaveValue('重新編輯並保存的正文');
  await page.reload();
  await expect(body).toHaveValue('重新編輯並保存的正文');
  await showChapters(page);
  await page.getByLabel('章節清單').getByRole('button',{name:/第二章 方法/}).click();
  await expect(body).toHaveValue('第二章保留文字');
  await expect(page.locator('.bp-chapters')).toBeHidden();

  const downloadWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'匯出 Word',exact:true}).click();
  const download=await downloadWait;expect(await download.failure()).toBeNull();
  const zip=await JSZip.loadAsync(await readFile((await download.path())!));
  const xml=await zip.file('word/document.xml')!.async('string');
  expect(xml).toContain('重新編輯並保存的正文');
  expect(xml).toContain('第二章保留文字');

  await page.getByRole('button',{name:'登出',exact:true}).click();
  await expect(page.getByRole('heading',{name:'歡迎回到文序'})).toBeVisible();
  await signIn(page);
  await expect(body).toHaveValue('重新編輯並保存的正文');
  expect(errors).toEqual([]);
});

test('上下文工具、使用者建議、逐段差異、採用與版本還原',async({page})=>{
  await signIn(page);await importSample(page);
  const body=page.getByLabel('正文內容');await body.fill('原始正文');await body.blur();
  await body.evaluate((el:HTMLTextAreaElement)=>{el.focus();el.setSelectionRange(0,4);el.dispatchEvent(new Event('select',{bubbles:true}));});
  await expect(page.locator('.bp-selection-toolbar')).toBeVisible();
  await page.getByRole('button',{name:'精簡',exact:true}).click();
  await expect(page.getByLabel('提示詞')).toHaveValue(/精簡選取文字/);
  await page.getByRole('button',{name:'關閉修改工具'}).click();
  await showAssistant(page);
  await page.getByRole('button',{name:'整個章節',exact:true}).click();
  await page.getByRole('button',{name:'貼上修改建議',exact:true}).click();
  await page.getByLabel('修改後文字').fill('使用者提供的修改稿');
  await page.getByRole('button',{name:'加入待確認建議',exact:true}).click();
  await expect(page.locator('.bp-suggestion')).toContainText('使用者貼上');
  await page.getByRole('button',{name:'比較原稿',exact:true}).click();
  await expect(page.locator('.bp-diff-text del')).toContainText('原始正文');
  await expect(page.locator('.bp-diff-text ins')).toContainText('使用者提供的修改稿');
  await page.getByRole('button',{name:'採用這份建議',exact:true}).click();
  await expect(body).toHaveValue('使用者提供的修改稿');
  await page.getByRole('button',{name:'版本時間軸',exact:true}).click();
  const saved=page.locator('.bp-version').filter({hasText:'採用建議前'}).first();
  await saved.getByRole('button',{name:'還原此版本'}).click();
  await expect(body).toHaveValue('原始正文');
});

for(const width of [360,390,768,1440])test('RWD '+width+' 保留主要功能且無水平溢出',async({page})=>{
  await page.setViewportSize({width,height:900});
  await signIn(page);await importSample(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const mobile=width<=900;
  if(mobile){
    await expect(page.getByRole('navigation',{name:'工作區切換'})).toBeVisible();
    await showChapters(page,true);
    await page.getByLabel('章節清單').getByRole('button',{name:/第二章 執行方式/}).click();
    await expect(page.getByLabel('正文內容')).toBeVisible();
    await showAssistant(page,true);
    await page.getByLabel('提示詞').fill('精簡段落');
    await expect(page.getByLabel('提示詞')).toHaveValue('精簡段落');
    await page.getByRole('navigation',{name:'工作區切換'}).getByRole('button',{name:'編輯',exact:true}).click();
  }else{
    await showChapters(page);
    await page.getByRole('button',{name:'關閉章節導覽'}).click();
    await showAssistant(page);
    await page.getByRole('button',{name:'關閉修改工具'}).click();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await mkdir('.qa',{recursive:true});
  await page.screenshot({path:'.qa/immersive-'+width+'.png',fullPage:true});
});

test('操作導覽與匯入對話框支援鍵盤離開',async({page})=>{
  await signIn(page,true);
  const dialog=page.getByRole('dialog',{name:'操作導覽'});
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('1 / 5');
  await dialog.getByRole('button',{name:'下一步',exact:true}).click();
  await expect(dialog).toContainText('2 / 5');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button',{name:'匯入原稿',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'匯入原稿'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog',{name:'匯入原稿'})).toHaveCount(0);
});
