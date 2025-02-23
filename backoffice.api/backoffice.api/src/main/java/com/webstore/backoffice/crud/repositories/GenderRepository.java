package com.webstore.backoffice.crud.repositories;

import com.webstore.backoffice.crud.models.Gender;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenderRepository  extends JpaRepository<Gender, Long> {
}
