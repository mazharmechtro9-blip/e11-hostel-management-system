import { expect, test } from '@playwright/test';
import { assertNoHorizontalOverflow } from './helpers';

for (const width of [1440, 768, 390]) {
  test(`public home and booking form fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your Home Away From Home' })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.goto('/booking');
    await expect(page.getByRole('heading', { name: 'Your next chapter starts here.' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/public-${width}.png`, fullPage: true });
  });
}

test('booking validates required fields without submitting a request', async ({ page }) => {
  await page.goto('/booking');
  await expect(page.getByLabel('Room preference')).toBeEnabled();
  await page.getByRole('button', { name: 'Submit booking request' }).click();
  await expect(page.getByText('Please enter your full name.', { exact: true })).toBeVisible();
  await expect(page.getByText('Please enter a valid email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Please choose a room preference.', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('unauthenticated portal request redirects to sign in', async ({ page }) => {
  await page.goto('/owner/payments');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});

test('incorrect password produces an accessible error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill('student@e11.demo');
  await page.getByLabel('Password', { exact: true }).fill('Incorrect-password!2026');
  await page.getByRole('button', { name: 'Sign in to portal' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Email or password is incorrect');
  await expect(page).toHaveURL(/\/login$/);
});

test('public assistant answers using published prices and identifies its local mode', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open E-11 assistant', exact: true }).click();
  const assistant = page.getByRole('dialog', { name: 'E-11 public assistant' });
  await expect(assistant).toContainText('No live language model');
  await assistant.getByLabel('Ask the E-11 assistant').fill('What is the monthly rent for a 2 seater?');
  await assistant.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(assistant.getByRole('log')).toContainText('2 Seater: PKR 22,000 per student / month');
  await assistant.getByText('Sources · 1').click();
  await expect(assistant.getByText('Configured room prices', { exact: true })).toBeVisible();
  await assistant.getByRole('button', { name: 'Close assistant', exact: true }).click();
  await expect(assistant).toHaveCount(0);
});
