const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const password = process.env.CARELINK_DEMO_PASSWORD;
  if (!password) throw new Error('Set CARELINK_DEMO_PASSWORD to match the localhost synthetic demo.');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const output = path.resolve('../../mobile-delivery/screenshots'); fs.mkdirSync(output, { recursive: true });
  const checks = [];
  try {
    for (const [width, height] of [[360, 800], [320, 740], [412, 915]]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:8011/mobile');
      await page.getByLabel('Username', { exact: true }).fill('demo-patient');
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: /Sign in securely/ }).click();
      await page.getByRole('button', { name: 'Agree and continue' }).click();
      await page.getByRole('heading', { name: 'A little closer, every day.' }).waitFor();
      for (const [key, label] of [['home', 'Home'], ['records', 'Records'], ['baby', 'My Baby'], ['appointments', 'Appointments'], ['profile', 'Profile']]) {
        await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
        if (key === 'baby' || key === 'home') {
          await page.locator('canvas').waitFor();
          await page.waitForTimeout(400);
        }
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`${width}px ${key}: horizontal overflow`);
        const nav = page.getByRole('navigation');
        if (!await nav.isVisible()) throw new Error('Navigation unavailable');
        if (width === 360) {
          await page.screenshot({ path: path.join(output, `${key}-360.png`), fullPage: true });
          await page.screenshot({ path: path.join(output, `${key}-360-viewport.png`) });
        }
        if (key === 'baby') {
          await page.getByRole('slider', { name: 'Preview pregnancy week' }).fill('30');
          await page.getByRole('heading', { name: 'Week 30', exact: true }).waitFor();
          await page.getByRole('button', { name: /Return to current week/ }).click();
          await page.getByRole('button', { name: 'Play illustration' }).click();
          await page.getByRole('button', { name: 'Pause illustration' }).click();
          await page.getByRole('button', { name: 'Reset view' }).click();
        }
        if (key === 'records') {
          await page.getByRole('button', { name: 'View source document', exact: true }).first().click();
          const image = page.getByRole('dialog', { name: 'Source document', exact: true }).getByRole('img');
          await image.waitFor();
          await image.evaluate(img => img.complete ? Promise.resolve() : new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; }));
          if (!await image.evaluate(img => img.naturalWidth > 0)) throw new Error('Protected source did not load');
          await page.getByRole('button', { name: 'Close document', exact: true }).click();
        }
      }
      await page.getByLabel('Phone number', { exact: true }).fill('Synthetic phone');
      await page.getByRole('button', { name: 'Save to shared record' }).click();
      await page.getByRole('status').filter({ hasText: 'Saved to your shared' }).waitFor();
      const profileResponse = await page.request.get('http://127.0.0.1:8011/api/mobile/synthetic-mobile/profile');
      const profile = await profileResponse.json();
      if (profile.phone_number !== 'Synthetic phone') throw new Error('Profile did not persist');
      const conflict = await page.request.patch('http://127.0.0.1:8011/api/mobile/synthetic-mobile/profile', { headers: { 'X-CareLink-Client': '1' }, data: { profile_version: profile.profile_version - 1, lmp: null } });
      if (conflict.status() !== 409) throw new Error('Expected stale update conflict');
      const denied = await page.request.get('http://127.0.0.1:8011/api/patients/unassigned/journey');
      if (denied.status() !== 403) throw new Error('Patient scope escaped');
      await page.getByLabel('Language', { exact: true }).selectOption('hi');
      await page.getByRole('navigation').getByRole('button', { name: 'होम', exact: true }).click();
      await page.getByLabel('Language', { exact: true }).selectOption('mr');
      await page.getByRole('navigation').getByRole('button', { name: 'मुख्यपृष्ठ', exact: true }).click();
      await page.getByLabel('Language', { exact: true }).selectOption('en');
      await context.setOffline(true);
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      await page.getByRole('alert').waitFor();
      await context.setOffline(false);
      await page.getByRole('button', { name: 'Retry / reload record' }).click();
      await page.getByRole('heading', { name: 'A little closer, every day.' }).waitFor();
      if (errors.length) throw new Error(errors.join('\n'));
      checks.push(`${width}×${height}: tabs, WebGL, stage preview, motion controls, persistence, 409, access denial, languages, offline/retry passed`);
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8011/mobile');
    await page.getByLabel('Username', { exact: true }).fill('demo-staff'); await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /Sign in securely/ }).click(); await page.getByRole('button', { name: 'Agree and continue' }).click();
    await page.getByRole('heading', { name: 'Assigned patients' }).waitFor();
    await page.getByRole('navigation').getByRole('button', { name: 'Records', exact: true }).click();
    await page.getByRole('heading', { name: 'Record review' }).waitFor();
    await page.screenshot({ path: path.join(output, 'staff-360.png'), fullPage: true });
    checks.push('Assigned staff dashboard and record tasks render');
    await context.close();
    fs.writeFileSync(path.join(output, '../browser-verification.txt'), checks.join('\n') + '\n');
    console.log(checks.join('\n'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
