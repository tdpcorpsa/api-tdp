import { Module } from '@nestjs/common';
import { DirectoryController } from './controllers/directory/directory.controller';
import { DirectoryService } from './services/directory/directory.service';
import { ActiveDirectoryModule } from '../active-directory/active-directory.module';

@Module({
  imports: [ActiveDirectoryModule],
  controllers: [DirectoryController],
  providers: [DirectoryService]
})
export class DirectoryModule {}
