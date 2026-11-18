import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvaluationService } from './evaluation.service.js';
import { EvaluationEntity } from './entities/evaluation.entity.js';
import { CompetencyScoreEntity } from './entities/competency-score.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { Competency } from '../tracks/entities/competency.entity.js';
import { Question } from '../tracks/entities/question.entity.js';
import type { EvidenceService } from '../evidence/evidence.service.js';
import type { ProviderRegistryService } from '../ai/provider-registry.service.js';
import type { Repository } from 'typeorm';
import {
  EvaluationRating,
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewStatus,
  InterviewStage,
  InterviewMode,
  InterviewerPersonality,
  ReasoningQuality,
} from '@interviewai/shared-types';

describe('EvaluationService', () => {
  let service: EvaluationService;
  let evalRepo: Partial<Repository<EvaluationEntity>>;
  let scoreRepo: Partial<Repository<CompetencyScoreEntity>>;
  let sessionRepo: Partial<Repository<InterviewSessionEntity>>;
  let competencyRepo: Partial<Repository<Competency>>;
  let evidenceService: Partial<EvidenceService>;
  let providerRegistry: Partial<ProviderRegistryService>;

  const mockCompetency: Competency = {
    id: 'comp-eval-1',
    domain: ProfessionalDomain.SDE,
    name: 'Distributed Systems',
    slug: 'distributed-systems',
    category: 'Architecture',
    description: 'System design and distributed computing',
    isActive: true,
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQuestion: Question = {
    id: 'q-eval-1',
    competencyId: 'comp-eval-1',
    competency: mockCompetency,
    domain: ProfessionalDomain.SDE,
    companyCategories: [CompanyCategory.PRODUCT_COMPANY],
    experienceLevels: [ExperienceLevel.SDE_1],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'Design Rate Limiter',
    stem: 'Design a distributed rate limiter.',
    contextPrompt: 'Context',
    expectedConcepts: ['Token Bucket', 'Redis'],
    commonMisconceptions: ['Single server counter'],
    probingQuestions: [],
    rubricGuide: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: Partial<InterviewSessionEntity> = {
    id: 'session-eval-1',
    candidateId: 'user-eval-1',
    domain: ProfessionalDomain.SDE,
    companyCategory: CompanyCategory.PRODUCT_COMPANY,
    targetRole: 'Senior Backend Engineer',
    experienceLevel: ExperienceLevel.SENIOR,
    difficulty: InterviewDifficulty.MEDIUM,
    durationMinutes: 30,
    personality: InterviewerPersonality.PROFESSIONAL,
    mode: InterviewMode.PRACTICE,
    status: InterviewStatus.IN_PROGRESS,
    currentStage: InterviewStage.WRAP_UP,
    coveredConcepts: ['Token Bucket', 'Redis'],
    currentQuestion: mockQuestion,
    transcript: [
      {
        id: 't-1',
        role: 'assistant' as any,
        text: 'How would you scale rate limiting across multiple regions?',
        timestamp: Date.now() - 60000,
      },
      {
        id: 't-2',
        role: 'candidate' as any,
        text: 'I would use Redis with token bucket per local region and batch synchronize quotas asynchronously.',
        timestamp: Date.now() - 30000,
      },
    ],
  };

  const mockEvidence = [
    {
      id: 'ev-1',
      sessionId: 'session-eval-1',
      competencyId: 'comp-eval-1',
      questionAsked: 'How would you scale rate limiting?',
      candidateAnswer: 'I would use Redis with token bucket...',
      technicalClaims: ['Redis token bucket', 'Asynchronous synchronization'],
      correctConcepts: ['Token Bucket', 'Redis'],
      incorrectConcepts: [],
      missingConcepts: [],
      reasoningQuality: ReasoningQuality.GOOD,
      practicalExperience: true,
      confidence: 0.9,
      notes: 'Strong candidate answer',
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    let savedEvaluation: EvaluationEntity | null = null;
    let savedScores: CompetencyScoreEntity[] = [];

    evalRepo = {
      create: vi.fn().mockImplementation((dto: any) => ({
        ...dto,
        id: 'eval-123',
        createdAt: new Date(),
      })),
      save: vi.fn().mockImplementation((entity: any) => {
        savedEvaluation = entity;
        return Promise.resolve(entity);
      }),
      findOne: vi.fn().mockImplementation(({ where }: any) => {
        if (where?.sessionId === 'session-eval-1' && savedEvaluation) {
          return Promise.resolve(
            Object.assign(new EvaluationEntity(), savedEvaluation, {
              competencyScores: savedScores,
            }),
          );
        }
        return Promise.resolve(null);
      }),
      remove: vi.fn().mockImplementation((entity: any) => {
        if (savedEvaluation?.id === entity.id) savedEvaluation = null;
        return Promise.resolve(entity);
      }),
    };

    scoreRepo = {
      create: vi.fn().mockImplementation((dto: any) => ({
        ...dto,
        id: `cs-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date(),
      })),
      save: vi.fn().mockImplementation((entities: any) => {
        const arr = Array.isArray(entities) ? entities : [entities];
        savedScores = [...savedScores, ...arr];
        return Promise.resolve(arr);
      }),
      remove: vi.fn().mockImplementation((entities: any) => {
        savedScores = [];
        return Promise.resolve(entities);
      }),
    };

    sessionRepo = {
      findOne: vi.fn().mockImplementation(({ where }: any) => {
        if (where?.id === 'session-eval-1') {
          return Promise.resolve(
            Object.assign(new InterviewSessionEntity(), mockSession),
          );
        }
        return Promise.resolve(null);
      }),
      save: vi
        .fn()
        .mockImplementation((entity: any) => Promise.resolve(entity)),
    };

    competencyRepo = {
      find: vi
        .fn()
        .mockResolvedValue([Object.assign(new Competency(), mockCompetency)]),
    };

    evidenceService = {
      getEvidenceBySession: vi.fn().mockResolvedValue(mockEvidence as any),
    };

    providerRegistry = {
      getActiveEvaluationProvider: vi.fn().mockReturnValue({
        name: 'mock',
        isConfigured: true,
        evaluateSession: vi.fn().mockResolvedValue({
          id: 'mock-eval-report',
          sessionId: 'session-eval-1',
          overallScore: 3.5,
          overallRating: EvaluationRating.STRONG,
          summary: 'Candidate demonstrated deep distributed systems expertise.',
          competencyScores: [
            {
              competencyId: 'comp-eval-1',
              competencyName: 'Distributed Systems',
              score: 3.5,
              rating: EvaluationRating.STRONG,
              justification:
                'Excellent understanding of token buckets and concurrency.',
              sufficientEvidence: true,
            },
          ],
          strengths: ['Clear explanation of Redis token bucket'],
          weaknesses: ['Could discuss disaster recovery in more detail'],
          incorrectStatements: [],
          areasNotAssessed: [],
          recommendations: [
            'Explore multi-DC active-active consistency models',
          ],
          suggestedNextDifficulty: InterviewDifficulty.HARD,
          generatedAt: new Date().toISOString(),
        }),
      }),
    };

    service = new EvaluationService(
      evalRepo as Repository<EvaluationEntity>,
      scoreRepo as Repository<CompetencyScoreEntity>,
      sessionRepo as Repository<InterviewSessionEntity>,
      competencyRepo as Repository<Competency>,
      evidenceService as EvidenceService,
      providerRegistry as ProviderRegistryService,
    );
  });

  it('should evaluate session and persist evaluation entity with competency scores', async () => {
    const evaluation = await service.evaluateSession('session-eval-1');

    expect(evaluation).toBeDefined();
    expect(evaluation.overallScore).toBe(3.5);
    expect(evaluation.overallRating).toBe(EvaluationRating.STRONG);
    expect(evaluation.summary).toContain('distributed systems expertise');
    expect(evaluation.competencyScores).toHaveLength(1);
    expect(evaluation.competencyScores[0].evidenceRefs).toContain('ev-1');
    expect(sessionRepo.save).toHaveBeenCalled();
  });

  it('should mark interview session status as COMPLETED after evaluation', async () => {
    await service.evaluateSession('session-eval-1');

    expect(sessionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: InterviewStatus.COMPLETED,
      }),
    );
  });

  it('should retrieve existing evaluation and map correctly to InterviewReport', async () => {
    await service.evaluateSession('session-eval-1');

    const retrieved = await service.getEvaluation('session-eval-1');
    expect(retrieved).not.toBeNull();

    const report = service.mapToReport(retrieved!);
    expect(report.sessionId).toBe('session-eval-1');
    expect(report.overallScore).toBe(3.5);
    expect(report.competencyScores[0].evidenceRefs).toContain('ev-1');
  });
});
