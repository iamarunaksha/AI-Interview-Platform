import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service.js';
import type {
  TestGenerateRequest,
  TestGenerateResponse,
  AiSystemStatusResponse,
} from '@interviewai/shared-types';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Get the current status and availability of all AI providers.
   */
  @Get('providers')
  async getStatus(): Promise<AiSystemStatusResponse> {
    return this.aiService.getStatus();
  }

  /**
   * Test-generate a response from the active or requested AI provider.
   */
  @Post('test-generate')
  @HttpCode(HttpStatus.OK)
  async testGenerate(
    @Body() request: TestGenerateRequest,
  ): Promise<TestGenerateResponse> {
    return this.aiService.testGenerate(request);
  }
}
