import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ReasoningQuality } from '@interviewai/shared-types';
import { InterviewSessionEntity } from '../../interview/entities/interview-session.entity.js';
import { Competency } from '../../tracks/entities/competency.entity.js';

/**
 * EvidenceRecordEntity — maps to the "evidence_records" table.
 *
 * Implements granular, verifiable evaluation evidence extracted from
 * candidate answers per question/turn. Every claim, concept, and reasoning
 * quality indicator is grounded in transcript evidence.
 */
@Entity('evidence_records')
export class EvidenceRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => InterviewSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: InterviewSessionEntity;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  competencyId?: string | null;

  @ManyToOne(() => Competency, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'competencyId' })
  competency?: Competency | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  turnId?: string | null;

  @Column({ type: 'text' })
  questionAsked: string;

  @Column({ type: 'text' })
  candidateAnswer: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  technicalClaims: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  correctConcepts: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  incorrectConcepts: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  missingConcepts: string[];

  @Column({
    type: 'varchar',
    length: 50,
    default: ReasoningQuality.FAIR,
  })
  reasoningQuality: ReasoningQuality;

  @Column({ type: 'boolean', default: false })
  practicalExperience: boolean;

  @Column({ type: 'float', default: 0.85 })
  confidence: number;

  @Column({ type: 'text', default: '' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
