import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { registerReportHelpers } from './helpers';

export class TemplateService {
  constructor() {
    registerReportHelpers();
  }

  render(templateName: string, data: any): string {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'modules',
      'operaciones',
      'reports',
      'templates',
      `${templateName}.hbs`,
    );
    //console.log(templatePath);
    const source = fs.readFileSync(templatePath, 'utf8');
    //console.log(source);
    const template = Handlebars.compile(source);
    return template(data);
  }
}