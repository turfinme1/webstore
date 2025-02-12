package com.webstore.backoffice.asserts;

public class LogData {
    private final String code;
    private final String shortDescription;
    private final String longDescription;
    private final String debugInfo;
    private final String logLevel;
    private final String auditType;

    public LogData(String code,
                   String shortDescription,
                   String longDescription,
                   String debugInfo,
                   String logLevel,
                   String auditType) {
        this.code = code;
        this.shortDescription = shortDescription;
        this.longDescription = longDescription;
        this.debugInfo = debugInfo;
        this.logLevel = logLevel;
        this.auditType = auditType;
    }
}
