package com.webstore.backoffice.asserts.services;

import com.webstore.backoffice.crud.models.Log;
import com.webstore.backoffice.asserts.repositories.LogRepository;
import org.springframework.stereotype.Service;

@Service
public class LoggerService {

    private final LogRepository logRepository;

    public LoggerService(LogRepository logRepository) {
        this.logRepository = logRepository;
    }

    public void logInfo(Log log) {
        log.setLogLevel("INFO");
        log.setAuditType("INFO");
        logRepository.save(log);
    }

    public void logError(Log log) {
        logRepository.save(log);
    }
}
