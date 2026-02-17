import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RmqContext } from '@nestjs/microservices/ctx-host/rmq.context';
import { ServerResponse } from 'http';
import { Logger } from 'winston';
import { WINSTON_LOGGER_OPTIONS_TOKEN } from './constants';
import { LogLevel, WinstonLoggerOptions } from './interfaces';
import { AppSentryService } from '../app-sentry';
import { DataDogLogMetadata } from './interfaces/dd-log-metadata.interface';

@Injectable()
export class WinstonLoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject('winston') protected readonly logger: Logger,
    protected readonly appSentryService: AppSentryService,
    @Optional()
    @Inject(WINSTON_LOGGER_OPTIONS_TOKEN)
    protected readonly options: WinstonLoggerOptions = {},
  ) {}

  private static isRMQContext(context: ExecutionContext): boolean {
    const contextType = context.getType();
    if (contextType === 'rpc') {
      const rpcContext = context.switchToRpc().getContext();
      return rpcContext instanceof RmqContext;
    }
    return false;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    try {
      const startedAt = Date.now();
      const contextType = context.getType();

      if (WinstonLoggerInterceptor.isRMQContext(context)) {
        const rmqContext = context.switchToRpc().getContext() as RmqContext;
        const message = rmqContext.getMessage();
        const headers = (message as any).properties.headers;
        headers['startedAt'] = startedAt;
      } else if (contextType === 'rpc') {
        const rpcContext = context.switchToRpc().getContext();
        rpcContext.add('started-at', startedAt.toString());
      } else {
        const request = context.switchToHttp().getRequest();
        request.startedAt = startedAt;
      }

      if (this.options?.logRequests) {
        this.logRequest(context, this.logger);
      }
    } catch (ex) {
      this.appSentryService.captureException(ex, context);
    }

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          try {
            if (
              data instanceof ServerResponse ||
              !this.options?.logResponseBody
            ) {
              this.logResponse(context, this.logger, this.options?.logLevel);
            } else {
              this.logResponse(
                context,
                this.logger,
                this.options?.logLevel || LogLevel.Info,
                data,
              );
            }
          } catch (ex) {
            this.appSentryService.captureException(ex, context);
          }
        },
        error: (_err: any) => {
          try {
            this.errorLog(context, this.logger, _err);
          } catch (ex) {
            this.appSentryService.captureException(ex, context);
          }
        },
      }),
    );
  }

  protected errorLog(
    context: ExecutionContext,
    logger: Logger,
    _err: any,
  ): void {
    this.logResponse(context, this.logger, LogLevel.Error, _err);
  }

  private logRequest(context: ExecutionContext, logger: Logger): void {
    if (WinstonLoggerInterceptor.isRMQContext(context)) {
      this.logRMQRequest(context, logger);
    } else if (context.getType() === 'rpc') {
      this.logGRPCRequest(context, logger);
    } else {
      this.logHTTPRequest(context, logger);
    }
  }

  protected logResponse(
    context: ExecutionContext,
    logger: Logger,
    level: LogLevel | string = LogLevel.Info,
    requestBody?: any,
  ): void {
    if (WinstonLoggerInterceptor.isRMQContext(context)) {
      this.logRMQResponse(context, logger, level, requestBody);
    } else if (context.getType() === 'rpc') {
      this.logGRPCResponse(context, logger, level, requestBody);
    } else {
      this.logHTTPResponse(context, logger, level, requestBody);
    }
  }

  private constructHTTPLog(context: ExecutionContext): DataDogLogMetadata {
    const request = context.switchToHttp().getRequest();
    const {
      originalUrl = '',
      method = '',
      headers,
      body,
      user: usr,
      ip,
    } = request;

    const user = usr || {};

    if (
      originalUrl.endsWith('heartbeat') ||
      method.trim().toLowerCase() === 'options'
    ) {
      return null;
    }

    return {
      timestamp: new Date().getTime(),
      duration: 0,
      http: {
        url: originalUrl,
        method,
        useragent_details: {
          device: {
            family: headers['x-device-platform'],
          },
        },
        headers,
        body: this.cleanBody(body),
      },
      usr: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      network: {
        client: { ip },
      },
    };
  }

  private logHTTPRequest(context: ExecutionContext, logger: Logger): void {
    const meta = this.constructHTTPLog(context);
    if (!meta) return;

    logger.log({
      level: LogLevel.Info + '',
      severity: (this.options?.logLevel || LogLevel.Info) + '',
      message: `<-- ${meta.http.url}`,
      ...meta,
    });
  }

  private logHTTPResponse(
    context: ExecutionContext,
    logger: Logger,
    level: LogLevel | string = LogLevel.Info,
    responseBody?: any,
  ): void {
    const { startedAt } = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const meta = this.constructHTTPLog(context);
    if (!meta) return;

    if (startedAt) {
      const responseTime = Date.now() - startedAt;
      if (!response['headersSent']) {
        response.setHeader('X-Response-Time', `${responseTime}ms`);
      }
      meta.duration = responseTime * 1000000;
    } else {
      meta.duration = 0;
    }

    if (level === LogLevel.Error && responseBody) {
      const error = responseBody;
      meta.http.status_code =
        (error || {}).statusCode || (responseBody || {}).status || 500;
      meta.responseBody = error || responseBody;
      meta.error = {
        message: responseBody.message,
        stack: responseBody.stack,
      };
    } else if (responseBody) {
      meta.responseBody = responseBody;
    }

    logger.log({
      level: LogLevel.Info + '',
      severity: level + '',
      message: `--> ${meta.http.url}`,
      ...meta,
    });
  }

  private constructGRPCLog(context: ExecutionContext): DataDogLogMetadata {
    const grpcRequest = context.switchToRpc().getContext();
    const body = context.switchToRpc().getData();
    const loggedInUser = grpcRequest.get('user')[0];
    let user: any = {};
    if (loggedInUser) {
      user = JSON.parse(loggedInUser.toString());
    }
    const originalUrl = `${context.getClass().name}.${context.getHandler().name}`;

    return {
      timestamp: new Date().getTime(),
      duration: 0,
      http: {
        url: originalUrl,
        headers: grpcRequest,
        body: this.cleanBody(body),
      },
      usr: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    };
  }

  private logGRPCRequest(context: ExecutionContext, logger: Logger): void {
    const meta = this.constructGRPCLog(context);
    logger.log({
      level: LogLevel.Info + '',
      severity: (this.options?.logLevel || LogLevel.Info) + '',
      message: `<-- ${meta.http.url}`,
      ...meta,
    });
  }

  private logGRPCResponse(
    context: ExecutionContext,
    logger: Logger,
    level: LogLevel | string = LogLevel.Info,
    responseBody?: any,
  ): void {
    const grpcRequest = context.switchToRpc().getContext();
    const startedAt = grpcRequest.get('started-at')[0];
    const meta = this.constructGRPCLog(context);

    if (startedAt) {
      const responseTime = Date.now() - Number(startedAt);
      meta.duration = responseTime * 1000000;
    } else {
      meta.duration = 0;
    }

    if (level === LogLevel.Error && responseBody) {
      meta.error = {
        code: responseBody.code,
        message: responseBody.message,
        stack: responseBody.stack,
      };
    } else if (responseBody) {
      meta.responseBody = responseBody;
    }

    logger.log({
      level: LogLevel.Info + '',
      severity: level + '',
      message: `--> ${meta.http.url}`,
      ...meta,
    });
  }

  private constructRMQLog(context: ExecutionContext): DataDogLogMetadata {
    const rmqContext = context.switchToRpc().getContext() as RmqContext;
    const message = rmqContext.getMessage();
    const messageContent = JSON.parse((message as any).content.toString());
    const originalUrl = `${context.getClass().name}.${context.getHandler().name}`;

    return {
      timestamp: new Date().getTime(),
      duration: 0,
      rmq: {
        handler: originalUrl,
        content: messageContent,
      },
    };
  }

  private logRMQRequest(context: ExecutionContext, logger: Logger): void {
    const meta = this.constructRMQLog(context);
    logger.log({
      level: LogLevel.Info + '',
      severity: (this.options?.logLevel || LogLevel.Info) + '',
      message: `<-- ${meta.rmq.handler}`,
      ...meta,
    });
  }

  private logRMQResponse(
    context: ExecutionContext,
    logger: Logger,
    level: LogLevel | string = LogLevel.Info,
    responseBody?: any,
  ): void {
    const rmqContext = context.switchToRpc().getContext() as RmqContext;
    const message = rmqContext.getMessage();
    const headers = (message as any).properties.headers;
    const meta: any = {
      ...this.constructRMQLog(context),
      duration: headers?.startedAt
        ? (Date.now() - Number(headers.startedAt)) * 1000000
        : 0,
      responseBody,
    };

    logger.log({
      level: LogLevel.Info + '',
      severity: level + '',
      message: `--> ${meta.rmq.handler}`,
      ...meta,
    });
  }

  private cleanBody(body: any): any {
    return Object.keys(body)
      .map((key) => {
        if (['pin', 'password'].includes(key)) {
          return { [key]: '***' };
        }
        return { [key]: body[key] };
      })
      .reduce((obj, curr) => Object.assign(obj, curr), {});
  }
}
