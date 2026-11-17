import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile } from './candidate-profile.entity.js';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto.js';
import type { CandidateProfileResponse } from '@interviewai/shared-types';

/**
 * CandidatesService — manages candidate profiles and onboarding state.
 */
@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profileRepository: Repository<CandidateProfile>,
  ) {}

  /**
   * Retrieves or automatically initializes a CandidateProfile for a user.
   */
  async getOrCreateProfile(userId: string): Promise<CandidateProfileResponse> {
    let profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.profileRepository.create({
        userId,
        preferences: {},
      });
      profile = await this.profileRepository.save(profile);
    }

    return this.toResponse(profile);
  }

  /**
   * Updates an existing candidate profile.
   * Marks isOnboarded = true if required onboarding selections are present.
   */
  async updateProfile(
    userId: string,
    dto: UpdateCandidateProfileDto,
  ): Promise<CandidateProfileResponse> {
    let profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.profileRepository.create({
        userId,
      });
    }

    Object.assign(profile, dto);

    // A candidate is considered onboarded if domain, companyCategory, and experienceLevel are set
    if (profile.domain && profile.companyCategory && profile.experienceLevel) {
      profile.isOnboarded = true;
    }

    const saved = await this.profileRepository.save(profile);
    return this.toResponse(saved);
  }

  /**
   * Maps entity to clean shared response shape.
   */
  private toResponse(entity: CandidateProfile): CandidateProfileResponse {
    return {
      id: entity.id,
      userId: entity.userId,
      domain: entity.domain,
      companyCategory: entity.companyCategory,
      targetRole: entity.targetRole,
      experienceLevel: entity.experienceLevel,
      preferredDifficulty: entity.preferredDifficulty,
      preferredDurationMinutes: entity.preferredDurationMinutes,
      preferredPersonality: entity.preferredPersonality,
      preferredMode: entity.preferredMode,
      resumeUrl: entity.resumeUrl,
      resumeFileName: entity.resumeFileName,
      isOnboarded: entity.isOnboarded,
      preferences: entity.preferences ?? {},
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
