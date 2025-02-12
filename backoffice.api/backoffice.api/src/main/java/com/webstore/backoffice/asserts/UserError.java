package com.webstore.backoffice.asserts;

public class UserError extends RuntimeException {
    private final Object[] params;

    public UserError(String message, Object... params) {
        super(message);
        this.params = params;
    }

    public Object[] getParams() {
        return params;
    }
}
