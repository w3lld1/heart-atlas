import { defineConfig, devices } from '@playwright/test';

// Tests run against `astro preview`, so pages are served under the same base path
// as on GitHub Pages. Build the site first (`pnpm build`).
const port = 4321;
// Lets a machine with a preinstalled Chromium skip `playwright install`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
/** Specs that draw with WebGL. */
const webgl = /(anatomy|heart-clock|home-3d)\.spec\.ts$/;
const base = (process.env.BASE_PATH ?? '/heart-atlas').replace(/\/?$/, '/');

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}${base}`,
    trace: 'on-first-retry',
    // Stale worker caches make tests flaky; pwa.spec.ts turns workers on for itself.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: webgl,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
    {
      // SwiftShader draws on the CPU: two 3D pages at once starve each other on a CI runner, and
      // a heart that should beat or hold still does neither in time. One at a time, next to the
      // light tests.
      name: 'webgl',
      testMatch: webgl,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    // --ignore-lock keeps the server in the foreground: Astro moves `preview` to the
    // background when it detects a coding agent, and Playwright then sees it exit.
    command: `pnpm exec astro preview --port ${port} --ignore-lock`,
    url: `http://localhost:${port}${base}`,
    reuseExistingServer: !process.env.CI,
  },
});
