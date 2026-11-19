import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type {
  ComprehensiveInterviewReport,
  CandidateDashboardMetrics,
  UserProfile,
} from '@interviewai/shared-types';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Get the comprehensive interview report for a specific session.
   * Auto-generates the report if not yet persisted.
   */
  @Get('interviews/:id/report')
  async getReport(
    @Param('id') sessionId: string,
    @Req() req: { user: UserProfile },
  ): Promise<ComprehensiveInterviewReport> {
    return this.reportsService.getReport(sessionId, req.user.id);
  }

  /**
   * Explicitly generate or regenerate the interview report for a session.
   */
  @Post('interviews/:id/report')
  async generateReport(
    @Param('id') sessionId: string,
    @Req() req: { user: UserProfile },
  ): Promise<ComprehensiveInterviewReport> {
    return this.reportsService.generateReport(sessionId, req.user.id);
  }

  /**
   * Get aggregate metrics and history for the authenticated candidate's dashboard.
   */
  @Get('reports/dashboard')
  async getDashboardMetrics(
    @Req() req: { user: UserProfile },
  ): Promise<CandidateDashboardMetrics> {
    return this.reportsService.getCandidateDashboardMetrics(req.user.id);
  }
}
