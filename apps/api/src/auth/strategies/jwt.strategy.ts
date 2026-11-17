import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';
import type { UserProfile } from '@interviewai/shared-types';

/**
 * JwtStrategy — validates Bearer tokens on protected routes.
 *
 * Flow:
 * 1. Client sends: Authorization: Bearer <access_token>
 * 2. Passport extracts the token from the header.
 * 3. It verifies the signature using our JWT_SECRET.
 * 4. If valid, it calls validate() with the decoded payload.
 * 5. validate() looks up the user in the DB (to ensure they
 *    still exist and are active) and returns a UserProfile.
 * 6. That UserProfile is attached to req.user.
 *
 * Why look up the user again instead of trusting the token?
 * - The user might have been deleted or suspended after the
 *   token was issued. The token is valid for 15 minutes, but
 *   the user's status could change in that window.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'dev-secret-change-me',
      ),
    });
  }

  async validate(payload: { sub: string; type: string }): Promise<UserProfile> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return this.authService.getProfile(payload.sub);
  }
}
