import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewReportEntity } from './entities/interview-report.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { EvaluationEntity } from '../evaluation/entities/evaluation.entity.js';
import { EvidenceRecordEntity } from '../evidence/entities/evidence-record.entity.js';
import { User } from '../users/user.entity.js';
import { EvaluationModule } from '../evaluation/evaluation.module.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterviewReportEntity,
      InterviewSessionEntity,
      EvaluationEntity,
      EvidenceRecordEntity,
      User,
    ]),
    EvaluationModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
