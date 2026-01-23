import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdUserService } from './services/ad-user.service';

@Module({
    imports: [ConfigModule],
    providers: [AdUserService],
    exports: [AdUserService],
})
export class ActiveDirectoryModule {}
