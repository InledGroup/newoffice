import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDocx, ooxmlText, zipEntryText } from './lib/ooxml';
import { expect, test } from './lib/l0';

/**
 * The standalone site (index.html), not the embed demo: what users actually
 * click. Open a local file through the hero button and the native file
 * chooser, type into the real editor, save with Ctrl+S and receive the
 * download; and the "New Excel" flow. Matrix section C "standalone 主站".
 *
 * showSaveFilePicker is removed so saveFileToDisk takes the anchor-download
 * branch Playwright can observe (the picker is browser UI, not our code).
 */
test.describe('standalone site (real editor)', () => {
  test.describe.configure({ timeout: 150_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
    });
  });

  const waitForEditorReady = (page: import('@playwright/test').Page) =>
    page.waitForFunction(
      () => {
        return Boolean(window.__ooFrames.readyEditor());
      },
      undefined,
      { timeout: 90_000 },
    );

  test('open a local docx from the hero button, type, Ctrl+S downloads the edited file', async ({ page }) => {
    const dir = join('test-results', 'main-site');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, '主站打开 (1).docx');
    writeFileSync(path, buildDocx('main site paragraph'));

    await page.goto('/');
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#hero-open').click();
    const chooser = await chooserPromise;
    await chooser.setFiles(path);

    await waitForEditorReady(page);
    const sdk = page.frameLocator('iframe[name="frameEditor"]').locator('#editor_sdk');
    await sdk.waitFor({ state: 'visible', timeout: 30_000 });
    await sdk.click({ position: { x: 300, y: 200 } });
    await page.keyboard.press('End');
    await page.keyboard.type(' typed', { delay: 60 });

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await page.keyboard.press('Control+s');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('主站打开 (1).docx');
    const saved = await download.path();
    const bytes = new Uint8Array(readFileSync(saved));
    expect(bytes[0]).toBe(0x50);
    expect(ooxmlText((await zipEntryText(bytes, 'word/document.xml')) || '')).toContain('main site paragraph typed');
  });

  test('New Excel from the app homepage creates a blank workbook that saves via Ctrl+S', async ({ page }) => {
    // The hero no longer carries a New button (the InSuite landing has two
    // calls to action); creating a blank workbook starts from /home, whose
    // quick actions link to /editor?new=xlsx.
    await page.goto('/home');
    await page.locator('.app-quick[data-type="xlsx"]').click();
    await waitForEditorReady(page);
    const frame = page.frameLocator('iframe[name="frameEditor"]');
    const sdk = frame.locator('#editor_sdk');
    await sdk.waitFor({ state: 'visible', timeout: 30_000 });
    // Interface theme: the modern flat light theme by default (the v9 loader's
    // own light default -- not the classic per-app coloured header).
    await expect(frame.locator('body')).toHaveClass(/theme-white/);
    await sdk.click({ position: { x: 200, y: 150 } });
    await page.keyboard.type('hello', { delay: 60 });
    await page.keyboard.press('Enter');

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await page.keyboard.press('Control+s');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('New_Document.xlsx');
    const bytes = new Uint8Array(readFileSync(await download.path()));
    expect(bytes[0]).toBe(0x50);
    expect((await zipEntryText(bytes, 'xl/sharedStrings.xml')) || '').toContain('hello');
  });

  test('a browser holding the retired classic theme opens in the modern one', async ({ page }) => {
    // The regression this pins: theme-classic-light used to be the default we
    // drove, so browsers from before the retirement hold it in ui-theme-id --
    // written by the editor persisting the value we sent. To the resolution
    // logic that read as a deliberate pick, and every open kept the classic
    // look forever. The one-shot migration clears it; after that, a genuine
    // in-editor pick sticks (unit-tested), so this is the browser state the
    // user reported from.
    // Seed the top frame only: an unfiltered addInitScript runs in the editor
    // iframe too and re-seeds the key AFTER the page's migration cleared it --
    // an artifact no real browser has (the real value was written once by the
    // editor itself, and the migration wipes it before the iframe boots).
    await page.addInitScript(() => {
      if (window !== window.top) return;
      window.localStorage.setItem('ui-theme-id', 'theme-classic-light');
      window.localStorage.setItem('ui-theme-site-driven', 'theme-classic-light');
    });
    await page.goto('/editor?new=docx');
    await waitForEditorReady(page);
    const frame = page.frameLocator('iframe[name="frameEditor"]');
    await expect(frame.locator('body')).toHaveClass(/theme-white/, { timeout: 30_000 });
  });

  test('a browser holding the retired classic dark opens in the modern dark', async ({ page }) => {
    // Same leak, and it lived longer: `theme-dark` is the classic family's dark
    // despite the name, so it was our dark default and stayed on the old look
    // after the light default went modern. It had to join the retirement set,
    // not just the default change, or every dark site stayed pinned to a
    // "preference" the editor wrote for us.
    await page.addInitScript(() => {
      if (window !== window.top) return;
      window.localStorage.setItem('ui-theme-id', 'theme-dark');
      window.localStorage.setItem('ui-theme-site-driven', 'theme-dark');
    });
    // A dark site, so the driven value is the modern dark.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/editor?new=docx');
    await waitForEditorReady(page);
    const frame = page.frameLocator('iframe[name="frameEditor"]');
    await expect(frame.locator('body')).toHaveClass(/theme-night/, { timeout: 30_000 });
  });
});
