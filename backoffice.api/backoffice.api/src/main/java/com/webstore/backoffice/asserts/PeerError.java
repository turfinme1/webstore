package com.webstore.backoffice.asserts;

public class PeerError extends RuntimeException {
    private final Object[] params;

    public PeerError(String message, Object... params) {
        super(message);
        this.params = params;
    }

    public Object[] getParams() {
        return params;
    }
}
