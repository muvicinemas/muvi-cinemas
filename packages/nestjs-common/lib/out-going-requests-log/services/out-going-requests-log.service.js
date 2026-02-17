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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutGoingRequestsLogService = void 0;
const common_1 = require("@nestjs/common");
const interceptors_1 = require("@mswjs/interceptors");
const node_1 = require("@mswjs/interceptors/lib/presets/node");
const constants_1 = require("../constants");
const winston_1 = require("winston");
const app_sentry_1 = require("../../app-sentry");
let OutGoingRequestsLogService = class OutGoingRequestsLogService {
    constructor(options, logger, sentryService) {
        var _a, _b, _c;
        this.options = options;
        this.logger = logger;
        this.sentryService = sentryService;
        this.name = options.name || 'http-interceptor';
        this.interceptor = new interceptors_1.BatchInterceptor({
            name: this.name,
            interceptors: node_1.default,
        });
        // always filter out sentry & datadog requests
        if (!((_a = options.whiteList) === null || _a === void 0 ? void 0 : _a.length) && !((_b = options.blackList) === null || _b === void 0 ? void 0 : _b.length)) {
            options.blackList = ['datadog', 'sentry'];
        }
        else if ((_c = options.blackList) === null || _c === void 0 ? void 0 : _c.length) {
            options.blackList.push('datadog', 'sentry');
        }
    }
    onApplicationBootstrap() {
        this.interceptor.on('request', (request) => {
            if (this.shouldLog(request)) {
                request.headers.append(`X-${this.name}-Started-At`, Date.now().toString());
            }
        });
        this.interceptor.on('response', async (request, response) => {
            try {
                if (this.shouldLog(request)) {
                    this.logResponse(request, response);
                }
            }
            catch (ex) {
                this.interceptor.dispose();
                this.reportError(ex);
                setTimeout(() => this.interceptor.apply());
            }
        });
        this.interceptor.apply();
    }
    shouldLog(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return ((!((_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.whiteList) === null || _b === void 0 ? void 0 : _b.length) && !((_d = (_c = this.options) === null || _c === void 0 ? void 0 : _c.blackList) === null || _d === void 0 ? void 0 : _d.length)) ||
            (((_f = (_e = this.options) === null || _e === void 0 ? void 0 : _e.whiteList) === null || _f === void 0 ? void 0 : _f.length) &&
                request.url.host.match((_g = this.options) === null || _g === void 0 ? void 0 : _g.whiteList.join('|'))) ||
            (((_j = (_h = this.options) === null || _h === void 0 ? void 0 : _h.blackList) === null || _j === void 0 ? void 0 : _j.length) &&
                !request.url.host.match((_k = this.options) === null || _k === void 0 ? void 0 : _k.blackList.join('|'))));
    }
    reportError(error) {
        if (this.sentryService) {
            this.sentryService.captureException(error);
        }
        console.log(error);
    }
    async logResponse(request, response) {
        let logLevel = 'info';
        if (response.status >= 400) {
            logLevel = 'error';
        }
        let requestBody = {};
        if ((request.headers.get('content-type') || '').includes('json')) {
            requestBody = await request.json();
        }
        let responseBody = {};
        const responseContentType = response.headers.get('content-type') || '';
        if (responseContentType.includes('text') ||
            responseContentType.includes('json')) {
            responseBody = response.body;
        }
        const meta = {
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
};
OutGoingRequestsLogService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.OutGoingRequestsConstants.OUT_GOING_REQUESTS_MODULE_OPTIONS)),
    __param(1, (0, common_1.Inject)('winston')),
    __param(2, (0, common_1.Optional)()),
    __param(2, (0, app_sentry_1.InjectSentry)()),
    __metadata("design:paramtypes", [Object, winston_1.Logger,
        app_sentry_1.AppSentryService])
], OutGoingRequestsLogService);
exports.OutGoingRequestsLogService = OutGoingRequestsLogService;
