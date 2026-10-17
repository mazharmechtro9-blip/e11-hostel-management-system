import { expect, type APIRequestContext } from '@playwright/test';
import { API_BASE, apiLogin, json, runID, type Collection } from './helpers';

export type Invoice = { id: string; number: string; balance: number; month: string; student_id: string; paid_amount: number };
type Student = { id: string; email: string; full_name: string };

/** Create an isolated unpaid invoice without changing existing financial records. */
export async function createStudentInvoice(request: APIRequestContext): Promise<Invoice> {
  const headers = await apiLogin(request, 'owner');
  const students = await json<Collection<Student>>(request, '/students?search=student%40e11.demo');
  const student = students.items.find(item => item.email === 'student@e11.demo');
  expect(student, 'Explicit demo seed must be installed').toBeTruthy();
  const existing: Invoice[] = [];
  let page = 1;
  while (true) {
    const result = await json<Collection<Invoice>>(request, `/invoices?search=${encodeURIComponent(student!.full_name)}&page_size=100&page=${page}`);
    existing.push(...result.items);
    if (existing.length >= result.total || !result.items.length) break;
    page++;
  }
  const usedMonths = new Set(existing.filter(item => item.student_id === student!.id).map(item => item.month));
  let month: string | undefined;
  for (let year = 2030; year < 2099 && !month; year++) {
    for (let number = 1; number <= 12; number++) {
      const candidate = `${year}-${String(number).padStart(2, '0')}`;
      if (!usedMonths.has(candidate)) { month = candidate; break; }
    }
  }
  expect(month, 'A free development-only invoice period is required').toBeTruthy();
  const response = await request.post(`${API_BASE}/invoices`, {
    headers,
    data: { student_id: student!.id, month, subtotal: 23777, late_fee: 0, due_date: `${month}-15` },
  });
  expect(response.status(), await response.text()).toBe(201);
  return response.json() as Promise<Invoice>;
}

/** A genuine, parseable PDF fixture, clearly marked as non-settlement demo evidence. */
export function demoReceiptPDF(): Buffer {
  const stream = `BT /F1 14 Tf 50 150 Td (DEMO receipt ${runID} - for review only, not settlement evidence) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 250] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
