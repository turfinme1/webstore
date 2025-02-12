package com.webstore.backoffice.asserts;

public class ApplicationError extends RuntimeException {
    private final Object[] params;

    public ApplicationError(String message, Object... params) {
        super(message);
        this.params = params;
    }

    public Object[] getParams() {
        return params;
    }
}
