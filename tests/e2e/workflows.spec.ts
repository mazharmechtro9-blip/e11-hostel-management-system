import { expect, test } from '@playwright/test';
import { json, login, runID, type Collection } from './helpers';
import { createStudentInvoice, demoReceiptPDF, type Invoice } from './fixtures';

type Room = { id: string; number: string; floor_id: string; floor_name: string; beds: { id: string; label: string; status: string; student_id?: string }[] };
type Booking = { id: string; reference: string; status: string; email: string };
type Student = { id: string; full_name: string; email: string };

test('visitor receives a reference, owner approves, then separately allocates a bed', async ({ page }) => {
  const fullName = `Booking journey ${runID}`;
  const email = `booking-${runID}@example.com`;
  await page.goto('/booking');
  await page.getByLabel('Full name').fill(fullName);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone number').fill('+923001234567');
  await page.getByLabel('University / institution').fill('QA Test University');
  const preference = page.getByLabel('Room preference');
  await expect(preference).toBeEnabled();
  const choice = await preference.locator('option').evaluateAll(options =>
    options.map(option => ({ value: (option as HTMLOptionElement).value, disabled: (option as HTMLOptionElement).disabled }))
      .find(option => option.value && !option.disabled)?.value,
  );
  expect(choice, 'At least one available room category is required').toBeTruthy();
  await preference.selectOption(choice!);
  await page.getByRole('checkbox').check();
  const submitted = page.waitForResponse(response => response.url().endsWith('/api/v1/bookings') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit booking request' }).click();
  const created = await submitted;
  expect(created.status()).toBe(201);
  const booking = await created.json() as Booking;
  await expect(page.getByRole('status')).toContainText('Booking request received');
  await expect(page.getByRole('status')).toContainText(booking.reference);

  await login(page, 'owner');
  await page.goto('/owner/bookings');
  const row = page.getByRole('row').filter({ hasText: fullName });
  await row.getByRole('button', { name: 'Approve booking' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve booking', exact: true }).click();
  await expect(row).toContainText('Approved');
  const students = await json<Collection<Student>>(page.request, `/students?search=${encodeURIComponent(email)}`);
  const student = students.items.find(item => item.email === email);
  expect(student, 'Approval should create a pending resident profile').toBeTruthy();
  const before = await json<Collection<Room>>(page.request, '/rooms?page_size=100');
  expect(before.items.flatMap(room => room.beds).some(bed => bed.student_id === student!.id)).toBe(false);
  const room = before.items.find(item => item.beds.some(bed => bed.status === 'available'));
  expect(room).toBeTruthy();
  const bed = room!.beds.find(item => item.status === 'available')!;
  await page.goto('/owner/floor-map');
  await page.getByRole('button', { name: room!.floor_name, exact: true }).click();
  // Accessible controls use the same room and resident identifiers shown to staff.
  await page.getByRole('button', { name: `Room ${room!.number}`, exact: false }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Assign bed', exact: true }).click();
  await dialog.getByLabel('Student').selectOption(student!.id);
  await dialog.getByLabel('Bed').selectOption(bed.id);
  await dialog.getByRole('button', { name: 'Assign bed', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const after = await json<Collection<Room>>(page.request, '/rooms?page_size=100');
  const assigned = after.items.flatMap(item => item.beds).find(item => item.id === bed.id);
  expect(assigned?.student_id).toBe(student!.id);
  expect(assigned?.status).toBe('occupied');
});

test('student downloads challan and uploads receipt; owner reconciles trusted evidence', async ({ page }) => {
  const invoice = await createStudentInvoice(page.request);
  const transaction = `QA-BANK-${runID}`;
  await login(page, 'student');
  await page.goto('/student/payments');
  const invoiceCard = page.locator('article').filter({ hasText: invoice.number });
  const download = page.waitForEvent('download');
  await invoiceCard.getByRole('link', { name: 'Download challan' }).click();
  const challan = await download;
  expect(challan.suggestedFilename()).toMatch(/\.pdf$/i);
  expect(await challan.failure()).toBeNull();
  await page.getByRole('button', { name: 'New payment', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Invoice').selectOption(invoice.id);
  await dialog.getByLabel('Amount (PKR)').fill('23777');
  await dialog.getByLabel('Method').selectOption('bank_transfer');
  await dialog.getByLabel('Transaction reference').fill(transaction);
  const submitted = page.waitForResponse(response => response.url().endsWith('/api/v1/payments') && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Record payment', exact: true }).click();
  const created = await submitted;
  expect(created.status()).toBe(201);
  const payment = await created.json();
  const row = page.getByRole('row').filter({ hasText: payment.reference });
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Receipt document').setInputFiles({ name: `demo-receipt-${runID}.pdf`, mimeType: 'application/pdf', buffer: demoReceiptPDF() });
  const receipt = page.waitForResponse(response => response.url().endsWith(`/payments/${payment.id}/receipts`) && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Upload receipt', exact: true }).click();
  expect((await receipt).status()).toBe(201);
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText('Pending');
  const pending = await json<Invoice>(page.request, `/invoices/${invoice.id}`);
  expect(pending.balance, 'A receipt cannot settle an invoice').toBe(23777);

  await login(page, 'owner');
  await page.goto('/owner/payments');
  const ownerRow = page.getByRole('row').filter({ hasText: payment.reference });
  await ownerRow.getByRole('button', { name: 'Verify payment', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Evidence type').selectOption('bank_statement');
  await dialog.getByLabel('Evidence reference').fill(`QA-STATEMENT-LINE-${runID}`);
  await dialog.getByLabel('Bank transaction reference').fill(transaction);
  await dialog.getByLabel('Confirmation').fill('VERIFY PAYMENT');
  await dialog.getByRole('button', { name: 'Verify payment', exact: true }).click();
  await expect(ownerRow).toContainText('Verified');
  const reconciled = await json<Invoice>(page.request, `/invoices/${invoice.id}`);
  expect(reconciled.balance).toBe(0);
  expect(reconciled.paid_amount).toBe(23777);
});

test('student complaint is processed by staff and its resolution remains visible', async ({ page }) => {
  const title = `QA maintenance ${runID}`;
  const response = `Maintenance completed and checked ${runID}`;
  await login(page, 'student');
  await page.goto('/student/complaints');
  await page.getByRole('button', { name: 'New complaint', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Category').selectOption('maintenance');
  await dialog.getByLabel('Description').fill('The desk light needs maintenance. This is a browser acceptance test.');
  await dialog.getByLabel('Priority').selectOption('normal');
  await dialog.getByRole('button', { name: 'Submit complaint', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await login(page, 'warden');
  await page.goto('/warden/complaints');
  const complaint = page.locator('article').filter({ hasText: title });
  await complaint.getByRole('button', { name: 'Update complaint', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Status').selectOption('resolved');
  await dialog.getByLabel('Response').fill(response);
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);

  await login(page, 'student');
  await page.goto('/student/complaints');
  const updated = page.locator('article').filter({ hasText: title });
  await expect(updated).toContainText('Resolved');
  await expect(updated).toContainText(response);
});
