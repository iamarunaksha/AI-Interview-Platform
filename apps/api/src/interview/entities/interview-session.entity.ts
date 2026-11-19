import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewStatus,
  InterviewStage,
  InterviewMode,
  InterviewerPersonality,
  type TranscriptTurn,
} from '@interviewai/shared-types';
import { User } from '../../users/user.entity.js';
import { Question } from '../../tracks/entities/question.entity.js';

/**
 * InterviewSession entity — records live and historical interview sessions.
 */
@Entity('interview_sessions')
export class InterviewSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  candidateId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: User;

  @Column({
    type: 'varchar',
    length: 50,
    default: ProfessionalDomain.SDE,
  })
  domain: ProfessionalDomain;

  @Column({
    type: 'varchar',
    length: 50,
    default: CompanyCategory.PRODUCT_COMPANY,
  })
  companyCategory: CompanyCategory;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'Software Development Engineer',
  })
  targetRole: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ExperienceLevel.SDE_1,
  })
  experienceLevel: ExperienceLevel;

  @Column({
    type: 'varchar',
    length: 50,
    default: InterviewDifficulty.MEDIUM,
  })
  difficulty: InterviewDifficulty;

  @Column({ type: 'int', default: 30 })
  durationMinutes: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: InterviewerPersonality.PROFESSIONAL,
  })
  personality: InterviewerPersonality;

  @Column({
    type: 'varchar',
    length: 50,
    default: InterviewMode.PRACTICE,
  })
  mode: InterviewMode;

  @Index()
  @Column({
    type: 'varchar',
    length: 50,
    default: InterviewStatus.CREATED,
  })
  status: InterviewStatus;

  @Column({
    type: 'varchar',
    length: 50,
    default: InterviewStage.GREETING,
  })
  currentStage: InterviewStage;

  @Column({
    type: 'jsonb',
    default: [],
  })
  coveredConcepts: string[];

  @Index()
  @Column({ type: 'uuid', nullable: true })
  currentQuestionId: string | null;

  @ManyToOne(() => Question, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'currentQuestionId' })
  currentQuestion: Question | null;

  @Column({
    type: 'jsonb',
    default: [],
  })
  transcript: TranscriptTurn[];

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
