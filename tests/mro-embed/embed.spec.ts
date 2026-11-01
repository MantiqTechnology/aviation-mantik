import { expect, test, type Page } from '@playwright/test';

const remote = 'http://127.0.0.1:3100';

async function login(page: Page, role = 'Maintenance Manager') {
  const response = await page.request.get('/api/auth/demo-accounts');
  const { data } = await response.json();
  const account = data.find((entry: { role: string }) => entry.role === role);
  expect(account).toBeTruthy();
  const signedIn = await page.request.post('/api/auth/login', {
    data: { username: account.username, password: account.password }
  });
  expect(signedIn.ok()).toBe(true);
}

test('standalone remains on summary; embed opens the interactive model', async ({ page }) => {
  await page.goto(remote);
  await expect(page.locator('.app-header')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Ringkasan', exact: true })).toHaveAttribute('aria-selected', 'true');
  const response = await page.goto(`${remote}/embed`);
  expect(response?.headers()['content-security-policy']).toBe('frame-ancestors https://aviation.mantik.id http://127.0.0.1:3467');
  await expect(page.locator('.app-header')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Model 3D', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Demo terarah', exact: true })).toBeEnabled();
  await page.locator('.quick-select').getByRole('button', { name: 'Roda utama kiri', exact: true }).click();
  for (const name of ['Isolasi', 'Transparansi']) {
    const button = page.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  }
  await page.getByRole('button', { name: 'Atas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2 + 30, { steps: 10 });
  await page.mouse.up();
  await page.mouse.wheel(0, -150);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Demo terarah', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
});

test('host sidebar, embedded viewer, responsive bounds, retry and return', async ({ page }) => {
  await login(page);
  await page.goto('/maintenance');
  await page.getByRole('link', { name: 'MRO 3D', exact: true }).click();
  await expect(page).toHaveURL(/\/mro-3d$/);
  await expect(page.locator('.v-navigation-drawer')).toBeVisible();
  await expect(page.getByRole('link', { name: 'MRO 3D', exact: true })).toHaveClass(/v-list-item--active/);
  await expect(page.locator('.v-app-bar')).toContainText('MRO 3D');
  const viewer = page.frameLocator('.mro3d-frame');
  await expect(viewer.getByRole('button', { name: 'Demo terarah', exact: true })).toBeEnabled();
  await expect(viewer.getByRole('tab', { name: 'Model 3D', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(viewer.locator('.app-header')).toHaveCount(0);
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => ({
      width: document.documentElement.scrollWidth <= innerWidth,
      height: document.documentElement.scrollHeight <= innerHeight + 2
    }))).toEqual({ width: true, height: true });
    await expect.poll(() => viewer.locator('html').evaluate((element) => ({
      width: element.scrollWidth <= window.innerWidth,
      height: element.scrollHeight <= window.innerHeight + 2
    }))).toEqual({ width: true, height: true });
    await page.screenshot({ path: `/tmp/mro-embed-smoke/host-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(viewer.getByRole('button', { name: 'Demo terarah', exact: true })).toBeEnabled();
  const external = page.getByRole('link', { name: 'Open MRO 3D in a new tab', exact: true });
  await expect(external).toHaveAttribute('href', `${remote}/embed`);
  await expect(external).toHaveAttribute('target', '_blank');
  await page.getByRole('link', { name: 'Ringkasan Maintenance', exact: true }).click();
  await expect(page).toHaveURL(/\/maintenance$/);
  await expect(page.locator('iframe.mro3d-frame')).toHaveCount(0);
});

test('unauthorized role cannot open the route or see its menu', async ({ page }) => {
  await login(page, 'OCC');
  await page.goto('/mro-3d');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'MRO 3D', exact: true })).toHaveCount(0);
});

test('remote failure preserves shell, retry and external fallback', async ({ page }) => {
  await login(page);
  await page.route(`${remote}/embed`, (route) => route.abort());
  await page.goto('/mro-3d');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open MRO 3D in a new tab', exact: true })).toBeVisible();
  await expect(page.locator('.mro3d-status')).toContainText(/Viewer missing|taking longer/);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.v-navigation-drawer')).toBeVisible();
});
