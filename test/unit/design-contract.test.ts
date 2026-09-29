import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generate } from '../../bin/build-pages.mjs';

/**
 * The two things that decide whether a site reads as one site: how wide its
 * content is, and whether every page carries the same chrome.
 *
 * Both are cheap to break one page at a time -- a new page picks a width that
 * looks right on its own, or ships without the header because it was built as
 * a standalone thing. Neither is visible until the pages are seen side by side,
 * which is why they are pinned here rather than left to review.
 *
 * The reference is docs/design-system.md; `node bin/design-audit.mjs` prints
 * the rendered numbers.
 */
const ROOT = resolve(__dirname, '../..');
const PUBLIC = resolve(ROOT, 'public');
// Most pages are rendered from markdown at build time and are not committed
// (bin/build-pages.mjs, vite plugin `generated-pages`), so they are taken from
// a fresh in-memory render rather than from disk -- the chrome contract is the
// shell's, and the shell is the generator's.
const GENERATED = generate({ outDir: null }) as Array<{ rel: string; html: string }>;

const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

/** First declaration of a property inside a rule, e.g. `.wrap { max-width: X }`. */
function declaration(css: string, selector: string, property: string): string | undefined {
  const rule = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
  return rule ? new RegExp(`${property}:\\s*([^;]+);`).exec(rule[1])?.[1].trim() : undefined;
}

describe('page width scale', () => {
  const home = read('public/home.css');
  const landing = read('public/landing.css');
  const appShell = read('styles/app-shell.css');

  it('has exactly two widths, and every page that declares one uses them', () => {
    const wide = declaration(home, '#landing-hero', '--maxw');
    const prose = declaration(landing, '.wrap', 'max-width');
    expect(wide, 'wide column').toBe('1152px');
    expect(prose, 'prose column').toBe('720px');
    // /home and /history take the same frame as the content pages, and for the
    // same reason: 1152 was mostly air while a page's content sat alone in it.
    // It stops being air once the rail is beside it, and it is the one frame
    // both app pages are built in (styles/app-shell.css), so neither of them
    // can be resized without the other.
    expect(declaration(appShell, '.app-shell', 'max-width'), 'app frame').toBe(wide);
  });

  /** Frame 1152, and the narrower column beside it. */
  function railFrame(css: string, selector: string): { frame: string; column: number } {
    const frame = new RegExp(`${selector.replace('.', '\\.')} \\{([^}]*)\\}`, 'g');
    // The frame's grid lives in a media query, so scan every block with this
    // selector and keep the one that declares columns.
    let columns = '';
    let outer = '';
    for (const match of css.matchAll(frame)) {
      if (/max-width:\s*1152px/.test(match[1])) outer = match[1];
      if (/grid-template-columns/.test(match[1])) columns = match[1];
    }
    // Two shapes for the same idea, and both are "the narrow column": a content
    // page states it as the flexible track (`minmax(0, 660px)`) beside a `1fr`
    // rail, the app shell states it as the fixed rail itself (`224px
    // minmax(0, 1fr)`) with the card taking what is left.
    const column = /minmax\(0,\s*(\d+)px\)/.exec(columns)?.[1] ?? /grid-template-columns:\s*(\d+)px/.exec(columns)?.[1];
    return { frame: outer, column: Number(column ?? 0) };
  }

  it.each([
    // Frame 1152, reading column ~660, rail takes the rest.
    ['content pages', 'landing.css', '.page', 600, 680],
    // Frame 1152, a 224px navigation rail, card takes the rest. The measure
    // argument does not apply here: neither app page is prose, and the rail is
    // navigation that has to be the same object on both of them.
    ['app pages', 'app-shell.css', '.app-shell', 200, 240],
  ])('%s: a rail beside the column, not a wider column', (_label, file, selector, min, max) => {
    // The wide viewport problem is not "the text is too narrow" -- 720px with
    // 56px gutters puts the measure at 66 characters, dead centre of the band.
    // It is that the page was a single column with nothing beside it. The frame
    // is 1152 (the site's wide width), the reading column is 660 so the measure
    // lands at ~72, and the rail takes the rest. Widening the column to fill
    // the frame would push the measure to 77.
    const css = file === 'landing.css' ? landing : appShell;
    const { frame, column } = railFrame(css, selector);
    expect(frame, 'frame is the wide width').toMatch(/max-width:\s*1152px/);
    expect(column, 'the narrow column beside it').toBeGreaterThanOrEqual(min);
    expect(column, 'the narrow column beside it').toBeLessThanOrEqual(max);
  });

  it('themes the language menu identically in both stylesheets', () => {
    // The menu panel is portalled to <body>, so its variables live at :root --
    // and the homepage does not load landing.css, so the block exists twice.
    // Two copies of a palette drift the moment someone tunes one of them.
    const block = (css: string) => /:root \{([^}]*--ran-dropdown[^}]*)\}/.exec(css)?.[1]?.trim();
    const inHome = block(home);
    const inLanding = block(landing);
    expect(inHome, 'home.css declares the menu palette').toBeTruthy();
    expect(inLanding).toBe(inHome);
  });

  it('bounds prose by characters, not by whatever the container happens to be', () => {
    const intro = declaration(read('styles/history.css'), '.history-intro', 'max-width');
    expect(intro).toMatch(/^\d{2}ch$/);
    expect(Number.parseInt(intro!, 10)).toBeLessThanOrEqual(72);
  });

  it('resets the document margin in every stylesheet that owns a page', () => {
    // The browser default is 8px. landing.css always cleared it; home.css did
    // not, so the homepage sat in a frame of backdrop -- invisible in light
    // mode against a white page, obvious in dark mode.
    for (const [name, css] of [
      ['home.css', home],
      ['landing.css', landing],
    ] as Array<[string, string]>) {
      expect(declaration(css, 'body', 'margin'), name).toBe('0');
    }
  });

  it('agrees on body line-height across the stylesheets that set it', () => {
    expect(declaration(landing, 'body', 'line-height')).toBe('1.65');
    expect(declaration(home, '#landing-hero', 'line-height')).toBe('1.65');
  });
});

describe('page chrome', () => {
  /** Every hand-written HTML page on disk (the generated ones come from the render). */
  function pages(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (['sdkjs', 'web-apps', 'ranui-iife', 'ran-fonts', 'fonts', 'img', 'wasm'].includes(name)) continue;
        pages(path, out);
      } else if (name.endsWith('.html') && !isGenerated(path)) {
        out.push(path);
      }
    }
    return out;
  }
  const isGenerated = (file: string) => GENERATED.some((g) => resolve(PUBLIC, g.rel) === file);

  /** Every user-facing page: the files on disk, plus the generated ones in memory. */
  const all = [
    ...[...pages(PUBLIC), resolve(ROOT, 'history.html'), resolve(ROOT, 'home.html')].map((file) => ({
      label: relative(ROOT, file),
      html: readFileSync(file, 'utf8'),
    })),
    ...GENERATED.map((g) => ({ label: `${g.rel} (generated)`, html: g.html })),
  ];

  it('finds the pages (sanity)', () => {
    expect(all.length).toBeGreaterThan(15);
  });

  it.each(all.map((p) => [p.label, p.html]))('%s carries the site header', (_label, html) => {
    // The homepage builds its own bar inside #landing-hero; everything else
    // uses the shared one from landing.css. A page with neither is a page a
    // visitor arrives at and cannot tell is still this site.
    const hasSharedBar = /<header class="bar">/.test(html);
    const hasHeroBar = /id="landing-hero"/.test(html) && /class="bar"/.test(html);
    expect(hasSharedBar || hasHeroBar).toBe(true);
  });

  it('styles that header from a shared stylesheet, never from the page itself', () => {
    // Two stylesheets carry the bar: home.css for the homepages, landing.css
    // for everything else. A page that draws its own would be a fourth copy of
    // the same measurements, drifting on its own schedule.
    for (const { label, html } of all) {
      if (!/class="bar"/.test(html)) continue;
      const shared = /landing\.css/.test(html) || /home\.css/.test(html);
      expect(shared, `${label} links home.css or landing.css`).toBe(true);
    }
  });
});

/**
 * The two app pages are one frame.
 *
 * /home and /history are the surfaces a visitor works in, and the rail's
 * "Saved documents" is how you get from one to the other, so they are built in
 * the same shell: one stylesheet, one module, one grid. Each page used to draw
 * its own, and they drifted -- a card on one and a bare column on the other, a
 * document row in one shape and a different one in the other shape. Copying a
 * frame is a decision nobody makes on purpose and nobody reviews, so the frame
 * is shared and these three things are pinned instead: both pages are built in
 * it, and neither of them is allowed to declare a frame of its own.
 */
describe('the app shell', () => {
  const APP_PAGES: ReadonlyArray<readonly [string, string]> = [
    ['home.html', 'styles/home-page.css'],
    ['history.html', 'styles/history.css'],
  ];
  const frames = APP_PAGES.map(([name, css]) => [name, read(name), read(css)] as const);

  it.each(frames)('%s is built in the shared frame', (_name, html) => {
    // Named in the HTML, not only set by the script: the class is what puts the
    // page in the grid at first paint, and a page that only gets it at runtime
    // reflows visibly once it arrives.
    expect(html, 'the app frame is on <main>').toMatch(/<main[^>]*class="[^"]*\bapp-shell\b/);
  });

  it.each(frames)('%s declares no frame of its own', (name, _html, css) => {
    // A page's own stylesheet may lay its own content out -- a two-column grid
    // of editor tiles is a layout, not a frame. What it may not do is decide how
    // wide the page is, which is most of what makes two app pages look like one.
    expect(css, `${name} declares no frame width`).not.toMatch(/max-width:\s*1152px/);
    expect(css, `${name} styles no shell of its own`).not.toMatch(/^\s*\.[a-z-]*shell\b/m);
  });

  it('is the one place the frame is declared', () => {
    expect(read('styles/app-shell.css')).toMatch(/max-width:\s*1152px/);
  });

  it('mounts both pages from one module, not two', () => {
    // The drift this prevents is not only in CSS: two copies of the rail means
    // two copies of the list of destinations, and a fifth destination added to
    // one of them is a link that exists on /home and not on /history.
    expect(read('lib/home-page.ts')).toMatch(/from '\.\/app-shell'/);
    expect(read('lib/history-page.ts')).toMatch(/from '\.\/app-shell'/);
  });
});

/**
 * The audit script is the only thing that measures the rendered pages, so a
 * blind spot in it is a blind spot in the design system. It had one: the page
 * list was six English routes plus `/zh-CN/`, which left five languages
 * unmeasured, and the character probe was hard-coded Latin, which made the CJK
 * pages report a Latin-equivalent number (72) instead of the 41 full-width
 * characters they actually run at.
 */
describe('design audit coverage', () => {
  const src = readFileSync(resolve(__dirname, '../../bin/design-audit.mjs'), 'utf8');

  it('derives its page list from the locale table, so a new language is audited on arrival', () => {
    expect(src).toMatch(/import \{ LOCALES \} from '\.\/build-pages\.mjs'/);
    expect(src).toMatch(/Object\.keys\(LOCALES\)/);
  });

  it('measures CJK pages in full-width characters, not Latin ones', () => {
    expect(src).toMatch(/\/\^\(zh\|ja\|ko\)\//);
  });
});

/**
 * Small text needs a stronger green than a dot does.
 *
 * `--ran-color-success` is ranui's green-700 (#28a948), which measures 3.06:1
 * on white. That is fine behind a 7px status dot and short of WCAG AA's 4.5:1
 * for text -- and the homepage used it for four 10-12px labels (the chip's
 * "open source", the document window's badge and note headings, the step
 * markers), which is exactly the size where contrast matters most. They now
 * use `--success-text` (green-900, 5.2:1). Fills keep the base token.
 */
describe('success green', () => {
  const css = read('public/home.css');
  /** Every rule as (selectors, body), comments stripped. */
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    body: m[2],
  }));

  it('defines a text-grade token', () => {
    expect(declaration(css, '#landing-hero', '--success-text')).toBe('var(--ran-green-900)');
  });

  it('never paints small text with the fill-grade green', () => {
    const small = rules.filter((rule) => {
      const size = /font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/.exec(rule.body);
      return size !== null && Number(size[1]) < 14;
    });
    // Sanity: the homepage does have small text, so a parser change that
    // matched nothing could not pass this by finding nothing to check.
    expect(small.length).toBeGreaterThan(5);

    const weak = small
      .filter((rule) => /(^|[^-])color:\s*var\(--ran-color-success\)/.test(rule.body))
      .map((rule) => rule.selector);
    expect(weak).toEqual([]);
  });
});
