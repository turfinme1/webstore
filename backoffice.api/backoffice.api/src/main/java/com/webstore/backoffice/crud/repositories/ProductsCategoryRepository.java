package com.webstore.backoffice.crud.repositories;

import com.webstore.backoffice.crud.models.ProductsCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductsCategoryRepository extends JpaRepository<ProductsCategory, Long> {
}