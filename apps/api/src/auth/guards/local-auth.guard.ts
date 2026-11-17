import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * LocalAuthGuard — triggers email+password validation on login.
 *
 * Applied to the POST /auth/login endpoint. Runs the LocalStrategy
 * which checks email+password via AuthService.validateUser().
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
