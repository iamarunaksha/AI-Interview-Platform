import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import type { AuthResponse, UserProfile } from '@interviewai/shared-types';

/**
 * AuthController — handles registration, login, token refresh, and profile.
 *
 * Route prefix: /auth (combined with the global /api prefix → /api/auth)
 *
 * Flow summary:
 * - POST /api/auth/register — create account, return tokens
 * - POST /api/auth/login — validate credentials, return tokens
 * - POST /api/auth/refresh — exchange refresh token for new access token
 * - GET  /api/auth/me — return current user profile (requires JWT)
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user.
   *
   * The RegisterDto is validated automatically by the global
   * ValidationPipe before this method runs. If validation fails,
   * NestJS returns 400 with error details.
   */
  @Post('register')
  @RateLimit({ ttlSeconds: 60, limit: 15 })
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto.email, dto.password, dto.name);
  }

  /**
   * Login with email + password.
   *
   * The LocalAuthGuard runs the LocalStrategy first:
   * 1. Extracts email + password from request body.
   * 2. Calls AuthService.validateUser().
   * 3. If valid, attaches the UserProfile to req.user.
   * 4. Then this handler runs and generates tokens.
   *
   * @HttpCode(200) overrides NestJS's default 201 for POST routes.
   * Login doesn't create a resource, so 200 is more appropriate.
   */
  @Post('login')
  @RateLimit({ ttlSeconds: 60, limit: 15 })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: { user: UserProfile },
    @Body() _dto: LoginDto, // ensure validation runs
  ): Promise<AuthResponse> {
    return this.authService.login(req.user);
  }

  /**
   * Exchange a refresh token for a new access token.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshAccessToken(refreshToken);
  }

  /**
   * Get current user's profile.
   *
   * Protected by JwtAuthGuard — requires a valid access token
   * in the Authorization header.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: { user: UserProfile }): Promise<UserProfile> {
    return req.user;
  }
}
