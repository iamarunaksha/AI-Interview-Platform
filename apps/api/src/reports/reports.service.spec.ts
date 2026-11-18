import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportsService } from './reports.service.js';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewStatus,
  InterviewStage,
  InterviewMode,
  InterviewerPersonality,
  EvaluationRating,
  ReasoningQuality,
  ReportStatus,
} from '@interviewai/shared-types';
import { InterviewReportEntity } from './entities/interview-report.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { EvaluationEntity } from '../evaluation/entities/evaluation.entity.js';
import { EvidenceRecordEntity } from '../evidence/entities/evidence-record.entity.js';
import { User } from '../users/user.entity.js';
import { CompetencyScoreEntity } from '../evaluation/entities/competency-score.entity.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockReportRepo: any;
  let mockSessionRepo: any;
  let mockEvalRepo: any;
  let mockEvidenceRepo: any;
  let mockUserRepo: any;
  let mockEvaluationService: any;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'candidate@example.com',
    name: 'Alice Candidate',
    passwordHash: 'hash',
    status: 'active' as any,
    createdAt: new Date('2026-11-01'),
    updatedAt: new Date('2026-11-01'),
  };

  const mockSession: InterviewSessionEntity = {
    id: 'session-uuid-1',
    candidateId: 'user-uuid-1',
    candidate: mockUser,
    domain: ProfessionalDomain.SDE,
    companyCategory: CompanyCategory.PRODUCT_COMPANY,
    targetRole: 'Senior Backend Engineer',
    experienceLevel: ExperienceLevel.SDE_2,
    difficulty: InterviewDifficulty.HARD,
    durationMinutes: 45,
    personality: InterviewerPersonality.PROFESSIONAL,
    mode: InterviewMode.PRACTICE,
    status: InterviewStatus.COMPLETED,
    currentStage: InterviewStage.DEEP_DIVE,
    coveredConcepts: ['caching', 'sharding'],
    currentQuestionId: null,
    currentQuestion: null,
    transcript: [
      {
        id: 'turn-1',
        role: 'interviewer' as any,
        text: 'How do you handle cache invalidation?',
        timestamp: 1000,
      },
      {
        id: 'turn-2',
        role: 'candidate' as any,
        text: 'We use Redis with write-through cache and TTL to avoid stale keys.',
        timestamp: 2000,
      },
    ],
    startedAt: new Date(Date.now() - 1800 * 1000),
    endedAt: new Date(),
    createdAt: new Date(Date.now() - 1800 * 1000),
    updatedAt: new Date(),
  };

  const mockCompetencyScore: CompetencyScoreEntity = {
    id: 'cs-uuid-1',
    evaluationId: 'eval-uuid-1',
    evaluation: null as any,
    competencyId: 'comp-uuid-1',
    competency: {
      id: 'comp-uuid-1',
      name: 'System Design & Architecture',
      slug: 'system-design',
      domain: ProfessionalDomain.SDE,
      category: 'Architecture',
      description: 'Distributed systems architecture',
      isActive: true,
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    score: 3.5,
    rating: EvaluationRating.STRONG,
    justification: 'Excellent explanation of cache coherence.',
    evidenceRefs: ['ev-uuid-1'],
    sufficientEvidence: true,
    createdAt: new Date(),
  };

  const mockEvaluation: EvaluationEntity = {
    id: 'eval-uuid-1',
    sessionId: 'session-uuid-1',
    session: mockSession,
    overallScore: 3.5,
    overallRating: EvaluationRating.STRONG,
    summary: 'Candidate demonstrated strong mastery of distributed systems.',
    strengths: [
      'Deep understanding of caching patterns',
      'Clear communication',
    ],
    weaknesses: ['Could elaborate more on failover latency'],
    incorrectStatements: [],
    areasNotAssessed: [],
    recommendations: ['Review Paxos and Raft consensus algorithms'],
    suggestedNextDifficulty: InterviewDifficulty.HARD,
    evaluatorModel: 'gemini-2.0-flash',
    evaluatorProvider: 'gemini',
    competencyScores: [mockCompetencyScore],
    createdAt: new Date(),
  };

  const mockEvidenceRecord: EvidenceRecordEntity = {
    id: 'ev-uuid-1',
    sessionId: 'session-uuid-1',
    session: mockSession,
    competencyId: 'comp-uuid-1',
    competency: mockCompetencyScore.competency,
    questionAsked: 'How do you handle cache invalidation?',
    candidateAnswer:
      'We use Redis with write-through cache and TTL to avoid stale keys.',
    technicalClaims: ['Redis with write-through', 'TTL configuration'],
    correctConcepts: ['write-through', 'TTL', 'cache coherence'],
    incorrectConcepts: [],
    missingConcepts: [],
    reasoningQuality: ReasoningQuality.EXCELLENT,
    practicalExperience: true,
    confidence: 0.95,
    notes: 'Well articulated.',
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockReportRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((data: any) =>
        Object.assign(new InterviewReportEntity(), data),
      ),
      save: vi.fn((data: any) => Promise.resolve(data)),
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      })),
    };

    mockSessionRepo = {
      findOne: vi.fn().mockResolvedValue(mockSession),
      find: vi.fn().mockResolvedValue([mockSession]),
    };

    mockEvalRepo = {
      findOne: vi.fn().mockResolvedValue(mockEvaluation),
      createQueryBuilder: vi.fn(() => ({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockEvaluation]),
      })),
    };

    mockEvidenceRepo = {
      find: vi.fn().mockResolvedValue([mockEvidenceRecord]),
    };

    mockUserRepo = {
      findOne: vi.fn().mockResolvedValue(mockUser),
    };

    mockEvaluationService = {
      evaluateSession: vi.fn().mockResolvedValue(mockEvaluation),
    };

    service = new ReportsService(
      mockReportRepo,
      mockSessionRepo,
      mockEvalRepo,
      mockEvidenceRepo,
      mockUserRepo,
      mockEvaluationService,
    );
  });

  it('should generate a Comprehensive Interview Report with linked evidence and metadata', async () => {
    mockReportRepo.findOne.mockResolvedValue(null);

    const report = await service.generateReport('session-uuid-1');

    expect(report).toBeDefined();
    expect(report.sessionId).toBe('session-uuid-1');
    expect(report.evaluationId).toBe('eval-uuid-1');
    expect(report.candidateName).toBe('Alice Candidate');
    expect(report.overallScore).toBe(3.5);
    expect(report.overallRating).toBe(EvaluationRating.STRONG);
    expect(report.detailedEvidence).toHaveLength(1);
    expect(report.detailedEvidence[0].id).toBe('ev-uuid-1');
    expect(report.detailedEvidence[0].competencyName).toBe(
      'System Design & Architecture',
    );
    expect(report.competencyScores).toHaveLength(1);
    expect(report.status).toBe(ReportStatus.GENERATED);
    expect(report.strengths).toContain(
      'Deep understanding of caching patterns',
    );
    expect(mockReportRepo.save).toHaveBeenCalled();
  });

  it('should return cached report when getReport is called and report exists', async () => {
    const existingReportEntity: InterviewReportEntity = {
      id: 'report-uuid-1',
      sessionId: 'session-uuid-1',
      session: mockSession,
      evaluationId: 'eval-uuid-1',
      evaluation: mockEvaluation,
      reportData: {
        id: 'report-uuid-1',
        sessionId: 'session-uuid-1',
        evaluationId: 'eval-uuid-1',
        candidateName: 'Alice Candidate',
        candidateEmail: 'candidate@example.com',
        domain: ProfessionalDomain.SDE,
        targetRole: 'Senior Backend Engineer',
        experienceLevel: ExperienceLevel.SDE_2,
        difficulty: InterviewDifficulty.HARD,
        durationMinutes: 45,
        actualDurationSeconds: 1800,
        sessionStatus: InterviewStatus.COMPLETED,
        overallScore: 3.5,
        overallRating: EvaluationRating.STRONG,
        summary: 'Cached report summary',
        competencyScores: [],
        detailedEvidence: [],
        strengths: [],
        weaknesses: [],
        incorrectStatements: [],
        areasNotAssessed: [],
        recommendations: [],
        suggestedNextDifficulty: InterviewDifficulty.HARD,
        evaluatorModel: 'gemini-2.0-flash',
        evaluatorProvider: 'gemini',
        transcriptLength: 2,
        status: ReportStatus.GENERATED,
        generatedAt: new Date().toISOString(),
      },
      status: ReportStatus.GENERATED,
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockReportRepo.findOne.mockResolvedValue(existingReportEntity);

    const report = await service.getReport('session-uuid-1');

    expect(report.id).toBe('report-uuid-1');
    expect(report.summary).toBe('Cached report summary');
    // Ensure generateReport was not triggered
    expect(mockEvaluationService.evaluateSession).not.toHaveBeenCalled();
  });

  it('should compute candidate dashboard metrics across sessions', async () => {
    const metrics = await service.getCandidateDashboardMetrics('user-uuid-1');

    expect(metrics).toBeDefined();
    expect(metrics.totalInterviews).toBe(1);
    expect(metrics.completedInterviews).toBe(1);
    expect(metrics.averageScore).toBe(3.5);
    expect(metrics.highestScore).toBe(3.5);
    expect(metrics.ratingDistribution[EvaluationRating.STRONG]).toBe(1);
    expect(metrics.competencyPerformance).toHaveLength(1);
    expect(metrics.competencyPerformance[0].competencyName).toBe(
      'System Design & Architecture',
    );
    expect(metrics.recentSessions).toHaveLength(1);
    expect(metrics.recentSessions[0].id).toBe('session-uuid-1');
    expect(metrics.topStrengths).toContain(
      'Deep understanding of caching patterns',
    );
  });
});
