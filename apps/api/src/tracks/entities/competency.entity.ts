import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ProfessionalDomain } from '@interviewai/shared-types';
import type { Question } from './question.entity.js';

/**
 * Competency entity — maps to the "competencies" table.
 *
 * Defines the core technical and architectural capabilities evaluated
 * during interviews (e.g. Distributed System Design, Algorithmic Problem Solving,
 * SAP Transportation Management, Enterprise ABAP).
 */
@Entity('competencies')
export class Competency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  domain: ProfessionalDomain;

  @Column({
    type: 'varchar',
    length: 150,
  })
  name: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 100,
  })
  slug: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  category: string;

  @Column({
    type: 'text',
  })
  description: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @OneToMany('Question', 'competency')
  questions: Question[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
