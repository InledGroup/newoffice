/**
 * The app pages' shared wiring: the language, the file picker, opening a
 * dropped file, and the rail's create-or-upload menu. Loaded by the AppLayout,
 * so /home and /history behave identically without either page repeating the
 * setup.
 */
import './site';
import { installOpenHandlers } from '../../lib/open-file';

installOpenHandlers();

/**
 * The rail's menu.
 *
 * A button and a panel rather than a native <details>: the trigger is styled
 * as a primary button and the panel has to sit over the content column, and
 * <details> would have it take part in the rail's layout. Closed by Escape, by
 * a click outside and by choosing something -- the three ways out that a menu
 * is expected to have.
 */
const toggle = document.querySelector<HTMLButtonElement>('[data-picker-toggle]');
const menu = document.getElementById('rail-picker-menu');

if (toggle && menu) {
  const setOpen = (open: boolean): void => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  };

  // `hidden` is `boolean | "until-found"` in the DOM typings, so ask whether
  // the attribute is there rather than whether the property is truthy.
  toggle.addEventListener('click', () => setOpen(menu.hasAttribute('hidden')));

  document.addEventListener('click', (event) => {
    if (menu.hasAttribute('hidden')) return;
    const target = event.target as Node | null;
    if (target && (menu.contains(target) || toggle.contains(target))) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || menu.hasAttribute('hidden')) return;
    setOpen(false);
    toggle.focus();
  });

  menu.addEventListener('click', (event) => {
    if ((event.target as Element | null)?.closest('a, button')) setOpen(false);
  });
}
