import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse<{ statusCode: number }>();
        const statusCode = response.statusCode;

        let message = 'Success';
        if (statusCode === 201) {
          message = 'Created successfully';
        } else if (statusCode === 204) {
          message = 'Deleted successfully';
        }

        // Allow controllers to pass a custom message
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof (data as Record<string, unknown>).message === 'string'
        ) {
          const dataWithMessage = data as Record<string, unknown>;
          message = dataWithMessage.message as string;

          // Remove message from data if it was only used for the wrapper
          if ('result' in dataWithMessage) {
            return {
              success: true,
              data: dataWithMessage.result as T,
              message,
              timestamp: new Date().toISOString(),
            };
          }
        }

        return {
          success: true,
          data,
          message,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
