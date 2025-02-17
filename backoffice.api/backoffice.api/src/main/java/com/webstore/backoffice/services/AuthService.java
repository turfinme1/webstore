package com.webstore.backoffice.services;

import com.webstore.backoffice.models.AdminSession;
import com.webstore.backoffice.repositories.AdminSessionRepository;
import com.webstore.backoffice.repositories.AdminUserRepository;
import com.webstore.backoffice.repositories.SessionTypeRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final AdminSessionRepository adminSessionRepository;
    private final SessionTypeRepository sessionTypeRepository;
    private final AdminUserRepository adminUserRepository;

    public AuthService(AdminSessionRepository adminSessionRepository, SessionTypeRepository sessionTypeRepository, AdminUserRepository adminUserRepository) {
        this.adminSessionRepository = adminSessionRepository;
        this.sessionTypeRepository = sessionTypeRepository;
        this.adminUserRepository = adminUserRepository;
    }

    public Optional<AdminSession> getValidSession(UUID sessionHash) {
        return adminSessionRepository.findBySessionHashAndIsActiveTrue(sessionHash)
                .filter(session -> session.getExpiresAt().isAfter(OffsetDateTime.now()));
    }

    public Optional<AdminSession> createSession() {
        AdminSession session = new AdminSession();
        session.setSessionHash(UUID.randomUUID());
//        session.setIpAddress(ipAddress);
        var sessionType = sessionTypeRepository.findByType("Anonymous");
        session.setSessionType(sessionType.get());

        session.setCreatedAt(OffsetDateTime.now());
        session.setExpiresAt(OffsetDateTime.now().plusMinutes(60));
        session.setIsActive(true);
        return Optional.of(adminSessionRepository.save(session));
    }

    public Optional<AdminSession> changeSessionType(UUID sessionHash, String sessionTypeName, Long adminUserId) {
        Optional<AdminSession> sessionOpt = adminSessionRepository.findBySessionHashAndIsActiveTrue(sessionHash);
        // assert sessionOpt.isPresent();
        AdminSession session = sessionOpt.get();

        var sessionType = sessionTypeRepository.findByType(sessionTypeName);
        // assert sessionTypeOptional.isPresent();
        session.setSessionType(sessionType.get());


        var adminUser = adminUserRepository.findById(adminUserId);
        // assert adminUser.isPresent();
        session.setAdminUser(adminUser.get());

        return Optional.of(adminSessionRepository.save(session));
    }
}
