import { Injectable, Logger } from '@nestjs/common';
import { PdfService } from '../reports/pdf.service';
import { EmailService } from 'src/common/libs/email/email.service';
import { TemplateService } from '../reports/template.service';

@Injectable()
export class OperacionesService {
  private readonly logger = new Logger(OperacionesService.name);
  private readonly templateService = new TemplateService();

  constructor(
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
  ) {}

  async generarReporteInspeccionPdf(data: any): Promise<Buffer> {
    return this.pdfService.generateInspeccionPdf(data);
  }

  async notificarDespachoEmail(data: any, emailTo: string | string[]): Promise<boolean> {
    try {
      // 1. Generar el PDF
      const pdfBuffer = await this.generarReporteInspeccionPdf(data);

      // 2. Renderizar el cuerpo del correo con la misma data (o parte de ella)
      // Si data es un array, tomamos el primer elemento para los datos generales del correo
      const templateData = Array.isArray(data) ? data[0] : data;
      const htmlBody = this.templateService.render('notificacion-despacho', templateData);

      // 3. Enviar el correo
      const subject = `Notificación de Despacho - Caso ${templateData.id || ''} - ${templateData.cliente || ''}`;
      
      const result = await this.emailService.sendEmail({
        to: emailTo,
        subject,
        html: htmlBody,
        attachments: [
          {
            filename: `Reporte-Inspeccion-${templateData.id || 'Despacho'}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      return result;
    } catch (error) {
      this.logger.error('Error en notificarDespachoEmail:', error);
      return false;
    }
  }

  async makeDespachoReport(model: any): Promise<boolean> {
    try {
      // Si tienes getUser(), úsalo pidiendo un attr mínimo      
      //console.log(model);
      return true;
    } catch {
      return false;
    }
  }

}
