package com.webstore.backoffice.asserts;

public class AssertUtils {
    public static void ASSERT(boolean condition, String message, Object... params) {
        if (!condition) {
            throw new ApplicationError(message, params);
        }
    }

    public static void ASSERT_USER(boolean condition, String message, Object... params) {
        if (!condition) {
            throw new UserError(message, params);
        }
    }

    public static void ASSERT_PEER(boolean condition, String message, Object... params) {
        if (!condition) {
            throw new PeerError(message, params);
        }
    }
}
