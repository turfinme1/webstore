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
@Table(name = "campaigns_view")
public class CampaignsView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "name", length = Integer.MAX_VALUE)
    private String name;

    @Column(name = "start_date")
    private OffsetDateTime startDate;

    @Column(name = "end_date")
    private OffsetDateTime endDate;

    @Column(name = "status", length = Integer.MAX_VALUE)
    private String status;

    @Column(name = "target_group_id")
    private Long targetGroupId;

    @Column(name = "voucher_id")
    private Long voucherId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "target_group_name", length = Integer.MAX_VALUE)
    private String targetGroupName;

    @Column(name = "voucher_name", length = Integer.MAX_VALUE)
    private String voucherName;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public OffsetDateTime getStartDate() {
        return startDate;
    }

    public OffsetDateTime getEndDate() {
        return endDate;
    }

    public String getStatus() {
        return status;
    }

    public Long getTargetGroupId() {
        return targetGroupId;
    }

    public Long getVoucherId() {
        return voucherId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public String getTargetGroupName() {
        return targetGroupName;
    }

    public String getVoucherName() {
        return voucherName;
    }

    protected CampaignsView() {
    }
}