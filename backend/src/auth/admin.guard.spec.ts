import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from './admin.guard';

function httpContext(headers: Record<string, string>): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

function guardWithToken(token?: string) {
  return new AdminGuard({ get: () => token } as unknown as ConfigService);
}

describe('AdminGuard', () => {
  it('allows a request with the correct token', () => {
    const guard = guardWithToken('secret');
    expect(guard.canActivate(httpContext({ 'x-admin-token': 'secret' }))).toBe(
      true,
    );
  });

  it('rejects a wrong or missing token', () => {
    const guard = guardWithToken('secret');
    expect(() =>
      guard.canActivate(httpContext({ 'x-admin-token': 'nope' })),
    ).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(httpContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects everything when ADMIN_TOKEN is not set', () => {
    const guard = guardWithToken(undefined);
    expect(() =>
      guard.canActivate(httpContext({ 'x-admin-token': '' })),
    ).toThrow(UnauthorizedException);
  });
});
