package com.webstore.backoffice.crud.repositories;

import com.webstore.backoffice.crud.models.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
}
