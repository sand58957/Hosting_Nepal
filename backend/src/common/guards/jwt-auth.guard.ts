import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err) {
      this.logger.warn(`Authentication error: ${err.message}`);
      throw new UnauthorizedException('Authentication failed');
    }

    if (!user) {
      const message = info?.message || 'No authentication token provided';
      this.logger.warn(`Unauthorized access attempt: ${message}`);
      throw new UnauthorizedException(
        message === 'jwt expired'
          ? 'Token has expired'
          : message === 'No auth token'
            ? 'No authentication token provided'
            : 'Invalid authentication token',
      );
    }

    return user;
  }
}
