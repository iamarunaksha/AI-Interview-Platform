import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsRelations } from 'typeorm';
import { EvaluationEntity } from './entities/evaluation.entity.js';
import { CompetencyScoreEntity } from './entities/competency-score.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { Competency } from '../tracks/entities/competency.entity.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { ProviderRegistryService } from '../ai/provider-registry.service.js';
import {
  type InterviewReport,
  type CompetencyScore,
  InterviewStatus,
  EvaluationRating,
} from '@interviewai/shared-types';
import type { EvaluationSessionInput } from '../ai/interfaces/evaluation-provider.interface.js';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    @InjectRepository(EvaluationEntity)
    private readonly evalRepo: Repository<EvaluationEntity>,
    @InjectRepository(CompetencyScoreEntity)
    private readonly scoreRepo: Repository<CompetencyScoreEntity>,
    @InjectRepository(InterviewSessionEntity)
    private readonly sessionRepo: Repository<InterviewSessionEntity>,
    @InjectRepository(Competency)
    private readonly competencyRepo: Repository<Competency>,
    private readonly evidenceService: EvidenceService,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  /**
   * Run the independent evaluation engine for an interview session.
   * Leverages the multi-turn transcript, structured evidence records, and
   * question rubrics to compute objective competency scores and an overall rating.
   */
  async evaluateSession(
    sessionId: string,
    options?: { provider?: string; userId?: string },
  ): Promise<EvaluationEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        currentQuestion: { competency: true },
      } as FindOptionsRelations<InterviewSessionEntity>,
    });

    if (!session) {
      throw new NotFoundException(`Interview session ${sessionId} not found`);
    }

    if (options?.userId && session.candidateId !== options.userId) {
      throw new ForbiddenException(
        'You do not have permission to evaluate this interview session',
      );
    }

    // 1. Gather all granular evidence records collected for this session
    const evidenceRecords =
      await this.evidenceService.getEvidenceBySession(sessionId);

    // 2. Identify all competencies relevant to this session's track / question
    let competencies: Competency[] = [];
    if (session.currentQuestion?.competency) {
      competencies = [session.currentQuestion.competency];
    } else {
      competencies = await this.competencyRepo.find({
        where: { domain: session.domain, isActive: true },
        take: 3,
      });
    }

    // 3. Assemble Evaluation Session Input for Provider
    const input: EvaluationSessionInput = {
      sessionId,
      domain: session.domain,
      targetRole: session.targetRole,
      experienceLevel: session.experienceLevel,
      transcript: (session.transcript || []).map((t) => ({
        role: t.role as any,
        text: t.text,
        timestamp: t.timestamp,
      })),
      evidence: evidenceRecords.map((e) => ({
        competencyId: e.competencyId || '',
        questionAsked: e.questionAsked,
        candidateAnswer: e.candidateAnswer,
        technicalClaims: e.technicalClaims,
      })),
      competencies: competencies.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
      })),
    };

    // 4. Select Evaluation Provider (Gemini or Mock)
    const provider = options?.provider
      ? this.providerRegistry.getEvaluationProvider(options.provider)
      : this.providerRegistry.getActiveEvaluationProvider();

    this.logger.log(
      `Running independent evaluation for session ${sessionId} using provider: ${provider.name}`,
    );

    const report = await provider.evaluateSession(input);

    // 5. Clean up any existing evaluation for idempotency / re-evaluation
    const existing = await this.evalRepo.findOne({
      where: { sessionId },
      relations: {
        competencyScores: true,
      } as FindOptionsRelations<EvaluationEntity>,
    });

    if (existing) {
      if (existing.competencyScores && existing.competencyScores.length > 0) {
        await this.scoreRepo.remove(existing.competencyScores);
      }
      await this.evalRepo.remove(existing);
    }

    // 6. Persist Evaluation Entity
    const evaluation = this.evalRepo.create({
      sessionId,
      overallScore: report.overallScore,
      overallRating: report.overallRating || EvaluationRating.PROFICIENT,
      summary: report.summary,
      strengths: report.strengths || [],
      weaknesses: report.weaknesses || [],
      incorrectStatements: report.incorrectStatements || [],
      areasNotAssessed: report.areasNotAssessed || [],
      recommendations: report.recommendations || [],
      suggestedNextDifficulty:
        report.suggestedNextDifficulty || session.difficulty,
      evaluatorModel:
        provider.name === 'gemini' ? 'gemini-2.0-flash' : 'mock-v1',
      evaluatorProvider: provider.name,
    });

    const savedEvaluation = await this.evalRepo.save(evaluation);

    // 7. Persist Granular Competency Scores linked to cited evidence records
    const competencyScoreEntities: CompetencyScoreEntity[] = [];

    for (const cs of report.competencyScores) {
      // Find evidence records corresponding to this competency
      const matchingEvidenceIds = evidenceRecords
        .filter((e) => !e.competencyId || e.competencyId === cs.competencyId)
        .map((e) => e.id);

      const scoreEntity = this.scoreRepo.create({
        evaluationId: savedEvaluation.id,
        competencyId: cs.competencyId,
        score: cs.score,
        rating: cs.rating,
        justification: cs.justification,
        evidenceRefs: matchingEvidenceIds,
        sufficientEvidence:
          cs.sufficientEvidence ?? matchingEvidenceIds.length > 0,
      });

      competencyScoreEntities.push(scoreEntity);
    }

    if (competencyScoreEntities.length > 0) {
      savedEvaluation.competencyScores = await this.scoreRepo.save(
        competencyScoreEntities,
      );
    }

    // 8. Update Session Status to COMPLETED if not already
    if (session.status !== InterviewStatus.COMPLETED) {
      session.status = InterviewStatus.COMPLETED;
      session.endedAt = new Date();
      await this.sessionRepo.save(session);
    }

    this.logger.log(
      `Successfully generated evaluation for session ${sessionId} (Score: ${savedEvaluation.overallScore}/4, Rating: ${savedEvaluation.overallRating})`,
    );

    return savedEvaluation;
  }

  /**
   * Get existing evaluation for an interview session, optionally verifying user ownership.
   */
  async getEvaluation(
    sessionId: string,
    userId?: string,
  ): Promise<EvaluationEntity | null> {
    if (userId) {
      const session = await this.sessionRepo.findOne({
        where: { id: sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Interview session ${sessionId} not found`);
      }
      if (session.candidateId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to view this evaluation',
        );
      }
    }

    return this.evalRepo.findOne({
      where: { sessionId },
      relations: {
        competencyScores: { competency: true },
      } as FindOptionsRelations<EvaluationEntity>,
    });
  }

  /**
   * Map evaluation entity into client-facing InterviewReport DTO.
   */
  mapToReport(entity: EvaluationEntity): InterviewReport {
    const scores: CompetencyScore[] = (entity.competencyScores || []).map(
      (cs) => ({
        id: cs.id,
        competencyId: cs.competencyId,
        competencyName: cs.competency?.name || 'Technical Competency',
        score: cs.score,
        rating: cs.rating,
        justification: cs.justification,
        evidenceRefs: cs.evidenceRefs || [],
        sufficientEvidence: cs.sufficientEvidence,
      }),
    );

    return {
      id: entity.id,
      sessionId: entity.sessionId,
      overallScore: entity.overallScore,
      overallRating: entity.overallRating,
      summary: entity.summary,
      competencyScores: scores,
      strengths: entity.strengths || [],
      weaknesses: entity.weaknesses || [],
      incorrectStatements: entity.incorrectStatements || [],
      areasNotAssessed: entity.areasNotAssessed || [],
      recommendations: entity.recommendations || [],
      suggestedNextDifficulty: entity.suggestedNextDifficulty,
      evaluatorModel: entity.evaluatorModel,
      evaluatorProvider: entity.evaluatorProvider,
      generatedAt: entity.createdAt.toISOString(),
    };
  }
}
