import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for POST /api/auth/register
 *
 * DTOs (Data Transfer Objects) define the expected shape of
 * incoming request bodies. The class-validator decorators
 * (@IsEmail, @MinLength, etc.) are checked automatically by
 * NestJS's global ValidationPipe.
 *
 * If a request body fails validation, NestJS returns a 400 Bad
 * Request with detailed error messages — the controller code
 * never runs. This means your business logic can safely assume
 * the data is valid.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  name: string;
}
