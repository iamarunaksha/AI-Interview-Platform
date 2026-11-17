import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity.js';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewerPersonality,
  InterviewMode,
} from '@interviewai/shared-types';

/**
 * CandidateProfile entity — maps to the "candidate_profiles" table.
 *
 * Each user has exactly one candidate profile (1-to-1 relationship).
 * When a user completes onboarding, their domain, target company category,
 * role, experience level, and interview preferences are recorded here.
 *
 * Design decisions:
 * - Foreign key `userId` is indexed and unique, with CASCADE on delete.
 * - Fields like `domain`, `companyCategory`, and `experienceLevel` are nullable
 *   initially because a user can sign up first, and then complete onboarding
 *   in a multi-step flow.
 * - `isOnboarded` flag makes it trivial for frontend route guards to redirect
 *   un-onboarded candidates directly to `/onboarding`.
 * - `preferences` is a JSONB column to allow future extensibility (e.g. custom
 *   voice settings, accessibility toggles) without schema migrations.
 */
@Entity('candidate_profiles')
export class CandidateProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  domain: ProfessionalDomain | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  companyCategory: CompanyCategory | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  targetRole: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  experienceLevel: ExperienceLevel | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: InterviewDifficulty.MEDIUM,
  })
  preferredDifficulty: InterviewDifficulty;

  @Column({
    type: 'int',
    default: 45,
  })
  preferredDurationMinutes: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: InterviewerPersonality.PROFESSIONAL,
  })
  preferredPersonality: InterviewerPersonality;

  @Column({
    type: 'varchar',
    length: 30,
    default: InterviewMode.PRACTICE,
  })
  preferredMode: InterviewMode;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  resumeUrl: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  resumeFileName: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  resumeSummary: string | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  isOnboarded: boolean;

  @Column({
    type: 'jsonb',
    default: {},
  })
  preferences: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
