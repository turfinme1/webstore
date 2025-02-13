package com.webstore.backoffice.asserts;

import java.util.Map;

public class AssertUtil {

    public static void ASSERT(boolean condition, String message, Map<String, Object> params) {
        if (!condition) {
            throw new ApplicationError(message, params);
        }
    }

    public static void ASSERT_USER(boolean condition, String message, Map<String, Object> params) {
        if (!condition) {
            throw new UserError(message, params);
        }
    }

    public static void ASSERT_PEER(boolean condition, String message, Map<String, Object> params) {
        if (!condition) {
            throw new PeerError(message, params);
        }
    }
}
