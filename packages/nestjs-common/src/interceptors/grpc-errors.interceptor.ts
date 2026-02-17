import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { RpcException } from '@nestjs/microservices';
import { UNHANDELED } from '../exceptions/error-codes';
import { GrpcException } from '../exceptions/grpc.exceptions';

@Injectable()
export class GrpcErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        console.log('err', err);
        if (err instanceof RpcException) {
          return throwError(() => err);
        }

        const message = GrpcException.composeLocalizedMessage('Unkown Error');
        const service = process.env.npm_package_name;
        const generatedMetadata = GrpcException.generateExceptionMetadata(
          UNHANDELED,
          message,
          service,
        );

        let metadata = err.metadata || err?.error?.metadata;
        let code = err.code || err?.error?.code;

        if (!metadata) {
          metadata = generatedMetadata;
          code = Status.UNKNOWN;
        }

        return throwError(() => {
          return new RpcException({ code, metadata });
        });
      }),
    );
  }
}
