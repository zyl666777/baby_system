package com.babysymptom.service;

import com.babysymptom.audit.AuditService;
import com.babysymptom.domain.ContentStatus;
import com.babysymptom.domain.Symptom;
import com.babysymptom.repo.BodyPartRepository;
import com.babysymptom.repo.SymptomRepository;
import com.babysymptom.web.ApiException;
import com.babysymptom.web.PublicSymptom;
import com.babysymptom.web.SymptomRequest;
import com.babysymptom.web.SymptomResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class SymptomService {
    private final SymptomRepository symptoms;
    private final BodyPartRepository parts;
    private final AuditService audit;

    public SymptomService(SymptomRepository symptoms, BodyPartRepository parts, AuditService audit) {
        this.symptoms = symptoms;
        this.parts = parts;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<PublicSymptom> listPublished() {
        return symptoms.findByStatusOrderByIdAsc(ContentStatus.PUBLISHED).stream().map(PublicSymptom::of).toList();
    }

    @Transactional(readOnly = true)
    public List<SymptomResponse> listAll() {
        return symptoms.findAllByOrderByIdAsc().stream().map(SymptomResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public SymptomResponse get(Long id) {
        return SymptomResponse.of(find(id));
    }

    @Transactional
    public SymptomResponse create(SymptomRequest req) {
        if (symptoms.existsByCode(req.code())) {
            throw new ApiException(HttpStatus.CONFLICT, "code", "這個代碼已經有人用了");
        }
        Symptom s = new Symptom();
        s.setCreatedAt(Instant.now());
        apply(s, req);
        Symptom saved = symptoms.saveAndFlush(s);
        audit.record("CREATE", saved.getCode(), "新增「" + saved.getName() + "」，狀態 " + saved.getStatus());
        return SymptomResponse.of(saved);
    }

    @Transactional
    public SymptomResponse update(Long id, SymptomRequest req) {
        Symptom s = find(id);
        if (req.version() == null || !Objects.equals(req.version(), s.getVersion())) {
            throw new ApiException(HttpStatus.CONFLICT, "這筆資料剛被其他人修改過，請重新載入後再編輯");
        }
        if (symptoms.existsByCodeAndIdNot(req.code(), id)) {
            throw new ApiException(HttpStatus.CONFLICT, "code", "這個代碼已經有人用了");
        }
        String changes = describeChanges(s, req);
        apply(s, req);
        Symptom saved = symptoms.saveAndFlush(s);
        audit.record("UPDATE", saved.getCode(), changes.isEmpty() ? "沒有變更" : "修改：" + changes);
        return SymptomResponse.of(saved);
    }

    @Transactional
    public SymptomResponse changeStatus(Long id, ContentStatus status) {
        Symptom s = find(id);
        ContentStatus old = s.getStatus();
        s.setStatus(status);
        touch(s);
        Symptom saved = symptoms.saveAndFlush(s);
        audit.record("STATUS", saved.getCode(), old + " → " + status);
        return SymptomResponse.of(saved);
    }

    @Transactional
    public void delete(Long id) {
        Symptom s = find(id);
        symptoms.delete(s);
        audit.record("DELETE", s.getCode(), "刪除「" + s.getName() + "」");
    }

    // ---------- 內部 ----------

    private Symptom find(Long id) {
        return symptoms.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "找不到這筆症狀"));
    }

    private void apply(Symptom s, SymptomRequest req) {
        Set<String> partCodes = new LinkedHashSet<>(req.parts());
        List<String> unknown = partCodes.stream().filter(p -> !parts.existsById(p)).toList();
        if (!unknown.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "parts", "不存在的部位：" + String.join(", ", unknown));
        }
        s.setCode(req.code().trim());
        s.setName(req.name().trim());
        s.setCategory(req.category());
        s.setSeverity(req.severity());
        s.setSummary(req.summary().trim());
        s.setWhenToSeeDoctor(req.whenToSeeDoctor().trim());
        s.setStatus(req.status());
        s.setReviewedBy(blankToNull(req.reviewedBy()));
        s.setReviewedAt(req.reviewedAt());
        s.getParts().clear();
        s.getParts().addAll(partCodes);
        s.getSigns().clear();
        req.signs().stream().map(String::trim).forEach(s.getSigns()::add);
        touch(s);
    }

    private void touch(Symptom s) {
        s.setUpdatedAt(Instant.now());
        s.setUpdatedBy(AuditService.currentUser());
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    /** 稽核紀錄用：列出哪些欄位被改了 */
    private static String describeChanges(Symptom s, SymptomRequest r) {
        List<String> c = new ArrayList<>();
        if (!s.getCode().equals(r.code().trim())) c.add("代碼");
        if (!s.getName().equals(r.name().trim())) c.add("名稱");
        if (s.getCategory() != r.category()) c.add("分類");
        if (s.getSeverity() != r.severity()) c.add("嚴重程度 " + s.getSeverity() + "→" + r.severity());
        if (!s.getSummary().equals(r.summary().trim())) c.add("簡介");
        if (!s.getWhenToSeeDoctor().equals(r.whenToSeeDoctor().trim())) c.add("就醫時機");
        if (s.getStatus() != r.status()) c.add("狀態 " + s.getStatus() + "→" + r.status());
        if (!new LinkedHashSet<>(s.getParts()).equals(new LinkedHashSet<>(r.parts()))) c.add("部位");
        if (!s.getSigns().equals(r.signs().stream().map(String::trim).toList())) c.add("徵兆");
        if (!Objects.equals(s.getReviewedBy(), blankToNull(r.reviewedBy()))
                || !Objects.equals(s.getReviewedAt(), r.reviewedAt())) c.add("審閱資訊");
        return String.join("、", c);
    }
}
