import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { DirectoryService } from '../../services/directory/directory.service';
import { UserExistsQueryDto } from '../../dtos/user-exists.query.dto';
import { UserExistsResponseDto } from '../../dtos/user-exists.response.dto';
import { AdUserService } from 'src/modules/active-directory/services/ad-user.service';
import { CreateUserDto } from '../../dtos/create-user.dto';
import { UpdateUserDto } from '../../dtos/update-user.dto';
import { DeleteUserDto } from '../../dtos/delete-user.dto';
import { PasswordResetDto } from '../../dtos/password-reset.dto';
import { LoginDto } from '../../dtos/login.dto';
import { ApiKeyGuard } from 'src/modules/auth/guards/api-key.guard';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

@ApiTags('Directory')
@ApiHeader({
  name: 'x-api-key',
  description: 'API Key para autenticación servidor-a-servidor',
})
@UseGuards(ApiKeyGuard)
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

  @Post('user-create')
  async createUser(@Body() body: CreateUserDto): Promise<object> {
    await this.ad.createUser(
      body.username,
      body.password,
      body.givenName ?? null,
      body.sn ?? null,
      body.mail ?? null,
      body.userType,
      body.initialState,
      body.forcePwdChangeOnFirstLogon
    );
    return { success: true };
  }

  @Post('user-update')
  async updateUser(@Body() body: UpdateUserDto): Promise<object> {
    const attrs: Record<string, any> = {};
    if (body.givenName !== undefined) attrs.givenName = body.givenName;
    if (body.sn !== undefined) attrs.sn = body.sn;
    if (body.mail !== undefined) attrs.mail = body.mail;
    
    await this.ad.updateUserAttributes(body.username, attrs);
    return { success: true };
  }

  @Post('user-delete')
  async deleteUser(@Body() body: DeleteUserDto): Promise<object> {
    await this.ad.deleteUser(body.username);
    return { success: true };
  }

  @Post('password-reset')
  async passwordReset(@Body() body: PasswordResetDto): Promise<object> {
    await this.ad.adminResetPasswordHard(body.username, body.newPassword);
    return { success: true };
  }

  @Post('validate-credentials')
  async validateCredentials(@Body() body: LoginDto): Promise<object> {
    const valid = await this.ad.validateCredentials(body.username, body.password);
    return { valid, username: body.username };
  }
}
