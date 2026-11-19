import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard.js';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let mockReflector: Partial<Reflector>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RateLimitGuard(mockReflector as Reflector);
  });

  const createMockContext = (
    ip = '127.0.0.1',
    userId?: string,
  ): ExecutionContext => {
    const headers: Record<string, string> = {};
    const resHeaders: Record<string, string> = {};

    const req = {
      user: userId ? { id: userId } : undefined,
      headers,
      socket: { remoteAddress: ip },
    };

    const res = {
      setHeader: vi.fn((k: string, v: string) => {
        resHeaders[k] = v;
      }),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => ({ name: 'testHandler' }),
      getClass: () => ({ name: 'TestController' }),
    } as unknown as ExecutionContext;
  };

  it('should allow requests unconditionally when no @RateLimit metadata is applied', () => {
    vi.mocked(mockReflector.getAllAndOverride!).mockReturnValue(undefined);
    const ctx = createMockContext();

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow requests within the configured rate limit', () => {
    vi.mocked(mockReflector.getAllAndOverride!).mockReturnValue({
      limit: 3,
      ttlSeconds: 60,
    });
    const ctx = createMockContext('192.168.1.10');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw HTTP 429 when rate limit is exceeded', () => {
    vi.mocked(mockReflector.getAllAndOverride!).mockReturnValue({
      limit: 2,
      ttlSeconds: 60,
    });
    const ctx = createMockContext('10.0.0.5');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);

    expect(() => guard.canActivate(ctx)).toThrowError();
    try {
      guard.canActivate(ctx);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.getResponse().message).toContain('Too many requests');
    }
  });

  it('should isolate rate limits across different IP addresses', () => {
    vi.mocked(mockReflector.getAllAndOverride!).mockReturnValue({
      limit: 1,
      ttlSeconds: 60,
    });
    const ctxA = createMockContext('1.1.1.1');
    const ctxB = createMockContext('2.2.2.2');

    expect(guard.canActivate(ctxA)).toBe(true);
    expect(() => guard.canActivate(ctxA)).toThrow();

    // Client B should not be affected by Client A
    expect(guard.canActivate(ctxB)).toBe(true);
  });

  it('should set X-RateLimit-Reset header along with limit and remaining', () => {
    vi.mocked(mockReflector.getAllAndOverride!).mockReturnValue({
      limit: 5,
      ttlSeconds: 60,
    });
    const ctx = createMockContext('192.168.1.50');
    const res = ctx.switchToHttp().getResponse();

    expect(guard.canActivate(ctx)).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Reset',
      expect.any(String),
    );
  });

  it('should cleanly unbind interval timer onModuleDestroy', () => {
    guard.onModuleDestroy();
    expect(guard['hits'].size).toBe(0);
  });
});
