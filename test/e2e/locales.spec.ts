import { expect, test } from './lib/l0';

/**
 * The translated routes.
 *
 * `/`, `/es`, `/fr` and `/it` are four real pages, not one page rewritten after
 * paint: the copy is chosen at build time from the route. What can only be seen
 * in a browser is that the served HTML already says the right thing, that the
 * language menu marks the route's language rather than whatever cookie the
 * browser happens to carry, and that the editor links keep the language.
 */
const ROUTES = [
  {
    path: '/',
    lang: 'en',
    title: 'Your Office, in the browser.',
    menu: 'English',
    canonical: 'https://office.inled.es/',
  },
  {
    path: '/es',
    lang: 'es',
    title: 'Tu Office, en el navegador.',
    menu: 'Español',
    canonical: 'https://office.inled.es/es',
  },
  {
    path: '/fr',
    lang: 'fr',
    title: 'Votre Office, dans le navigateur.',
    menu: 'Français',
    canonical: 'https://office.inled.es/fr',
  },
  {
    path: '/it',
    lang: 'it',
    title: 'Il tuo Office, nel browser.',
    menu: 'Italiano',
    canonical: 'https://office.inled.es/it',
  },
];

test.describe('translated landing pages', () => {
  for (const route of ROUTES) {
    test(`${route.path} is served in ${route.lang}`, async ({ page }) => {
      await page.goto(route.path);

      await expect(page.locator('.hero h1')).toHaveText(route.title);
      await expect(page.locator('html')).toHaveAttribute('lang', route.lang);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', route.canonical);

      // The menu's current entry follows the route, not navigator.language.
      await page.locator('.lang-trigger').click();
      await expect(page.locator('a.lang-option[aria-current="page"]')).toHaveAttribute('lang', route.lang);
      await expect(page.locator('.lang-current')).toHaveText(route.menu);

      // Every language links to every other, itself included.
      const alternates = await page.locator('link[rel="alternate"][hreflang]').count();
      expect(alternates).toBeGreaterThanOrEqual(5);
    });
  }

  test('a trailing slash reaches the same page', async ({ page }) => {
    const response = await page.goto('/es/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('.hero h1')).toHaveText('Tu Office, en el navegador.');
  });

  test('the editor keeps the page language', async ({ page }) => {
    await page.goto('/fr');
    const openLink = page.locator('[data-open-local]').first();
    await expect(openLink).toHaveAttribute('data-open-local', /locale=fr/);
    await expect(page.locator('a.product[data-prefetch="docx"]')).toHaveAttribute('href', /locale=fr/);
  });
});

test.describe('translated app home', () => {
  const HOME = [
    { path: '/home', lang: 'en', title: 'Start' },
    { path: '/es/home', lang: 'es', title: 'Empezar' },
    { path: '/fr/home', lang: 'fr', title: 'Démarrer' },
    { path: '/it/home', lang: 'it', title: 'Inizia' },
  ];

  for (const route of HOME) {
    test(`${route.path} is served in ${route.lang}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator('.app-main .page-title')).toHaveText(route.title);
      await expect(page.locator('html')).toHaveAttribute('lang', route.lang);
      await expect(page.locator('.rail-cta')).toBeVisible();
    });
  }
});

test('the rail menu offers the document types and a file', async ({ page }) => {
  await page.goto('/home');

  const toggle = page.locator('[data-picker-toggle]');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#rail-picker-menu')).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#rail-picker-menu')).toBeVisible();

  // Three blank document types, then the way in for an existing file.
  const items = page.locator('#rail-picker-menu [role="menuitem"]');
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toHaveAttribute('href', '/editor?new=docx');
  await expect(items.nth(1)).toHaveAttribute('href', '/editor?new=xlsx');
  await expect(items.nth(2)).toHaveAttribute('href', '/editor?new=pptx');
  await expect(items.nth(3)).toHaveAttribute('data-open-file', '');

  await page.keyboard.press('Escape');
  await expect(page.locator('#rail-picker-menu')).toBeHidden();
  await expect(toggle).toBeFocused();
});
