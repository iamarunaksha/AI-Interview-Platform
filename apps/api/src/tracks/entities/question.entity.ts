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
  type ProbingQuestion,
  type RubricLevelGuide,
} from '@interviewai/shared-types';
import { Competency } from './competency.entity.js';

/**
 * Question entity — maps to the "questions" table.
 *
 * Each question represents an intelligent node in the interview graph.
 * It contains not just the question text, but technical ground truth:
 * expected concepts, common misconceptions, probing branches, and rubric guides.
 */
@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  competencyId: string;

  @ManyToOne(() => Competency, (c) => c.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competencyId' })
  competency: Competency;

  @Index()
  @Column({
    type: 'varchar',
    length: 50,
  })
  domain: ProfessionalDomain;

  @Column({
    type: 'jsonb',
    default: [],
  })
  companyCategories: CompanyCategory[];

  @Column({
    type: 'jsonb',
    default: [],
  })
  experienceLevels: ExperienceLevel[];

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: InterviewDifficulty.MEDIUM,
  })
  difficulty: InterviewDifficulty;

  @Column({
    type: 'varchar',
    length: 255,
  })
  title: string;

  @Column({
    type: 'text',
  })
  stem: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  contextPrompt: string;

  @Column({
    type: 'jsonb',
    default: [],
  })
  expectedConcepts: string[];

  @Column({
    type: 'jsonb',
    default: [],
  })
  commonMisconceptions: string[];

  @Column({
    type: 'jsonb',
    default: [],
  })
  probingQuestions: ProbingQuestion[];

  @Column({
    type: 'jsonb',
    default: [],
  })
  rubricGuide: RubricLevelGuide[];

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
