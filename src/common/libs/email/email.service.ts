import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<number>('SMTP_PORT') === 465, // true para 465, false para otros
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const from = this.configService.get<string>('SMTP_FROM');
      const info = await this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      });

      this.logger.log(`Email enviado correctamente: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Error enviando email:', error);
      return false;
    }
  }
}
