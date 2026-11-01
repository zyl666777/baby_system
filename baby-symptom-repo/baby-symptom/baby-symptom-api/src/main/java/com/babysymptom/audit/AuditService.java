package com.babysymptom.audit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class AuditService {
    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) { this.repo = repo; }

    /** 記錄目前登入者的操作 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String target, String detail) {
        repo.save(new AuditLog(currentUser(), action, target, detail, currentIp()));
    }

    /** 記錄登入成功／失敗（獨立交易，失敗的登入也一定寫得進去） */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLogin(String username, boolean success, String ip) {
        repo.save(new AuditLog(username == null ? "(空白)" : username,
                success ? "LOGIN_OK" : "LOGIN_FAIL", null, null, ip));
    }

    public static String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? "anonymous" : auth.getName();
    }

    private static String currentIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest req = attrs.getRequest();
            return req.getRemoteAddr();
        }
        return null;
    }
}
