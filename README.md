# 文稿編輯器｜文序

繁體中文 RWD 文稿編輯器：匯入原稿 → 選章節或反白段落 → 填寫修改要求 → 比較及編輯 → 匯出 Word。

- 網站：https://wenxu-document-agent.canadaur77.workers.dev/
- 原始碼：https://github.com/Linrinnn/wenxu-document-agent （私人）
- 技術：React、TypeScript、Vite、Cloudflare Workers、D1。

## 在 GitHub 修改樣式

| 想修改的內容 | 檔案 |
| --- | --- |
| 新版顏色、字型、單欄登入、沉浸式工作區、抽屜與 RWD | [src/wenxu-redesign.css](src/wenxu-redesign.css)（舊樣式仍保留於 [src/blue-preview.css](src/blue-preview.css)） |
| 登入、章節抽屜、選取修改、逐段比較及其他互動 | [src/BluePreview.tsx](src/BluePreview.tsx) |
| 山景背景插畫 | [public/wenxu-mountains.svg](public/wenxu-mountains.svg) |
| 首次使用的箭頭與操作提示 | [src/WorkspaceTour.tsx](src/WorkspaceTour.tsx) |
| 網頁標題與瀏覽器主題色 | [index.html](index.html) |
| 首頁入口 | [src/main.tsx](src/main.tsx) |

開啟檔案後按鉛筆編輯，或在儲存庫按 `.` 開啟 GitHub 網頁編輯器。修改完成後可先開 Pull Request 進行驗收，再合併至 `main`；只有在另行要求部署時才更新 Cloudflare。

**GitHub 提交不會自動更新正式網站。** 此儲存庫沒有自動部署工作流程；由 Codex 取得最新版本、檢查變更、建置驗證後再手動發布。一般樣式修改不需要重建資料庫或重設帳號。

## 目前可用功能與限制

- 代號與密碼登入，沒有公開註冊；正式帳密透過 Cloudflare secrets 保存，原始碼不含正式密碼。
- 匯入 TXT、Markdown、DOCX、可擷取文字的 PDF，或貼上文字；確認後才取代草稿。每檔上限 10MB，不含 OCR、圖片與複雜公式的保留。
- 章節清單、正文 Markdown 編輯與預覽、修改要求、手動建議比較採用、版本保存還原、Word 全文匯出。
- 草稿依代號存於目前瀏覽器；**目前首頁尚未串接雲端稿件同步與 AI 生成**。網站與本機預覽草稿各自保存，移轉前請匯出備份。
- 最多 40 章、本機 30 筆章節版本、20 筆建議及工作階段 10 次復原。版本不是無限備份。
- 桌面採單欄正文優先、左側章節抽屜與右側修改／版本抽屜；選取文字顯示快捷工具；手機使用頁籤切換。360／390／768／1440 為瀏覽器模擬尺寸驗收，不代表實體手機驗收。
- 舊版 `src/App.tsx`、`src/styles.css` 與相關後端模組保留；目前首頁載入 `BluePreview.tsx`。舊版雲端與四格式匯出功能不代表已整合到目前首頁。

## 本機啟動

需要 Node.js 22 以上。於專案目錄執行：

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run db:local
npm.cmd run dev:worker
```

另開終端機執行：

```powershell
npm.cmd run dev
```

開啟 http://127.0.0.1:5173/ 。僅本機測試代號 `demo`、密碼 `local-demo-only`；正式站不接受此預設帳號。本機 AI 預設不連線。

## 驗證

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright test tests/e2e/blue-preview.spec.ts
npx.cmd wrangler deploy --dry-run
```

瀏覽器測試預設指向 8787 的本機 Worker，需先建置、啟動後端並安裝 Playwright Chromium。僅對本機執行測試，不將測試的資料清理指向正式站。

首次上線前曾通過 38 項單元測試及完整 9 項瀏覽器測試；實際發布後驗證一組帳號登入、首頁 200 與未登入 API 401。真實 AI、跨裝置、老師第二帳號與隔離、免費 CPU 指標及實體手機仍待驗收。

## 手動部署與憑證

沿用既有免費方案、Workers 網址及正式 D1。部署只在使用者要求時執行。

```powershell
$env:XDG_CONFIG_HOME=Join-Path (Get-Location) '.wrangler/auth'
node scripts/cloudflare-login.mjs
npx.cmd wrangler whoami
npm.cmd run build
npm.cmd run deploy
```

一般更新直接使用既有 `wrangler.jsonc`，不要重建 D1 或重新套用已完成的資料初始化。新環境首次部署才需要建立自己的資料庫並修改 database_id。

若日後需重設兩組帳號，在私人互動終端機執行 `node scripts/accounts.mjs --cloud`；此操作會取代帳號清單並使既有登入失效，非一般部署步驟。

`.wrangler`、`.dev.vars*`、`.env*`、SQLite、原始私人文件、node_modules、dist、測試暫存不進入 Git。OAuth 使用 Windows 安全憑證儲存；登入與部署必須沿用相同 XDG_CONFIG_HOME。

## 文件與畫面

- [工作紀錄](LOG.md)、[專案經驗](MEMORY.md)、[待辦](TODO.md)、[驗證紀錄](驗證紀錄.md)。
- 畫面：藍色版預覽.png、修改比較.png、操作導覽.png、登入畫面.png、匯入引導.png；皆為自製測試稿。
- 字型授權：[SIL Open Font License](public/fonts/LICENSE.txt)。
