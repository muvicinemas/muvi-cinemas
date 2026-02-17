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
exports.AppSentryService = void 0;
const common_1 = require("@nestjs/common");
const Sentry = require("@sentry/node");
const constants_1 = require("../constants");
let AppSentryService = class AppSentryService {
    constructor(sentryInstance, options) {
        this.sentryInstance = sentryInstance;
        this.options = options;
    }
    captureException(exception, host) {
        this.sentryInstance.withScope((scope) => this.captureHttpException(scope, host ? host.switchToHttp() : null, exception));
    }
    captureEvent(event) {
        this.sentryInstance.withScope((scope) => this.captureSentryEvent(scope, event));
    }
    captureSentryEvent(scope, event) {
        // try to parse Request if it was supplied to the event
        this.enrichSentryEvent(scope, event.request);
        this.sentryInstance.captureEvent(event);
    }
    captureHttpException(scope, http, exception) {
        this.enrichSentryEvent(scope, http ? http.getRequest() : null);
        this.sentryInstance.captureException(exception);
    }
    enrichSentryEvent(scope, request) {
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
};
AppSentryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.AppSentryConstants.APP_SENTRY_INSTANCE_TOKEN)),
    __param(1, (0, common_1.Inject)(constants_1.AppSentryConstants.APP_SENTRY_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object, Object])
], AppSentryService);
exports.AppSentryService = AppSentryService;
