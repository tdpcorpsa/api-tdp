import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { TemplateService } from './template.service';

@Injectable()
export class PdfService {
  private readonly templateService = new TemplateService();

  async generateInspeccionPdf(data: any): Promise<Buffer> {
    const html = this.templateService.render('inspeccion', data);

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
          top: '8mm',
          right: '8mm',
          bottom: '8mm',
          left: '8mm',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}