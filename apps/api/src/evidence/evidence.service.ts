import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsRelations } from 'typeorm';
import { EvidenceRecordEntity } from './entities/evidence-record.entity.js';
import { EvidenceExtractorService } from './evidence-extractor.service.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { ExtractEvidenceDto } from './dto/extract-evidence.dto.js';
import type { EvidenceRecord } from '@interviewai/shared-types';

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    @InjectRepository(EvidenceRecordEntity)
    private readonly evidenceRepo: Repository<EvidenceRecordEntity>,
    @InjectRepository(InterviewSessionEntity)
    private readonly sessionRepo: Repository<InterviewSessionEntity>,
    private readonly extractor: EvidenceExtractorService,
  ) {}

  /**
   * Extract verifiable evidence from a question-answer turn and persist it.
   */
  async extractAndSaveEvidence(
    dto: ExtractEvidenceDto,
  ): Promise<EvidenceRecordEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
      relations: {
        currentQuestion: { competency: true },
      } as FindOptionsRelations<InterviewSessionEntity>,
    });

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    // Determine expected concepts and misconceptions from session's active question if not supplied
    const expectedConcepts =
      dto.expectedConcepts || session.currentQuestion?.expectedConcepts || [];
    const commonMisconceptions =
      dto.commonMisconceptions ||
      session.currentQuestion?.commonMisconceptions ||
      [];
    const competencyId =
      dto.competencyId || session.currentQuestion?.competencyId || null;

    const extracted = await this.extractor.extractEvidence({
      questionAsked: dto.questionAsked,
      candidateAnswer: dto.candidateAnswer,
      expectedConcepts,
      commonMisconceptions,
    });

    const record = this.evidenceRepo.create({
      sessionId: session.id,
      competencyId,
      turnId: dto.turnId || null,
      questionAsked: dto.questionAsked,
      candidateAnswer: dto.candidateAnswer,
      technicalClaims: extracted.technicalClaims,
      correctConcepts: extracted.correctConcepts,
      incorrectConcepts: extracted.incorrectConcepts,
      missingConcepts: extracted.missingConcepts,
      reasoningQuality: extracted.reasoningQuality,
      practicalExperience: extracted.practicalExperience,
      confidence: extracted.confidence,
      notes: extracted.notes,
    });

    const saved = await this.evidenceRepo.save(record);
    this.logger.log(
      `Recorded evidence record ${saved.id} for session ${session.id} (Quality: ${saved.reasoningQuality}, Claims: ${saved.technicalClaims.length})`,
    );

    return saved;
  }

  /**
   * List all evidence records collected for an interview session.
   */
  async getEvidenceBySession(
    sessionId: string,
  ): Promise<EvidenceRecordEntity[]> {
    return this.evidenceRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      relations: {
        competency: true,
      } as FindOptionsRelations<EvidenceRecordEntity>,
    });
  }

  /**
   * List evidence records filtered by competency.
   */
  async getEvidenceByCompetency(
    sessionId: string,
    competencyId: string,
  ): Promise<EvidenceRecordEntity[]> {
    return this.evidenceRepo.find({
      where: { sessionId, competencyId },
      order: { createdAt: 'ASC' },
      relations: {
        competency: true,
      } as FindOptionsRelations<EvidenceRecordEntity>,
    });
  }

  /**
   * Batch process all candidate transcript turns in a session to extract evidence.
   */
  async batchExtractFromTranscript(
    sessionId: string,
  ): Promise<EvidenceRecordEntity[]> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        currentQuestion: true,
      } as FindOptionsRelations<InterviewSessionEntity>,
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const transcript = session.transcript || [];
    if (transcript.length === 0) {
      return [];
    }

    const existingRecords = await this.evidenceRepo.find({
      where: { sessionId },
    });
    const processedTurnIds = new Set(
      existingRecords.map((r) => r.turnId).filter(Boolean),
    );

    const newlySaved: EvidenceRecordEntity[] = [];

    // Pair assistant questions with candidate answers
    for (let i = 0; i < transcript.length; i++) {
      const turn = transcript[i];
      if (turn.role === 'candidate' && !processedTurnIds.has(turn.id)) {
        // Look backwards for the preceding assistant question
        let questionAsked =
          session.currentQuestion?.stem || 'Interview question';
        for (let j = i - 1; j >= 0; j--) {
          if (transcript[j].role === 'assistant') {
            questionAsked = transcript[j].text;
            break;
          }
        }

        const saved = await this.extractAndSaveEvidence({
          sessionId,
          turnId: turn.id,
          questionAsked,
          candidateAnswer: turn.text,
          competencyId: session.currentQuestion?.competencyId,
          expectedConcepts: session.currentQuestion?.expectedConcepts,
          commonMisconceptions: session.currentQuestion?.commonMisconceptions,
        });

        newlySaved.push(saved);
        processedTurnIds.add(turn.id);
      }
    }

    return newlySaved;
  }

  /**
   * Map database entity to client DTO contract.
   */
  mapToResponse(entity: EvidenceRecordEntity): EvidenceRecord {
    return {
      id: entity.id,
      sessionId: entity.sessionId,
      competencyId: entity.competencyId,
      turnId: entity.turnId,
      questionAsked: entity.questionAsked,
      candidateAnswer: entity.candidateAnswer,
      technicalClaims: entity.technicalClaims || [],
      correctConcepts: entity.correctConcepts || [],
      incorrectConcepts: entity.incorrectConcepts || [],
      missingConcepts: entity.missingConcepts || [],
      reasoningQuality: entity.reasoningQuality,
      practicalExperience: entity.practicalExperience,
      confidence: entity.confidence,
      notes: entity.notes,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
