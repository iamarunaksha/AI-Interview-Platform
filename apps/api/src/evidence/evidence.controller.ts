import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { EvidenceService } from './evidence.service.js';
import { ExtractEvidenceDto } from './dto/extract-evidence.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { EvidenceRecord } from '@interviewai/shared-types';

@Controller('interviews/:id/evidence')
@UseGuards(JwtAuthGuard)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  /**
   * Get all evidence records collected for an interview session.
   */
  @Get()
  async getSessionEvidence(
    @Param('id') sessionId: string,
  ): Promise<EvidenceRecord[]> {
    const records = await this.evidenceService.getEvidenceBySession(sessionId);
    return records.map((r) => this.evidenceService.mapToResponse(r));
  }

  /**
   * Extract and save evidence from a specific question-answer turn.
   */
  @Post('extract')
  async extractEvidence(
    @Param('id') sessionId: string,
    @Body() dto: Omit<ExtractEvidenceDto, 'sessionId'>,
  ): Promise<EvidenceRecord> {
    const record = await this.evidenceService.extractAndSaveEvidence({
      ...dto,
      sessionId,
    });
    return this.evidenceService.mapToResponse(record);
  }

  /**
   * Batch extract evidence across all candidate turns in a session transcript.
   */
  @Post('batch-extract')
  async batchExtract(
    @Param('id') sessionId: string,
  ): Promise<EvidenceRecord[]> {
    const records =
      await this.evidenceService.batchExtractFromTranscript(sessionId);
    return records.map((r) => this.evidenceService.mapToResponse(r));
  }

  /**
   * Get evidence records filtered by a specific competency.
   */
  @Get('competency/:competencyId')
  async getCompetencyEvidence(
    @Param('id') sessionId: string,
    @Param('competencyId') competencyId: string,
  ): Promise<EvidenceRecord[]> {
    const records = await this.evidenceService.getEvidenceByCompetency(
      sessionId,
      competencyId,
    );
    return records.map((r) => this.evidenceService.mapToResponse(r));
  }
}
