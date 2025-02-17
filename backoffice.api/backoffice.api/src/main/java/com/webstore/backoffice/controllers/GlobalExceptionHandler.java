package com.webstore.backoffice.controllers;

import com.webstore.backoffice.asserts.ApplicationError;
import com.webstore.backoffice.asserts.CustomErrorResponse;
import com.webstore.backoffice.asserts.PeerError;
import com.webstore.backoffice.asserts.UserError;
import com.webstore.backoffice.models.Log;
import com.webstore.backoffice.services.LoggerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private final LoggerService loggerService;

    public enum AuditType {
        ASSERT("ASSERT"),
        ASSERT_USER("ASSERT_USER"),
        TEMPORARY("TEMPORARY");

        private final String value;

        AuditType(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    public static final String LOG_LEVEL_ERROR = "ERROR";
    public static final String STATUS_INTERNAL_ERROR = "INTERNAL_SERVER_ERROR";

    public GlobalExceptionHandler(LoggerService loggerService) {
        this.loggerService = loggerService;
    }

    @ExceptionHandler({ApplicationError.class, UserError.class, PeerError.class, AuthorizationDeniedException.class})
    public ResponseEntity<?> handleCustomErrors(RuntimeException ex) {
        AuditType auditType;
        Map<String, Object> params;

        if (ex instanceof UserError) {
            auditType = AuditType.ASSERT_USER;
            params = ((UserError) ex).getParams();
        } else if (ex instanceof PeerError) {
            auditType = AuditType.TEMPORARY;
            params = ((PeerError) ex).getParams();
        } else if (ex instanceof AuthorizationDeniedException) {
            auditType = AuditType.ASSERT_USER;
            params = null;
        }
        else {
            auditType = AuditType.ASSERT;
            params = ((ApplicationError) ex).getParams();
        }

        Log log = buildLogFromException(ex, params, auditType.getValue(), LOG_LEVEL_ERROR);
        loggerService.logError(log);

        CustomErrorResponse errorResponse = new CustomErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneralException(Exception ex) {
        Log log = buildLogFromException(ex, null, AuditType.ASSERT.getValue(), LOG_LEVEL_ERROR);
        loggerService.logError(log);

        CustomErrorResponse errorResponse = new CustomErrorResponse("Internal Server Error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    private Log buildLogFromException(Exception ex, Map<String, Object> params, String auditType, String logLevel) {
        Log log = new Log();
        if (params != null && params.containsKey("code")) {
            log.setStatusCode(params.get("code").toString());
        } else {
            log.setStatusCode(STATUS_INTERNAL_ERROR);
        }
        log.setLogLevel(logLevel);
        log.setAuditType(auditType);
        log.setShortDescription(ex.getMessage());
        if (params != null && params.containsKey("long_description")) {
            log.setLongDescription(params.get("long_description").toString());
        }
        StringBuilder stackTrace = new StringBuilder();
        for (StackTraceElement element : ex.getStackTrace()) {
            stackTrace.append(element.toString()).append("\n");
        }
        log.setDebugInfo(stackTrace.toString());
        return log;
    }
}

