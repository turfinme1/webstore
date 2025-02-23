package com.webstore.backoffice.asserts.dtos;

public class CustomErrorResponse {

    private String error;

    public CustomErrorResponse(String error) {
        this.error = error;
    }

    // Getters and setters
    public String getError() {
        return error;
    }
    public void setError(String error) {
        this.error = error;
    }
}
