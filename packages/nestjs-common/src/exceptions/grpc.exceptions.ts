import { Metadata } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { Status } from '@grpc/grpc-js/build/src/constants';
import {
  BAD_REQUEST,
  RESOURCE_NOT_FOUND,
  UNAUTHENTICATED,
  UNAUTHORIZED,
} from './error-codes';
import { ErrorMessages } from './error-messages';

export const IS_GRPC_EXCEPTION = 'grpc';
export const MESSAGE = 'message';
export const CODE = 'code';
export const SERVICE_NAME = 'service';

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

export class GrpcException extends RpcException {
  statusCode: number;
  args: GrpcExceptionArguments;

  constructor(
    code: string,
    statusCode: Status,
    message: localizedMessage,
  ) {
    const service = process.env.npm_package_name;
    const metadata = GrpcException.generateExceptionMetadata(
      code,
      message,
      service,
    );
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

  static generateExceptionMetadata(
    code: string,
    message: localizedMessage,
    service: string,
  ): Metadata {
    const metadata = new Metadata();
    metadata.add(CODE, code);
    metadata.add(IS_GRPC_EXCEPTION, JSON.stringify(true));
    metadata.add(MESSAGE, JSON.stringify(message));
    metadata.add(SERVICE_NAME, service);
    return metadata;
  }

  static composeLocalizedMessage(messageText: string): localizedMessage {
    return {
      en: messageText,
    };
  }
}

export class ResourceNotFoundException extends GrpcException {
  constructor(code?: string, message?: localizedMessage) {
    const localizedMsg = message
      ? message
      : ErrorMessages.GENERAL.RESOURCE_NOT_FOUND;
    super(
      code || RESOURCE_NOT_FOUND,
      Status.NOT_FOUND,
      localizedMsg,
    );
  }
}

export class UnauthenticatedException extends GrpcException {
  constructor() {
    super(
      UNAUTHENTICATED,
      Status.UNAUTHENTICATED,
      ErrorMessages.GENERAL.UNAUTHENTICATED,
    );
  }
}

export class UnauthorizedException extends GrpcException {
  constructor() {
    super(
      UNAUTHORIZED,
      Status.PERMISSION_DENIED,
      ErrorMessages.GENERAL.UNAUTHORIZED,
    );
  }
}

export class BadRequestException extends GrpcException {
  constructor(code?: string, message?: localizedMessage) {
    const localizedMsg = message
      ? message
      : ErrorMessages.GENERAL.BAD_REQUEST;
    super(
      code || BAD_REQUEST,
      Status.INVALID_ARGUMENT,
      localizedMsg,
    );
  }
}
