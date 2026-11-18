import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvidenceService } from './evidence.service.js';
import { EvidenceExtractorService } from './evidence-extractor.service.js';
import { EvidenceRecordEntity } from './entities/evidence-record.entity.js';
import { InterviewSessionEntity } from '../interview/entities/interview-session.entity.js';
import { Question } from '../tracks/entities/question.entity.js';
import type { ProviderRegistryService } from '../ai/provider-registry.service.js';
import type { Repository } from 'typeorm';
import {
  ReasoningQuality,
  MessageRole,
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewStatus,
  InterviewStage,
  InterviewMode,
  InterviewerPersonality,
} from '@interviewai/shared-types';

describe('EvidenceService & EvidenceExtractorService', () => {
  let evidenceService: EvidenceService;
  let extractorService: EvidenceExtractorService;
  let evidenceRepo: Partial<Repository<EvidenceRecordEntity>>;
  let sessionRepo: Partial<Repository<InterviewSessionEntity>>;
  let providerRegistry: Partial<ProviderRegistryService>;

  const mockQuestion: Question = {
    id: 'q-101',
    competencyId: 'comp-101',
    competency: {
      id: 'comp-101',
      domain: ProfessionalDomain.SDE,
      name: 'Distributed Systems',
      slug: 'distributed-systems',
      category: 'Architecture',
      description: 'System design competency',
      isActive: true,
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    domain: ProfessionalDomain.SDE,
    companyCategories: [CompanyCategory.PRODUCT_COMPANY],
    experienceLevels: [ExperienceLevel.SDE_1],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'Design Consistent Hashing',
    stem: 'Explain how consistent hashing avoids massive key remapping.',
    contextPrompt: 'Focus on virtual nodes and partition balance.',
    expectedConcepts: [
      'Hash ring abstraction',
      'Virtual nodes for uniform distribution',
      'Clockwise successor lookup',
    ],
    commonMisconceptions: [
      'Adding a node invalidates all keys',
      'Virtual nodes increase latency exponentially',
    ],
    probingQuestions: [],
    rubricGuide: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: Partial<InterviewSessionEntity> = {
    id: 'session-evidence-1',
    candidateId: 'user-cand-1',
    domain: ProfessionalDomain.SDE,
    companyCategory: CompanyCategory.PRODUCT_COMPANY,
    targetRole: 'Backend Engineer',
    experienceLevel: ExperienceLevel.SDE_1,
    difficulty: InterviewDifficulty.MEDIUM,
    durationMinutes: 30,
    personality: InterviewerPersonality.PROFESSIONAL,
    mode: InterviewMode.PRACTICE,
    status: InterviewStatus.IN_PROGRESS,
    currentStage: InterviewStage.PROBING,
    coveredConcepts: [],
    currentQuestion: mockQuestion as Question,
    transcript: [
      {
        id: 'turn-1',
        role: MessageRole.ASSISTANT,
        text: 'How does consistent hashing mitigate node failure?',
        timestamp: Date.now() - 10000,
      },
      {
        id: 'turn-2',
        role: MessageRole.CANDIDATE,
        text: 'Consistent hashing uses a hash ring abstraction where keys map to clockwise successor nodes. In production at scale, we use virtual nodes for uniform distribution to avoid hot spots and handle failover smoothly.',
        timestamp: Date.now() - 5000,
      },
    ],
  };

  beforeEach(() => {
    providerRegistry = {
      getActiveLlmProvider: vi.fn().mockReturnValue({
        name: 'mock',
        isConfigured: true,
        generateText: vi.fn(),
      } as any),
    };

    extractorService = new EvidenceExtractorService(
      providerRegistry as ProviderRegistryService,
    );

    const savedRecords: EvidenceRecordEntity[] = [];

    evidenceRepo = {
      create: vi.fn().mockImplementation((dto: any) => ({
        ...dto,
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date(),
      })),
      save: vi.fn().mockImplementation((entity: any) => {
        savedRecords.push(entity);
        return Promise.resolve(entity);
      }),
      find: vi.fn().mockImplementation(({ where }: any) => {
        return Promise.resolve(
          savedRecords.filter((r) => {
            if (where?.sessionId && r.sessionId !== where.sessionId)
              return false;
            if (where?.competencyId && r.competencyId !== where.competencyId)
              return false;
            return true;
          }),
        );
      }),
    };

    sessionRepo = {
      findOne: vi.fn().mockImplementation(({ where }: any) => {
        if (where?.id === 'session-evidence-1') {
          return Promise.resolve(
            Object.assign(new InterviewSessionEntity(), mockSession),
          );
        }
        return Promise.resolve(null);
      }),
    };

    evidenceService = new EvidenceService(
      evidenceRepo as Repository<EvidenceRecordEntity>,
      sessionRepo as Repository<InterviewSessionEntity>,
      extractorService,
    );
  });

  describe('EvidenceExtractorService', () => {
    it('should extract correct concepts, technical claims, and detect practical experience', () => {
      const answer =
        'Consistent hashing uses a hash ring abstraction where servers are mapped. In production at scale, virtual nodes for uniform distribution are essential to avoid hot spots during failover incidents.';

      const result = extractorService.extractWithHeuristics(
        mockQuestion.stem,
        answer,
        mockQuestion.expectedConcepts,
        mockQuestion.commonMisconceptions,
      );

      expect(result.correctConcepts).toContain('Hash ring abstraction');
      expect(result.correctConcepts).toContain(
        'Virtual nodes for uniform distribution',
      );
      expect(result.missingConcepts).toContain('Clockwise successor lookup');
      expect(result.incorrectConcepts).toHaveLength(0);
      expect(result.practicalExperience).toBe(true);
      expect([ReasoningQuality.GOOD, ReasoningQuality.EXCELLENT]).toContain(
        result.reasoningQuality,
      );
      expect(result.technicalClaims.length).toBeGreaterThan(0);
    });

    it('should detect misconceptions and flag poor/fair reasoning', () => {
      const answer =
        'Consistent hashing means adding a node invalidates all keys completely, so we must reload cache.';

      const result = extractorService.extractWithHeuristics(
        mockQuestion.stem,
        answer,
        mockQuestion.expectedConcepts,
        mockQuestion.commonMisconceptions,
      );

      expect(result.incorrectConcepts).toContain(
        'Adding a node invalidates all keys',
      );
      expect([ReasoningQuality.POOR, ReasoningQuality.FAIR]).toContain(
        result.reasoningQuality,
      );
    });

    it('should return poor quality for short or trivial responses', async () => {
      const result = await extractorService.extractEvidence({
        questionAsked: 'Explain consistent hashing',
        candidateAnswer: 'I do not know.',
        expectedConcepts: mockQuestion.expectedConcepts,
      });

      expect(result.reasoningQuality).toBe(ReasoningQuality.POOR);
      expect(result.practicalExperience).toBe(false);
      expect(result.missingConcepts).toHaveLength(
        mockQuestion.expectedConcepts.length,
      );
    });
  });

  describe('EvidenceService', () => {
    it('should extract and persist an evidence record linked to session and competency', async () => {
      const record = await evidenceService.extractAndSaveEvidence({
        sessionId: 'session-evidence-1',
        questionAsked: 'Explain consistent hashing',
        candidateAnswer:
          'Consistent hashing uses a hash ring abstraction. In production at scale, we configure virtual nodes for uniform distribution.',
      });

      expect(record.sessionId).toBe('session-evidence-1');
      expect(record.competencyId).toBe('comp-101');
      expect(record.correctConcepts.length).toBeGreaterThan(0);
      expect(record.technicalClaims.length).toBeGreaterThan(0);
      expect(evidenceRepo.save).toHaveBeenCalled();
    });

    it('should list evidence records by session and competency', async () => {
      await evidenceService.extractAndSaveEvidence({
        sessionId: 'session-evidence-1',
        questionAsked: 'Explain consistent hashing',
        candidateAnswer:
          'Consistent hashing uses a hash ring abstraction with virtual nodes for uniform distribution in production.',
      });

      const sessionRecords =
        await evidenceService.getEvidenceBySession('session-evidence-1');
      expect(sessionRecords).toHaveLength(1);

      const compRecords = await evidenceService.getEvidenceByCompetency(
        'session-evidence-1',
        'comp-101',
      );
      expect(compRecords).toHaveLength(1);
    });

    it('should batch extract evidence across un-extracted transcript turns', async () => {
      const batchRecords =
        await evidenceService.batchExtractFromTranscript('session-evidence-1');

      expect(batchRecords).toHaveLength(1);
      expect(batchRecords[0].turnId).toBe('turn-2');
      expect(batchRecords[0].candidateAnswer).toContain('Consistent hashing');

      // Subsequent batch extract should not duplicate existing turn
      const secondBatch =
        await evidenceService.batchExtractFromTranscript('session-evidence-1');
      expect(secondBatch).toHaveLength(0);
    });
  });
});
