package com.webstore.backoffice.crud.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "logs_view")
public class LogsView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "admin_user_id")
    private Long adminUserId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "status_code", length = Integer.MAX_VALUE)
    private String statusCode;

    @Column(name = "log_level", length = Integer.MAX_VALUE)
    private String logLevel;

    @Column(name = "short_description", length = Integer.MAX_VALUE)
    private String shortDescription;

    @Column(name = "long_description", length = Integer.MAX_VALUE)
    private String longDescription;

    @Column(name = "debug_info", length = Integer.MAX_VALUE)
    private String debugInfo;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public Long getId() {
        return id;
    }

    public Long getAdminUserId() {
        return adminUserId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getStatusCode() {
        return statusCode;
    }

    public String getLogLevel() {
        return logLevel;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public String getLongDescription() {
        return longDescription;
    }

    public String getDebugInfo() {
        return debugInfo;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    protected LogsView() {
    }
}