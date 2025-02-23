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
@Table(name = "notifications_view")
public class NotificationsView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "name", length = Integer.MAX_VALUE)
    private String name;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "user_ids", length = Integer.MAX_VALUE)
    private String userIds;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "template_type", length = Integer.MAX_VALUE)
    private String templateType;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Long getTemplateId() {
        return templateId;
    }

    public String getUserIds() {
        return userIds;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public String getTemplateType() {
        return templateType;
    }

    protected NotificationsView() {
    }
}