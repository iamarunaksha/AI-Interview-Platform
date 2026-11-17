import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CandidatesService } from './candidates.service.js';
import type { Repository } from 'typeorm';
import type { CandidateProfile } from './candidate-profile.entity.js';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewerPersonality,
  InterviewMode,
} from '@interviewai/shared-types';

describe('CandidatesService', () => {
  let candidatesService: CandidatesService;
  let mockProfileRepo: Partial<Repository<CandidateProfile>>;

  beforeEach(() => {
    mockProfileRepo = {
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((data: any) => ({
        id: 'p-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferredDifficulty: InterviewDifficulty.MEDIUM,
        preferredDurationMinutes: 45,
        preferredPersonality: InterviewerPersonality.PROFESSIONAL,
        preferredMode: InterviewMode.PRACTICE,
        isOnboarded: false,
        preferences: {},
        ...data,
      })),
      save: vi
        .fn()
        .mockImplementation((entity: any) => Promise.resolve(entity)),
    } as unknown as Partial<Repository<CandidateProfile>>;

    candidatesService = new CandidatesService(
      mockProfileRepo as Repository<CandidateProfile>,
    );
  });

  describe('getOrCreateProfile', () => {
    it('should return existing profile if present', async () => {
      const existingProfile = {
        id: 'p-1',
        userId: 'u-1',
        domain: ProfessionalDomain.SDE,
        companyCategory: CompanyCategory.FAANG_STYLE,
        targetRole: 'Fullstack',
        experienceLevel: ExperienceLevel.SDE_2,
        preferredDifficulty: InterviewDifficulty.HARD,
        preferredDurationMinutes: 60,
        preferredPersonality: InterviewerPersonality.PROFESSIONAL,
        preferredMode: InterviewMode.ASSESSMENT,
        resumeUrl: null,
        resumeFileName: null,
        resumeSummary: null,
        isOnboarded: true,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CandidateProfile;

      vi.spyOn(mockProfileRepo, 'findOne').mockResolvedValue(existingProfile);

      const profile = await candidatesService.getOrCreateProfile('u-1');
      expect(profile.id).toBe('p-1');
      expect(profile.domain).toBe(ProfessionalDomain.SDE);
      expect(profile.isOnboarded).toBe(true);
    });

    it('should create and return a new profile if not found', async () => {
      vi.spyOn(mockProfileRepo, 'findOne').mockResolvedValue(null);

      const profile = await candidatesService.getOrCreateProfile('u-2');
      expect(profile.userId).toBe('u-2');
      expect(profile.isOnboarded).toBe(false);
      expect(mockProfileRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should mark isOnboarded true when domain, companyCategory, and experienceLevel are set', async () => {
      const existingProfile = {
        id: 'p-1',
        userId: 'u-1',
        domain: null,
        companyCategory: null,
        targetRole: null,
        experienceLevel: null,
        preferredDifficulty: InterviewDifficulty.MEDIUM,
        preferredDurationMinutes: 45,
        preferredPersonality: InterviewerPersonality.PROFESSIONAL,
        preferredMode: InterviewMode.PRACTICE,
        resumeUrl: null,
        resumeFileName: null,
        resumeSummary: null,
        isOnboarded: false,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as CandidateProfile;

      vi.spyOn(mockProfileRepo, 'findOne').mockResolvedValue(existingProfile);

      const updated = await candidatesService.updateProfile('u-1', {
        domain: ProfessionalDomain.SDE,
        companyCategory: CompanyCategory.PRODUCT_COMPANY,
        experienceLevel: ExperienceLevel.SDE_1,
      });

      expect(updated.isOnboarded).toBe(true);
      expect(updated.domain).toBe(ProfessionalDomain.SDE);
      expect(updated.companyCategory).toBe(CompanyCategory.PRODUCT_COMPANY);
    });
  });
});
