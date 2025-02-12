package com.webstore.backoffice.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "categories_view")
public class CategoriesView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "name", length = Integer.MAX_VALUE)
    private String name;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    protected CategoriesView() {
    }
}