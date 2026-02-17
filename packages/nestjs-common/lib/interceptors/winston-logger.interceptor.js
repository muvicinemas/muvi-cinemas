"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WinstonLoggerInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinstonLoggerInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const rmq_context_1 = require("@nestjs/microservices/ctx-host/rmq.context");
const http_1 = require("http");
const winston_1 = require("winston");
const constants_1 = require("./constants");
const interfaces_1 = require("./interfaces");
const app_sentry_1 = require("../app-sentry");
let WinstonLoggerInterceptor = WinstonLoggerInterceptor_1 = class WinstonLoggerInterceptor {
    constructor(logger, appSentryService, options = {}) {
        this.logger = logger;
        this.appSentryService = appSentryService;
        this.options = options;
    }
    static isRMQContext(context) {
        const contextType = context.getType();
        if (contextType === 'rpc') {
            const rpcContext = context.switchToRpc().getContext();
            return rpcContext instanceof rmq_context_1.RmqContext;
        }
        return false;
    }
    intercept(context, next) {
        var _a;
        try {
            const startedAt = Date.now();
            const contextType = context.getType();
            if (WinstonLoggerInterceptor_1.isRMQContext(context)) {
                const rmqContext = context.switchToRpc().getContext();
                const message = rmqContext.getMessage();
                const headers = message.properties.headers;
                headers['startedAt'] = startedAt;
            }
            else if (contextType === 'rpc') {
                const rpcContext = context.switchToRpc().getContext();
                rpcContext.add('started-at', startedAt.toString());
            }
            else {
                const request = context.switchToHttp().getRequest();
                request.startedAt = startedAt;
            }
            if ((_a = this.options) === null || _a === void 0 ? void 0 : _a.logRequests) {
                this.logRequest(context, this.logger);
            }
        }
        catch (ex) {
            this.appSentryService.captureException(ex, context);
        }
        return next.handle().pipe((0, operators_1.tap)({
            next: (data) => {
                var _a, _b, _c;
                try {
                    if (data instanceof http_1.ServerResponse ||
                        !((_a = this.options) === null || _a === void 0 ? void 0 : _a.logResponseBody)) {
                        this.logResponse(context, this.logger, (_b = this.options) === null || _b === void 0 ? void 0 : _b.logLevel);
                    }
                    else {
                        this.logResponse(context, this.logger, ((_c = this.options) === null || _c === void 0 ? void 0 : _c.logLevel) || interfaces_1.LogLevel.Info, data);
                    }
                }
                catch (ex) {
                    this.appSentryService.captureException(ex, context);
                }
            },
            error: (_err) => {
                try {
                    this.errorLog(context, this.logger, _err);
                }
                catch (ex) {
                    this.appSentryService.captureException(ex, context);
                }
            },
        }));
    }
    errorLog(context, logger, _err) {
        this.logResponse(context, this.logger, interfaces_1.LogLevel.Error, _err);
    }
    logRequest(context, logger) {
        if (WinstonLoggerInterceptor_1.isRMQContext(context)) {
            this.logRMQRequest(context, logger);
        }
        else if (context.getType() === 'rpc') {
            this.logGRPCRequest(context, logger);
        }
        else {
            this.logHTTPRequest(context, logger);
        }
    }
    logResponse(context, logger, level = interfaces_1.LogLevel.Info, requestBody) {
        if (WinstonLoggerInterceptor_1.isRMQContext(context)) {
            this.logRMQResponse(context, logger, level, requestBody);
        }
        else if (context.getType() === 'rpc') {
            this.logGRPCResponse(context, logger, level, requestBody);
        }
        else {
            this.logHTTPResponse(context, logger, level, requestBody);
        }
    }
    constructHTTPLog(context) {
        const request = context.switchToHttp().getRequest();
        const { originalUrl = '', method = '', headers, body, user: usr, ip, } = request;
        const user = usr || {};
        if (originalUrl.endsWith('heartbeat') ||
            method.trim().toLowerCase() === 'options') {
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
    logHTTPRequest(context, logger) {
        var _a;
        const meta = this.constructHTTPLog(context);
        if (!meta)
            return;
        logger.log(Object.assign({ level: interfaces_1.LogLevel.Info + '', severity: (((_a = this.options) === null || _a === void 0 ? void 0 : _a.logLevel) || interfaces_1.LogLevel.Info) + '', message: `<-- ${meta.http.url}` }, meta));
    }
    logHTTPResponse(context, logger, level = interfaces_1.LogLevel.Info, responseBody) {
        const { startedAt } = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const meta = this.constructHTTPLog(context);
        if (!meta)
            return;
        if (startedAt) {
            const responseTime = Date.now() - startedAt;
            if (!response['headersSent']) {
                response.setHeader('X-Response-Time', `${responseTime}ms`);
            }
            meta.duration = responseTime * 1000000;
        }
        else {
            meta.duration = 0;
        }
        if (level === interfaces_1.LogLevel.Error && responseBody) {
            const error = responseBody;
            meta.http.status_code =
                (error || {}).statusCode || (responseBody || {}).status || 500;
            meta.responseBody = error || responseBody;
            meta.error = {
                message: responseBody.message,
                stack: responseBody.stack,
            };
        }
        else if (responseBody) {
            meta.responseBody = responseBody;
        }
        logger.log(Object.assign({ level: interfaces_1.LogLevel.Info + '', severity: level + '', message: `--> ${meta.http.url}` }, meta));
    }
    constructGRPCLog(context) {
        const grpcRequest = context.switchToRpc().getContext();
        const body = context.switchToRpc().getData();
        const loggedInUser = grpcRequest.get('user')[0];
        let user = {};
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
    logGRPCRequest(context, logger) {
        var _a;
        const meta = this.constructGRPCLog(context);
        logger.log(Object.assign({ level: interfaces_1.LogLevel.Info + '', severity: (((_a = this.options) === null || _a === void 0 ? void 0 : _a.logLevel) || interfaces_1.LogLevel.Info) + '', message: `<-- ${meta.http.url}` }, meta));
    }
    logGRPCResponse(context, logger, level = interfaces_1.LogLevel.Info, responseBody) {
        const grpcRequest = context.switchToRpc().getContext();
        const startedAt = grpcRequest.get('started-at')[0];
        const meta = this.constructGRPCLog(context);
        if (startedAt) {
            const responseTime = Date.now() - Number(startedAt);
            meta.duration = responseTime * 1000000;
        }
        else {
            meta.duration = 0;
        }
        if (level === interfaces_1.LogLevel.Error && responseBody) {
            meta.error = {
                code: responseBody.code,
                message: responseBody.message,
                stack: responseBody.stack,
            };
        }
        else if (responseBody) {
            meta.responseBody = responseBody;
        }
        logger.log(Object.assign({ level: interfaces_1.LogLevel.Info + '', severity: level + '', message: `--> ${meta.http.url}` }, meta));
    }
    constructRMQLog(context) {
        const rmqContext = context.switchToRpc().getContext();
        const message = rmqContext.getMessage();
        const messageContent = JSON.parse(message.content.toString());
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
    logRMQRequest(context, logger) {
        var _a;
        const meta = this.constructRMQLog(context);
        logger.log(Object.assign({ level: interfaces_1.LogLevel.Info + '', severity: (((_a = this.options) === null || _a === void 0 ? void 0 : _a.logLevel) || interfaces_1.LogLevel.Info) + '', message: `<-- ${meta.rmq.handler}` }, meta));
    }
    logRMQResponse(context, logger, level = interfaces_1.LogLevel.Info, responseBody) {
        const rmqContext = context.switchToRpc().getContext();
        const message = rmqContext.getMessage();
        const headers = message.properties.headers;
        const meta = Object.assign(Object.assign({}, this.constructRMQLog(context)), { duration: (headers === null || headers === void 0 ? void 0 : headers.startedAt)
                ? (Date.now() - Number(headers.startedAt)) * 1000000
                : 0, responseBody });
        logger.log(Object.assign({ level: interfaces_1.LogLevel.Info + '', severity: level + '', message: `--> ${meta.rmq.handler}` }, meta));
    }
    cleanBody(body) {
        return Object.keys(body)
            .map((key) => {
            if (['pin', 'password'].includes(key)) {
                return { [key]: '***' };
            }
            return { [key]: body[key] };
        })
            .reduce((obj, curr) => Object.assign(obj, curr), {});
    }
};
WinstonLoggerInterceptor = WinstonLoggerInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('winston')),
    __param(2, (0, common_1.Optional)()),
    __param(2, (0, common_1.Inject)(constants_1.WINSTON_LOGGER_OPTIONS_TOKEN)),
    __metadata("design:paramtypes", [winston_1.Logger,
        app_sentry_1.AppSentryService, Object])
], WinstonLoggerInterceptor);
exports.WinstonLoggerInterceptor = WinstonLoggerInterceptor;
