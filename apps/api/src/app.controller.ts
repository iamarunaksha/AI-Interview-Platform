import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { SystemHealthResponse } from '@interviewai/shared-types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async getHealth(): Promise<SystemHealthResponse> {
    return this.appService.getHealth();
  }

  @Get()
  getRoot(): { name: string; status: string } {
    return {
      name: 'InterviewAI API',
      status: 'operational',
    };
  }
}
