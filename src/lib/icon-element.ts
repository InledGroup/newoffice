/**
 * The same Fluent paths the Astro components draw, for DOM built at runtime.
 *
 * Lists are assembled in script, so the icon has to exist as an element rather
 * than as markup: one source (src/icons.ts) keeps the two surfaces identical.
 */
import { ICONS, type IconName } from '../icons';

export function iconEl(name: IconName, size = 16): SVGSVGElement {
  const icon = ICONS[name];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', icon.viewBox);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = icon.body;
  return svg;
}
