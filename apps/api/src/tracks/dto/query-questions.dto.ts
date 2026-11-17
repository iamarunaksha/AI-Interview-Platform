import { IsOptional, IsEnum, IsString } from 'class-validator';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
} from '@interviewai/shared-types';

export class QueryQuestionsDto {
  @IsOptional()
  @IsEnum(ProfessionalDomain)
  domain?: ProfessionalDomain;

  @IsOptional()
  @IsEnum(CompanyCategory)
  companyCategory?: CompanyCategory;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @IsOptional()
  @IsString()
  competencySlug?: string;
}
