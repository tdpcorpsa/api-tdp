import { IsString, MinLength } from 'class-validator';

export class DeleteUserDto {
  @IsString()
  @MinLength(1)
  username: string;
}
