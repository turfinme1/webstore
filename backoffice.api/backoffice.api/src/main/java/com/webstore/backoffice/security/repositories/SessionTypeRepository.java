package com.webstore.backoffice.security.repositories;

import com.webstore.backoffice.crud.models.SessionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SessionTypeRepository extends JpaRepository<SessionType, Long> {
    Optional<SessionType> findByType(String type);
}
