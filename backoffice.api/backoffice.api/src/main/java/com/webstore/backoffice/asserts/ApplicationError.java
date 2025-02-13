package com.webstore.backoffice.asserts;

import java.util.Map;

public class ApplicationError extends RuntimeException {
    private Map<String, Object> params;

    public ApplicationError(String message, Map<String, Object> params) {
        super(message);
        this.params = params;
    }

    public Map<String, Object> getParams() {
        return params;
    }
}
