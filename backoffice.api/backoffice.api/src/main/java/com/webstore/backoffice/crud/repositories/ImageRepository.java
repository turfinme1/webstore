package com.webstore.backoffice.crud.repositories;

import com.webstore.backoffice.crud.models.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ImageRepository extends JpaRepository<Image, Long>, JpaSpecificationExecutor<Image> {
    void deleteByUrl(String url);
}
