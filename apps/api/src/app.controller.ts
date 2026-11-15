import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { HealthCheckResponse } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async getHealth(): Promise<HealthCheckResponse> {
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
