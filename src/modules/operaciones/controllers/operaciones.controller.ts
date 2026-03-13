import { Controller, Get, Post, Query, Body, UseGuards, Res } from '@nestjs/common';
import { AdUserService } from 'src/modules/active-directory/services/ad-user.service';
import { ApiKeyGuard } from 'src/modules/auth/guards/api-key.guard';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { OperacionesService } from '../services/operaciones.service';
import { OperTDespacho } from '../dtos/despacho.model';
import type { Response } from 'express';

@ApiTags('Operaciones')
@ApiHeader({
  name: 'x-api-key',
  description: 'API Key para autenticación servidor-a-servidor',
})
@UseGuards(ApiKeyGuard)
@Controller('operaciones')
export class OperacionesController {
   constructor(private readonly operaciones: OperacionesService
   ) {}  

  @Post('reporte-inspeccion/pdf')
  async generarReporte(
    @Body() body: any,
    @Res() res: Response
  ) {
    console.log(body);
    const pdf = await this.operaciones.generarReporteInspeccionPdf(body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte-inspeccion.pdf'
    );

    res.send(pdf);

  }

  @Post('despacho-pdfreport-get')
  async makeDespachoReport(@Body() body: any): Promise<object> {
  //async makeDespachoReport(@Query() q: OperTDespacho): Promise<object> {
    console.log(body);
    const report = await this.operaciones.makeDespachoReport(body);
    return { report };
  }
 
}
