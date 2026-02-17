import { Metadata } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { Status } from '@grpc/grpc-js/build/src/constants';
export declare const IS_GRPC_EXCEPTION = "grpc";
export declare const MESSAGE = "message";
export declare const CODE = "code";
export declare const SERVICE_NAME = "service";
export type availableLanguages = 'en';
export type localizedMessage = {
    [key in availableLanguages]: string;
};
export interface GrpcExceptionArguments {
    code: string;
    message: localizedMessage;
    isGrpcException: boolean;
    service?: string;
}
export declare class GrpcException extends RpcException {
    statusCode: number;
    args: GrpcExceptionArguments;
    constructor(code: string, statusCode: Status, message: localizedMessage);
    static generateExceptionMetadata(code: string, message: localizedMessage, service: string): Metadata;
    static composeLocalizedMessage(messageText: string): localizedMessage;
}
export declare class ResourceNotFoundException extends GrpcException {
    constructor(code?: string, message?: localizedMessage);
}
export declare class UnauthenticatedException extends GrpcException {
    constructor();
}
export declare class UnauthorizedException extends GrpcException {
    constructor();
}
export declare class BadRequestException extends GrpcException {
    constructor(code?: string, message?: localizedMessage);
}
