import Handlebars from 'handlebars';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function joinCsv(value?: string | string[]): string {
  if (!value) return '-';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .join(', ');
}

export function registerReportHelpers() {
  Handlebars.registerHelper('fmtDate', (value: string) => formatDate(value));
  Handlebars.registerHelper('joinCsv', (value: string | string[]) => joinCsv(value));
  Handlebars.registerHelper('orDash', (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  });
  Handlebars.registerHelper('plusOne', (value: number) => Number(value) + 1);
}