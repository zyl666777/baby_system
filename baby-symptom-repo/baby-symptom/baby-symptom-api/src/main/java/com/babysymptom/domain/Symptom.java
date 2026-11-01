package com.babysymptom.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "symptom")
public class Symptom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Category category = Category.GENERAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Severity severity;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(name = "when_to_see_doctor", nullable = false, length = 500)
    private String whenToSeeDoctor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContentStatus status = ContentStatus.DRAFT;

    @Column(name = "reviewed_by", length = 50)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDate reviewedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by", nullable = false, length = 50)
    private String updatedBy;

    @Version
    private Long version;

    @ElementCollection
    @CollectionTable(name = "symptom_body_part", joinColumns = @JoinColumn(name = "symptom_id"))
    @Column(name = "part_code", length = 30)
    private Set<String> parts = new LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "symptom_sign", joinColumns = @JoinColumn(name = "symptom_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "content", length = 100)
    private List<String> signs = new ArrayList<>();

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public Severity getSeverity() { return severity; }
    public void setSeverity(Severity severity) { this.severity = severity; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getWhenToSeeDoctor() { return whenToSeeDoctor; }
    public void setWhenToSeeDoctor(String v) { this.whenToSeeDoctor = v; }
    public ContentStatus getStatus() { return status; }
    public void setStatus(ContentStatus status) { this.status = status; }
    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDate getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDate reviewedAt) { this.reviewedAt = reviewedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
    public Set<String> getParts() { return parts; }
    public List<String> getSigns() { return signs; }
}
