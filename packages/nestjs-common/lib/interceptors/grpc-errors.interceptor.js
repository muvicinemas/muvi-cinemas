"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrpcErrorsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("@grpc/grpc-js/build/src/constants");
const microservices_1 = require("@nestjs/microservices");
const error_codes_1 = require("../exceptions/error-codes");
const grpc_exceptions_1 = require("../exceptions/grpc.exceptions");
let GrpcErrorsInterceptor = class GrpcErrorsInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.catchError)((err) => {
            var _a, _b;
            console.log('err', err);
            if (err instanceof microservices_1.RpcException) {
                return (0, rxjs_1.throwError)(() => err);
            }
            const message = grpc_exceptions_1.GrpcException.composeLocalizedMessage('Unkown Error');
            const service = process.env.npm_package_name;
            const generatedMetadata = grpc_exceptions_1.GrpcException.generateExceptionMetadata(error_codes_1.UNHANDELED, message, service);
            let metadata = err.metadata || ((_a = err === null || err === void 0 ? void 0 : err.error) === null || _a === void 0 ? void 0 : _a.metadata);
            let code = err.code || ((_b = err === null || err === void 0 ? void 0 : err.error) === null || _b === void 0 ? void 0 : _b.code);
            if (!metadata) {
                metadata = generatedMetadata;
                code = constants_1.Status.UNKNOWN;
            }
            return (0, rxjs_1.throwError)(() => {
                return new microservices_1.RpcException({ code, metadata });
            });
        }));
    }
};
GrpcErrorsInterceptor = __decorate([
    (0, common_1.Injectable)()
], GrpcErrorsInterceptor);
exports.GrpcErrorsInterceptor = GrpcErrorsInterceptor;
