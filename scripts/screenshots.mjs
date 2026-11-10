// End-to-end smoke test + responsive screenshots using the locally installed Chrome (playwright-core).
// Usage: npm run build && npm run screenshots   (writes ./screenshots/*.png, exits non-zero on console errors)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4179;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
mkdirSync('screenshots', { recursive: true });
const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: process.env.SCHEME === 'light' ? 'light' : 'dark' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const base = `http://localhost:${PORT}/`;
const step = async (name, fn) => { try { await fn(); console.log('✓', name); } catch (e) { errors.push(`${name}: ${e.message}`); console.log('✗', name, e.message); } };

await page.goto(base);
await step('list loads', () => page.getByRole('heading', { name: 'Characters', exact: true }).waitFor());
await step('create character', async () => {
  await page.getByRole('button', { name: /Create your first character|New character/ }).first().click();
  await page.getByPlaceholder('e.g. Seraphine Vale').fill('Lyra Duskmantle');
  await page.getByRole('button', { name: /Next: Race/ }).click();
  await page.getByRole('button', { name: /^Elf/ }).click();
  await page.getByRole('button', { name: /^High Elf/ }).click();
  await page.getByRole('button', { name: /Next: Class/ }).click();
  await page.getByRole('button', { name: /^Wizard/ }).click();
  await page.getByRole('button', { name: /Next: Subclass/ }).click();
  await page.getByRole('button', { name: /Next: Background/ }).click();
  await page.getByRole('button', { name: /^Sage/ }).click();
  await page.getByRole('button', { name: /Next: Ability Scores/ }).click();
  await page.getByRole('button', { name: 'Standard Array' }).click();
  const selects = page.locator('.abil select');
  for (let i = 0; i < 6; i++) await selects.nth(i).selectOption({ index: [5, 2, 3, 1, 4, 6][i] });
  await page.getByRole('button', { name: /Next: Proficiencies/ }).click();
  await page.screenshot({ path: 'screenshots/wizard-choices.png', fullPage: true });
  await page.getByRole('button', { name: /Next: Equipment/ }).click();
  await page.getByRole('button', { name: /Add to inventory/ }).click();
  await page.getByRole('button', { name: /Next: Spells/ }).click();
  await page.screenshot({ path: 'screenshots/wizard-spells.png', fullPage: true });
  const adds = page.getByRole('button', { name: 'Add', exact: true });
  for (let i = 0; i < 3; i++) await adds.first().click();
  await page.getByRole('button', { name: /Next: Details/ }).click();
  await page.getByRole('button', { name: /Next: Review/ }).click();
  await page.getByRole('button', { name: 'Create character' }).click();
  await page.getByRole('heading', { name: 'Lyra Duskmantle' }).waitFor();
});
const shots = async (prefix) => {
  for (const tab of ['overview', 'sheet', 'abilities', 'combat', 'spells', 'inventory', 'features', 'progression', 'notes', 'settings']) {
    await step(`tab ${tab} (${prefix})`, async () => {
      const url = page.url().replace(/#\/c\/([^/]+).*/, `#/c/$1/${tab}`);
      await page.goto(url);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `screenshots/${prefix}-${tab}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 2) errors.push(`${prefix} ${tab}: horizontal overflow ${overflow}px`);
    });
  }
};
await step('damage & heal', async () => {
  await page.getByPlaceholder('Amount or dice').fill('3');
  await page.getByRole('button', { name: 'Damage', exact: true }).click();
  await page.getByPlaceholder('Amount or dice').fill('1d4');
  await page.getByRole('button', { name: 'Heal', exact: true }).click();
});
await step('add item via fuzzy search', async () => {
  await page.goto(page.url().replace(/#\/c\/([^/]+).*/, '#/c/$1/inventory'));
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByPlaceholder(/Search \d+ items/).fill('long sw');
  await page.locator('.modal .list-row').first().getByRole('button', { name: 'Add' }).click();
  await page.keyboard.press('Escape');
  await page.getByText('Longsword').first().waitFor();
});
await step('custom item from template', async () => {
  await page.getByRole('button', { name: 'Add New Item…' }).click();
  await page.getByPlaceholder(/Search an existing item/).fill('dagger');
  await page.locator('.modal .list-row').first().click();
  await page.locator('.modal input').first().fill('Holy Banana +1 Dagger');
  await page.getByRole('button', { name: 'Save & add to inventory' }).click();
  await page.getByText('Holy Banana +1 Dagger').first().waitFor();
});
await step('short & long rest', async () => {
  await page.goto(page.url().replace(/#\/c\/([^/]+).*/, '#/c/$1/combat'));
  await page.getByRole('button', { name: 'Long rest' }).first().click();
  await page.locator('.modal').getByRole('button', { name: 'Rest' }).click();
});
await step('dice tray', async () => {
  await page.getByRole('button', { name: 'Open dice roller' }).click();
  await page.getByRole('button', { name: 'd20', exact: true }).click();
  await page.getByRole('button', { name: 'Close dice roller' }).click();
});
await step('persistence after reload', async () => {
  await page.waitForTimeout(800);
  await page.reload();
  await page.getByRole('heading', { name: 'Lyra Duskmantle' }).waitFor();
});
await step('create 2024 character', async () => {
  await page.goto(base);
  await page.getByRole('button', { name: 'New character' }).click();
  await page.getByPlaceholder('e.g. Seraphine Vale').fill('Bryn Ironhold');
  await page.locator('label:has-text("Ruleset") select').selectOption('dnd5e-2024');
  await page.getByRole('button', { name: /Next: Species/ }).click();
  await page.getByRole('button', { name: /^Dwarf/ }).click();
  await page.getByRole('button', { name: /Next: Class/ }).click();
  await page.getByRole('button', { name: /^Fighter/ }).click();
  await page.getByRole('button', { name: /Next: Subclass/ }).click();
  await page.getByRole('button', { name: /Next: Background/ }).click();
  await page.getByRole('button', { name: /^Soldier/ }).click();
  await page.getByRole('button', { name: '+1 to all three' }).click();
  await page.screenshot({ path: 'screenshots/2024-background.png', fullPage: true });
  await page.getByRole('button', { name: /Next: Ability Scores/ }).click();
  await page.getByRole('button', { name: /Next: Proficiencies/ }).click();
  await page.screenshot({ path: 'screenshots/2024-choices.png', fullPage: true });
  await page.getByRole('button', { name: /Next: Equipment/ }).click();
  await page.getByRole('button', { name: /Add to inventory/ }).click();
  await page.getByRole('button', { name: /Next: Spells/ }).click();
  await page.getByRole('button', { name: /Next: Details/ }).click();
  await page.getByRole('button', { name: /Next: Review/ }).click();
  await page.getByRole('button', { name: 'Create character' }).click();
  await page.getByRole('heading', { name: 'Bryn Ironhold' }).waitFor();
  await page.getByText('2024 rules').first().waitFor();
  await page.screenshot({ path: 'screenshots/2024-overview.png', fullPage: true });
  await page.goto(page.url().replace(/#\/c\/([^/]+).*/, '#/c/$1/inventory'));
  await page.screenshot({ path: 'screenshots/2024-inventory.png', fullPage: true });
  await page.goto(page.url().replace(/#\/c\/([^/]+).*/, '#/c/$1/features'));
  await page.screenshot({ path: 'screenshots/2024-features.png', fullPage: true });
});
await step('back to 2014 character', async () => {
  await page.goto(base);
  await page.getByRole('link', { name: 'Lyra Duskmantle' }).click();
  await page.getByRole('heading', { name: 'Lyra Duskmantle' }).waitFor();
});
await shots('desktop');
for (const [name, w, h] of [['mobile', 375, 812], ['tablet', 820, 1180], ['laptop', 1280, 800], ['4k', 2560, 1440]]) {
  await page.setViewportSize({ width: w, height: h });
  await shots(name);
}
await page.setViewportSize({ width: 1440, height: 900 });
await step('library page', async () => { await page.goto(base + '#/library/item'); await page.getByRole('heading', { name: 'Library' }).waitFor(); await page.screenshot({ path: 'screenshots/library.png' }); });
await step('character list', async () => { await page.goto(base); await page.screenshot({ path: 'screenshots/list.png' }); });

await browser.close();
server.kill();
if (errors.length) { console.error('\nProblems:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('\nAll smoke checks passed.');
