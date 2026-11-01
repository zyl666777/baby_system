package com.babysymptom.domain;

/** 內容狀態：只有 PUBLISHED 會出現在前台 */
public enum ContentStatus {
    DRAFT,     // 草稿（含待審閱）
    PUBLISHED, // 已發布
    ARCHIVED   // 已下架
}
