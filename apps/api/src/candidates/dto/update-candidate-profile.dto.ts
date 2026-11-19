import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsObject,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewerPersonality,
  InterviewMode,
} from '@interviewai/shared-types';

/**
 * DTO for PUT /api/candidates/profile
 *
 * Validates incoming onboarding choices. All fields are optional so
 * candidates can complete steps incrementally or update individual settings.
 */
export class UpdateCandidateProfileDto {
  @IsOptional()
  @IsEnum(ProfessionalDomain, {
    message: 'Domain must be one of: sde, sap',
  })
  domain?: ProfessionalDomain;

  @IsOptional()
  @IsEnum(CompanyCategory, {
    message:
      'Company category must be one of: faang_style, product_company, service_company, sap_product, sap_consulting, sap_customer',
  })
  companyCategory?: CompanyCategory;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Target role must be at most 100 characters' })
  targetRole?: string;

  @IsOptional()
  @IsEnum(ExperienceLevel, {
    message:
      'Experience level must be one of: fresher, sde_1, sde_2, senior, staff',
  })
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsEnum(InterviewDifficulty, {
    message: 'Difficulty must be one of: easy, medium, hard',
  })
  preferredDifficulty?: InterviewDifficulty;

  @IsOptional()
  @IsInt()
  @Min(15, { message: 'Minimum duration is 15 minutes' })
  @Max(120, { message: 'Maximum duration is 120 minutes' })
  preferredDurationMinutes?: number;

  @IsOptional()
  @IsEnum(InterviewerPersonality, {
    message: 'Personality must be one of: professional, friendly, strict',
  })
  preferredPersonality?: InterviewerPersonality;

  @IsOptional()
  @IsEnum(InterviewMode, {
    message: 'Mode must be one of: practice, assessment, learning',
  })
  preferredMode?: InterviewMode;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isOnboarded?: boolean;
}
