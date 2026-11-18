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
  ReportStatus,
  type ComprehensiveInterviewReport,
} from '@interviewai/shared-types';
import { InterviewSessionEntity } from '../../interview/entities/interview-session.entity.js';
import { EvaluationEntity } from '../../evaluation/entities/evaluation.entity.js';

/**
 * InterviewReportEntity — maps to the "interview_reports" table.
 *
 * Persists the final generated comprehensive interview report containing
 * candidate profile, session parameters, independent rubric evaluation scores,
 * evidence citations, strengths/weaknesses breakdown, and dashboard analytics.
 */
@Entity('interview_reports')
export class InterviewReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => InterviewSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: InterviewSessionEntity;

  @Index()
  @Column({ type: 'uuid' })
  evaluationId: string;

  @ManyToOne(() => EvaluationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluationId' })
  evaluation: EvaluationEntity;

  @Column({ type: 'jsonb' })
  reportData: ComprehensiveInterviewReport;

  @Column({
    type: 'varchar',
    length: 50,
    default: ReportStatus.GENERATED,
  })
  status: ReportStatus;

  @Column({ type: 'timestamptz' })
  generatedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
