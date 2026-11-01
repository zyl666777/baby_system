-- =========================================================
-- 每次更新資料時執行
-- 1. 在 Excel 把「症狀」「徵兆」「資料來源」三個分頁各存成 CSV UTF-8
-- 2. 把三個 CSV 放到 SQL Server 那台電腦的 C:\baby-symptom-import\
-- 3. 先執行到「預覽」那段，確認沒錯，再執行最後一段正式匯入
-- =========================================================

-- 清空暫存表
TRUNCATE TABLE dbo.stg_source;
TRUNCATE TABLE dbo.stg_symptom;
TRUNCATE TABLE dbo.stg_sign;

-- 讀入 CSV（路徑是 SQL Server 那台電腦上的路徑）
BULK INSERT dbo.stg_source  FROM 'C:\baby-symptom-import\sources.csv'
    WITH (FORMAT = 'CSV', CODEPAGE = '65001', FIRSTROW = 2, FIELDQUOTE = '"', ROWTERMINATOR = '\n', TABLOCK);
BULK INSERT dbo.stg_symptom FROM 'C:\baby-symptom-import\symptoms.csv'
    WITH (FORMAT = 'CSV', CODEPAGE = '65001', FIRSTROW = 2, FIELDQUOTE = '"', ROWTERMINATOR = '\n', TABLOCK);
BULK INSERT dbo.stg_sign    FROM 'C:\baby-symptom-import\signs.csv'
    WITH (FORMAT = 'CSV', CODEPAGE = '65001', FIRSTROW = 2, FIELDQUOTE = '"', ROWTERMINATOR = '\n', TABLOCK);

-- 確認讀進來的筆數
SELECT [資料來源] = (SELECT COUNT(*) FROM dbo.stg_source),
       [症狀]     = (SELECT COUNT(*) FROM dbo.stg_symptom),
       [徵兆]     = (SELECT COUNT(*) FROM dbo.stg_sign);

-- 預覽：只檢查，不寫入。有錯誤會列出是哪一筆、哪裡錯
EXEC dbo.usp_import_staging @dry_run = 1;

-- 正式匯入：確認預覽沒問題後，選取下面這行單獨執行（把名字換成你的）
-- EXEC dbo.usp_import_staging @imported_by = N'你的名字', @dry_run = 0;
