package com.webstore.backoffice.repositories;

import com.webstore.backoffice.models.Gender;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenderRepository  extends JpaRepository<Gender, Long> {
}
