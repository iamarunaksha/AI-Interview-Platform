import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { TestGenerateDto } from './dto/test-generate.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import type {
  TestGenerateResponse,
  AiSystemStatusResponse,
} from '@interviewai/shared-types';

@ApiTags('ai')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Get the current status and availability of all AI providers.
   */
  @Get('providers')
  @RateLimit({ ttlSeconds: 60, limit: 60 })
  async getStatus(): Promise<AiSystemStatusResponse> {
    return this.aiService.getStatus();
  }

  /**
   * Test-generate a response from the active or requested AI provider.
   */
  @Post('test-generate')
  @RateLimit({ ttlSeconds: 60, limit: 10 })
  @HttpCode(HttpStatus.OK)
  async testGenerate(
    @Body() request: TestGenerateDto,
  ): Promise<TestGenerateResponse> {
    return this.aiService.testGenerate(request);
  }
}
