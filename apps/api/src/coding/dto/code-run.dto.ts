import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ProgrammingLanguage,
  type CodeRunRequest,
  type TestCase,
} from '@interviewai/shared-types';

/**
 * DTO for POST /api/coding/execute
 */
export class CodeRunDto implements CodeRunRequest {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(50000, { message: 'Code exceeds maximum allowed size' })
  code: string;

  @IsEnum(ProgrammingLanguage, {
    message: 'Unsupported programming language',
  })
  language: ProgrammingLanguage;

  @IsOptional()
  @IsArray()
  testCases?: TestCase[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entryFunction?: string;
}
