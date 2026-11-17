import { IsEmail, IsString } from 'class-validator';

/**
 * DTO for POST /api/auth/login
 *
 * We only validate that the fields are present and correctly typed.
 * We don't enforce MinLength on password here because login should
 * simply fail with "Invalid credentials" — not reveal password rules.
 */
export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'Password is required' })
  password: string;
}
