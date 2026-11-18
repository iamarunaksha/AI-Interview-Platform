import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsArray,
} from 'class-validator';
import type { ExtractEvidenceRequest } from '@interviewai/shared-types';

export class ExtractEvidenceDto implements ExtractEvidenceRequest {
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  questionAsked: string;

  @IsString()
  @IsNotEmpty()
  candidateAnswer: string;

  @IsOptional()
  @IsUUID()
  competencyId?: string;

  @IsOptional()
  @IsString()
  turnId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expectedConcepts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commonMisconceptions?: string[];
}
