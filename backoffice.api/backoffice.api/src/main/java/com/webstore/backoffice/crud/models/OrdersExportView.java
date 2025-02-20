package com.webstore.backoffice.crud.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "orders_export_view")
public class OrdersExportView {
    @Id
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "id")
    private Long id;

    @Column(name = "order_hash")
    private UUID orderHash;

    @Column(name = "email", length = Integer.MAX_VALUE)
    private String email;

    @Column(name = "status", length = Integer.MAX_VALUE)
    private String status;

    @Column(name = "total_price", precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "discount_percentage", precision = 5, scale = 2)
    private BigDecimal discountPercentage;

    @Column(name = "discount_amount")
    private BigDecimal discountAmount;

    @Column(name = "total_price_after_discount")
    private BigDecimal totalPriceAfterDiscount;

    @Column(name = "vat_percentage", precision = 5, scale = 2)
    private BigDecimal vatPercentage;

    @Column(name = "vat_amount")
    private BigDecimal vatAmount;

    @Column(name = "total_price_with_vat")
    private BigDecimal totalPriceWithVat;

    @Column(name = "paid_amount", precision = 12, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "is_active")
    private Boolean isActive;

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public Long getId() {
        return id;
    }

    public UUID getOrderHash() {
        return orderHash;
    }

    public String getEmail() {
        return email;
    }

    public String getStatus() {
        return status;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public BigDecimal getDiscountPercentage() {
        return discountPercentage;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public BigDecimal getTotalPriceAfterDiscount() {
        return totalPriceAfterDiscount;
    }

    public BigDecimal getVatPercentage() {
        return vatPercentage;
    }

    public BigDecimal getVatAmount() {
        return vatAmount;
    }

    public BigDecimal getTotalPriceWithVat() {
        return totalPriceWithVat;
    }

    public BigDecimal getPaidAmount() {
        return paidAmount;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    protected OrdersExportView() {
    }
}