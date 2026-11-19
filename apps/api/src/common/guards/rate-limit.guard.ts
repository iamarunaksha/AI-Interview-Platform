import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  OnModuleDestroy,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from '../decorators/rate-limit.decorator.js';

interface ClientHistory {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly hits = new Map<string, ClientHistory>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly reflector: Reflector) {
    // Periodically prune stale keys every 60 seconds to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => {
      this.pruneStaleEntries();
    }, 60000);
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.hits.clear();
  }

  private pruneStaleEntries(): void {
    const now = Date.now();
    for (const [key, history] of this.hits.entries()) {
      // If all timestamps are older than 10 minutes, delete tracking key from map
      if (
        history.timestamps.length === 0 ||
        now - history.timestamps[history.timestamps.length - 1] > 600000
      ) {
        this.hits.delete(key);
      }
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    // If no @RateLimit metadata is applied, allow request through
    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const now = Date.now();
    const windowMs = options.ttlSeconds * 1000;

    // Identify client by authenticated user ID or client IP
    const clientId =
      (req as any).user?.id ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown-client';

    const handlerName = context.getHandler().name;
    const trackingKey = `${clientId}:${handlerName}`;

    let history = this.hits.get(trackingKey);
    if (!history) {
      history = { timestamps: [] };
      this.hits.set(trackingKey, history);
    }

    // Purge timestamps outside the sliding window
    history.timestamps = history.timestamps.filter((t) => now - t < windowMs);

    const currentHits = history.timestamps.length;
    const remaining = Math.max(0, options.limit - (currentHits + 1));
    const oldestHit = history.timestamps[0] || now;
    const resetTime = Math.ceil((oldestHit + windowMs) / 1000);

    // Set rate limit headers
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', options.limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
    }

    if (currentHits >= options.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestHit + windowMs - now) / 1000),
      );

      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', retryAfterSeconds.toString());
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Too many requests. Limit is ${options.limit} requests per ${options.ttlSeconds}s. Please retry in ${retryAfterSeconds}s.`,
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Record current hit
    history.timestamps.push(now);
    return true;
  }

  /**
   * Clears internal state (useful for tests)
   */
  reset(): void {
    this.hits.clear();
  }
}
