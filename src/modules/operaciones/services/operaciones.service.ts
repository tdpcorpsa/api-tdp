import { Injectable, Logger } from '@nestjs/common';
import { PdfService } from '../reports/pdf.service';
import { EmailService } from 'src/common/libs/email/email.service';
import { TemplateService } from '../reports/template.service';
import { ExcelService } from 'src/common/libs/excel/excel.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OperacionesService {
  private readonly logger = new Logger(OperacionesService.name);
  private readonly templateService = new TemplateService();

  constructor(
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly excelService: ExcelService,
    private readonly configService: ConfigService,
  ) {}

  async generarReporteInspeccionExcel(data: any[]): Promise<Buffer> {
    const flattenedData: any[] = [];
    const headers = [
      'ID', 'RUC Cliente', 'Cliente', 'N° Pedido', 'Fecha Inspección', 'Fecha Despacho',
      'N° Guía', 'N° Factura', 'Cantidad Códigos', 'Cant. Códigos Revisados', 'Transportista',
      'Transporte', 'Responsable Despacho', 'Observaciones', 'Usuario Registro',
      'OP/PO', 'Código', 'Descripción', 'Cantidad Unidades', 'Cantidad Inspeccionada',
      'Lote', 'Calidad Producto', 'Picking Realizado Por', 'Picking Revisado Por', 
      'Packing Realizado Por', 'Packing Revisado Por', 'Estado Inspección'
    ];

    const parseDate = (val: any) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d;
    };

    for (const item of data) {
      if (item.atributos && item.atributos.length > 0) {
        for (const attr of item.atributos) {
          flattenedData.push({
            id: item.id,
            cliruc: item.cliruc,
            cliente: item.cliente,
            nPedido: item.nPedido,
            fechaInspeccion: parseDate(item.fechaInspeccion),
            fechaDespacho: parseDate(item.fechaDespacho),
            nGuia: item.nGuia,
            nFactura: item.nFactura,
            cantidadCodigos: item.cantidadCodigos,
            cantCodigosRevisados: item.cantCodigosRevisados,
            transportistaNombre: item.transportistaNombre,
            transporteNombre: item.transporteNombre,
            responsableDespacho: item.responsableDespacho,
            observaciones: item.observaciones,
            usuarioRegistro: item.usuarioRegistro,
            opPo: attr.opPo,
            codigo: attr.codigo,
            descripcion: attr.descripcion,
            cantidadUnidades: attr.cantidadUnidades,
            cantidadInspeccionada: attr.cantidadInspeccionada,
            lote: attr.lote,
            calidadProducto: attr.calidadProducto,
            pickingRealizadoPor: attr.pickingRealizadoPor,
            pickingRevisadoPor: attr.pickingRevisadoPor,
            packingRealizadoPor: attr.packingRealizadoPor,
            packingRevisadoPor: attr.packingRevisadoPor,
            estadoInspeccion: attr.estadoInspeccion,
          });
        }
      } else {
        // Add header-only data if no attributes
        flattenedData.push({
            id: item.id,
            cliruc: item.cliruc,
            cliente: item.cliente,
            nPedido: item.nPedido,
            fechaInspeccion: parseDate(item.fechaInspeccion),
            fechaDespacho: parseDate(item.fechaDespacho),
            nGuia: item.nGuia,
            nFactura: item.nFactura,
            cantidadCodigos: item.cantidadCodigos,
            cantCodigosRevisados: item.cantCodigosRevisados,
            transportistaNombre: item.transportistaNombre,
            transporteNombre: item.transporteNombre,
            responsableDespacho: item.responsableDespacho,
            observaciones: item.observaciones,
            usuarioRegistro: item.usuarioRegistro,
        });
      }
    }

    return this.excelService.createExcel(headers, flattenedData);
  }

  async generarReporteInspeccionPdf(data: any): Promise<Buffer> {
    return this.pdfService.generateInspeccionPdf(data);
  }

  async notificarDespachoEmail(data: any, emailTo: string | string[]): Promise<boolean> {
    try {
      // 1. Generar el PDF

      const pdfBuffer = await this.generarReporteInspeccionPdf(Array.isArray(data)? data : [data]);

      // 2. Renderizar el cuerpo del correo con la misma data (o parte de ella)
      // Si data es un array, tomamos el primer elemento para los datos generales del correo
      const templateData = Array.isArray(data) ? data[0] : data;
      const htmlBody = this.templateService.render('notificacion-despacho', templateData);

      // 3. Enviar el correo
      //const subject = `Notificación de Despacho - Caso ${templateData.id || ''} - ${templateData.cliente || ''}`;
      let subject = "Notificación de Despacho: caso "+templateData.id;    
      if(data.estado=='A')       subject += ' - Aprobado';
      else if(data.estado=='R')  subject += ' - Rechazado';
      else  subject += ' - En espera de aprobación';
      
      if(emailTo==null || emailTo=='') {
        emailTo = data.usuarioRegistro+'@'+this.configService.get('DOMINIO');
        emailTo += (', notificaciones.despacho'+'@'+this.configService.get('DOMINIO'));
      }

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
