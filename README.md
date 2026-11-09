# 寶寶症狀 3D 圖解（積木寶寶版）

用 Three.js 做的互動雛形：

- **一般症狀**：點寶寶身上的部位或從清單選症狀，會標示相關部位，並顯示衛教：相關部位、可能看到的徵兆、居家照護。網站不替家長判斷何時就醫，統一寫「依情況就醫，請依照醫囑與護理師的出院衛教照護寶寶」（文字在 `data/symptoms.js` 的 `CARE_NOTE`）。
- **回報資訊錯誤**：每個症狀、補助金額、托育據點旁都有回報連結，可以送到後端資料庫，或改用 Google 表單／LINE。
- **寶寶紀錄**（`log.html`）：餵食、尿布、大便顏色、生長紀錄與趨勢圖，資料只存在瀏覽器，可匯出匯入備份。
- **育兒資源**（`resources.html`）：選縣市看中央與縣市補助、補助試算、公共托育地圖與清單。
- **早產兒對比**：早產兒和足月寶寶並排，拉動出生週數（24–36 週）比較身長、體重、頭圍；點早產兒身上的部位看早產兒常見問題。

## 執行

1. 安裝 [Node.js](https://nodejs.org/)（LTS 版）
2. 用 VS Code 開啟這個資料夾，按 `Ctrl + ~` 開終端機
3. 輸入：

```
npm install
npm run dev
```

4. 打開終端機顯示的網址（通常是 http://localhost:5173）

## 架構（MVC）

```
src/
├── main.js、log.js、resources.js  進入點：只負責啟動 Controller
├── data/                  靜態資料
│   ├── symptoms.js        部位、症狀衛教（一般＋早產兒）、依情況就醫的固定說明
│   ├── growth.js          各週數出生時的身長、體重、頭圍（約略值，參考 Fenton 曲線）
│   ├── logOptions.js      紀錄頁的選項：餵食、尿布、大便顏色、提醒文字
│   └── policies.js        中央補助規則、22 縣市生育獎勵、托育查詢連結（都附來源與查證日期）
├── models/                Model：狀態與規則，不碰 DOM
│   ├── symptomModel.js    讀取症狀（本機或 API）、篩選、選取、早產兒對比計算
│   ├── logModel.js        紀錄的 localStorage 存取、統計、生長資料、備份
│   ├── resourceModel.js   補助試算 estimate()、縣市切換、托育據點篩選
│   └── feedbackModel.js   回報的驗證規則、送出方式
├── views/                 View：只負責畫面，操作透過 handlers 回報
│   ├── babyMesh.js        用基本形狀拼出寶寶（之後可換成 .glb）
│   ├── sceneView.js       Three.js 場景、鏡頭、點選偵測、上色
│   ├── listView.js        症狀篩選與清單
│   ├── panelView.js       右側說明面板
│   ├── compareView.js     模式切換、早產兒對比卡
│   ├── log/               紀錄頁的各區塊（寶寶資料、快速紀錄、今天、生長、備份）
│   ├── resources/         育兒資源頁：政策表、試算、Leaflet 地圖、據點清單
│   └── shared/            共用元件：「回報資訊錯誤」對話框、頁首「緊急情況請撥 119」跑馬燈
├── controllers/           Controller：接收操作 → 更新 Model → 叫 View 重畫
│   ├── symptomController.js
│   ├── logController.js
│   ├── resourceController.js
│   └── feedbackController.js  回報功能，症狀頁和育兒資源頁共用
└── utils/                 共用工具（建立 DOM 元素、日期格式）
```

資料流向：使用者操作 → View 回報給 Controller → Controller 更新 Model → Controller 用 Model 的資料叫 View 重畫。
View 和 Model 互相不知道對方，要換畫面（例如改用 React）或換資料來源（例如改接 API）時只需要改其中一邊。

| 其他檔案 | 用途 |
| --- | --- |
| `index.html`、`log.html`、`resources.html` | 三個頁面的 HTML |
| `src/style.css`、`src/log.css`、`src/resources.css` | 樣式，含手機版 |
| `public/data/childcare.json` | 托育據點資料（打包時原樣複製） |
| `scripts/childcare-csv-to-json.mjs` | 把官方名冊 CSV 轉成上面的 JSON |
| `vite.config.js` | 打包設定：相對路徑、三個頁面 |

## 育兒資源頁的資料

**補助金額**在 `src/data/policies.js`。政策每年會變，改金額時一併更新 `checkedAt`（查證日期）。
縣市生育獎勵目前取自民間整理，畫面會標「待查證」；逐一對照縣市政府公告後，把 `COUNTY_BONUS_SOURCE.verified` 改成 `true`。

**托育據點**目前只放了衛福部名冊的前 10 筆（新北市）當示範，還沒有座標，所以地圖上只顯示各縣市的據點數。換成完整名冊：

1. 下載衛福部〈公設民營托嬰中心及社區公共托育家園名冊〉PDF
2. 用 Excel「資料 → 取得資料 → 從 PDF」匯入，留下欄位名稱那一列和資料列，另存「CSV UTF-8」
   需要的欄位：`縣市別,區域,機構名稱,設立別,地址,電話,核定收托人數`（可另加 `緯度,經度`）
3. 執行（`--geocode` 會用 OpenStreetMap 查座標，每秒 1 筆，幾百筆要等幾分鐘；先把腳本裡的 `CONTACT` 改成你的專案網址）：

```
node scripts/childcare-csv-to-json.mjs 名冊.csv --geocode
```

查不到座標的據點仍會出現在清單，附「在 Google 地圖開啟」連結。地圖底圖來自 OpenStreetMap，頁面右下角保留其標示。

## 回報資訊錯誤

把 `.env.example` 複製成 `.env`，依情況設定（改完要重新 `npm run dev` 或重新打包）：

| 設定 | 效果 |
| --- | --- |
| `VITE_API_URL` | 回報直接寫進後端資料庫（`feedback` 資料表），管理後台「使用者回報」分頁處理 |
| `VITE_FEEDBACK_FORM_URL` | 沒有後端時，顯示「開啟回報表單」按鈕（Google 表單） |
| `VITE_LINE_URL` | 顯示「用 LINE 回報」按鈕（LINE 官方帳號加好友連結） |

沒有後端時，使用者按「複製內容」把整理好的回報文字貼到表單或 LINE。
後端另外可以設定 `LINE_CHANNEL_TOKEN`、`LINE_ADMIN_USER_ID`，有新回報時推播到管理員的 LINE（見後端 `application.properties`）。

GitHub Pages 部署時，到 GitHub repo 的 Settings → Secrets and variables → Actions → **Variables** 新增同名變數，workflow 打包時會帶進去。

## 下一步

- 換成真的模型：用 `GLTFLoader` 載入 .glb，模型裡的物件名稱對應 `data/symptoms.js` 的 `parts`，替換 `views/babyMesh.js` 即可（head、chest、belly、diaper、arms、legs）
- 接後端：把 `.env.example` 複製成 `.env`，取消註解 `VITE_API_URL`，重新 `npm run dev`，資料就會改從 `baby-symptom-api` 讀取（連不到時自動改用本機資料）

> 症狀內容為示範，公開前請由兒科醫師或護理師審閱。
