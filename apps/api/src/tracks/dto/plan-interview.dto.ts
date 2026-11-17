import { IsEnum, IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
} from '@interviewai/shared-types';

export class PlanInterviewDto {
  @IsEnum(ProfessionalDomain, {
    message: 'Domain must be either sde or sap',
  })
  domain: ProfessionalDomain;

  @IsEnum(CompanyCategory, {
    message: 'Invalid company category',
  })
  companyCategory: CompanyCategory;

  @IsString()
  targetRole: string;

  @IsEnum(ExperienceLevel, {
    message: 'Invalid experience level',
  })
  experienceLevel: ExperienceLevel;

  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  durationMinutes?: number;
}
