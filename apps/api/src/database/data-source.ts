import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity.js';
import { CandidateProfile } from '../candidates/candidate-profile.entity.js';
import { Competency } from '../tracks/entities/competency.entity.js';
import { Question } from '../tracks/entities/question.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { EvidenceRecordEntity } from '../evidence/entities/evidence-record.entity.js';
import { EvaluationEntity } from '../evaluation/entities/evaluation.entity.js';
import { CompetencyScoreEntity } from '../evaluation/entities/competency-score.entity.js';
import { InterviewReportEntity } from '../reports/entities/interview-report.entity.js';
import { InitialSchema1732640000000 } from './migrations/1732640000000-InitialSchema.js';

const databaseUrl = process.env.DATABASE_URL;
const isSsl = process.env.DATABASE_SSL === 'true';

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: Number(process.env.DATABASE_PORT || 5432),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'postgres',
      }),
  ssl: isSsl ? { rejectUnauthorized: false } : false,
  entities: [
    User,
    CandidateProfile,
    Competency,
    Question,
    InterviewSessionEntity,
    EvidenceRecordEntity,
    EvaluationEntity,
    CompetencyScoreEntity,
    InterviewReportEntity,
  ],
  migrations: [InitialSchema1732640000000],
  synchronize: false,
});
