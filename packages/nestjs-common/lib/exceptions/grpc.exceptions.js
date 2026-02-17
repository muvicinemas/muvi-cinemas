"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadRequestException = exports.UnauthorizedException = exports.UnauthenticatedException = exports.ResourceNotFoundException = exports.GrpcException = exports.SERVICE_NAME = exports.CODE = exports.MESSAGE = exports.IS_GRPC_EXCEPTION = void 0;
const grpc_js_1 = require("@grpc/grpc-js");
const microservices_1 = require("@nestjs/microservices");
const constants_1 = require("@grpc/grpc-js/build/src/constants");
const error_codes_1 = require("./error-codes");
const error_messages_1 = require("./error-messages");
exports.IS_GRPC_EXCEPTION = 'grpc';
exports.MESSAGE = 'message';
exports.CODE = 'code';
exports.SERVICE_NAME = 'service';
class GrpcException extends microservices_1.RpcException {
    constructor(code, statusCode, message) {
        const service = process.env.npm_package_name;
        const metadata = GrpcException.generateExceptionMetadata(code, message, service);
        super({
            code: statusCode,
            metadata,
        });
        this.statusCode = statusCode;
        this.args = {
            code,
            message,
            isGrpcException: true,
            service,
        };
    }
    static generateExceptionMetadata(code, message, service) {
        const metadata = new grpc_js_1.Metadata();
        metadata.add(exports.CODE, code);
        metadata.add(exports.IS_GRPC_EXCEPTION, JSON.stringify(true));
        metadata.add(exports.MESSAGE, JSON.stringify(message));
        metadata.add(exports.SERVICE_NAME, service);
        return metadata;
    }
    static composeLocalizedMessage(messageText) {
        return {
            en: messageText,
        };
    }
}
exports.GrpcException = GrpcException;
class ResourceNotFoundException extends GrpcException {
    constructor(code, message) {
        const localizedMsg = message
            ? message
            : error_messages_1.ErrorMessages.GENERAL.RESOURCE_NOT_FOUND;
        super(code || error_codes_1.RESOURCE_NOT_FOUND, constants_1.Status.NOT_FOUND, localizedMsg);
    }
}
exports.ResourceNotFoundException = ResourceNotFoundException;
class UnauthenticatedException extends GrpcException {
    constructor() {
        super(error_codes_1.UNAUTHENTICATED, constants_1.Status.UNAUTHENTICATED, error_messages_1.ErrorMessages.GENERAL.UNAUTHENTICATED);
    }
}
exports.UnauthenticatedException = UnauthenticatedException;
class UnauthorizedException extends GrpcException {
    constructor() {
        super(error_codes_1.UNAUTHORIZED, constants_1.Status.PERMISSION_DENIED, error_messages_1.ErrorMessages.GENERAL.UNAUTHORIZED);
    }
}
exports.UnauthorizedException = UnauthorizedException;
class BadRequestException extends GrpcException {
    constructor(code, message) {
        const localizedMsg = message
            ? message
            : error_messages_1.ErrorMessages.GENERAL.BAD_REQUEST;
        super(code || error_codes_1.BAD_REQUEST, constants_1.Status.INVALID_ARGUMENT, localizedMsg);
    }
}
exports.BadRequestException = BadRequestException;
