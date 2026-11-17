import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects routes by requiring a valid JWT.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('me')
 *   getProfile(@Req() req: Request) { return req.user; }
 *
 * When this guard is applied to a route:
 * 1. Passport extracts the JWT from the Authorization header.
 * 2. The JwtStrategy validates it.
 * 3. If valid: req.user is populated, the route handler runs.
 * 4. If invalid/missing: NestJS returns 401 Unauthorized.
 *
 * We extend AuthGuard('jwt') to get this behavior automatically.
 * The string 'jwt' matches the default name of passport-jwt's
 * Strategy class.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
