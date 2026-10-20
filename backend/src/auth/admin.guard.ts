import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

/**
 * Protects write endpoints (REST + GraphQL). Callers must send the
 * `x-admin-token` header matching the ADMIN_TOKEN env var.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req: Request =
      context.getType<GqlContextType>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext<{ req: Request }>().req
        : context.switchToHttp().getRequest<Request>();

    const expected = this.config.get<string>('ADMIN_TOKEN');
    if (!expected) {
      throw new UnauthorizedException('Admin access is not configured');
    }

    const provided = req.headers['x-admin-token'];
    if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid admin token');
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
