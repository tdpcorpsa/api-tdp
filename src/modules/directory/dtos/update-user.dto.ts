import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsString()
  @IsOptional()
  givenName?: string;

  @IsString()
  @IsOptional()
  sn?: string;

  @IsString()
  @IsOptional()
  mail?: string;
  
  // Other attributes can be handled if needed, 
  // but for now let's stick to these common ones or use a catch-all if required.
}
