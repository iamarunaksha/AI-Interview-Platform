import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewMode,
  InterviewerPersonality,
  type CreateInterviewSessionRequest,
} from '@interviewai/shared-types';

export class CreateInterviewSessionDto implements CreateInterviewSessionRequest {
  @IsOptional()
  @IsEnum(ProfessionalDomain)
  domain?: ProfessionalDomain;

  @IsOptional()
  @IsEnum(CompanyCategory)
  companyCategory?: CompanyCategory;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  targetRole?: string;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(90)
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(InterviewerPersonality)
  personality?: InterviewerPersonality;

  @IsOptional()
  @IsEnum(InterviewMode)
  mode?: InterviewMode;

  @IsOptional()
  @IsUUID()
  questionId?: string;
}
