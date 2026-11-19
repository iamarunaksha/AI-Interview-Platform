import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TracksService } from './tracks.service.js';
import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Competency } from './entities/competency.entity.js';
import type { Question } from './entities/question.entity.js';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
} from '@interviewai/shared-types';

describe('TracksService', () => {
  let tracksService: TracksService;
  let mockCompetencyRepo: Partial<Repository<Competency>>;
  let mockQuestionRepo: Partial<Repository<Question>>;

  const mockCompetencies: Competency[] = [
    {
      id: 'comp-1',
      domain: ProfessionalDomain.SDE,
      name: 'System Design',
      slug: 'sde_system_design',
      category: 'Architecture',
      description: 'Distributed systems',
      isActive: true,
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'comp-2',
      domain: ProfessionalDomain.SDE,
      name: 'Problem Solving',
      slug: 'sde_dsa_problem_solving',
      category: 'Problem Solving',
      description: 'Data structures',
      isActive: true,
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockQuestions: Question[] = [
    {
      id: 'q-1',
      competencyId: 'comp-1',
      competency: mockCompetencies[0],
      domain: ProfessionalDomain.SDE,
      companyCategories: [CompanyCategory.FAANG_STYLE],
      experienceLevels: [ExperienceLevel.SDE_2],
      difficulty: InterviewDifficulty.MEDIUM,
      title: 'Rate Limiter',
      stem: 'Design a distributed rate limiter',
      contextPrompt: 'Context',
      expectedConcepts: ['Token Bucket'],
      commonMisconceptions: ['Local memory counter'],
      probingQuestions: [],
      rubricGuide: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'q-2',
      competencyId: 'comp-2',
      competency: mockCompetencies[1],
      domain: ProfessionalDomain.SDE,
      companyCategories: [CompanyCategory.FAANG_STYLE],
      experienceLevels: [ExperienceLevel.SDE_2],
      difficulty: InterviewDifficulty.MEDIUM,
      title: 'LRU Cache',
      stem: 'Implement an LRU Cache',
      contextPrompt: 'Context',
      expectedConcepts: ['HashMap + DoublyLinkedList'],
      commonMisconceptions: ['Singly linked list'],
      probingQuestions: [],
      rubricGuide: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockCompetencyRepo = {
      count: vi.fn().mockResolvedValue(2),
      find: vi.fn().mockResolvedValue(mockCompetencies),
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((data: any) => data),
      save: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
    };

    const mockQueryBuilder = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue(mockQuestions),
    };

    mockQuestionRepo = {
      count: vi.fn().mockResolvedValue(2),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
      findOne: vi
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const found = mockQuestions.find((q) => q.id === where.id);
          return Promise.resolve(found ?? null);
        }),
      create: vi.fn().mockImplementation((data: any) => data),
      save: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
    };

    tracksService = new TracksService(
      mockCompetencyRepo as Repository<Competency>,
      mockQuestionRepo as Repository<Question>,
    );
  });

  describe('getCompetencies', () => {
    it('should return all active competencies for domain', async () => {
      const result = await tracksService.getCompetencies(
        ProfessionalDomain.SDE,
      );
      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('sde_system_design');
    });
  });

  describe('getQuestionById', () => {
    it('should return question when found', async () => {
      const q = await tracksService.getQuestionById('q-1');
      expect(q.id).toBe('q-1');
      expect(q.title).toBe('Rate Limiter');
      expect(q.competency?.slug).toBe('sde_system_design');
    });

    it('should throw NotFoundException when question does not exist', async () => {
      await expect(
        tracksService.getQuestionById('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('planInterview', () => {
    it('should generate an interview plan with balanced questions and competencies', async () => {
      const plan = await tracksService.planInterview({
        domain: ProfessionalDomain.SDE,
        companyCategory: CompanyCategory.FAANG_STYLE,
        targetRole: 'Backend Engineer',
        experienceLevel: ExperienceLevel.SDE_2,
        difficulty: InterviewDifficulty.MEDIUM,
        durationMinutes: 45,
      });

      expect(plan.sessionTrack.domain).toBe(ProfessionalDomain.SDE);
      expect(plan.competencies).toHaveLength(2);
      expect(plan.questions.length).toBeGreaterThan(0);
      expect(plan.questions[0].title).toBe('Rate Limiter');
    });

    it('should plan an SAP Enterprise interview session with SAP competencies', async () => {
      const sapCompetency: Competency = {
        id: 'comp-sap-1',
        domain: ProfessionalDomain.SAP,
        name: 'SAP Clean Core & S/4HANA Architecture',
        slug: 'sap_s4hana_core_clean_core',
        category: 'Enterprise Architecture',
        description: 'Universal Journal and Clean Core',
        isActive: true,
        questions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sapQuestion: Question = {
        id: 'q-sap-1',
        competencyId: 'comp-sap-1',
        competency: sapCompetency,
        domain: ProfessionalDomain.SAP,
        companyCategories: [CompanyCategory.SAP_CONSULTING],
        experienceLevels: [ExperienceLevel.SENIOR],
        difficulty: InterviewDifficulty.HARD,
        title: 'SAP Clean Core Extensibility Strategy',
        stem: 'Explain the 3-tier extensibility model',
        contextPrompt: 'Context',
        expectedConcepts: [
          'Tier 1 Key User',
          'Tier 2 Embedded Steampunk',
          'Tier 3 BTP',
        ],
        commonMisconceptions: ['Direct table modification'],
        probingQuestions: [],
        rubricGuide: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockCompetencyRepo.find!).mockResolvedValueOnce([
        sapCompetency,
      ]);
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([sapQuestion]),
      };
      vi.mocked(mockQuestionRepo.createQueryBuilder!).mockReturnValueOnce(
        mockQueryBuilder as any,
      );

      const plan = await tracksService.planInterview({
        domain: ProfessionalDomain.SAP,
        companyCategory: CompanyCategory.SAP_CONSULTING,
        targetRole: 'SAP S/4HANA Solution Architect',
        experienceLevel: ExperienceLevel.SENIOR,
        difficulty: InterviewDifficulty.HARD,
        durationMinutes: 45,
      });

      expect(plan.sessionTrack.domain).toBe(ProfessionalDomain.SAP);
      expect(plan.competencies).toHaveLength(1);
      expect(plan.competencies[0].slug).toBe('sap_s4hana_core_clean_core');
      expect(plan.questions).toHaveLength(1);
      expect(plan.questions[0].title).toBe(
        'SAP Clean Core Extensibility Strategy',
      );
    });
  });
});
