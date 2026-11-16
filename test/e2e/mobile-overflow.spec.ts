import { expect, test } from './lib/l0';

/**
 * No page may scroll sideways on a phone.
 *
 * A run of text with no break opportunity that is wider than the column does
 * not overflow its own box -- it widens the page under it, which reads as a
 * horizontal scrollbar on what is otherwise a column of prose. It is invisible
 * on a desktop viewport and invisible in the markup.
 *
 * The site is four screens now, so this checks all four rather than walking a
 * sitemap: the marketing page, the two app pages, and the editor's shell.
 */
const ROUTES = ['/', '/home', '/history', '/editor?new=docx'];

test.describe('no page scrolls sideways on a phone', () => {
  test.describe.configure({ timeout: 180_000 });
  test.use({ viewport: { width: 390, height: 844 } });

  test('every page fits a 390 px viewport', async ({ page }) => {
    const wide: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route);
      // Web fonts change how much a run measures, so wait for them: the
      // fallback face can fit where the real one does not.
      await page.evaluate(() => document.fonts.ready);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      // 1 px of slack for subpixel rounding at fractional device ratios.
      if (over > 1) wide.push(`${route} (+${over}px)`);
    }
    expect(wide, 'pages wider than the viewport').toEqual([]);
  });
});
