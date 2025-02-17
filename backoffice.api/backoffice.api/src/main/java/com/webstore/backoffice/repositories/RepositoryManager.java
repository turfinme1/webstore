package com.webstore.backoffice.repositories;

import org.springframework.stereotype.Repository;

@Repository
public class RepositoryManager {

    private final AdminSessionRepository adminSessionRepository;
    private final AdminUserRepository adminUserRepository;
    private final GenderRepository genderRepository;
    private final IsoCountryCodeRepository isoCountryCodeRepository;
    private final LogRepository logRepository;
    private final SessionTypeRepository sessionTypeRepository;
    private final UserRepository userRepository;

    public RepositoryManager(AdminSessionRepository adminSessionRepository,
                             AdminUserRepository adminUserRepository,
                             GenderRepository genderRepository,
                             IsoCountryCodeRepository isoCountryCodeRepository,
                             LogRepository logRepository,
                             SessionTypeRepository sessionTypeRepository,
                             UserRepository userRepository) {
        this.adminSessionRepository = adminSessionRepository;
        this.adminUserRepository = adminUserRepository;
        this.genderRepository = genderRepository;
        this.isoCountryCodeRepository = isoCountryCodeRepository;
        this.logRepository = logRepository;
        this.sessionTypeRepository = sessionTypeRepository;
        this.userRepository = userRepository;
    }


    public AdminSessionRepository getAdminSessionRepository() {
        return adminSessionRepository;
    }

    public AdminUserRepository getAdminUserRepository() {
        return adminUserRepository;
    }

    public GenderRepository getGenderRepository() {
        return genderRepository;
    }

    public IsoCountryCodeRepository getIsoCountryCodeRepository() {
        return isoCountryCodeRepository;
    }

    public LogRepository getLogRepository() {
        return logRepository;
    }

    public SessionTypeRepository getSessionTypeRepository() {
        return sessionTypeRepository;
    }

    public UserRepository getUserRepository() {
        return userRepository;
    }
}
