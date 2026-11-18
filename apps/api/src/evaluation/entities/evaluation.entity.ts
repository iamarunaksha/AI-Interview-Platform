import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  EvaluationRating,
  InterviewDifficulty,
} from '@interviewai/shared-types';
import { InterviewSessionEntity } from '../../interview/entities/interview-session.entity.js';
import { CompetencyScoreEntity } from './competency-score.entity.js';

/**
 * EvaluationEntity — maps to the "evaluations" table.
 *
 * Implements the independent post-session rubric assessment.
 * Calculates overall score, rating, executive summary, actionable recommendations,
 * and references all granular competency scores and transcript evidence.
 */
@Entity('evaluations')
export class EvaluationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => InterviewSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: InterviewSessionEntity;

  @Column({ type: 'float', nullable: true })
  overallScore: number | null;

  @Column({
    type: 'int',
    default: EvaluationRating.NOT_ASSESSED,
  })
  overallRating: EvaluationRating;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  strengths: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  weaknesses: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  incorrectStatements: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  areasNotAssessed: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  recommendations: string[];

  @Column({
    type: 'varchar',
    length: 50,
    default: InterviewDifficulty.MEDIUM,
  })
  suggestedNextDifficulty: InterviewDifficulty;

  @Column({ type: 'varchar', length: 100, default: 'gemini-2.0-flash' })
  evaluatorModel: string;

  @Column({ type: 'varchar', length: 50, default: 'gemini' })
  evaluatorProvider: string;

  @OneToMany(() => CompetencyScoreEntity, (cs) => cs.evaluation, {
    cascade: true,
  })
  competencyScores: CompetencyScoreEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
