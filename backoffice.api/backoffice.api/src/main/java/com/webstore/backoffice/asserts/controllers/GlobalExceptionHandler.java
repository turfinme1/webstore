package com.webstore.backoffice.asserts.controllers;

import com.webstore.backoffice.asserts.configurations.ApplicationError;
import com.webstore.backoffice.asserts.dtos.CustomErrorResponse;
import com.webstore.backoffice.asserts.configurations.PeerError;
import com.webstore.backoffice.asserts.configurations.UserError;
import com.webstore.backoffice.crud.models.Log;
import com.webstore.backoffice.asserts.services.LoggerService;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

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

    @ExceptionHandler({
            ApplicationError.class,
            UserError.class, PeerError.class,
            AuthorizationDeniedException.class,
            ConstraintViolationException.class,
            MethodArgumentNotValidException.class,
            Exception.class
    })
    public ResponseEntity<?> handleCustomErrors(Exception ex) {
        try {
            AuditType auditType;
            Map<String, Object> params;
            String errorMessage = ex.getMessage();

            if (ex instanceof UserError) {
                auditType = AuditType.ASSERT_USER;
                params = ((UserError) ex).getParams();
            } else if (ex instanceof PeerError) {
                auditType = AuditType.TEMPORARY;
                params = ((PeerError) ex).getParams();
            } else if (ex instanceof AuthorizationDeniedException) {
                auditType = AuditType.ASSERT_USER;
                params = null;
            } else if (ex instanceof ApplicationError) {
                auditType = AuditType.ASSERT;
                params = ((ApplicationError) ex).getParams();
            } else if (ex instanceof ConstraintViolationException) {
                auditType = AuditType.ASSERT_USER;
                params = null;
                errorMessage = ((ConstraintViolationException) ex)
                        .getConstraintViolations().stream()
                        .map(violation -> violation.getPropertyPath() + " - " + violation.getMessage())
                        .collect(Collectors.joining("; "));
            } else if (ex instanceof MethodArgumentNotValidException) {
                auditType = AuditType.ASSERT_USER;
                params = null;
                errorMessage = ((MethodArgumentNotValidException) ex)
                        .getBindingResult().getFieldErrors().stream()
                        .map(error -> error.getDefaultMessage())
                        .collect(Collectors.joining("; "));
            } else {
                auditType = AuditType.ASSERT;
                params = null;
                errorMessage = STATUS_INTERNAL_ERROR;
            }

            Log log = buildLogFromException(ex, params, auditType.getValue(), LOG_LEVEL_ERROR);
            loggerService.logError(log);

            CustomErrorResponse errorResponse = new CustomErrorResponse(errorMessage);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (Exception e) {
            try {
                Log log = buildLogFromException(e, null, AuditType.ASSERT.getValue(), LOG_LEVEL_ERROR);
                loggerService.logError(log);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new CustomErrorResponse("Internal error"));
            } catch (Exception e2) {
                e2.printStackTrace();
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new CustomErrorResponse("Internal error"));
            }
        }
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

