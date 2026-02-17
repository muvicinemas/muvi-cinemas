import { OnApplicationBootstrap } from '@nestjs/common';
import { OutGoingRequestsLogOptions } from '../interfaces';
import { Logger } from 'winston';
import { AppSentryService } from '../../app-sentry';
export declare class OutGoingRequestsLogService implements OnApplicationBootstrap {
    private readonly options;
    private readonly logger;
    private readonly sentryService;
    private readonly name;
    private interceptor;
    constructor(options: OutGoingRequestsLogOptions, logger: Logger, sentryService: AppSentryService);
    onApplicationBootstrap(): any;
    private shouldLog;
    private reportError;
    private logResponse;
}
