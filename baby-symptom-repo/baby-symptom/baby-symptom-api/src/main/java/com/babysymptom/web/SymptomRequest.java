package com.babysymptom.web;

import com.babysymptom.domain.Category;
import com.babysymptom.domain.ContentStatus;
import com.babysymptom.domain.Severity;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

/** 表單送進來的資料，欄位驗證規則都在這裡 */
public record SymptomRequest(
        @NotBlank(message = "請填代碼")
        @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$", message = "代碼只能用小寫英文、數字和連字號，例如 diaper-rash")
        @Size(max = 40, message = "代碼最多 40 字")
        String code,

        @NotBlank(message = "請填症狀名稱")
        @Size(max = 50, message = "名稱最多 50 字")
        String name,

        @NotNull(message = "請選分類")
        Category category,

        @NotNull(message = "請選嚴重程度")
        Severity severity,

        @NotBlank(message = "請填簡介")
        @Size(max = 500, message = "簡介最多 500 字")
        String summary,

        @NotEmpty(message = "至少填一項徵兆")
        @Size(max = 12, message = "徵兆最多 12 項")
        List<@NotBlank(message = "徵兆不能空白") @Size(max = 100, message = "每項徵兆最多 100 字") String> signs,

        @NotEmpty(message = "至少選一個部位")
        List<@NotBlank String> parts,

        @NotBlank(message = "請填就醫時機")
        @Size(max = 500, message = "就醫時機最多 500 字")
        String whenToSeeDoctor,

        @NotNull(message = "請選狀態")
        ContentStatus status,

        @Size(max = 50, message = "審閱者最多 50 字")
        String reviewedBy,

        @PastOrPresent(message = "審閱日期不能是未來")
        LocalDate reviewedAt,

        /** 編輯時帶回原本的版本號，避免覆蓋別人剛改的內容；新增時留空 */
        Long version
) {}
