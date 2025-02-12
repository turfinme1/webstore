package com.webstore.backoffice.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "product_ratings_view")
public class ProductRatingsView {
    @Id
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "average_rating")
    private BigDecimal averageRating;

    @Column(name = "rating_count")
    private Long ratingCount;

    public Long getProductId() {
        return productId;
    }

    public BigDecimal getAverageRating() {
        return averageRating;
    }

    public Long getRatingCount() {
        return ratingCount;
    }

    protected ProductRatingsView() {
    }
}