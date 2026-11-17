import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import type { UserProfile, AuthResponse } from '@interviewai/shared-types';

/**
 * AuthService — handles registration, login, and token management.
 *
 * Key design decisions:
 *
 * 1. BCRYPT COST FACTOR 12
 *    Each increment doubles the work. 12 ≈ 300ms per hash on modern
 *    hardware — fast enough for a login request, but an attacker
 *    brute-forcing 1 billion passwords would need ~10 years.
 *
 * 2. GENERIC ERROR MESSAGES
 *    "Invalid credentials" for both wrong-email and wrong-password.
 *    If we said "user not found" vs "wrong password", an attacker
 *    could enumerate which emails are registered.
 *
 * 3. TWO TOKENS
 *    - Access token (15m): Sent with every API request. Short-lived
 *      so if stolen, the damage window is small.
 *    - Refresh token (7d): Used only to get a new access token.
 *      Stored client-side (httpOnly cookie in production, localStorage
 *      for now). Longer-lived for convenience.
 */
@Injectable()
export class AuthService {
  private readonly bcryptRounds = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user.
   * Hashes the password, creates the user record, returns tokens.
   */
  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
    const user = await this.usersService.create({
      email,
      passwordHash,
      name,
    });

    return this.buildAuthResponse(user);
  }

  /**
   * Validate email + password combination.
   * Called by the LocalStrategy during login.
   * Returns the user if valid, throws UnauthorizedException if not.
   */
  async validateUser(email: string, password: string): Promise<UserProfile> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.toUserProfile(user);
  }

  /**
   * Generate access + refresh tokens for a validated user.
   * Called after successful login validation.
   */
  async login(userProfile: UserProfile): Promise<AuthResponse> {
    return {
      user: userProfile,
      accessToken: this.generateAccessToken(userProfile.id),
      refreshToken: this.generateRefreshToken(userProfile.id),
    };
  }

  /**
   * Refresh the access token using a valid refresh token.
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>(
            'JWT_REFRESH_SECRET',
            'refresh-dev-secret',
          ),
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify the user still exists and is active
      const user = await this.usersService.findById(payload.sub);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      return {
        accessToken: this.generateAccessToken(payload.sub),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Look up the full user profile by ID.
   * Called by JWT strategy to populate req.user on protected routes.
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toUserProfile(user);
  }

  // ── Private helpers ──────────────────────────────────

  private generateAccessToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'access' },
      {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'dev-secret-change-me',
        ),
        expiresIn: '15m',
      },
    );
  }

  private generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'refresh-dev-secret',
        ),
        expiresIn: '7d',
      },
    );
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    status: string;
    createdAt: Date;
  }): AuthResponse {
    const userProfile = this.toUserProfile(user);
    return {
      user: userProfile,
      accessToken: this.generateAccessToken(user.id),
      refreshToken: this.generateRefreshToken(user.id),
    };
  }

  private toUserProfile(user: {
    id: string;
    email: string;
    name: string;
    status: string;
    createdAt: Date;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status as UserProfile['status'],
      createdAt: user.createdAt.toISOString(),
    };
  }
}
