package com.webstore.backoffice.security.repositories;

import com.webstore.backoffice.crud.models.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
    AdminUser findByEmail(String email);
}
