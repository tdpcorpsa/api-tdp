import { Module } from '@nestjs/common';
import { OperacionesController } from './controllers/operaciones.controller';
import { OperacionesService } from './services/operaciones.service';
import { PdfService } from './reports/pdf.service';
import { EmailService } from 'src/common/libs/email/email.service';
import { ExcelService } from 'src/common/libs/excel/excel.service';

@Module({
  imports: [],
  controllers: [OperacionesController],
  providers: [OperacionesService, PdfService, EmailService, ExcelService]
})
export class OperacionesModule {}
