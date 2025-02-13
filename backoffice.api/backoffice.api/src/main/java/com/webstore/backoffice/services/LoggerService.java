package com.webstore.backoffice.services;

import com.webstore.backoffice.models.Log;
import com.webstore.backoffice.repositories.LogRepository;
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
