-- =========================================================
-- CSV 匯入機制（只需要執行一次）
-- 需求：SQL Server 2017 以上（BULK INSERT 的 FORMAT='CSV'）
--       資料庫相容性層級 130 以上（STRING_SPLIT）
--
-- 流程：CSV → 暫存表 stg_* → 預存程序檢查 → 沒錯誤才寫進正式資料表
-- 正式資料表不會被直接覆蓋，任何一筆有錯就整批不匯入。
-- =========================================================

-- ---------- 暫存表：欄位順序必須和 CSV 一樣 ----------
DROP TABLE IF EXISTS dbo.stg_symptom;
DROP TABLE IF EXISTS dbo.stg_sign;
DROP TABLE IF EXISTS dbo.stg_source;
GO

CREATE TABLE dbo.stg_symptom (
    code                NVARCHAR(MAX) NULL,
    name                NVARCHAR(MAX) NULL,
    category            NVARCHAR(MAX) NULL,
    severity            NVARCHAR(MAX) NULL,
    summary             NVARCHAR(MAX) NULL,
    when_to_see_doctor  NVARCHAR(MAX) NULL,
    status              NVARCHAR(MAX) NULL,
    reviewed_by         NVARCHAR(MAX) NULL,
    reviewed_at         NVARCHAR(MAX) NULL,
    parts               NVARCHAR(MAX) NULL,   -- 用逗號分隔，例如 head,chest
    sources             NVARCHAR(MAX) NULL    -- 資料來源代碼，用逗號分隔
);

CREATE TABLE dbo.stg_sign (
    symptom_code  NVARCHAR(MAX) NULL,
    sort_order    NVARCHAR(MAX) NULL,
    content       NVARCHAR(MAX) NULL
);

CREATE TABLE dbo.stg_source (
    code           NVARCHAR(MAX) NULL,
    title          NVARCHAR(MAX) NULL,
    publisher      NVARCHAR(MAX) NULL,
    author         NVARCHAR(MAX) NULL,
    source_type    NVARCHAR(MAX) NULL,
    url            NVARCHAR(MAX) NULL,
    published      NVARCHAR(MAX) NULL,
    accessed_date  NVARCHAR(MAX) NULL,
    note           NVARCHAR(MAX) NULL
);
GO

-- ---------- 匯入程序 ----------
-- @dry_run = 1：只檢查並預覽，不寫入
-- @imported_by：記在稽核紀錄裡的匯入者名字
CREATE OR ALTER PROCEDURE dbo.usp_import_staging
    @imported_by NVARCHAR(50) = N'csv-import',
    @dry_run     BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;   -- 任何錯誤都整批復原

    DECLARE @err TABLE (sheet NVARCHAR(20), row_key NVARCHAR(200), message NVARCHAR(400));

    -- =====================================================
    -- 1. 整理暫存資料：去頭尾空白、轉大寫、轉日期，略過整列空白
    -- =====================================================
    SELECT
        code          = CAST(NULLIF(LTRIM(RTRIM(code)), N'') AS NVARCHAR(400)),
        title         = NULLIF(LTRIM(RTRIM(title)), N''),
        publisher     = NULLIF(LTRIM(RTRIM(publisher)), N''),
        author        = NULLIF(LTRIM(RTRIM(author)), N''),
        source_type   = CAST(UPPER(NULLIF(LTRIM(RTRIM(source_type)), N'')) AS NVARCHAR(400)),
        url           = NULLIF(LTRIM(RTRIM(url)), N''),
        published     = NULLIF(LTRIM(RTRIM(published)), N''),
        accessed_raw  = NULLIF(LTRIM(RTRIM(accessed_date)), N''),
        accessed_date = COALESCE(TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(accessed_date)), N''), 23),
                                 TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(accessed_date)), N''), 111)),
        note          = NULLIF(LTRIM(RTRIM(note)), N'')
    INTO #src
    FROM dbo.stg_source
    WHERE LTRIM(RTRIM(CONCAT(code, title, publisher, url))) <> N'';

    SELECT
        code               = CAST(NULLIF(LTRIM(RTRIM(code)), N'') AS NVARCHAR(400)),
        name               = NULLIF(LTRIM(RTRIM(name)), N''),
        category           = CAST(UPPER(NULLIF(LTRIM(RTRIM(category)), N'')) AS NVARCHAR(400)),
        severity           = CAST(UPPER(NULLIF(LTRIM(RTRIM(severity)), N'')) AS NVARCHAR(400)),
        summary            = NULLIF(LTRIM(RTRIM(summary)), N''),
        when_to_see_doctor = NULLIF(LTRIM(RTRIM(when_to_see_doctor)), N''),
        status             = CAST(UPPER(NULLIF(LTRIM(RTRIM(status)), N'')) AS NVARCHAR(400)),
        reviewed_by        = NULLIF(LTRIM(RTRIM(reviewed_by)), N''),
        reviewed_raw       = NULLIF(LTRIM(RTRIM(reviewed_at)), N''),
        reviewed_at        = COALESCE(TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(reviewed_at)), N''), 23),
                                      TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(reviewed_at)), N''), 111)),
        parts              = REPLACE(ISNULL(parts, N''), N'，', N','),     -- 全形逗號也接受
        sources            = REPLACE(ISNULL(sources, N''), N'，', N',')
    INTO #sym
    FROM dbo.stg_symptom
    WHERE LTRIM(RTRIM(CONCAT(code, name, summary))) <> N'';

    SELECT
        symptom_code = CAST(NULLIF(LTRIM(RTRIM(symptom_code)), N'') AS NVARCHAR(400)),
        sort_raw     = LTRIM(RTRIM(ISNULL(sort_order, N''))),
        sort_order   = TRY_CONVERT(int, LTRIM(RTRIM(sort_order))),
        content      = NULLIF(LTRIM(RTRIM(content)), N'')
    INTO #sign
    FROM dbo.stg_sign
    WHERE LTRIM(RTRIM(CONCAT(symptom_code, content))) <> N'';

    -- 拆開「部位」和「資料來源」欄位
    SELECT s.code, part = CAST(LTRIM(RTRIM(v.value)) AS NVARCHAR(400))
    INTO #sym_part
    FROM #sym s CROSS APPLY STRING_SPLIT(s.parts, N',') v
    WHERE LTRIM(RTRIM(v.value)) <> N'';

    SELECT s.code, source_code = CAST(LTRIM(RTRIM(v.value)) AS NVARCHAR(400))
    INTO #sym_src
    FROM #sym s CROSS APPLY STRING_SPLIT(s.sources, N',') v
    WHERE LTRIM(RTRIM(v.value)) <> N'';

    -- =====================================================
    -- 2. 檢查
    -- =====================================================
    -- ---- 資料來源 ----
    INSERT @err SELECT N'資料來源', ISNULL(title, N'(無標題)'), N'代碼沒有填' FROM #src WHERE code IS NULL;
    INSERT @err SELECT N'資料來源', code, N'代碼只能用小寫英文、數字和連字號，最多 40 字'
        FROM #src WHERE code COLLATE Latin1_General_BIN LIKE N'%[^a-z0-9-]%' OR LEN(code) > 40;
    INSERT @err SELECT N'資料來源', code, N'代碼重複' FROM #src WHERE code IS NOT NULL GROUP BY code HAVING COUNT(*) > 1;
    INSERT @err SELECT N'資料來源', code, N'標題沒有填，或超過 200 字' FROM #src WHERE title IS NULL OR LEN(title) > 200;
    INSERT @err SELECT N'資料來源', code, N'發布單位沒有填，或超過 100 字' FROM #src WHERE publisher IS NULL OR LEN(publisher) > 100;
    INSERT @err SELECT N'資料來源', code, N'作者超過 100 字' FROM #src WHERE LEN(author) > 100;
    INSERT @err SELECT N'資料來源', code, N'類型必須是 WEBSITE、PDF、JOURNAL、HANDBOOK、OTHER 其中之一'
        FROM #src WHERE source_type IS NULL OR source_type NOT IN (N'WEBSITE', N'PDF', N'JOURNAL', N'HANDBOOK', N'OTHER');
    INSERT @err SELECT N'資料來源', code, N'網址超過 500 字' FROM #src WHERE LEN(url) > 500;
    INSERT @err SELECT N'資料來源', code, N'發布時間超過 20 字' FROM #src WHERE LEN(published) > 20;
    INSERT @err SELECT N'資料來源', code, N'查閱日期格式錯誤，請用 2026-11-02' FROM #src WHERE accessed_raw IS NOT NULL AND accessed_date IS NULL;
    INSERT @err SELECT N'資料來源', code, N'備註超過 500 字' FROM #src WHERE LEN(note) > 500;

    -- ---- 症狀 ----
    INSERT @err SELECT N'症狀', ISNULL(name, N'(無名稱)'), N'代碼沒有填' FROM #sym WHERE code IS NULL;
    INSERT @err SELECT N'症狀', code, N'代碼只能用小寫英文、數字和連字號，最多 40 字'
        FROM #sym WHERE code COLLATE Latin1_General_BIN LIKE N'%[^a-z0-9-]%' OR LEN(code) > 40;
    INSERT @err SELECT N'症狀', code, N'代碼重複' FROM #sym WHERE code IS NOT NULL GROUP BY code HAVING COUNT(*) > 1;
    INSERT @err SELECT N'症狀', code, N'名稱沒有填，或超過 50 字' FROM #sym WHERE name IS NULL OR LEN(name) > 50;
    INSERT @err SELECT N'症狀', code, N'分類必須是 GENERAL 或 PREEMIE'
        FROM #sym WHERE category IS NULL OR category NOT IN (N'GENERAL', N'PREEMIE');
    INSERT @err SELECT N'症狀', code, N'嚴重程度必須是 EMERGENCY、SOON、HOME、FOLLOW 其中之一'
        FROM #sym WHERE severity IS NULL OR severity NOT IN (N'EMERGENCY', N'SOON', N'HOME', N'FOLLOW');
    INSERT @err SELECT N'症狀', code, N'狀態必須是 DRAFT、PUBLISHED、ARCHIVED 其中之一'
        FROM #sym WHERE status IS NULL OR status NOT IN (N'DRAFT', N'PUBLISHED', N'ARCHIVED');
    INSERT @err SELECT N'症狀', code, N'簡介沒有填，或超過 500 字' FROM #sym WHERE summary IS NULL OR LEN(summary) > 500;
    INSERT @err SELECT N'症狀', code, N'就醫時機沒有填，或超過 500 字' FROM #sym WHERE when_to_see_doctor IS NULL OR LEN(when_to_see_doctor) > 500;
    INSERT @err SELECT N'症狀', code, N'審閱者超過 50 字' FROM #sym WHERE LEN(reviewed_by) > 50;
    INSERT @err SELECT N'症狀', code, N'審閱日期格式錯誤，請用 2026-11-02' FROM #sym WHERE reviewed_raw IS NOT NULL AND reviewed_at IS NULL;
    INSERT @err SELECT N'症狀', code, N'至少要填一個部位' FROM #sym s WHERE NOT EXISTS (SELECT 1 FROM #sym_part p WHERE p.code = s.code);
    INSERT @err SELECT N'症狀', p.code, CONCAT(N'不存在的部位：', p.part)
        FROM #sym_part p WHERE NOT EXISTS (SELECT 1 FROM dbo.body_part b WHERE b.code = p.part);
    INSERT @err SELECT N'症狀', x.code, CONCAT(N'找不到資料來源代碼：', x.source_code)
        FROM #sym_src x
        WHERE NOT EXISTS (SELECT 1 FROM #src r WHERE r.code = x.source_code)
          AND NOT EXISTS (SELECT 1 FROM dbo.source r WHERE r.code = x.source_code);
    INSERT @err SELECT N'症狀', code, N'徵兆分頁裡沒有這個症狀的徵兆'
        FROM #sym s WHERE NOT EXISTS (SELECT 1 FROM #sign g WHERE g.symptom_code = s.code);

    -- ---- 徵兆 ----
    INSERT @err SELECT N'徵兆', CONCAT(symptom_code, N' 第 ', sort_raw, N' 項'), N'對應的症狀代碼不在症狀分頁裡'
        FROM #sign g WHERE NOT EXISTS (SELECT 1 FROM #sym s WHERE s.code = g.symptom_code);
    INSERT @err SELECT N'徵兆', CONCAT(symptom_code, N' 第 ', sort_raw, N' 項'), N'順序必須是整數'
        FROM #sign WHERE sort_order IS NULL;
    INSERT @err SELECT N'徵兆', CONCAT(symptom_code, N' 第 ', sort_raw, N' 項'), N'內容沒有填，或超過 100 字'
        FROM #sign WHERE content IS NULL OR LEN(content) > 100;
    INSERT @err SELECT N'徵兆', CONCAT(symptom_code, N' 第 ', sort_order, N' 項'), N'同一個症狀的順序重複'
        FROM #sign WHERE sort_order IS NOT NULL GROUP BY symptom_code, sort_order HAVING COUNT(*) > 1;

    IF EXISTS (SELECT 1 FROM @err)
    BEGIN
        SELECT [分頁] = sheet, [哪一筆] = row_key, [問題] = message FROM @err ORDER BY sheet, row_key;
        PRINT N'有錯誤，這次沒有匯入任何資料。請修正 Excel 後重新匯出 CSV。';
        RETURN 1;
    END

    -- =====================================================
    -- 3. 預覽
    -- =====================================================
    IF @dry_run = 1
    BEGIN
        SELECT [項目] = N'症狀', [新增] = SUM(CASE WHEN y.id IS NULL THEN 1 ELSE 0 END), [更新] = SUM(CASE WHEN y.id IS NULL THEN 0 ELSE 1 END)
        FROM #sym s LEFT JOIN dbo.symptom y ON y.code = s.code
        UNION ALL
        SELECT N'資料來源', SUM(CASE WHEN r.id IS NULL THEN 1 ELSE 0 END), SUM(CASE WHEN r.id IS NULL THEN 0 ELSE 1 END)
        FROM #src s LEFT JOIN dbo.source r ON r.code = s.code
        UNION ALL
        SELECT N'徵兆（整批重寫）', COUNT(*), 0 FROM #sign;
        PRINT N'檢查通過（預覽模式，沒有寫入）。確認後用 @dry_run = 0 正式匯入。';
        RETURN 0;
    END

    -- =====================================================
    -- 4. 寫入（同一個交易，失敗就全部復原）
    -- =====================================================
    DECLARE @changes TABLE (action NVARCHAR(10), code NVARCHAR(40), kind NVARCHAR(10));

    BEGIN TRANSACTION;

    MERGE dbo.source AS t
    USING #src AS s ON t.code = s.code
    WHEN MATCHED AND EXISTS (
            SELECT s.title, s.publisher, s.author, s.source_type, s.url, s.published, s.accessed_date, s.note
            EXCEPT
            SELECT t.title, t.publisher, t.author, t.source_type, t.url, t.published, t.accessed_date, t.note)
        THEN UPDATE SET title = s.title, publisher = s.publisher, author = s.author, source_type = s.source_type,
                        url = s.url, published = s.published, accessed_date = s.accessed_date, note = s.note
    WHEN NOT MATCHED BY TARGET
        THEN INSERT (code, title, publisher, author, source_type, url, published, accessed_date, note)
             VALUES (s.code, s.title, s.publisher, s.author, s.source_type, s.url, s.published, s.accessed_date, s.note)
    OUTPUT $action, inserted.code, N'source' INTO @changes;

    MERGE dbo.symptom AS t
    USING #sym AS s ON t.code = s.code
    WHEN MATCHED AND EXISTS (
            SELECT s.name, s.category, s.severity, s.summary, s.when_to_see_doctor, s.status, s.reviewed_by, s.reviewed_at
            EXCEPT
            SELECT t.name, t.category, t.severity, t.summary, t.when_to_see_doctor, t.status, t.reviewed_by, t.reviewed_at)
        THEN UPDATE SET name = s.name, category = s.category, severity = s.severity, summary = s.summary,
                        when_to_see_doctor = s.when_to_see_doctor, status = s.status,
                        reviewed_by = s.reviewed_by, reviewed_at = s.reviewed_at,
                        updated_at = SYSDATETIME(), updated_by = @imported_by, version = t.version + 1
    WHEN NOT MATCHED BY TARGET
        THEN INSERT (code, name, category, severity, summary, when_to_see_doctor, status, reviewed_by, reviewed_at, updated_by)
             VALUES (s.code, s.name, s.category, s.severity, s.summary, s.when_to_see_doctor, s.status, s.reviewed_by, s.reviewed_at, @imported_by)
    OUTPUT $action, inserted.code, N'symptom' INTO @changes;

    -- 部位、徵兆、資料來源：CSV 裡出現的症狀，整批以 CSV 為準重寫
    DELETE sp FROM dbo.symptom_body_part sp
        JOIN dbo.symptom y ON y.id = sp.symptom_id JOIN #sym s ON s.code = y.code;
    INSERT dbo.symptom_body_part (symptom_id, part_code)
        SELECT DISTINCT y.id, p.part FROM #sym_part p JOIN dbo.symptom y ON y.code = p.code;

    DELETE sg FROM dbo.symptom_sign sg
        JOIN dbo.symptom y ON y.id = sg.symptom_id JOIN #sym s ON s.code = y.code;
    INSERT dbo.symptom_sign (symptom_id, sort_order, content)
        SELECT y.id, g.sort_order, g.content FROM #sign g JOIN dbo.symptom y ON y.code = g.symptom_code;

    DELETE ss FROM dbo.symptom_source ss
        JOIN dbo.symptom y ON y.id = ss.symptom_id JOIN #sym s ON s.code = y.code;
    INSERT dbo.symptom_source (symptom_id, source_id)
        SELECT DISTINCT y.id, r.id FROM #sym_src x
        JOIN dbo.symptom y ON y.code = x.code
        JOIN dbo.source r ON r.code = x.source_code;

    -- 稽核紀錄
    INSERT dbo.audit_log (username, action, target, detail)
        SELECT @imported_by,
               CASE c.action WHEN N'INSERT' THEN 'IMPORT_CREATE' ELSE 'IMPORT_UPDATE' END,
               c.code,
               CASE c.kind WHEN N'source' THEN N'CSV 匯入：資料來源' ELSE N'CSV 匯入：症狀' END
        FROM @changes c;
    INSERT dbo.audit_log (username, action, target, detail)
        VALUES (@imported_by, 'IMPORT', NULL,
                CONCAT(N'CSV 匯入完成：症狀 ', (SELECT COUNT(*) FROM #sym), N' 筆、徵兆 ', (SELECT COUNT(*) FROM #sign),
                       N' 筆、資料來源 ', (SELECT COUNT(*) FROM #src), N' 筆'));

    COMMIT TRANSACTION;

    SELECT [項目] = CASE kind WHEN N'source' THEN N'資料來源' ELSE N'症狀' END,
           [動作] = CASE action WHEN N'INSERT' THEN N'新增' ELSE N'更新' END,
           [代碼] = code
    FROM @changes ORDER BY kind DESC, action, code;
    PRINT N'匯入完成。';
    RETURN 0;
END
GO
