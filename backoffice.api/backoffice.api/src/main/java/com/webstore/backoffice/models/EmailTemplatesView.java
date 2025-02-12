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
@Table(name = "email_templates_view")
public class EmailTemplatesView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "name", length = Integer.MAX_VALUE)
    private String name;

    @Column(name = "subject", length = Integer.MAX_VALUE)
    private String subject;

    @Column(name = "placeholders")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> placeholders;

    @Column(name = "template", length = Integer.MAX_VALUE)
    private String template;

    @Column(name = "table_border_width")
    private Long tableBorderWidth;

    @Column(name = "table_border_color", length = Integer.MAX_VALUE)
    private String tableBorderColor;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "type", length = Integer.MAX_VALUE)
    private String type;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSubject() {
        return subject;
    }

    public Map<String, Object> getPlaceholders() {
        return placeholders;
    }

    public String getTemplate() {
        return template;
    }

    public Long getTableBorderWidth() {
        return tableBorderWidth;
    }

    public String getTableBorderColor() {
        return tableBorderColor;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public String getType() {
        return type;
    }

    protected EmailTemplatesView() {
    }
}