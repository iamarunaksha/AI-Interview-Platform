import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewSessionEntity } from './entities/interview-session.entity.js';
import { Question } from '../tracks/entities/question.entity.js';
import { InterviewService } from './interview.service.js';
import { InterviewGateway } from './interview.gateway.js';
import { InterviewController } from './interview.controller.js';
import { ContextInjectorService } from './orchestrator/context-injector.service.js';
import { InterviewOrchestratorService } from './orchestrator/interview-orchestrator.service.js';
import { AiModule } from '../ai/ai.module.js';
import { TracksModule } from '../tracks/tracks.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterviewSessionEntity, Question]),
    AiModule,
    TracksModule,
    AuthModule,
  ],
  providers: [
    InterviewService,
    InterviewGateway,
    ContextInjectorService,
    InterviewOrchestratorService,
  ],
  controllers: [InterviewController],
  exports: [
    InterviewService,
    InterviewGateway,
    ContextInjectorService,
    InterviewOrchestratorService,
  ],
})
export class InterviewModule {}
