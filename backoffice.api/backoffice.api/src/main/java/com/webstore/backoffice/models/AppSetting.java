package com.webstore.backoffice.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.OffsetTime;

@Entity
@Table(name = "app_settings")
public class AppSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "app_settings_id_gen")
    @SequenceGenerator(name = "app_settings_id_gen", sequenceName = "app_settings_id_seq", allocationSize = 1)
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @ColumnDefault("10")
    @Column(name = "request_limit", nullable = false)
    private Long requestLimit;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "password_require_digit", nullable = false)
    private Boolean passwordRequireDigit = false;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "password_require_lowercase", nullable = false)
    private Boolean passwordRequireLowercase = false;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "password_require_uppercase", nullable = false)
    private Boolean passwordRequireUppercase = false;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "password_require_special", nullable = false)
    private Boolean passwordRequireSpecial = false;
    @NotNull
    @ColumnDefault("1000")
    @Column(name = "report_row_limit_display", nullable = false)
    private Long reportRowLimitDisplay;

    @NotNull
    @ColumnDefault("0.00")
    @Column(name = "vat_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal vatPercentage;
    @NotNull
    @ColumnDefault("'00:00:00+00'")
    @Column(name = "target_group_status_update_initial_time", nullable = false)
    private OffsetTime targetGroupStatusUpdateInitialTime;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRequestLimit() {
        return requestLimit;
    }

    public void setRequestLimit(Long requestLimit) {
        this.requestLimit = requestLimit;
    }

    public Boolean getPasswordRequireDigit() {
        return passwordRequireDigit;
    }

    public void setPasswordRequireDigit(Boolean passwordRequireDigit) {
        this.passwordRequireDigit = passwordRequireDigit;
    }

    public Boolean getPasswordRequireLowercase() {
        return passwordRequireLowercase;
    }

    public void setPasswordRequireLowercase(Boolean passwordRequireLowercase) {
        this.passwordRequireLowercase = passwordRequireLowercase;
    }

    public Boolean getPasswordRequireUppercase() {
        return passwordRequireUppercase;
    }

    public void setPasswordRequireUppercase(Boolean passwordRequireUppercase) {
        this.passwordRequireUppercase = passwordRequireUppercase;
    }

    public Boolean getPasswordRequireSpecial() {
        return passwordRequireSpecial;
    }

    public void setPasswordRequireSpecial(Boolean passwordRequireSpecial) {
        this.passwordRequireSpecial = passwordRequireSpecial;
    }

    public BigDecimal getVatPercentage() {
        return vatPercentage;
    }

    public void setVatPercentage(BigDecimal vatPercentage) {
        this.vatPercentage = vatPercentage;
    }

    public Long getReportRowLimitDisplay() {
        return reportRowLimitDisplay;
    }

    public void setReportRowLimitDisplay(Long reportRowLimitDisplay) {
        this.reportRowLimitDisplay = reportRowLimitDisplay;
    }

    public OffsetTime getTargetGroupStatusUpdateInitialTime() {
        return targetGroupStatusUpdateInitialTime;
    }

    public void setTargetGroupStatusUpdateInitialTime(OffsetTime targetGroupStatusUpdateInitialTime) {
        this.targetGroupStatusUpdateInitialTime = targetGroupStatusUpdateInitialTime;
    }

/*
 TODO [Reverse Engineering] create field to map the 'request_window' column
 Available actions: Define target Java type | Uncomment as is | Remove column mapping
    @ColumnDefault("'00:10:00'")
    @Column(name = "request_window", columnDefinition = "interval not null")
    private Object requestWindow;
*/
/*
 TODO [Reverse Engineering] create field to map the 'request_block_duration' column
 Available actions: Define target Java type | Uncomment as is | Remove column mapping
    @ColumnDefault("'01:00:00'")
    @Column(name = "request_block_duration", columnDefinition = "interval not null")
    private Object requestBlockDuration;
*/
/*
 TODO [Reverse Engineering] create field to map the 'campaign_status_update_interval' column
 Available actions: Define target Java type | Uncomment as is | Remove column mapping
    @ColumnDefault("'00:05:00'")
    @Column(name = "campaign_status_update_interval", columnDefinition = "interval not null")
    private Object campaignStatusUpdateInterval;
*/
/*
 TODO [Reverse Engineering] create field to map the 'target_group_status_update_interval' column
 Available actions: Define target Java type | Uncomment as is | Remove column mapping
    @ColumnDefault("'00:01:00'")
    @Column(name = "target_group_status_update_interval", columnDefinition = "interval not null")
    private Object targetGroupStatusUpdateInterval;
*/
}