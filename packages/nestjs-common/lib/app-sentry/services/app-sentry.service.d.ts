import { ArgumentsHost } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AppSentryOptions } from '../types/app-sentry-options';
export declare class AppSentryService {
    private readonly sentryInstance;
    private readonly options;
    constructor(sentryInstance: typeof Sentry, options: AppSentryOptions);
    captureException(exception: any, host?: ArgumentsHost): void;
    captureEvent(event: Sentry.Event): void;
    private captureSentryEvent;
    private captureHttpException;
    private enrichSentryEvent;
}
