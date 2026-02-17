import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Logger } from 'winston';
import { LogLevel, WinstonLoggerOptions } from './interfaces';
import { AppSentryService } from '../app-sentry';
export declare class WinstonLoggerInterceptor implements NestInterceptor {
    protected readonly logger: Logger;
    protected readonly appSentryService: AppSentryService;
    protected readonly options: WinstonLoggerOptions;
    constructor(logger: Logger, appSentryService: AppSentryService, options?: WinstonLoggerOptions);
    private static isRMQContext;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    protected errorLog(context: ExecutionContext, logger: Logger, _err: any): void;
    private logRequest;
    protected logResponse(context: ExecutionContext, logger: Logger, level?: LogLevel | string, requestBody?: any): void;
    private constructHTTPLog;
    private logHTTPRequest;
    private logHTTPResponse;
    private constructGRPCLog;
    private logGRPCRequest;
    private logGRPCResponse;
    private constructRMQLog;
    private logRMQRequest;
    private logRMQResponse;
    private cleanBody;
}
