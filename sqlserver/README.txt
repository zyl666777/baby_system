寶寶症狀資料庫（SQL Server 版）

【第一次建立】在 SSMS 依序執行：
  01_schema.sql        建立 7 張資料表
  02_seed.sql          填入示範資料（19 個症狀、6 筆資料來源）
  03_import_setup.sql  建立 CSV 匯入用的暫存表和預存程序

【之後更新資料】
  1. 用 Excel 編輯「寶寶症狀資料範本.xlsx」（第一頁有詳細說明）
  2. 症狀、徵兆、資料來源三個分頁各存成 CSV UTF-8：symptoms.csv、signs.csv、sources.csv
  3. 放到 SQL Server 電腦的 C:\baby-symptom-import\
  4. 執行 04_run_import.sql，先看預覽，沒錯再執行最後一行正式匯入

csv\ 資料夾裡是和範本內容相同、可以直接匯入的 CSV。
需要 SQL Server 2017 以上、資料庫相容性層級 130 以上。
