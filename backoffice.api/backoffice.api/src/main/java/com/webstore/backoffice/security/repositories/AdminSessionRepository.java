package com.webstore.backoffice.security.repositories;

import com.webstore.backoffice.crud.models.AdminSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdminSessionRepository extends JpaRepository<AdminSession, Long> {
    Optional<AdminSession> findBySessionHashAndIsActiveTrue(UUID sessionHash);
}
