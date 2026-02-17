import { Inject, Injectable, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { BatchInterceptor } from '@mswjs/interceptors';
import nodeInterceptors from '@mswjs/interceptors/lib/presets/node';
import { OutGoingRequestsConstants } from '../constants';
import { OutGoingRequestsLogOptions } from '../interfaces';
import { Logger } from 'winston';
import { AppSentryService, InjectSentry } from '../../app-sentry';

@Injectable()
export class OutGoingRequestsLogService implements OnApplicationBootstrap {
  private readonly name: string;
  private interceptor: any;

  constructor(
    @Inject(OutGoingRequestsConstants.OUT_GOING_REQUESTS_MODULE_OPTIONS)
    private readonly options: OutGoingRequestsLogOptions,
    @Inject('winston') private readonly logger: Logger,
    @Optional() @InjectSentry() private readonly sentryService: AppSentryService,
  ) {
    this.name = options.name || 'http-interceptor';
    this.interceptor = new BatchInterceptor({
      name: this.name,
      interceptors: nodeInterceptors,
    });

    // always filter out sentry & datadog requests
    if (!options.whiteList?.length && !options.blackList?.length) {
      (options as any).blackList = ['datadog', 'sentry'];
    } else if (options.blackList?.length) {
      options.blackList.push('datadog', 'sentry');
    }
  }

  onApplicationBootstrap(): any {
    this.interceptor.on('request', (request: any) => {
      if (this.shouldLog(request)) {
        request.headers.append(
          `X-${this.name}-Started-At`,
          Date.now().toString(),
        );
      }
    });

    this.interceptor.on('response', async (request: any, response: any) => {
      try {
        if (this.shouldLog(request)) {
          this.logResponse(request, response);
        }
      } catch (ex) {
        this.interceptor.dispose();
        this.reportError(ex);
        setTimeout(() => this.interceptor.apply());
      }
    });

    this.interceptor.apply();
  }

  private shouldLog(request: any): boolean {
    return (
      (!this.options?.whiteList?.length && !this.options?.blackList?.length) ||
      (this.options?.whiteList?.length &&
        request.url.host.match(this.options?.whiteList.join('|'))) ||
      (this.options?.blackList?.length &&
        !request.url.host.match(this.options?.blackList.join('|')))
    );
  }

  private reportError(error: any): void {
    if (this.sentryService) {
      this.sentryService.captureException(error);
    }
    console.log(error);
  }

  private async logResponse(request: any, response: any): Promise<void> {
    let logLevel = 'info';
    if (response.status >= 400) {
      logLevel = 'error';
    }

    let requestBody: any = {};
    if ((request.headers.get('content-type') || '').includes('json')) {
      requestBody = await request.json();
    }

    let responseBody: any = {};
    const responseContentType = response.headers.get('content-type') || '';
    if (
      responseContentType.includes('text') ||
      responseContentType.includes('json')
    ) {
      responseBody = response.body;
    }

    const meta: any = {
      timestamp: new Date().getTime(),
      duration: 0,
      http: {
        url: request.url.href,
        status_code: response.status,
        method: request.method,
        headers: request.headers.all(),
        body: requestBody,
      },
      responseBody,
      responseHeaders: response.headers.all(),
    };

    const startedAt = request.headers.get(`X-${this.name}-Started-At`);
    if (startedAt) {
      const responseTime = Date.now() - Number(startedAt);
      meta.duration = responseTime * 1000000;
    }

    this.logger.log(logLevel, request.url.toString(), meta);
  }
}
