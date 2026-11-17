import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateProfile } from './candidate-profile.entity.js';
import { CandidatesService } from './candidates.service.js';
import { CandidatesController } from './candidates.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateProfile])],
  providers: [CandidatesService],
  controllers: [CandidatesController],
  exports: [CandidatesService],
})
export class CandidatesModule {}
