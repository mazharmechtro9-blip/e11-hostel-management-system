import { expect, test } from '@playwright/test';
import { assertNoHorizontalOverflow, login, type Role } from './helpers';

for (const role of ['owner', 'warden', 'assistant', 'student'] as Role[]) {
  test(`${role} has an authenticated responsive workspace`, async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, role);
    const navigation = page.getByRole('navigation', { name: 'Portal navigation' });
    await expect(navigation).toBeVisible();
    await expect(page.locator('#main-content h1')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/${role}-desktop.png`, fullPage: true });
    if (role === 'assistant') {
      await expect(navigation.getByRole('link', { name: 'Payments', exact: true })).toHaveCount(0);
      await expect(navigation.getByRole('link', { name: 'Rent & invoices', exact: true })).toHaveCount(0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await expect(navigation.getByRole('link', { name: role === 'owner' ? 'Dashboard' : 'Overview', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close navigation', exact: true }).click({ position: { x: 380, y: 100 } });
    await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/${role}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    const paths = await navigation.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!));
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('#main-content h1'), `A page heading is required for ${path}`).toBeVisible();
      await expect(page.getByRole('status', { name: 'Loading content' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toHaveCount(0);
      await expect(page.locator('#main-content').getByRole('alert'), `No API or page error may appear at ${path}`).toHaveCount(0);
    }
  });
}
