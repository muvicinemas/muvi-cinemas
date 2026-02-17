"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OutGoingRequestsLogModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutGoingRequestsLogModule = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("./constants");
const services_1 = require("./services");
let OutGoingRequestsLogModule = OutGoingRequestsLogModule_1 = class OutGoingRequestsLogModule {
    static register(options = {}) {
        return {
            module: OutGoingRequestsLogModule_1,
            providers: [
                {
                    provide: constants_1.OutGoingRequestsConstants.OUT_GOING_REQUESTS_MODULE_OPTIONS,
                    useValue: options,
                },
                services_1.OutGoingRequestsLogService,
            ],
            exports: [],
        };
    }
    static registerAsync(options = {}) {
        return {
            module: OutGoingRequestsLogModule_1,
            imports: options.imports,
            providers: [
                ...this.createAsyncProviders(options),
                services_1.OutGoingRequestsLogService,
                ...(options.extraProviders || []),
            ],
            exports: [],
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
                provide: constants_1.OutGoingRequestsConstants.OUT_GOING_REQUESTS_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }
        return {
            provide: constants_1.OutGoingRequestsConstants.OUT_GOING_REQUESTS_MODULE_OPTIONS,
            useFactory: async (optionsFactory) => optionsFactory.createOutGoingRequestsLogModuleOptions(),
            inject: [options.useExisting || options.useClass],
        };
    }
};
OutGoingRequestsLogModule = OutGoingRequestsLogModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], OutGoingRequestsLogModule);
exports.OutGoingRequestsLogModule = OutGoingRequestsLogModule;
