import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { CandidatesService } from './candidates.service.js';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type {
  CandidateProfileResponse,
  UserProfile,
} from '@interviewai/shared-types';

/**
 * CandidatesController — candidate profile & onboarding endpoints.
 *
 * All endpoints require a valid JWT via JwtAuthGuard.
 * Base route: /api/candidates
 */
@Controller('candidates')
@UseGuards(JwtAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  /**
   * Get the current candidate's profile.
   * Creates an empty default profile if none exists yet.
   */
  @Get('profile')
  async getProfile(
    @Req() req: { user: UserProfile },
  ): Promise<CandidateProfileResponse> {
    return this.candidatesService.getOrCreateProfile(req.user.id);
  }

  /**
   * Update the candidate's profile and onboarding preferences.
   */
  @Put('profile')
  async updateProfile(
    @Req() req: { user: UserProfile },
    @Body() dto: UpdateCandidateProfileDto,
  ): Promise<CandidateProfileResponse> {
    return this.candidatesService.updateProfile(req.user.id, dto);
  }
}
