import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationEntity } from './entities/evaluation.entity.js';
import { CompetencyScoreEntity } from './entities/competency-score.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { Competency } from '../tracks/entities/competency.entity.js';
import { EvaluationService } from './evaluation.service.js';
import { EvaluationController } from './evaluation.controller.js';
import { AiModule } from '../ai/ai.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EvaluationEntity,
      CompetencyScoreEntity,
      InterviewSessionEntity,
      Competency,
    ]),
    AiModule,
    EvidenceModule,
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
