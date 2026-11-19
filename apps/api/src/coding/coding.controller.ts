import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CodingService } from './coding.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import type {
  CodingProblem,
  CodeExecutionResult,
  CodeRunRequest,
} from '@interviewai/shared-types';

@ApiTags('coding')
@ApiBearerAuth('JWT-auth')
@Controller('coding')
@UseGuards(JwtAuthGuard)
export class CodingController {
  constructor(private readonly codingService: CodingService) {}

  @Get('problems')
  @ApiOperation({ summary: 'List all interactive coding interview problems' })
  listProblems(): CodingProblem[] {
    return this.codingService.listProblems();
  }

  @Get('problems/:id')
  @ApiOperation({
    summary: 'Get details, starter code, and test cases for a coding problem',
  })
  getProblem(@Param('id') problemId: string): CodingProblem {
    return this.codingService.getProblem(problemId);
  }

  @Post('execute')
  @RateLimit({ ttlSeconds: 60, limit: 20 })
  @ApiOperation({
    summary:
      'Execute candidate code in the isolated sandbox against test suites',
  })
  async runCode(
    @Body() request: CodeRunRequest,
    @Query('problemId') problemId?: string,
  ): Promise<CodeExecutionResult> {
    return this.codingService.runCode(request, problemId);
  }
}
