import { Inject, Injectable, ArgumentsHost } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AppSentryConstants } from '../constants';
import { AppSentryOptions } from '../types/app-sentry-options';

@Injectable()
export class AppSentryService {
  constructor(
    @Inject(AppSentryConstants.APP_SENTRY_INSTANCE_TOKEN)
    private readonly sentryInstance: typeof Sentry,
    @Inject(AppSentryConstants.APP_SENTRY_MODULE_OPTIONS)
    private readonly options: AppSentryOptions,
  ) {}

  captureException(exception: any, host?: ArgumentsHost): void {
    this.sentryInstance.withScope((scope) =>
      this.captureHttpException(
        scope,
        host ? host.switchToHttp() : null,
        exception,
      ),
    );
  }

  captureEvent(event: Sentry.Event): void {
    this.sentryInstance.withScope((scope) =>
      this.captureSentryEvent(scope, event),
    );
  }

  private captureSentryEvent(scope: Sentry.Scope, event: Sentry.Event): void {
    // try to parse Request if it was supplied to the event
    this.enrichSentryEvent(scope, (event as any).request);
    this.sentryInstance.captureEvent(event);
  }

  private captureHttpException(
    scope: Sentry.Scope,
    http: any,
    exception: any,
  ): void {
    this.enrichSentryEvent(scope, http ? http.getRequest() : null);
    this.sentryInstance.captureException(exception);
  }

  private enrichSentryEvent(scope: Sentry.Scope, request: any): void {
    if (request) {
      const data = Sentry.Handlers.parseRequest({}, request, {
        request: true,
        user: true,
      });
      scope.setExtra('req', data.request);
      scope.setExtras(data.extra);
      if (data.user) {
        scope.setUser(data.user);
      }
    }
    if (this.options.tags) {
      scope.setTags(this.options.tags);
    }
  }
}
