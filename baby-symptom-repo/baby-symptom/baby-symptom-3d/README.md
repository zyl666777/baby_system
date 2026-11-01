# 寶寶症狀 3D 圖解（積木寶寶版）

用 Three.js 做的互動雛形：

- **一般症狀**：點寶寶身上的部位或從清單選症狀，會標示相關部位並顯示說明。
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

## 檔案說明

| 檔案 | 用途 |
| --- | --- |
| `src/baby.js` | 用基本形狀拼出寶寶，每個部位有 `partId` |
| `src/symptoms.js` | 部位、症狀（一般＋早產兒）、嚴重程度資料 |
| `src/growth.js` | 各週數出生時的身長、體重、頭圍（約略值，參考 Fenton 早產兒生長曲線） |
| `src/main.js` | 場景、鏡頭、點選、清單與說明面板 |
| `src/style.css` | 版面樣式，含手機版 |

## 下一步

- 換成真的模型：用 `GLTFLoader` 載入 .glb，模型裡的物件名稱對應 `symptoms.js` 的 `parts`（head、chest、belly、diaper、arms、legs）
- 接後端：把 `.env.example` 複製成 `.env`，取消註解 `VITE_API_URL`，重新 `npm run dev`，資料就會改從 `baby-symptom-api` 讀取（連不到時自動改用本機資料）

> 症狀內容為示範，公開前請由兒科醫師或護理師審閱。
