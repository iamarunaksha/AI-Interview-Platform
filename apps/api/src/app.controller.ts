import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service.js';
import type { SystemHealthResponse } from '@interviewai/shared-types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async getHealth(
    @Res({ passthrough: true }) res?: Response,
  ): Promise<SystemHealthResponse> {
    const health = await this.appService.getHealth();
    if (res && health.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }

  @Get('health/live')
  getLiveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/ready')
  async getReadiness(
    @Res({ passthrough: true }) res?: Response,
  ): Promise<SystemHealthResponse> {
    return this.getHealth(res);
  }

  @Get()
  getRoot(): { name: string; status: string } {
    return {
      name: 'InterviewAI API',
      status: 'operational',
    };
  }
}
