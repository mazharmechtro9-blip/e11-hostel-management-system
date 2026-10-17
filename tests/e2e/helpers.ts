import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE = process.env.E11_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
export const password = process.env.E11_DEMO_PASSWORD || 'E11Demo!2026';
export const runID = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export type Role = 'owner' | 'warden' | 'assistant' | 'student';
export type Collection<T> = { items: T[]; total: number };

async function respectLoginLimit(retryAfter: string | undefined) {
  const seconds = Number(retryAfter);
  expect(Number.isFinite(seconds) && seconds > 0 && seconds <= 60, 'Rate limit must provide a bounded Retry-After').toBeTruthy();
  test.setTimeout(test.info().timeout + seconds * 1000);
  test.info().annotations.push({ type: 'rate-limit', description: `Honored login Retry-After: ${seconds}s` });
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export async function login(page: Page, role: Role) {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(`${role}@e11.demo`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const submit = async () => {
    const response = page.waitForResponse(item => item.url().endsWith('/api/v1/auth/login') && item.request().method() === 'POST');
    await page.getByRole('button', { name: 'Sign in to portal', exact: true }).click();
    return response;
  };
  let response = await submit();
  if (response.status() === 429) {
    await respectLoginLimit(response.headers()['retry-after']);
    response = await submit();
  }
  expect(response.ok(), 'Valid development account must sign in').toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/${role}/?$`));
}

export async function apiLogin(request: APIRequestContext, role: Role) {
  const submit = () => request.post(`${API_BASE}/auth/login`, { data: { email: `${role}@e11.demo`, password } });
  let response = await submit();
  if (response.status() === 429) {
    await respectLoginLimit(response.headers()['retry-after']);
    response = await submit();
  }
  expect(response.ok(), `Log in ${role}: ${await response.text()}`).toBeTruthy();
  const result = await response.json();
  expect(result.csrf_token).toBeTruthy();
  return { 'X-CSRF-Token': result.csrf_token as string };
}

export async function json<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${API_BASE}${path}`);
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

export async function assertNoHorizontalOverflow(page: Page) {
  // Charts respond to viewport changes through ResizeObserver on the next
  // frame. Check the settled layout rather than its transitional SVG width.
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  ), { message: 'Page should fit the viewport', timeout: 3000 }).toBeLessThanOrEqual(1);
}
