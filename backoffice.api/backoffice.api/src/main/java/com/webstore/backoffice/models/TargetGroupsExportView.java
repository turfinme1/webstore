package com.webstore.backoffice.models;

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
@Table(name = "target_groups_export_view")
public class TargetGroupsExportView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "first_name", length = Integer.MAX_VALUE)
    private String firstName;

    @Column(name = "last_name", length = Integer.MAX_VALUE)
    private String lastName;

    @Column(name = "email", length = Integer.MAX_VALUE)
    private String email;

    @Column(name = "birth_date", length = Integer.MAX_VALUE)
    private String birthDate;

    @Column(name = "gender", length = Integer.MAX_VALUE)
    private String gender;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "days_since_registration")
    private Double daysSinceRegistration;

    @Column(name = "days_since_order")
    private Double daysSinceOrder;

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getBirthDate() {
        return birthDate;
    }

    public String getGender() {
        return gender;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public Double getDaysSinceRegistration() {
        return daysSinceRegistration;
    }

    public Double getDaysSinceOrder() {
        return daysSinceOrder;
    }

    protected TargetGroupsExportView() {
    }
}