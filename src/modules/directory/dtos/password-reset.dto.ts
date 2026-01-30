import { IsString, MinLength } from 'class-validator';

export class PasswordResetDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
