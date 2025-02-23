package com.webstore.backoffice.crud.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "email_templates")
public class EmailTemplate {
    @Id
    @ColumnDefault("nextval('email_templates_id_seq')")
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "name", nullable = false, length = Integer.MAX_VALUE)
    private String name;

    @NotNull
    @Column(name = "subject", nullable = false, length = Integer.MAX_VALUE)
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

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @NotNull
    @ColumnDefault("'Email'")
    @Column(name = "type", nullable = false, length = Integer.MAX_VALUE)
    private String type;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public Map<String, Object> getPlaceholders() {
        return placeholders;
    }

    public void setPlaceholders(Map<String, Object> placeholders) {
        this.placeholders = placeholders;
    }

    public String getTemplate() {
        return template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public Long getTableBorderWidth() {
        return tableBorderWidth;
    }

    public void setTableBorderWidth(Long tableBorderWidth) {
        this.tableBorderWidth = tableBorderWidth;
    }

    public String getTableBorderColor() {
        return tableBorderColor;
    }

    public void setTableBorderColor(String tableBorderColor) {
        this.tableBorderColor = tableBorderColor;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

}