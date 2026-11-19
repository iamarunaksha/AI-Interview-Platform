import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CandidatesModule } from './candidates/candidates.module.js';
import { TracksModule } from './tracks/tracks.module.js';
import { AiModule } from './ai/ai.module.js';
import { InterviewModule } from './interview/interview.module.js';
import { EvidenceModule } from './evidence/evidence.module.js';
import { EvaluationModule } from './evaluation/evaluation.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { CodingModule } from './coding/coding.module.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env', '.env.local'],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    CandidatesModule,
    TracksModule,
    AiModule,
    InterviewModule,
    EvidenceModule,
    EvaluationModule,
    ReportsModule,
    CodingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
