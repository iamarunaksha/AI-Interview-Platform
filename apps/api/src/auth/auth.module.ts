import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

/**
 * AuthModule — wires together authentication components.
 *
 * Module dependency graph:
 *
 *   AuthModule
 *   ├── imports UsersModule (to access UsersService)
 *   ├── imports PassportModule (registers Passport with NestJS)
 *   ├── imports JwtModule (provides JwtService for signing tokens)
 *   ├── providers:
 *   │   ├── AuthService (business logic)
 *   │   ├── LocalStrategy (email+password validation)
 *   │   └── JwtStrategy (Bearer token validation)
 *   └── controllers:
 *       └── AuthController (HTTP endpoints)
 *
 * JwtModule.register({}) — we pass an empty config here because
 * we provide the secret and expiry per-call in AuthService.
 * This gives us different secrets for access vs refresh tokens.
 */
@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({})],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
