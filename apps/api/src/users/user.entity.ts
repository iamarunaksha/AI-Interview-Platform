import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * User entity — maps to the "users" table in PostgreSQL.
 *
 * This is the core identity record. Every person who signs up
 * gets exactly one row here. The passwordHash is stored using
 * bcrypt (one-way hash), so even a database breach cannot
 * reveal plaintext passwords.
 *
 * Design note: We store the user's status as a Postgres enum
 * rather than a boolean "isActive". This lets us add states
 * like "suspended" or "pending_verification" without schema
 * changes — just add a value to the TypeScript enum and the
 * synchronize feature picks it up.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
