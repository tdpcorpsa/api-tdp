import { Injectable } from '@nestjs/common';
import { AdUserService } from 'src/modules/active-directory/services/ad-user.service';
import { PdfService } from '../reports/pdf.service';

@Injectable()
export class OperacionesService {
  constructor(private readonly pdfService: PdfService) {}

  async generarReporteInspeccionPdf(data: any): Promise<Buffer> {
    return this.pdfService.generateInspeccionPdf(data);
  }

  async makeDespachoReport(model: any): Promise<boolean> {
    try {
      // Si tienes getUser(), úsalo pidiendo un attr mínimo      
      console.log(model);
      return true;
    } catch {
      return false;
    }
  }

}
