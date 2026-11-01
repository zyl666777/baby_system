package com.babysymptom.security;

import com.babysymptom.audit.AuditService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AbstractAuthenticationFailureEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.stereotype.Component;

/** 記錄每一次登入成功與失敗：被暴力破解時，稽核紀錄裡會看到大量 LOGIN_FAIL */
@Component
public class LoginAuditListener {
    private static final Logger log = LoggerFactory.getLogger(LoginAuditListener.class);
    private final AuditService audit;

    public LoginAuditListener(AuditService audit) { this.audit = audit; }

    @EventListener
    public void onSuccess(AuthenticationSuccessEvent e) {
        audit.recordLogin(e.getAuthentication().getName(), true, ip(e.getAuthentication()));
    }

    @EventListener
    public void onFailure(AbstractAuthenticationFailureEvent e) {
        String ip = ip(e.getAuthentication());
        log.warn("登入失敗 user={} ip={}", e.getAuthentication().getName(), ip);
        audit.recordLogin(e.getAuthentication().getName(), false, ip);
    }

    private static String ip(Authentication auth) {
        return auth.getDetails() instanceof WebAuthenticationDetails d ? d.getRemoteAddress() : null;
    }
}
