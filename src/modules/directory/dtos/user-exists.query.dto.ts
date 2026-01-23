import { IsString, MinLength } from 'class-validator';

export class UserExistsQueryDto {
  @IsString()
  @MinLength(1)
  username: string;
}
