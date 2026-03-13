import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ActiveDirectoryModule } from './modules/active-directory/active-directory.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { OperacionesModule } from './modules/operaciones/operaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AuthModule,    
    DirectoryModule,  
    OperacionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
