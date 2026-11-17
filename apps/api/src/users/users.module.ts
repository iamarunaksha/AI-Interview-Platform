import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

/**
 * UsersModule owns everything related to User records.
 *
 * TypeOrmModule.forFeature([User]) does two things:
 * 1. Registers the User entity so TypeORM creates/syncs the table.
 * 2. Makes the User Repository injectable into services within
 *    this module (via @InjectRepository(User)).
 *
 * We export UsersService so other modules (like AuthModule)
 * can use it to look up users without directly accessing
 * the User repository.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
