import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for POST /api/auth/refresh
 */
export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
