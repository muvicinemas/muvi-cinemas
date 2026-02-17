export interface WinstonLoggerOptions {
    logRequests?: boolean;
    logResponseBody?: boolean;
    logLevel?: LogLevel;
}
export declare enum LogLevel {
    Emergency = "emerg",
    Alert = "alert",
    Critical = "critical",
    Error = "error",
    Warning = "warning",
    Notice = "notice",
    Info = "info",
    Debug = "debug",
    OK = "ok"
}
