import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applySiteThemeToEditor,
  hasUserPickedEditorTheme,
  installEditorThemeFollow,
  isSiteDark,
  resolveEditorUiTheme,
} from '../../lib/editor-theme';

const LIGHT = 'theme-white';

afterEach(() => {
  for (const key of [
    'ran-theme',
    'ui-theme-id',
    'ui-theme-site-driven',
    // The one-shot migration marker: tests before this one resolve a theme,
    // which stamps it, and the migration is per browser.
    'ui-theme-retired-default-migrated',
  ])
    window.localStorage.removeItem(key);
});

/**
 * The site is light, always.
 *
 * It used to follow a `data-ran-theme` attribute (and the OS preference behind
 * "system"). There is one palette now: an old `ran-theme=dark` left in a
 * visitor's localStorage must not drag the editor into a mode the site no
 * longer has, and the attribute must not bring one back either.
 */
describe('isSiteDark', () => {
  it('is false whatever the attribute or the stored intent says', () => {
    document.documentElement.setAttribute('data-ran-theme', 'dark');
    expect(isSiteDark()).toBe(false);
    document.documentElement.removeAttribute('data-ran-theme');
    window.localStorage.setItem('ran-theme', 'dark');
    expect(isSiteDark()).toBe(false);
    expect(resolveEditorUiTheme(LIGHT)).toBe(LIGHT);
  });
});

describe('resolveEditorUiTheme', () => {
  it('mounts the classic light theme and remembers it as the one we drove', () => {
    expect(resolveEditorUiTheme(LIGHT)).toBe(LIGHT);
    expect(window.localStorage.getItem('ui-theme-site-driven')).toBe(LIGHT);
    expect(hasUserPickedEditorTheme()).toBe(false);
  });

  it('still lets a theme picked inside the editor win', () => {
    window.localStorage.setItem('ui-theme-id', 'theme-night');
    expect(resolveEditorUiTheme(LIGHT)).toBe('theme-night');
  });
});

describe('applySiteThemeToEditor / installEditorThemeFollow', () => {
  function fakeEditorRoot(current = LIGHT) {
    const setTheme = vi.fn((id: string) => {
      current = id;
    });
    const frame = { Common: { UI: { Themes: { setTheme, currentThemeId: () => current } } }, frames: [] };
    const root = { frames: [frame] } as unknown as Window;
    return { root, setTheme };
  }

  it('pushes the light theme into every editor frame that exposes Common.UI.Themes', () => {
    const { root, setTheme } = fakeEditorRoot();
    expect(applySiteThemeToEditor(LIGHT, root)).toBe(LIGHT);
    expect(setTheme).not.toHaveBeenCalled(); // the frame is already on it
    const other = fakeEditorRoot('theme-night');
    expect(applySiteThemeToEditor(LIGHT, other.root)).toBe(LIGHT);
    expect(other.setTheme).toHaveBeenCalledWith(LIGHT);
  });

  it('does nothing when the user overrode the theme inside the editor', () => {
    const { root, setTheme } = fakeEditorRoot('theme-night');
    window.localStorage.setItem('ui-theme-id', 'theme-night');
    expect(applySiteThemeToEditor(LIGHT, root)).toBeNull();
    expect(setTheme).not.toHaveBeenCalled();
  });

  it('applies once on install and stops watching after disposal', async () => {
    const setTheme = vi.fn();
    const frame = { Common: { UI: { Themes: { setTheme, currentThemeId: () => 'theme-night' } } }, frames: [] };
    const original = Object.getOwnPropertyDescriptor(window, 'frames');
    Object.defineProperty(window, 'frames', { configurable: true, value: [frame] });
    const dispose = installEditorThemeFollow(LIGHT);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(setTheme).toHaveBeenCalledWith(LIGHT);
      dispose();
      setTheme.mockClear();
      document.documentElement.setAttribute('data-ran-theme', 'dark');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(setTheme).not.toHaveBeenCalled();
    } finally {
      document.documentElement.removeAttribute('data-ran-theme');
      if (original) Object.defineProperty(window, 'frames', original);
    }
  });
});
