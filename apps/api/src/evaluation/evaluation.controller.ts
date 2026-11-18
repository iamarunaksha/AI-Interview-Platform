import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { InterviewReport } from '@interviewai/shared-types';

@Controller('interviews/:id/evaluation')
@UseGuards(JwtAuthGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  /**
   * Run the evaluation engine on an interview session and generate the report.
   */
  @Post()
  async evaluate(
    @Param('id') sessionId: string,
    @Query('provider') provider?: string,
  ): Promise<InterviewReport> {
    const evaluation = await this.evaluationService.evaluateSession(sessionId, {
      provider,
    });
    return this.evaluationService.mapToReport(evaluation);
  }

  /**
   * Get the saved evaluation report for an interview session.
   */
  @Get()
  async getEvaluation(
    @Param('id') sessionId: string,
  ): Promise<InterviewReport> {
    const evaluation = await this.evaluationService.getEvaluation(sessionId);
    if (!evaluation) {
      throw new NotFoundException(
        `Evaluation for interview session ${sessionId} not found. Run POST /api/interviews/${sessionId}/evaluation first.`,
      );
    }
    return this.evaluationService.mapToReport(evaluation);
  }
}
