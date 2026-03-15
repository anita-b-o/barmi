package com.barmi.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@ControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> handleResponseStatus(ResponseStatusException ex) {
        String code = ex.getReason() == null ? "error" : ex.getReason();
        return buildErrorResponse(ex.getStatusCode().value(), code, "Request failed");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST.value(), "bad_request", "Bad request");
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleIllegalState(IllegalStateException ex) {
        return buildErrorResponse(HttpStatus.CONFLICT.value(), "conflict", "Conflict");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST.value(), "bad_request", "Bad request");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnhandled(Exception ex) {
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(), "internal_error", "Internal error");
    }

    private ResponseEntity<?> buildErrorResponse(int status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "error", Map.of(
                        "code", code,
                        "message", message,
                        "status", status
                )
        ));
    }
}
