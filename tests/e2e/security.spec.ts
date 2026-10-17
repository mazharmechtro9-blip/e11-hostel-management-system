import { expect, test } from '@playwright/test';
import { API_BASE, apiLogin, json, runID, type Collection } from './helpers';

type Student = { id: string; email: string };
type Room = { beds: { id: string; status: string }[] };
type RoomType = { id: string };

test('rendered pages use fresh script nonces and frontend rejects oversized requests', async ({ request }) => {
  const first = await request.get('/login');
  const second = await request.get('/login');
  expect(first.ok()).toBeTruthy();
  const policy = first.headers()['content-security-policy'];
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toBeTruthy();
  expect(second.headers()['content-security-policy']).not.toContain(`'nonce-${nonce}'`);
  expect(await first.text()).toContain(`nonce="${nonce}"`);
  const oversized = await request.post('/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: 'x'.repeat(6 * 1024 * 1024 + 1),
  });
  expect(oversized.status()).toBe(413);
});
type Invoice = { id: string };

test('student cannot discover another resident invoice or download its challan', async ({ request }) => {
  await apiLogin(request, 'owner');
  const all = await json<Collection<Invoice>>(request, '/invoices?page_size=100');
  await apiLogin(request, 'student');
  const own = await json<Collection<Invoice>>(request, '/invoices?page_size=100');
  const ownIDs = new Set(own.items.map(invoice => invoice.id));
  const other = all.items.find(invoice => !ownIDs.has(invoice.id));
  expect(other, 'Seed needs invoices for more than one student').toBeTruthy();
  for (const path of [`/invoices/${other!.id}`, `/invoices/${other!.id}/challan`]) {
    const response = await request.get(`${API_BASE}${path}`);
    expect(response.status(), 'Foreign financial records must remain undiscoverable').toBe(404);
  }
});

test('assistant cannot retrieve owner financial records or mutate invoices', async ({ request }) => {
  const headers = await apiLogin(request, 'assistant');
  for (const path of ['/payments', '/invoices', '/reports/financial', '/audit-events']) {
    const response = await request.get(`${API_BASE}${path}`);
    expect(response.status(), `${path} must deny the assistant role`).toBe(403);
  }
  const response = await request.post(`${API_BASE}/invoices`, {
    headers,
    data: { student_id: 'not-an-authorized-student', month: '2026-10' },
  });
  expect(response.status()).toBe(403);
});

test('authenticated write requires CSRF token', async ({ request }) => {
  await apiLogin(request, 'student');
  const response = await request.post(`${API_BASE}/complaints`, {
    data: { title: 'Must not persist', category: 'maintenance', description: 'CSRF denial check' },
  });
  expect(response.status()).toBe(403);
});

test('two simultaneous allocations cannot occupy the same bed', async ({ request }) => {
  const types = await json<Collection<RoomType>>(request, '/public/rooms');
  expect(types.items.length).toBeGreaterThan(0);
  const applicants = [0, 1].map(index => ({
    full_name: `Race applicant ${runID}-${index}`,
    email: `race-${runID}-${index}@example.com`,
    phone: '+923001234567',
    university: 'QA Test University',
    room_type_id: types.items[0].id,
  }));
  const bookingIDs: string[] = [];
  for (const applicant of applicants) {
    const created = await request.post(`${API_BASE}/bookings`, { data: applicant });
    expect(created.status(), await created.text()).toBe(201);
    bookingIDs.push((await created.json()).id);
  }
  const headers = await apiLogin(request, 'owner');
  for (const id of bookingIDs) {
    const approved = await request.post(`${API_BASE}/bookings/${id}/approve`, { headers, data: {} });
    expect(approved.ok(), await approved.text()).toBeTruthy();
  }
  const students = await json<Collection<Student>>(request, `/students?search=${encodeURIComponent(runID)}`);
  const pending = applicants.map(applicant => students.items.find(student => student.email === applicant.email));
  expect(pending.every(Boolean)).toBeTruthy();
  const rooms = await json<Collection<Room>>(request, '/rooms?page_size=100');
  const bed = rooms.items.flatMap(room => room.beds).find(item => item.status === 'available');
  expect(bed, 'Seed requires at least one available bed').toBeTruthy();

  const attempts = await Promise.all(pending.map(student => request.post(`${API_BASE}/allocations`, {
    headers,
    data: { student_id: student!.id, bed_id: bed!.id },
  })));
  expect(attempts.map(response => response.status()).sort()).toEqual([201, 409]);
  const finalRooms = await json<Collection<Room>>(request, '/rooms?page_size=100');
  const allocatedBed = finalRooms.items.flatMap(room => room.beds).find(item => item.id === bed!.id);
  expect(allocatedBed?.status).toBe('occupied');
});
