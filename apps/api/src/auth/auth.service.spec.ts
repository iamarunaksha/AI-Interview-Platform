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
});
