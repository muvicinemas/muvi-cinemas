"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var VistaModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VistaModule = void 0;
const common_1 = require("@nestjs/common");
const vista_service_1 = require("./vista.service");
const constants_1 = require("./constants");
let VistaModule = VistaModule_1 = class VistaModule {
    static forRoot(options) {
        const providers = [
            {
                provide: constants_1.VISTA_OPTIONS,
                useValue: options,
            },
        ];
        return {
            module: VistaModule_1,
            providers,
            exports: providers,
        };
    }
    static forRootAsync(options) {
        const providers = [
            {
                provide: constants_1.VISTA_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            },
        ];
        return {
            module: VistaModule_1,
            imports: options.imports || [],
            providers,
            exports: providers,
        };
    }
};
exports.VistaModule = VistaModule;
exports.VistaModule = VistaModule = VistaModule_1 = __decorate([
    (0, common_1.Module)({
        exports: [vista_service_1.VistaService],
        imports: [],
        providers: [vista_service_1.VistaService],
    })
], VistaModule);
//# sourceMappingURL=vista.module.js.map