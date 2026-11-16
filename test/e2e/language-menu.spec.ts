import { expect, test } from './lib/l0';

/**
 * The language menu.
 *
 * A native <details> disclosure over a list of real links: `<a href hreflang
 * lang>` for the entries, and the browser's own open/close/Escape for the
 * panel. No component library, no script required to open it, and a reader can
 * middle-click an entry or reach it with JavaScript off.
 *
 * What this file measures in a browser is the part no unit test can see: that
 * the panel opens where it should, that nothing is clipped, that exactly one
 * entry is marked current, and that the choice survives into the page it
 * navigates to.
 */
/**
 * The menu lists the four routed languages first, in route order, then the app
 * UI languages that have no page of their own.
 */
const ENDONYMS = ['English', 'Español', 'Français', 'Italiano', '中文', '日本語', '한국어', 'Deutsch', 'Português'];

const openMenu = async (page: import('@playwright/test').Page) => {
  const trigger = page.locator('.lang-trigger');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator('a.lang-option').first()).toBeVisible();
  return trigger;
};

test.describe('language menu', () => {
  for (const route of ['/', '/home', '/history']) {
    test(`${route}: names every language in its own words, whole`, async ({ page }) => {
      await page.goto(route);
      await openMenu(page);

      const options = await page.evaluate(() =>
        [...document.querySelectorAll('a.lang-option')].map((item) => ({
          text: item.textContent?.trim() ?? '',
          lang: item.getAttribute('lang'),
          hreflang: item.getAttribute('hreflang'),
          href: item.getAttribute('href'),
          current: item.getAttribute('aria-current'),
          clipped: item.scrollWidth > item.clientWidth + 1,
        })),
      );

      expect(options.map((option) => option.text)).toEqual(ENDONYMS);
      for (const option of options) {
        expect(option.clipped, `menu clips "${option.text}" on ${route}`).toBe(false);
        expect(option.href, `${option.text} is not a link`).toBeTruthy();
        expect(option.lang, `${option.text} has no lang`).toBeTruthy();
        expect(option.hreflang).toBe(option.lang);
      }

      // Exactly one entry is the current page: English, since these pages are
      // served in English and the visitor has not chosen anything yet.
      const current = options.filter((option) => option.current === 'page');
      expect(current).toHaveLength(1);
      expect(current[0].lang).toBe('en');
      await expect(page.locator('.lang-current')).toHaveText('English');
    });
  }

  test('a choice navigates, and the next page is read in that language', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await page.locator('a.lang-option[lang="zh-CN"]').click();
    await page.waitForURL(/locale=zh-CN/);

    // The app's i18n reads ?locale first, reflects it on <html lang>, and the
    // menu reports the same language in its trigger.
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.locator('.lang-current')).toHaveText('中文');
    await expect(page.locator('a.lang-option[aria-current="page"]')).toHaveAttribute('lang', 'zh-CN');
  });

  test('the panel is keyboard reachable and Escape closes it', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('.lang-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('a.lang-option').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('a.lang-option').first()).toBeHidden();
  });

  test('it fits a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await openMenu(page);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(1);
  });
});
