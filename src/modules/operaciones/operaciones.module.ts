import { Module } from '@nestjs/common';
import { OperacionesController } from './controllers/operaciones.controller';
import { OperacionesService } from './services/operaciones.service';
import { PdfService } from './reports/pdf.service';

@Module({
  imports: [],
  controllers: [OperacionesController],
  providers: [OperacionesService, PdfService]
})
export class OperacionesModule {}
