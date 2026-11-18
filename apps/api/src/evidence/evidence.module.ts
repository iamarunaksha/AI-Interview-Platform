import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidenceRecordEntity } from './entities/evidence-record.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { EvidenceService } from './evidence.service.js';
import { EvidenceExtractorService } from './evidence-extractor.service.js';
import { EvidenceController } from './evidence.controller.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([EvidenceRecordEntity, InterviewSessionEntity]),
    AiModule,
  ],
  controllers: [EvidenceController],
  providers: [EvidenceService, EvidenceExtractorService],
  exports: [EvidenceService, EvidenceExtractorService],
})
export class EvidenceModule {}
