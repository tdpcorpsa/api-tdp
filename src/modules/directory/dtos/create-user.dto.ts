import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AccountState } from '../../active-directory/services/ad-user.service';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  givenName?: string;

  @IsString()
  @IsOptional()
  sn?: string;

  @IsString()
  @IsOptional()
  mail?: string;

  @IsString()
  userType: string;

  @IsEnum(AccountState)
  @IsOptional()
  initialState?: AccountState;

  @IsBoolean()
  @IsOptional()
  forcePwdChangeOnFirstLogon?: boolean;
}
