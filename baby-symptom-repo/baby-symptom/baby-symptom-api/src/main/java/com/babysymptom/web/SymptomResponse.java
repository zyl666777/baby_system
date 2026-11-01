package com.babysymptom.web;

import com.babysymptom.domain.Category;
import com.babysymptom.domain.ContentStatus;
import com.babysymptom.domain.Severity;
import com.babysymptom.domain.Symptom;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record SymptomResponse(
        Long id, String code, String name, Category category, Severity severity, String summary,
        List<String> signs, List<String> parts, String whenToSeeDoctor,
        ContentStatus status, String reviewedBy, LocalDate reviewedAt,
        Instant updatedAt, String updatedBy, Long version) {

    public static SymptomResponse of(Symptom s) {
        return new SymptomResponse(s.getId(), s.getCode(), s.getName(), s.getCategory(), s.getSeverity(), s.getSummary(),
                List.copyOf(s.getSigns()), List.copyOf(s.getParts()), s.getWhenToSeeDoctor(),
                s.getStatus(), s.getReviewedBy(), s.getReviewedAt(),
                s.getUpdatedAt(), s.getUpdatedBy(), s.getVersion());
    }
}
