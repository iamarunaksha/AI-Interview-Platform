import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    CandidatesModule,
    TracksModule,
    AiModule,
    InterviewModule,
    EvidenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
