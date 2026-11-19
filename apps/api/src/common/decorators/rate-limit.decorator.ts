import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  /** Time window in seconds */
  ttlSeconds: number;
  /** Maximum number of requests allowed in the time window */
  limit: number;
}

/**
 * Decorator to apply rate limiting to a controller route.
 *
 * Example:
 * @RateLimit({ ttlSeconds: 60, limit: 10 })
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
