import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { UnauthorizedException } from '@nestjs/common';
import type { UsersService } from '../users/users.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: Partial<UsersService>;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockUsersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
    };
    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
      verify: vi.fn(),
    };
    mockConfigService = {
      get: vi
        .fn()
        .mockImplementation(
          (_key: string, defaultValue?: string) => defaultValue ?? 'secret',
        ),
    } as unknown as Partial<ConfigService>;

    authService = new AuthService(
      mockUsersService as UsersService,
      mockJwtService as JwtService,
      mockConfigService as ConfigService,
    );
  });

  describe('register', () => {
    it('should hash the password and create a user', async () => {
      const mockUser = {
        id: 'u-123',
        email: 'test@example.com',
        name: 'John Doe',
        passwordHash: 'hashed',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockUsersService, 'create').mockResolvedValue(mockUser);

      const response = await authService.register(
        'test@example.com',
        'password123',
        'John Doe',
      );

      expect(response.user.id).toBe('u-123');
      expect(response.user.email).toBe('test@example.com');
      expect(response.accessToken).toBe('mock-jwt-token');
      expect(response.refreshToken).toBe('mock-jwt-token');
      expect(mockUsersService.create).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(null);

      await expect(
        authService.validateUser('notfound@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile if found', async () => {
      const mockUser = {
        id: 'u-123',
        email: 'test@example.com',
        name: 'John Doe',
        passwordHash: 'hashed',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);

      const profile = await authService.getProfile('u-123');
      expect(profile.id).toBe('u-123');
      expect(profile.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(null);

      await expect(authService.getProfile('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and return user profile for a valid token', async () => {
      const mockUser = {
        id: 'u-123',
        email: 'test@example.com',
        name: 'John Doe',
        passwordHash: 'hashed',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockJwtService as any).verifyAsync = vi
        .fn()
        .mockResolvedValue({ sub: 'u-123', type: 'access' });
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);

      const profile = await authService.verifyAccessToken('valid-token');
      expect(profile.id).toBe('u-123');
      expect(profile.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if token type is not access', async () => {
      (mockJwtService as any).verifyAsync = vi
        .fn()
        .mockResolvedValue({ sub: 'u-123', type: 'refresh' });

      await expect(
        authService.verifyAccessToken('wrong-type-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('onModuleInit', () => {
    it('should throw an error in production if default secrets are detected', () => {
      vi.spyOn(mockConfigService, 'get').mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'JWT_SECRET') return 'dev-secret-change-me';
          return defaultValue;
        },
      );

      expect(() => authService.onModuleInit()).toThrow(
        /FATAL SECURITY VIOLATION/,
      );
    });

    it('should throw an error in production if .env.example placeholder secrets are detected', () => {
      vi.spyOn(mockConfigService, 'get').mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'JWT_SECRET')
            return 'dev-jwt-access-secret-replace-in-production-min-32-chars';
          if (key === 'JWT_REFRESH_SECRET')
            return 'another-secure-random-secret-with-32-plus-chars';
          return defaultValue;
        },
      );

      expect(() => authService.onModuleInit()).toThrow(
        /FATAL SECURITY VIOLATION/,
      );
    });

    it('should pass cleanly when secure secrets are configured in production', () => {
      vi.spyOn(mockConfigService, 'get').mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'JWT_SECRET')
            return 'super-cryptographic-random-secret-32-chars';
          if (key === 'JWT_REFRESH_SECRET')
            return 'another-secure-random-secret-32-plus-chars';
          return defaultValue;
        },
      );

      expect(() => authService.onModuleInit()).not.toThrow();
    });
  });
});
