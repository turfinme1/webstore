package com.webstore.backoffice.asserts.configurations;

import java.util.Map;

public class PeerError extends RuntimeException {
    private Map<String, Object> params;

    public PeerError(String message, Map<String, Object> params) {
        super(message);
        this.params = params;
    }

    public Map<String, Object> getParams() {
        return params;
    }
}
