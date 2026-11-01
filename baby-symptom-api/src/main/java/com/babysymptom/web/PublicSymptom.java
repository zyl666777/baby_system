package com.babysymptom.web;

import com.babysymptom.domain.Symptom;
import java.util.List;

/** 給 3D 前台的格式：欄位名稱和前端 symptoms.js 一致，不含內部欄位 */
public record PublicSymptom(String id, String name, String category, String severity, List<String> parts,
                            String summary, List<String> signs, String whenToSeeDoctor) {
    public static PublicSymptom of(Symptom s) {
        return new PublicSymptom(s.getCode(), s.getName(), s.getCategory().name().toLowerCase(),
                s.getSeverity().name().toLowerCase(),
                List.copyOf(s.getParts()), s.getSummary(), List.copyOf(s.getSigns()), s.getWhenToSeeDoctor());
    }
}
