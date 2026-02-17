"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AppSentryModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSentryModule = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("./constants");
const Sentry = require("@sentry/node");
const app_sentry_service_1 = require("./services/app-sentry.service");
let AppSentryModule = AppSentryModule_1 = class AppSentryModule {
    static register(options) {
        Sentry.init(options);
        return {
            module: AppSentryModule_1,
            providers: [
                {
                    provide: constants_1.AppSentryConstants.APP_SENTRY_MODULE_OPTIONS,
                    useValue: options,
                },
                {
                    provide: constants_1.AppSentryConstants.APP_SENTRY_INSTANCE_TOKEN,
                    useValue: Sentry,
                },
                app_sentry_service_1.AppSentryService,
            ],
            exports: [app_sentry_service_1.AppSentryService],
        };
    }
    static registerAsync(options) {
        return {
            module: AppSentryModule_1,
            imports: options.imports,
            providers: [
                ...this.createAsyncProviders(options),
                app_sentry_service_1.AppSentryService,
                {
                    provide: constants_1.AppSentryConstants.APP_SENTRY_INSTANCE_TOKEN,
                    useFactory: (appSentryOptions) => {
                        Sentry.init(appSentryOptions);
                        return Sentry;
                    },
                    inject: [constants_1.AppSentryConstants.APP_SENTRY_MODULE_OPTIONS],
                },
                ...(options.extraProviders || []),
            ],
            exports: [app_sentry_service_1.AppSentryService],
        };
    }
    static createAsyncProviders(options) {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }
        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: options.useClass,
                useClass: options.useClass,
            },
        ];
    }
    static createAsyncOptionsProvider(options) {
        if (options.useFactory) {
            return {
                provide: constants_1.AppSentryConstants.APP_SENTRY_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }
        return {
            provide: constants_1.AppSentryConstants.APP_SENTRY_MODULE_OPTIONS,
            useFactory: async (optionsFactory) => optionsFactory.createAppSentryModuleOptions(),
            inject: [options.useExisting || options.useClass],
        };
    }
};
AppSentryModule = AppSentryModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], AppSentryModule);
exports.AppSentryModule = AppSentryModule;
