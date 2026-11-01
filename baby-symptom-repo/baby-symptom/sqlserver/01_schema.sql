-- =========================================================
-- 寶寶症狀 3D 圖解：資料庫結構（SQL Server 2016 以上）
-- 執行順序：01_schema.sql → 02_seed.sql
-- 中文欄位一律用 NVARCHAR，否則中文會變成問號
-- =========================================================

-- 如果要建新資料庫，取消下面三行的註解
-- CREATE DATABASE BabySymptom;
-- GO
-- USE BabySymptom;

-- 重新執行時先刪除舊表（有外鍵，順序不能換）
DROP TABLE IF EXISTS symptom_source;
DROP TABLE IF EXISTS symptom_sign;
DROP TABLE IF EXISTS symptom_body_part;
DROP TABLE IF EXISTS symptom;
DROP TABLE IF EXISTS body_part;
DROP TABLE IF EXISTS source;
DROP TABLE IF EXISTS audit_log;
GO

-- 1. 身體部位：code 要和 3D 模型裡的物件名稱一致
CREATE TABLE body_part (
    code        VARCHAR(30)    NOT NULL CONSTRAINT pk_body_part PRIMARY KEY,
    name        NVARCHAR(30)   NOT NULL,
    sort_order  INT            NOT NULL CONSTRAINT df_body_part_sort DEFAULT 0
);

-- 2. 症狀主表
CREATE TABLE symptom (
    id                  BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_symptom PRIMARY KEY,
    code                VARCHAR(40)    NOT NULL CONSTRAINT uq_symptom_code UNIQUE,
    name                NVARCHAR(50)   NOT NULL,
    category            VARCHAR(20)    NOT NULL CONSTRAINT df_symptom_category DEFAULT 'GENERAL',
    severity            VARCHAR(20)    NOT NULL,
    summary             NVARCHAR(500)  NOT NULL,
    when_to_see_doctor  NVARCHAR(500)  NOT NULL,
    status              VARCHAR(20)    NOT NULL CONSTRAINT df_symptom_status DEFAULT 'DRAFT',
    reviewed_by         NVARCHAR(50)   NULL,
    reviewed_at         DATE           NULL,
    created_at          DATETIME2      NOT NULL CONSTRAINT df_symptom_created DEFAULT SYSDATETIME(),
    updated_at          DATETIME2      NOT NULL CONSTRAINT df_symptom_updated DEFAULT SYSDATETIME(),
    updated_by          NVARCHAR(50)   NOT NULL,
    version             BIGINT         NOT NULL CONSTRAINT df_symptom_version DEFAULT 0,
    CONSTRAINT ck_symptom_category CHECK (category IN ('GENERAL', 'PREEMIE')),
    CONSTRAINT ck_symptom_severity CHECK (severity IN ('EMERGENCY', 'SOON', 'HOME', 'FOLLOW')),
    CONSTRAINT ck_symptom_status   CHECK (status   IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

-- 3. 症狀 ↔ 部位（多對多）
CREATE TABLE symptom_body_part (
    symptom_id  BIGINT       NOT NULL,
    part_code   VARCHAR(30)  NOT NULL,
    CONSTRAINT pk_symptom_body_part PRIMARY KEY (symptom_id, part_code),
    CONSTRAINT fk_sbp_symptom FOREIGN KEY (symptom_id) REFERENCES symptom(id) ON DELETE CASCADE,
    CONSTRAINT fk_sbp_part    FOREIGN KEY (part_code)  REFERENCES body_part(code)
);

-- 4. 症狀的徵兆清單（有順序）
CREATE TABLE symptom_sign (
    symptom_id  BIGINT         NOT NULL,
    sort_order  INT            NOT NULL,
    content     NVARCHAR(100)  NOT NULL,
    CONSTRAINT pk_symptom_sign PRIMARY KEY (symptom_id, sort_order),
    CONSTRAINT fk_sign_symptom FOREIGN KEY (symptom_id) REFERENCES symptom(id) ON DELETE CASCADE
);

-- 5. 資料來源：每筆衛教內容參考的文件、網站、期刊
CREATE TABLE source (
    id              INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_source PRIMARY KEY,
    code            VARCHAR(40)    NOT NULL CONSTRAINT uq_source_code UNIQUE,  -- 匯入時用來對應，例如 hpa-stool-color
    title           NVARCHAR(200)  NOT NULL,   -- 標題
    publisher       NVARCHAR(100)  NOT NULL,   -- 發布單位／期刊
    author          NVARCHAR(100)  NULL,       -- 作者
    source_type     VARCHAR(20)    NOT NULL,   -- 類型
    url             NVARCHAR(500)  NULL,       -- 網址
    published       NVARCHAR(20)   NULL,       -- 發布時間，可只寫年或年月，例如 2022-11
    accessed_date   DATE           NULL,       -- 查閱日期
    note            NVARCHAR(500)  NULL,       -- 備註：內容重點、適用範圍
    CONSTRAINT ck_source_type CHECK (source_type IN ('WEBSITE', 'PDF', 'JOURNAL', 'HANDBOOK', 'OTHER'))
);

-- 6. 症狀 ↔ 資料來源（多對多）
CREATE TABLE symptom_source (
    symptom_id  BIGINT  NOT NULL,
    source_id   INT     NOT NULL,
    CONSTRAINT pk_symptom_source PRIMARY KEY (symptom_id, source_id),
    CONSTRAINT fk_ss_symptom FOREIGN KEY (symptom_id) REFERENCES symptom(id) ON DELETE CASCADE,
    CONSTRAINT fk_ss_source  FOREIGN KEY (source_id)  REFERENCES source(id)  ON DELETE CASCADE
);

-- 7. 稽核紀錄（只新增、不修改）
CREATE TABLE audit_log (
    id           BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_audit_log PRIMARY KEY,
    occurred_at  DATETIME2      NOT NULL CONSTRAINT df_audit_occurred DEFAULT SYSDATETIME(),
    username     NVARCHAR(50)   NOT NULL,
    action       VARCHAR(30)    NOT NULL,
    target       VARCHAR(40)    NULL,
    detail       NVARCHAR(500)  NULL,
    ip_address   VARCHAR(45)    NULL
);

CREATE INDEX ix_symptom_status   ON symptom(status);
CREATE INDEX ix_symptom_category ON symptom(category);
CREATE INDEX ix_audit_occurred   ON audit_log(occurred_at);
GO
