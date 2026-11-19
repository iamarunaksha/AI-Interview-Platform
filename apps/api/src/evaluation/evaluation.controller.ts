import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { InterviewReport, UserProfile } from '@interviewai/shared-types';

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
    @Req() req: { user: UserProfile },
    @Query('provider') provider?: string,
  ): Promise<InterviewReport> {
    const evaluation = await this.evaluationService.evaluateSession(sessionId, {
      provider,
      userId: req.user.id,
    });
    return this.evaluationService.mapToReport(evaluation);
  }

  /**
   * Get the saved evaluation report for an interview session.
   */
  @Get()
  async getEvaluation(
    @Param('id') sessionId: string,
    @Req() req: { user: UserProfile },
  ): Promise<InterviewReport> {
    const evaluation = await this.evaluationService.getEvaluation(
      sessionId,
      req.user.id,
    );
    if (!evaluation) {
      throw new NotFoundException(
        `Evaluation for interview session ${sessionId} not found. Run POST /api/interviews/${sessionId}/evaluation first.`,
      );
    }
    return this.evaluationService.mapToReport(evaluation);
  }
}
