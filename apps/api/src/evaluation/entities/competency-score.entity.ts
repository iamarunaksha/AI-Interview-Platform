import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EvaluationRating } from '@interviewai/shared-types';
import type { EvaluationEntity } from './evaluation.entity.js';
import { Competency } from '../../tracks/entities/competency.entity.js';

/**
 * CompetencyScoreEntity — maps to the "competency_scores" table.
 *
 * Stores the rubric rating and evidence-backed justification for a
 * specific competency evaluated during an interview.
 */
@Entity('competency_scores')
export class CompetencyScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  evaluationId: string;

  @ManyToOne('EvaluationEntity', (e: EvaluationEntity) => e.competencyScores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'evaluationId' })
  evaluation: EvaluationEntity;

  @Index()
  @Column({ type: 'uuid' })
  competencyId: string;

  @ManyToOne(() => Competency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competencyId' })
  competency: Competency;

  @Column({ type: 'float', nullable: true })
  score: number | null;

  @Column({
    type: 'int',
    default: EvaluationRating.NOT_ASSESSED,
  })
  rating: EvaluationRating;

  @Column({ type: 'text' })
  justification: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  evidenceRefs: string[];

  @Column({ type: 'boolean', default: false })
  sufficientEvidence: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
