import { expect, test } from '@playwright/test';
import { login, assertNoHorizontalOverflow } from './helpers';

test('photo-led homepage keeps real inventory and accessible booking controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.premium-hero h1')).toBeVisible();
  await expect(page.locator('.pub-room-card')).toHaveCount(5);
  await expect(page.getByText('Illustrative photo placeholder · Not the actual property', { exact: true })).toBeVisible();
  const image = page.locator('.premium-hero-photo');
  await expect.poll(() => image.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'View 2 Seater details' }).click();
  await expect(page.getByRole('dialog')).toContainText('2 Seater');
  await page.getByRole('button', { name: 'Close room details' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Public navigation' })).toBeVisible();
});

test('owner dashboard agrees with the API and supports chart period selection', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'owner');
  await expect(page.locator('.command-metric')).toHaveCount(5);
  const response = await page.request.get('/api/v1/dashboard');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  await expect(page.locator('.command-metric').nth(3).locator('strong')).toHaveText(Number(data.metrics.available_beds).toLocaleString('en-PK'));
  await expect(page.locator('.command-metric').nth(2).locator('strong')).toHaveText(`${data.metrics.occupancy_rate}%`);
  await page.getByLabel('Revenue chart period').selectOption('3');
  await expect(page.getByLabel('Revenue chart period')).toHaveValue('3');
  await expect(page.locator('.command-panel').filter({ has: page.getByRole('heading', { name: 'Revenue trend' }) }).locator('.recharts-xAxis .recharts-cartesian-axis-tick')).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
});
