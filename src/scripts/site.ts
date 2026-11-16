/**
 * The language switcher and the runtime translation of server-rendered markup.
 *
 * Pages ship their English text in the HTML -- that is what a visitor and a
 * crawler read before any script runs -- and every translated string is
 * addressed by its i18n key in a `data-i18n` attribute. This module reads the
 * key table, applies the visitor's language, and persists an explicit choice so
 * the next page (and the editor inside it) starts in the same one.
 *
 * One page per language is what the old generator did, and it meant 24 pages
 * times 7 languages for a site with four screens. A key table is the same
 * result without the fan-out: adding a language is adding a message file, not
 * regenerating 170 documents.
 */
import { SHELL_LOCALES, applyDocumentLanguage, getLanguage, setLanguage, t } from '@ranuts/shared/i18n';

/** Any key the shared message tables define. */
type MessageKey = Parameters<typeof t>[0];

/**
 * The language the route was rendered in, when the page says so.
 *
 * `/es/` and `/fr/home` are pre-translated, so the visitor's cookie must not
 * relabel the page: the route wins for this document, is written back as the
 * choice (which is what makes the editor open in the same language), and the
 * menu marks that entry rather than the one the cookie would have picked.
 */
const serverLocale = document.querySelector('[data-route-current]')?.getAttribute('data-locale') ?? null;
/** An explicit `?locale=` is a request; it outranks the language the route was built in. */
const queryLocale = new URL(window.location.href).searchParams.get('locale');
const routeLocale = queryLocale ? null : serverLocale;

if (routeLocale) {
  if ((SHELL_LOCALES as readonly string[]).includes(routeLocale))
    setLanguage(routeLocale as Parameters<typeof setLanguage>[0]);
  document.documentElement.setAttribute('lang', routeLocale);
} else {
  applyDocumentLanguage();
}

/** Rewrite everything that carries a key, and the attributes that carry one. */
const translate = (): void => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n as MessageKey | undefined;
    if (key) node.textContent = t(key);
  }
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n-placeholder]')) {
    const key = node.dataset.i18nPlaceholder as MessageKey | undefined;
    if (key) node.setAttribute('placeholder', t(key));
  }
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
    const key = node.dataset.i18nTitle as MessageKey | undefined;
    if (key) node.setAttribute('title', t(key));
  }
  // The tab has to say what the page says. The document title is served in
  // English (it is what a crawler and a no-JS reader get); once the heading has
  // been translated, leaving the title behind tells a Chinese reader they are
  // on the English site.
  const heading = document.querySelector<HTMLElement>('.history-title');
  if (heading?.textContent?.trim()) document.title = heading.textContent.trim();
};

/**
 * Mark the current language in the menu.
 *
 * The page starts in English and the visitor's language is resolved at runtime,
 * so the menu cannot be rendered pre-selected on the server. The endonyms are
 * already in the DOM (one per link), so the trigger's label is copied from the
 * link that matches the resolved language rather than from a second table.
 */
const syncMenu = (): void => {
  const lang = getLanguage();
  // The route's own language, when the page was rendered per locale, is the
  // one that is current -- not whatever cookie the browser happens to carry.
  const routeCurrent = queryLocale
    ? null
    : document.querySelector<HTMLAnchorElement>('.lang-option[data-route-current]');
  for (const option of document.querySelectorAll<HTMLAnchorElement>('.lang-option')) {
    const isCurrent = routeCurrent ? option === routeCurrent : option.dataset.locale === lang;
    option.classList.toggle('is-current', isCurrent);
    if (isCurrent) option.setAttribute('aria-current', 'page');
    else option.removeAttribute('aria-current');
  }
  const current = document.querySelector<HTMLElement>('.lang-option.is-current');
  const label = document.querySelector<HTMLElement>('.lang-current');
  if (label && current) label.textContent = current.textContent?.trim() ?? label.textContent;
};

translate();
syncMenu();

document.addEventListener('click', (event) => {
  const option = (event.target as Element | null)?.closest<HTMLAnchorElement>('.lang-option');
  if (!option) return;
  // Remember the choice for the app's i18n (and its cookie) before navigating,
  // then let the link's own `?locale=` do the same for this navigation.
  const locale = option.dataset.locale;
  if (locale) setLanguage(locale as Parameters<typeof setLanguage>[0]);
});

// An explicit ?locale= arriving from the language menu of another page should
// survive a reload in the app too: the i18n already reads it, this keeps the
// toolbar and the menu in step with it.
window.addEventListener('languagechange', () => {
  translate();
  syncMenu();
});

// Escape closes the language panel. Chromium only does this for popovers, not
// for a bare <details>, and a menu that stays open on Escape is a menu that
// traps a keyboard user.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const open = document.querySelector<HTMLDetailsElement>('details.lang-menu[open]');
  if (!open) return;
  open.open = false;
  open.querySelector('summary')?.focus();
});

export {};
