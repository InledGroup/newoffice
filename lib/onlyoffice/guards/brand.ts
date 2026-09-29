import { getLanguage, t, withLocale } from '@ranuts/shared/i18n';
import { isEmbedMode } from '../../embed-mode';

/**
 * Guard 17: this site's own mark in the editor header, with the vendor's kept
 * beside it and made smaller.
 *
 * The editor is the one screen a visitor spends real time on, and its header
 * was the only place in the whole interface with no way back to the site -- the
 * ONLYOFFICE logo sat alone at the top left of the frame. This adds the Insuite
 * mark as the primary link home, in the same lockup the site's own bar uses
 * (public/landing.css `header.bar .brand`), and scales the vendor mark down so
 * the two read as "this product, built on that one" rather than two logos
 * fighting for the same corner.
 *
 * The vendor logo is NOT removed, hidden or replaced. Section 7(b) of the
 * vendor's AGPL terms requires the original product logo to be retained when
 * the program is distributed, so it stays on screen and keeps its own image --
 * only its size changes (20px -> 15px tall, same aspect ratio, no crop). See
 * NOTICE, and test/e2e/vendor-branding.spec.ts, which is the half that proves
 * it is still visible.
 *
 * Skipped in embed mode: there the editor is inside someone else's page, and
 * our navigation does not belong in their document.
 *
 * Idempotent, and re-applied on the caller's timer, because the vendor rebuilds
 * parts of this header as the editor boots.
 */
const BRAND_ID = 'oo-home-brand';
const STYLE_ID = 'oo-home-brand-css';
/** Same asset and lockup as the app bar's brand on /home and /history. */
const LOGO_URL = 'https://hosted.inled.es/cdn/insuite.svg';

/**
 * The vendor mark's own box is 86x20 (`#header-logo i`). 65x15 is that same
 * aspect ratio, uniformly scaled -- a smaller but un-distorted product logo,
 * still comfortably above the >20x>8 floor the branding e2e asserts.
 */
export function installHomeBrand(doc: Document): boolean {
  if (isEmbedMode()) return true;

  const headerLogo = doc.getElementById('header-logo');
  // The desktop header's logo section. If it is not there yet, or the build is
  // the mobile one, the caller's timer will try again.
  const slot = headerLogo?.parentElement;
  if (!slot) return false;

  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      `#${BRAND_ID} {`,
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  height: 100%;',
      '  padding: 0 10px;',
      '  margin-right: 4px;',
      '  border-radius: 4px;',
      '  text-decoration: none;',
      '  color: inherit;',
      '  font: 600 13px/1 system-ui, sans-serif;',
      '  white-space: nowrap;',
      '}',
      `#${BRAND_ID}:hover { background: rgba(127, 127, 127, 0.14); }`,
      `#${BRAND_ID} img { width: 18px; height: 18px; display: block; }`,
      // The vendor mark, kept and scaled (AGPL-3.0 Section 7(b)): same image,
      // same aspect ratio, 20px -> 15px tall.
      '#header-logo i {',
      '  width: 65px !important;',
      '  height: 15px !important;',
      '  background-size: contain !important;',
      '  background-repeat: no-repeat !important;',
      '  background-position: left center !important;',
      '}',
    ].join('\n');
    (doc.head || doc.documentElement).appendChild(style);
  }

  if (!doc.getElementById(BRAND_ID)) {
    const link = doc.createElement('a');
    link.id = BRAND_ID;
    link.href = withLocale('/home', getLanguage());
    // The header lives in the editor iframe; the link should take the whole tab
    // home, not navigate the frame to a page it is not sized for.
    link.target = '_top';
    link.rel = 'noopener';
    link.title = `Insuite Office — ${t('homeNavOpen')}`;

    const mark = doc.createElement('img');
    mark.src = LOGO_URL;
    mark.alt = '';
    mark.width = 18;
    mark.height = 18;
    link.appendChild(mark);

    const name = doc.createElement('span');
    name.textContent = 'Insuite Office';
    link.appendChild(name);

    slot.insertBefore(link, slot.firstChild);
  }

  return true;
}
