import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applySiteThemeToEditor,
  hasUserPickedEditorTheme,
  installEditorThemeFollow,
  isSiteDark,
  resolveEditorUiTheme,
} from '../../lib/editor-theme';

const LIGHT = 'theme-white';
const html = document.documentElement;

afterEach(() => {
  html.removeAttribute('data-ran-theme');
  for (const k of [
    'ran-theme',
    'ui-theme-id',
    'ui-theme-site-driven',
    // The one-shot migration marker: tests before this one resolve a theme,
    // which stamps it, and the migration is per browser.
    'ui-theme-retired-default-migrated',
  ])
    window.localStorage.removeItem(k);
});

describe('isSiteDark', () => {
  it('reads the effective ranui attribute first', () => {
    html.setAttribute('data-ran-theme', 'dark');
    expect(isSiteDark()).toBe(true);
    html.setAttribute('data-ran-theme', 'light');
    window.localStorage.setItem('ran-theme', 'dark');
    expect(isSiteDark()).toBe(false);
  });

  it('falls back to the stored intent, then the OS media query', () => {
    window.localStorage.setItem('ran-theme', 'dark');
    expect(isSiteDark()).toBe(true);
    window.localStorage.setItem('ran-theme', 'system');
    expect(isSiteDark()).toBe(false); // vitest setup: matchMedia.matches = false
  });
});

describe('resolveEditorUiTheme', () => {
  it('maps a dark site to the modern theme-night, not the classic theme-dark', () => {
    // `theme-dark` is the classic family's dark despite the name, so driving it
    // left every dark site on the old look while light sites got the new one.
    html.setAttribute('data-ran-theme', 'dark');
    expect(resolveEditorUiTheme(LIGHT)).toBe('theme-night');
    expect(window.localStorage.getItem('ui-theme-site-driven')).toBe('theme-night');
    expect(hasUserPickedEditorTheme()).toBe(false);
  });

  it('a light site gets the modern default it was handed', () => {
    html.setAttribute('data-ran-theme', 'light');
    expect(resolveEditorUiTheme(LIGHT)).toBe(LIGHT);
  });

  it('a theme the user picked inside the editor wins over the site', () => {
    html.setAttribute('data-ran-theme', 'dark');
    window.localStorage.setItem('ui-theme-id', 'theme-white');
    expect(hasUserPickedEditorTheme()).toBe(true);
    expect(resolveEditorUiTheme(LIGHT)).toBe('theme-white');
  });

  it('an editor-persisted copy of the driven theme is not a user choice', () => {
    html.setAttribute('data-ran-theme', 'dark');
    resolveEditorUiTheme(LIGHT);
    // The editor writes ui-theme-id with the theme it was told to use.
    window.localStorage.setItem('ui-theme-id', 'theme-night');
    expect(hasUserPickedEditorTheme()).toBe(false);
    html.setAttribute('data-ran-theme', 'light');
    expect(resolveEditorUiTheme(LIGHT)).toBe(LIGHT);
  });

  it('migrates away from the retired classic default once, per browser', () => {
    // Browsers that opened the editor while theme-classic-light was the
    // default hold it as if they had picked it -- it was written by the editor
    // persisting the value we drove. It must not block the modern default.
    html.setAttribute('data-ran-theme', 'light');
    window.localStorage.setItem('ui-theme-id', 'theme-classic-light');
    window.localStorage.setItem('ui-theme-site-driven', 'theme-classic-light');

    expect(resolveEditorUiTheme('theme-white')).toBe('theme-white');
    expect(window.localStorage.getItem('ui-theme-id')).toBeNull();
    expect(window.localStorage.getItem('ui-theme-site-driven')).toBe('theme-white');
    expect(window.localStorage.getItem('ui-theme-retired-default-migrated')).toBe('1');

    // One-shot: a later genuine pick of the classic look is respected.
    window.localStorage.setItem('ui-theme-id', 'theme-classic-light');
    expect(resolveEditorUiTheme('theme-white')).toBe('theme-classic-light');
  });

  it('migrates the retired classic dark too, which is also a theme we drove', () => {
    // Same leak as the light one, and it went unnoticed for longer: the dark
    // default stayed classic after the light default went modern, so anyone on
    // a dark site was pinned to the old look by a "preference" they never made.
    window.localStorage.removeItem('ui-theme-retired-default-migrated');
    html.setAttribute('data-ran-theme', 'dark');
    window.localStorage.setItem('ui-theme-id', 'theme-dark');
    window.localStorage.setItem('ui-theme-site-driven', 'theme-dark');

    expect(resolveEditorUiTheme('theme-white')).toBe('theme-night');
    expect(window.localStorage.getItem('ui-theme-id')).toBeNull();
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

  it('pushes the site theme into every editor frame that exposes Common.UI.Themes', () => {
    const { root, setTheme } = fakeEditorRoot();
    html.setAttribute('data-ran-theme', 'dark');
    expect(applySiteThemeToEditor(LIGHT, root)).toBe('theme-night');
    expect(setTheme).toHaveBeenCalledWith('theme-night');
    // Same theme again: no redundant call.
    applySiteThemeToEditor(LIGHT, root);
    expect(setTheme).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the user overrode the theme inside the editor', () => {
    const { root, setTheme } = fakeEditorRoot();
    window.localStorage.setItem('ui-theme-id', 'theme-night');
    html.setAttribute('data-ran-theme', 'dark');
    expect(applySiteThemeToEditor(LIGHT, root)).toBeNull();
    expect(setTheme).not.toHaveBeenCalled();
  });

  it('reacts to <html data-ran-theme> flips until disposed', async () => {
    const setTheme = vi.fn();
    const frame = { Common: { UI: { Themes: { setTheme, currentThemeId: () => LIGHT } } }, frames: [] };
    const original = Object.getOwnPropertyDescriptor(window, 'frames');
    Object.defineProperty(window, 'frames', { configurable: true, value: [frame] });
    const dispose = installEditorThemeFollow(LIGHT);
    try {
      html.setAttribute('data-ran-theme', 'dark');
      await new Promise((r) => setTimeout(r, 0));
      expect(setTheme).toHaveBeenCalledWith('theme-night');
      dispose();
      setTheme.mockClear();
      html.setAttribute('data-ran-theme', 'light');
      await new Promise((r) => setTimeout(r, 0));
      expect(setTheme).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(window, 'frames', original);
    }
  });
});
