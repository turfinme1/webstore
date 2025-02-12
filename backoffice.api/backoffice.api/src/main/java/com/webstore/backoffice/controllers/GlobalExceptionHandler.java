package com.webstore.backoffice.controllers;

import com.webstore.backoffice.asserts.ApplicationError;
import com.webstore.backoffice.asserts.PeerError;
import com.webstore.backoffice.asserts.UserError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserError.class)
    public ResponseEntity<ErrorResponse> handleUserError(UserError ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), ex.getParams());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ApplicationError.class)
    public ResponseEntity<ErrorResponse> handleApplicationError(ApplicationError ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), ex.getParams());
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(PeerError.class)
    public ResponseEntity<ErrorResponse> handlePeerError(PeerError ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), ex.getParams());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}

