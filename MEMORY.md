# 錯誤與操作記錄

## 瀏覽器文件輸出與中文字型
- docx的Packer.toBuffer僅適用Node；瀏覽器必須使用toArrayBuffer並實際下載驗收，不能以Node單元成功當瀏覽器成功。
- PDF使用本地Noto Sans TC完整Regular／Bold，保留OFL；PDF.js升級6.2後使用loadingTask.destroy釋放資源。升級後須實際匯出回讀及多頁渲染。
- 存容量依UTF-8 bytes，不能用字串length代替D1列容量；來源引用使用固定ID，不依來源排序編號。

## 保存／登入／多分頁
- React StrictMode首次初始化可能重複載入，身份與資料清單須按順序設定；待同步內容清除要比對保存時的快照，避免刪掉新編輯。
- Session cookie同origin跨分頁共享；唯讀鎖無法防止別分頁換帳號。所有登入後API應帶預期代號，後端核對session owner，不符拒絕，防止新建文稿／備份匯入存到其他帳號。
- POST登出仍須JSON才能通過同源API限制；失敗訊息使用繁中並保留本地稿。
- 手機側欄可能覆蓋對話框，須實際點擊360／390寬度而非只查CSS。

## 驗收與部署
- 模擬AI只驗證流程，不宣稱真實免費生成；viewport不代表手機實機；dry-run不代表上線。
- Workers靜態assets可繞過Worker fetch，安全標頭應在public/_headers設定並以正式網站實際回應驗證。
- Windows Wrangler --use-keyring原生套件載入需準備Wrangler自己的模組目錄；scripts/cloudflare-login.mjs處理。本地配置及OAuth中間檔放.wrangler忽略目錄，憑證留OS安全儲存。
- Git依原驗收順序在真實AI本地測試後初始化，不把未完成條件寫成全部完成。
## 藍色獨立預覽
- 預覽頁必須明確標示AI是否真正連線，不以示範改寫假冒生成成功。
- 直接編輯的復原快照應先把ref複製到區域變數，再清空ref；React的延後setState不可引用已重設的ref。
- 本地試用資料和雲端帳號資料分開；localhost專用預覽入口不提供遠端免登入稿件存取。
- 既有端到端測試同時檢查正式CSP與同源登入，請指向8787的建置後Worker；5174被同源登入拒絕是預期保護，Vite5173缺正式標頭不代表正式網站故障。playwright.config.ts預設8787，預覽測試可另指定開發位址。
## 美學應參考實際產品的操作層級
- 問題：文件工具曾套用宣傳式hero、步驟列與多個浮動卡片，使正文後移，無法像日常編輯器。
- 原因：將展示頁的視覺構成套到內容工作區，沒有先決定唯一產品參考。
- 修正：依uiux-reference本地目錄選Outline為唯一主參考；保留工作相關狀態，用頂部工具與中央正文建立層級，移除宣傳區與裝飾容器。
- 未來：先選一個主參考，再調正文密度、導航、情境工具、字體與RWD；不可只換顏色或混合多種設計系統。參考來源與功能取捨記入README；保留原稿操作／保存測試。


## 操作入口與工作區必須一起驗收
- 問題：只有編輯畫面，使用者不知道從哪裡開始，也缺少登入與匯入確認。
- 修正：登入後先引導匯入並確認原文，或明確選擇接續草稿；桌面三欄提供章節、正文、要求，窄螢幕以頁籤切換。
- 未來：美學改版須驗收首次登入、首次匯入、續作、登出與空狀態；本機草稿必須依代號隔離，不能使用共用鍵讀取其他人的稿件。引導屬於操作必需內容，不因移除宣傳裝飾而一起省略。
- 相關：src/BluePreview.tsx、src/blue-preview.css、tests/e2e/blue-preview.spec.ts。




## 實際位置導覽與輸入區辨識
- 問題：獨立引導頁與純文字步驟無法讓新使用者知道實際點哪裡；白底無邊框輸入區被誤認為展示文字。
- 修正：登入直接進入工作區，原稿匯入用視窗確認；首次5步高亮與箭頭導覽，可略過及重看。輸入區用淡藍背景、邊框、明確文字標籤與焦點狀態。
- 未來：以實際操作驗收導覽每一步與手機頁籤轉換，不只驗收説明文字存在；色彩不能是唯一提示。前條「登入後先引導匯入」改為在工作區內引導，而非另設進入頁。
- 技術：SVG垂直線幾何寬度為零，Playwright的path可見性可能誤判；檢查SVG可見、有效線長與畫面人工確認。空白稿復原須同步移除儲存鍵。
- 相關：src/WorkspaceTour.tsx、src/BluePreview.tsx、src/blue-preview.css、tests/e2e/blue-preview.spec.ts。




## 產品感需以完整修改流程驗收
- 問題：三欄輸入表單加導覽仍像原型；缺少結果、比較、採用與恢復的操作連續性。
- 修正：Sudowrite為主參考，保留原稿與章節導航、中間文件工具與成稿預覽、右側建議及版本。AI未啟用時用明確標示的使用者建議驗證採用流程，不偽裝生成。
- 保稿：建議保存加入時的原正文與選取範圍；採用前驗證章節、內容版本與狀態，正文若變更即拒絕；採用與還原前均留版本。
- 導覽：焦點與量測效果不要依賴每次render都新建的關閉函式，否則輸入時會搶走游標。導覽只在步驟／目標變更時重新定位。
- 驗收：React選取行為使用實際鍵盤反白（Control+Home、ArrowDown、Shift+End），不可把setSelectionRange與自行派發select事件視為完整使用者操作。多層JS／PowerShell／TS文字傳遞必須明確保留跳脫換行。
- 相關：BluePreview、WorkspaceTour、suggestion-model及對應測試。


## 部署準備注意事項（2026-10-08）
- OAuth登入需要使用者在授權等待時段內完成；逾時後舊授權連結不可視為有效，應重新啟動。不可把spawn EPERM當成未登入，應在允許環境執行whoami確認。
- Wrangler登入及秘密設定必須使用同一XDG_CONFIG_HOME；帳號輔助程式自行指定本專案.wrangler/auth，密碼只在私人終端機輸入。
- 正式首頁載入簡化版；本地demo顯示依loopback主機限制，後端亦僅在LOCAL_DEV且loopback允許demo。上線時不宣稱瀏覽器本機保存等於雲端續作。

## Wrangler發布需要獨立scope
- workers:write不足以讀寫Worker deployments；正式發布需workers_scripts:write。OAuth授權成功後仍需以實際部署確認，不能將whoami登入成功等同發布權限足夠。
- 已在scripts/cloudflare-login.mjs補上scope，由使用者重新允許後部署成功。

## 正式秘密設定與可見性
- 外開終端機不等於使用者看得到；須確認可見操作位置。本次改依使用者明確提供的帳號設定，用無回顯標準輸入處理密碼，僅上传雜湊。
- 秘密上傳成功後可能尚有發布傳播時間；先確認兩個秘密名稱存在，再驗證實際登入，不以secret put成功直接宣稱可登入。

## GitHub改樣式後手動發布
- 使用者在遠端改樣式後，本機可能落後。部署前先fetch、比較本機變更及遠端提交；本機乾淨且可快轉時才更新，不用force或hard reset解決差異。
- main.tsx目前載入BluePreview，不能誤改保留的App/styles並當成新介面修改。
- 不配置自動部署；依使用者後續指示才發布Cloudflare。
