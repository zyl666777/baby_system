package com.babysymptom.web;

import com.babysymptom.audit.AuditLog;
import com.babysymptom.audit.AuditLogRepository;
import com.babysymptom.audit.AuditService;
import com.babysymptom.domain.ContentStatus;
import com.babysymptom.service.SymptomService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/** 管理 API：全部需要 ADMIN 權限（設定在 SecurityConfig） */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final SymptomService service;
    private final AuditLogRepository auditLogs;

    public AdminController(SymptomService service, AuditLogRepository auditLogs) {
        this.service = service;
        this.auditLogs = auditLogs;
    }

    /** 管理頁面載入時取得目前使用者與 CSRF token，之後的修改請求都要帶這個 token */
    @GetMapping("/session")
    public Map<String, String> session(CsrfToken csrf) {
        return Map.of("username", AuditService.currentUser(),
                "csrfHeader", csrf.getHeaderName(), "csrfToken", csrf.getToken());
    }

    @GetMapping("/symptoms")
    public List<SymptomResponse> list() { return service.listAll(); }

    @GetMapping("/symptoms/{id}")
    public SymptomResponse get(@PathVariable Long id) { return service.get(id); }

    @PostMapping("/symptoms")
    @ResponseStatus(HttpStatus.CREATED)
    public SymptomResponse create(@Valid @RequestBody SymptomRequest req) { return service.create(req); }

    @PutMapping("/symptoms/{id}")
    public SymptomResponse update(@PathVariable Long id, @Valid @RequestBody SymptomRequest req) {
        return service.update(id, req);
    }

    public record StatusRequest(@NotNull(message = "請選狀態") ContentStatus status) {}

    @PatchMapping("/symptoms/{id}/status")
    public SymptomResponse status(@PathVariable Long id, @Valid @RequestBody StatusRequest req) {
        return service.changeStatus(id, req.status());
    }

    @DeleteMapping("/symptoms/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }

    @GetMapping("/audit-logs")
    public List<AuditLog> auditLogs() { return auditLogs.findTop100ByOrderByOccurredAtDescIdDesc(); }
}
