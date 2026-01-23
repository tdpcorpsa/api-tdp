import { Controller, Get, Query } from '@nestjs/common';
import { DirectoryService } from '../../services/directory/directory.service';
import { UserExistsQueryDto } from '../../dtos/user-exists.query.dto';
import { UserExistsResponseDto } from '../../dtos/user-exists.response.dto';
import { AdUserService } from 'src/modules/active-directory/services/ad-user.service';

@Controller('directory')
export class DirectoryController {
   constructor(private readonly directory: DirectoryService,
    private readonly ad: AdUserService
   ) {}

  @Get('user-exists')
  async userExists(@Query() q: UserExistsQueryDto): Promise<UserExistsResponseDto> {
    const exists = await this.directory.userExists(q.username);
    return { exists, username: q.username };
  }

  @Get('user-get')
  async getUser(@Query() q: UserExistsQueryDto): Promise<object> {
    const user = await this.ad.getUser(q.username);
    return { user };
  }

}
