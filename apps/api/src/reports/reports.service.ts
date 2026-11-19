import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsRelations } from 'typeorm';
import {
  InterviewStatus,
  EvaluationRating,
  InterviewDifficulty,
  ReportStatus,
  type ComprehensiveInterviewReport,
  type CandidateDashboardMetrics,
  type DetailedReportEvidence,
  type CompetencyPerformanceSummary,
  type CandidateSessionSummary,
} from '@interviewai/shared-types';
import { InterviewReportEntity } from './entities/interview-report.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { EvaluationEntity } from '../evaluation/entities/evaluation.entity.js';
import { EvidenceRecordEntity } from '../evidence/entities/evidence-record.entity.js';
import { User } from '../users/user.entity.js';
import { EvaluationService } from '../evaluation/evaluation.service.js';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(InterviewReportEntity)
    private readonly reportRepository: Repository<InterviewReportEntity>,
    @InjectRepository(InterviewSessionEntity)
    private readonly sessionRepository: Repository<InterviewSessionEntity>,
    @InjectRepository(EvaluationEntity)
    private readonly evaluationRepository: Repository<EvaluationEntity>,
    @InjectRepository(EvidenceRecordEntity)
    private readonly evidenceRepository: Repository<EvidenceRecordEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly evaluationService: EvaluationService,
  ) {}

  /**
   * Generate or regenerate a Comprehensive Interview Report for a given session.
   */
  async generateReport(
    sessionId: string,
    userId?: string,
  ): Promise<ComprehensiveInterviewReport> {
    this.logger.log(`Generating report for interview session: ${sessionId}`);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: {
        candidate: true,
      } as FindOptionsRelations<InterviewSessionEntity>,
    });

    if (!session) {
      throw new NotFoundException(`Interview session ${sessionId} not found`);
    }

    if (userId && session.candidateId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to generate this report',
      );
    }

    // Ensure evaluation exists. If not, trigger the independent evaluation engine.
    let evaluation = await this.evaluationRepository.findOne({
      where: { sessionId },
      relations: {
        competencyScores: { competency: true },
      } as FindOptionsRelations<EvaluationEntity>,
    });

    if (!evaluation) {
      this.logger.log(
        `Evaluation not found for session ${sessionId}, triggering evaluation engine...`,
      );
      evaluation = await this.evaluationService.evaluateSession(sessionId);
    }

    // Load all structured evidence records collected during this interview
    const evidenceRecords = await this.evidenceRepository.find({
      where: { sessionId },
      relations: {
        competency: true,
      } as FindOptionsRelations<EvidenceRecordEntity>,
      order: { createdAt: 'ASC' },
    });

    // Calculate actual duration in seconds
    let actualDurationSeconds: number | null = null;
    if (session.startedAt) {
      const endTime = session.endedAt
        ? new Date(session.endedAt).getTime()
        : Date.now();
      actualDurationSeconds = Math.max(
        0,
        Math.round((endTime - new Date(session.startedAt).getTime()) / 1000),
      );
    }

    // Format detailed evidence items
    const detailedEvidence: DetailedReportEvidence[] = evidenceRecords.map(
      (ev) => ({
        id: ev.id,
        competencyId: ev.competencyId ?? undefined,
        competencyName: ev.competency?.name ?? 'General Competency',
        questionAsked: ev.questionAsked,
        candidateAnswer: ev.candidateAnswer,
        technicalClaims: ev.technicalClaims || [],
        correctConcepts: ev.correctConcepts || [],
        incorrectConcepts: ev.incorrectConcepts || [],
        missingConcepts: ev.missingConcepts || [],
        reasoningQuality: ev.reasoningQuality,
        practicalExperience: ev.practicalExperience,
        confidence: ev.confidence,
      }),
    );

    // Map competency scores to DTO
    const competencyScores = (evaluation.competencyScores || []).map((cs) => ({
      id: cs.id,
      competencyId: cs.competencyId,
      competencyName: cs.competency?.name || 'Technical Competency',
      score: cs.score,
      rating: cs.rating,
      justification: cs.justification,
      evidenceRefs: cs.evidenceRefs,
      sufficientEvidence: cs.sufficientEvidence,
    }));

    // Find candidate user details
    const candidateUser =
      session.candidate ||
      (await this.userRepository.findOne({
        where: { id: session.candidateId },
      }));

    const candidateName = candidateUser?.name || 'Candidate';
    const candidateEmail = candidateUser?.email || '';

    // Check for existing report
    const existingReport = await this.reportRepository.findOne({
      where: { sessionId },
    });

    const reportId = existingReport ? existingReport.id : crypto.randomUUID();
    const generatedAtIso = new Date().toISOString();

    const reportData: ComprehensiveInterviewReport = {
      id: reportId,
      sessionId: session.id,
      evaluationId: evaluation.id,
      candidateName,
      candidateEmail,
      domain: session.domain,
      targetRole: session.targetRole,
      experienceLevel: session.experienceLevel,
      difficulty: session.difficulty,
      durationMinutes: session.durationMinutes,
      actualDurationSeconds,
      sessionStatus: session.status,
      overallScore: evaluation.overallScore,
      overallRating: evaluation.overallRating,
      summary: evaluation.summary,
      competencyScores,
      detailedEvidence,
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      incorrectStatements: evaluation.incorrectStatements || [],
      areasNotAssessed: evaluation.areasNotAssessed || [],
      recommendations: evaluation.recommendations || [],
      suggestedNextDifficulty: evaluation.suggestedNextDifficulty,
      evaluatorModel: evaluation.evaluatorModel,
      evaluatorProvider: evaluation.evaluatorProvider,
      transcriptLength: session.transcript ? session.transcript.length : 0,
      status: ReportStatus.GENERATED,
      generatedAt: generatedAtIso,
    };

    if (existingReport) {
      existingReport.evaluationId = evaluation.id;
      existingReport.reportData = reportData;
      existingReport.status = ReportStatus.GENERATED;
      existingReport.generatedAt = new Date();
      await this.reportRepository.save(existingReport);
    } else {
      const reportEntity = this.reportRepository.create({
        id: reportId,
        sessionId: session.id,
        evaluationId: evaluation.id,
        reportData,
        status: ReportStatus.GENERATED,
        generatedAt: new Date(),
      });
      await this.reportRepository.save(reportEntity);
    }

    this.logger.log(
      `Successfully generated and persisted report ${reportId} for session ${sessionId}`,
    );

    return reportData;
  }

  /**
   * Retrieve the saved report for a session, or generate it if absent.
   */
  async getReport(
    sessionId: string,
    userId?: string,
  ): Promise<ComprehensiveInterviewReport> {
    if (userId) {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Interview session ${sessionId} not found`);
      }
      if (session.candidateId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to view this report',
        );
      }
    }

    const existing = await this.reportRepository.findOne({
      where: { sessionId },
    });

    if (existing && existing.reportData) {
      return existing.reportData;
    }

    return this.generateReport(sessionId, userId);
  }

  /**
   * Compute aggregated metrics for the candidate dashboard across all completed & active sessions.
   */
  async getCandidateDashboardMetrics(
    candidateId: string,
  ): Promise<CandidateDashboardMetrics> {
    this.logger.log(
      `Computing candidate dashboard metrics for user: ${candidateId}`,
    );

    // Fetch all interview sessions for the candidate
    const sessions = await this.sessionRepository.find({
      where: { candidateId },
      order: { createdAt: 'DESC' },
    });

    const totalInterviews = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === InterviewStatus.COMPLETED,
    );
    const completedInterviews = completedSessions.length;
    const inProgressInterviews = sessions.filter(
      (s) =>
        s.status === InterviewStatus.IN_PROGRESS ||
        s.status === InterviewStatus.CREATED,
    ).length;

    // Load all evaluations for these sessions
    const sessionIds = sessions.map((s) => s.id);
    let evaluations: EvaluationEntity[] = [];

    if (sessionIds.length > 0) {
      evaluations = await this.evaluationRepository
        .createQueryBuilder('evaluation')
        .leftJoinAndSelect('evaluation.competencyScores', 'competencyScores')
        .leftJoinAndSelect('competencyScores.competency', 'competency')
        .where('evaluation.sessionId IN (:...sessionIds)', { sessionIds })
        .orderBy('evaluation.createdAt', 'DESC')
        .getMany();
    }

    // Load all reports to know which sessions have a finalized report
    let reports: InterviewReportEntity[] = [];
    if (sessionIds.length > 0) {
      reports = await this.reportRepository
        .createQueryBuilder('report')
        .where('report.sessionId IN (:...sessionIds)', { sessionIds })
        .getMany();
    }
    const reportSessionSet = new Set(reports.map((r) => r.sessionId));

    // Map evaluation by sessionId for O(1) lookup
    const evalMap = new Map<string, EvaluationEntity>();
    for (const ev of evaluations) {
      evalMap.set(ev.sessionId, ev);
    }

    // Rating distribution
    const ratingDistribution: Record<EvaluationRating, number> = {
      [EvaluationRating.NOT_ASSESSED]: 0,
      [EvaluationRating.POOR]: 0,
      [EvaluationRating.DEVELOPING]: 0,
      [EvaluationRating.PROFICIENT]: 0,
      [EvaluationRating.STRONG]: 0,
    };

    let totalScoreSum = 0;
    let scoredCount = 0;
    let highestScore: number | null = null;

    for (const ev of evaluations) {
      if (ev.overallRating !== undefined && ev.overallRating !== null) {
        ratingDistribution[ev.overallRating] =
          (ratingDistribution[ev.overallRating] || 0) + 1;
      }
      if (ev.overallScore !== null && ev.overallScore !== undefined) {
        totalScoreSum += ev.overallScore;
        scoredCount += 1;
        if (highestScore === null || ev.overallScore > highestScore) {
          highestScore = ev.overallScore;
        }
      }
    }

    const averageScore =
      scoredCount > 0
        ? Math.round((totalScoreSum / scoredCount) * 10) / 10
        : null;

    // Competency aggregation across evaluations
    const compMap = new Map<
      string,
      {
        competencyId: string;
        competencyName: string;
        category: string;
        scores: number[];
        latestScore: number;
      }
    >();

    for (const ev of evaluations) {
      for (const cs of ev.competencyScores || []) {
        if (cs.score !== null && cs.score !== undefined) {
          const compId = cs.competencyId;
          const compName = cs.competency?.name || 'Technical Competency';
          const category = cs.competency?.category || 'Technical';

          if (!compMap.has(compId)) {
            compMap.set(compId, {
              competencyId: compId,
              competencyName: compName,
              category,
              scores: [cs.score],
              latestScore: cs.score,
            });
          } else {
            const entry = compMap.get(compId)!;
            entry.scores.push(cs.score);
          }
        }
      }
    }

    const competencyPerformance: CompetencyPerformanceSummary[] = Array.from(
      compMap.values(),
    ).map((item) => {
      const avg =
        item.scores.reduce((a, b) => a + b, 0) / (item.scores.length || 1);
      return {
        competencyId: item.competencyId,
        competencyName: item.competencyName,
        category: item.category,
        averageScore: Math.round(avg * 10) / 10,
        latestScore: Math.round(item.latestScore * 10) / 10,
        evaluationsCount: item.scores.length,
      };
    });

    // Recent session summaries
    const recentSessions: CandidateSessionSummary[] = sessions.map((s) => {
      const ev = evalMap.get(s.id);
      let actualDurationSeconds: number | null = null;
      if (s.startedAt) {
        const endTime = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
        actualDurationSeconds = Math.max(
          0,
          Math.round((endTime - new Date(s.startedAt).getTime()) / 1000),
        );
      }

      return {
        id: s.id,
        domain: s.domain,
        targetRole: s.targetRole,
        difficulty: s.difficulty,
        status: s.status,
        overallScore: ev?.overallScore ?? null,
        overallRating: ev?.overallRating ?? null,
        durationMinutes: s.durationMinutes,
        actualDurationSeconds,
        hasReport: reportSessionSet.has(s.id) || !!ev,
        createdAt: s.createdAt
          ? new Date(s.createdAt).toISOString()
          : new Date().toISOString(),
        endedAt: s.endedAt ? new Date(s.endedAt).toISOString() : null,
      };
    });

    // Distinct strengths & weaknesses across evaluations
    const strengthsSet = new Set<string>();
    const focusAreasSet = new Set<string>();

    for (const ev of evaluations) {
      for (const s of ev.strengths || []) {
        strengthsSet.add(s);
      }
      for (const w of ev.weaknesses || []) {
        focusAreasSet.add(w);
      }
    }

    const topStrengths = Array.from(strengthsSet).slice(0, 5);
    const focusAreas = Array.from(focusAreasSet).slice(0, 5);

    // Latest recommended difficulty
    const latestEvaluation = evaluations[0];
    const suggestedDifficulty =
      latestEvaluation?.suggestedNextDifficulty ?? InterviewDifficulty.MEDIUM;

    const recommendedTopics =
      focusAreas.length > 0
        ? focusAreas.slice(0, 3)
        : ['Distributed Systems', 'Caching Strategies', 'Concurrency'];

    return {
      totalInterviews,
      completedInterviews,
      inProgressInterviews,
      averageScore,
      highestScore,
      ratingDistribution,
      competencyPerformance,
      recentSessions,
      topStrengths,
      focusAreas,
      recommendedNextStep: {
        suggestedDifficulty,
        recommendedTopics,
      },
    };
  }
}
