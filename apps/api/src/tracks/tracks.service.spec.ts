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
  });
});
