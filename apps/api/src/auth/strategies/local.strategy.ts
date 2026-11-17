import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service.js';
import type { UserProfile } from '@interviewai/shared-types';

/**
 * LocalStrategy — validates email + password on login.
 *
 * How Passport strategies work:
 * 1. You extend PassportStrategy(Strategy) where Strategy is a
 *    passport plugin (here: passport-local).
 * 2. You implement validate(). Passport calls it with the
 *    credentials extracted from the request.
 * 3. If validate() returns a value, Passport attaches it to req.user.
 * 4. If validate() throws, Passport returns 401 Unauthorized.
 *
 * passport-local by default reads "username" and "password" from
 * the request body. We override usernameField to "email" so it
 * reads req.body.email instead.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<UserProfile> {
    return this.authService.validateUser(email, password);
  }
}
