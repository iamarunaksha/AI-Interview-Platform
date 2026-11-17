import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competency } from './entities/competency.entity.js';
import { Question } from './entities/question.entity.js';
import { TracksService } from './tracks.service.js';
import { TracksController } from './tracks.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Competency, Question])],
  providers: [TracksService],
  controllers: [TracksController],
  exports: [TracksService],
})
export class TracksModule {}
