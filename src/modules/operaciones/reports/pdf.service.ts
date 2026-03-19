import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { TemplateService } from './template.service';
import fs from 'fs';
import path from 'path';

@Injectable()
export class PdfService {
  private readonly templateService = new TemplateService();

  private getLogoBase64(): string {
    try {
      const logoPath = path.join(process.cwd(), 'src', 'common', 'assets', 'tdplogo.jpg');
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      console.error('Error loading logo:', error);
      return '';
    }
  }

  async generateInspeccionPdf(data: any): Promise<Buffer> {
    const logoBase64 = this.getLogoBase64();
    
    // Si data es un array, inyectamos el logo en cada objeto
    const processedData = Array.isArray(data) 
      ? data.map(item => ({ ...item, globalLogo: logoBase64 }))
      : { ...data, globalLogo: logoBase64 };

    const html = this.templateService.render('inspeccion', processedData);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}