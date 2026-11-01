import { defineConfig } from '@playwright/test';

// Intentionally no webServer: never invoke the existing demo:reset setup.
// Start both isolated local servers as documented in docs/mro-3d-embed.md.
export default defineConfig({
  testDir: './tests/mro-embed',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  outputDir: '/tmp/mro-embed-smoke/playwright',
  use: {
    baseURL: 'http://127.0.0.1:3467',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure'
  }
});
