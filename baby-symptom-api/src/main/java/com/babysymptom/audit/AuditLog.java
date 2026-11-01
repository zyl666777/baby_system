package com.babysymptom.audit;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
    @Column(nullable = false, length = 50)
    private String username;
    @Column(nullable = false, length = 30)
    private String action;
    @Column(length = 40)
    private String target;
    @Column(length = 500)
    private String detail;
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    protected AuditLog() {}

    public AuditLog(String username, String action, String target, String detail, String ipAddress) {
        this.occurredAt = Instant.now();
        this.username = truncate(username, 50);
        this.action = action;
        this.target = truncate(target, 40);
        this.detail = truncate(detail, 500);
        this.ipAddress = truncate(ipAddress, 45);
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    public Long getId() { return id; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getUsername() { return username; }
    public String getAction() { return action; }
    public String getTarget() { return target; }
    public String getDetail() { return detail; }
    public String getIpAddress() { return ipAddress; }
}
