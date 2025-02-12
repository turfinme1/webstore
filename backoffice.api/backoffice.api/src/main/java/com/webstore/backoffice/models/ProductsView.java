package com.webstore.backoffice.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.util.List;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "products_view")
public class ProductsView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "code", length = Integer.MAX_VALUE)
    private String code;

    @Column(name = "name", length = Integer.MAX_VALUE)
    private String name;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "short_description", length = Integer.MAX_VALUE)
    private String shortDescription;

    @Column(name = "long_description", length = Integer.MAX_VALUE)
    private String longDescription;

    @Column(name = "images")
    private List<String> images;

    @Column(name = "categories")
    private List<String> categories;

    @Column(name = "rating")
    private BigDecimal rating;

    @Column(name = "rating_count")
    private Long ratingCount;

    @Column(name = "price_with_vat")
    private BigDecimal priceWithVat;

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public String getLongDescription() {
        return longDescription;
    }

    public List<String> getImages() {
        return images;
    }

    public List<String> getCategories() {
        return categories;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public Long getRatingCount() {
        return ratingCount;
    }

    public BigDecimal getPriceWithVat() {
        return priceWithVat;
    }

    protected ProductsView() {
    }
}