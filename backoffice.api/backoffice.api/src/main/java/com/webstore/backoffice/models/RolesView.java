package com.webstore.backoffice.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "roles_view")
public class RolesView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "name", length = Integer.MAX_VALUE)
    private String name;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "permissions")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> permissions;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public Map<String, Object> getPermissions() {
        return permissions;
    }

    protected RolesView() {
    }
}