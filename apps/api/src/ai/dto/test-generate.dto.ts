import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { TestGenerateRequest } from '@interviewai/shared-types';

/**
 * DTO for POST /api/ai/test-generate
 */
export class TestGenerateDto implements TestGenerateRequest {
  @IsString()
  @IsNotEmpty({ message: 'Prompt is required' })
  @MaxLength(2000, { message: 'Prompt must be at most 2000 characters' })
  prompt: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemInstruction?: string;
}
