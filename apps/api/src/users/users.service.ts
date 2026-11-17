import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

/**
 * UsersService — data-access layer for User records.
 *
 * This service encapsulates all database operations on the
 * "users" table. Other modules (like Auth) call these methods
 * instead of directly touching the repository.
 *
 * Why a separate service instead of using Repository directly?
 * - Single Responsibility: business rules live here, not in controllers.
 * - Testability: mock UsersService in auth tests without a real DB.
 * - Encapsulation: if we switch from TypeORM to Drizzle later,
 *   only this file changes.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Create a new user record.
   * Throws ConflictException if the email is already taken.
   */
  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    // Check for existing user first to give a friendly error.
    // The unique index on email is our safety net if two requests
    // race past this check simultaneously.
    const existing = await this.usersRepository.findOne({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  /** Find a user by email. Returns null if not found. */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /** Find a user by ID. Returns null if not found. */
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
