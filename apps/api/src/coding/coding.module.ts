import { Module } from '@nestjs/common';
import { CodingSandboxService } from './coding-sandbox.service.js';
import { CodingService } from './coding.service.js';
import { CodingController } from './coding.controller.js';

@Module({
  providers: [CodingSandboxService, CodingService],
  controllers: [CodingController],
  exports: [CodingSandboxService, CodingService],
})
export class CodingModule {}
