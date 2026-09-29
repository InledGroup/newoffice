/**
 * The app shell: the frame both app pages are built inside.
 *
 * /home and /history are the two surfaces a visitor actually works in, and they
 * are reached from each other -- the rail's "Saved documents" is how you get
 * from one to the other. So they are one frame: this module builds it and
 * styles/app-shell.css draws it, and each page's own module supplies only what
 * is genuinely its own (the file picker and the four-editor grid on /home; the
 * search, the switch and the pager on /history).
 *
 * The alternative -- each page building its own rail, its own card and its own
 * document row -- is what the two pages did before, and it drifts: a radius
 * tuned on one, a row action that appears on hover on one page and on focus on
 * the other, a rail that hides at a different width. Neither page's author can
 * see the other page's copy while writing, and the result reads as two products
 * wearing one logo.
 *
 * The rows are built here too, with the page's own class added on top of the
 * shared one (`.app-row.history-row`). That is deliberate: each page keeps the
 * hooks its own styles and its own tests address, and neither of them can
 * override the shape of the other, because the shape is in the shared class.
 */
import 'ranui/button';
import { Div, Span, View } from 'ranui/builder';
import '../styles/app-shell.css';
import { getLanguage, localeHomePath, t, withLocale } from '@ranuts/shared/i18n';
import { formatRelativeTime } from './history/recovery';
import { hasUnsavedWork, type HistoryDoc } from './history/types';
import { stashPendingFile } from './pending-open';

/**
 * The lucide icons, as inline SVG.
 *
 * The reference draws its icons with lucide-react, and the shapes below are
 * lucide's own paths. They are inlined rather than served from a `<symbol>`
 * sprite for one concrete reason: a `<use>` clones the referenced element into
 * a shadow tree that inherits from the *`use` site*, not from the sprite's
 * ancestors, so a sprite cannot carry the stroke attributes that make an icon
 * take the colour of its container. Inlining the attributes on each icon is
 * what makes `color:` on the tile reach the stroke -- which is the whole reason
 * the document-type tiles are coloured at all.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Keep in step with the app's own picker (lib/document.ts) and public/open-local.js. */
const ACCEPT = '.docx,.xlsx,.pptx,.doc,.xls,.ppt,.csv,.pdf';

/** lucide's 24×24 stroke geometry: `d` for a path, or the attributes for a shape. */
type Shape = { tag: 'path' | 'rect' | 'circle' | 'line' | 'polyline'; attrs: Record<string, string> };
const LUCIDE: Record<string, Shape[]> = {
  // file-text
  'i-doc': [
    { tag: 'path', attrs: { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' } },
    { tag: 'path', attrs: { d: 'M14 2v4a2 2 0 0 0 2 2h4' } },
    { tag: 'path', attrs: { d: 'M10 9H8' } },
    { tag: 'path', attrs: { d: 'M16 13H8' } },
    { tag: 'path', attrs: { d: 'M16 17H8' } },
  ],
  // file-spreadsheet
  'i-sheet': [
    { tag: 'path', attrs: { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' } },
    { tag: 'path', attrs: { d: 'M14 2v4a2 2 0 0 0 2 2h4' } },
    { tag: 'path', attrs: { d: 'M8 13h2' } },
    { tag: 'path', attrs: { d: 'M14 13h2' } },
    { tag: 'path', attrs: { d: 'M8 17h2' } },
    { tag: 'path', attrs: { d: 'M14 17h2' } },
  ],
  // presentation
  'i-slides': [
    { tag: 'path', attrs: { d: 'M2 3h20' } },
    { tag: 'path', attrs: { d: 'M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3' } },
    { tag: 'path', attrs: { d: 'm7 21 5-5 5 5' } },
  ],
  // file-type (PDF)
  'i-pdf': [
    { tag: 'path', attrs: { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' } },
    { tag: 'path', attrs: { d: 'M14 2v4a2 2 0 0 0 2 2h4' } },
    { tag: 'path', attrs: { d: 'M9 15h1.5a1.5 1.5 0 0 1 0 3H9V15' } },
    { tag: 'path', attrs: { d: 'M13 15h1.5a1.5 1.5 0 0 1 0 3H13v-1' } },
  ],
  // upload
  'i-upload': [
    { tag: 'path', attrs: { d: 'M12 3v12' } },
    { tag: 'path', attrs: { d: 'm17 8-5-5-5 5' } },
    { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
  ],
  // clock
  'i-clock': [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'polyline', attrs: { points: '12 6 12 12 16 14' } },
  ],
  // folder-open
  'i-folder': [
    {
      tag: 'path',
      attrs: {
        d: 'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2',
      },
    },
  ],
  // download
  'i-download': [
    { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
    { tag: 'polyline', attrs: { points: '7 10 12 15 17 10' } },
    { tag: 'line', attrs: { x1: '12', y1: '15', x2: '12', y2: '3' } },
  ],
  // x
  'i-x': [{ tag: 'path', attrs: { d: 'M18 6 6 18M6 6l12 12' } }],
  // plus
  'i-plus': [{ tag: 'path', attrs: { d: 'M5 12h14M12 5v14' } }],
  // house
  'i-home': [
    { tag: 'path', attrs: { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' } },
    {
      tag: 'path',
      attrs: {
        d: 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      },
    },
  ],
  // layers
  'i-layers': [
    {
      tag: 'path',
      attrs: {
        d: 'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a2 2 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a2 2 0 0 0 0-1.83Z',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'm6.08 9.5-3.5 1.6a2 2 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a2 2 0 0 0 0-1.83L17.9 9.5' },
    },
    {
      tag: 'path',
      attrs: { d: 'm6.08 14.5-3.5 1.6a2 2 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a2 2 0 0 0 0-1.83l-3.5-1.59' },
    },
  ],
  // circle-help
  'i-help': [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'path', attrs: { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' } },
    { tag: 'path', attrs: { d: 'M12 17h.01' } },
  ],
  // info
  'i-info': [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'path', attrs: { d: 'M12 16v-4M12 8h.01' } },
  ],
};

/**
 * One lucide icon, inline.
 *
 * The stroke attributes are on the `<svg>` itself rather than inherited: a
 * `color:` on any ancestor then reaches the stroke, so a tile can colour its
 * own icon (`--doc-tint`) with nothing but a `color` declaration.
 */
export function icon(id: string, className = 'ic'): HTMLElement {
  const shapes = LUCIDE[id];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const shape of shapes) {
    const node = document.createElementNS(SVG_NS, shape.tag);
    for (const [key, value] of Object.entries(shape.attrs)) node.setAttribute(key, value);
    svg.appendChild(node);
  }
  return svg as unknown as HTMLElement;
}

/** The four editors, in the order the reference lists them. */
export const APP_TYPES: ReadonlyArray<{ type: string; label: () => string; icon: string }> = [
  { type: 'docx', label: () => t('homeDocument'), icon: 'i-doc' },
  { type: 'xlsx', label: () => t('homeSpreadsheet'), icon: 'i-sheet' },
  { type: 'pptx', label: () => t('homePresentation'), icon: 'i-slides' },
  { type: 'pdf', label: () => t('homePdf'), icon: 'i-pdf' },
];

/** An app URL, carrying the language this page is being read in. */
export const appUrl = (path: string): string => withLocale(path, getLanguage());

/** A translated static page (help, about) lives under the language's home. */
const pageUrl = (slug: string): string => `${localeHomePath(getLanguage())}${slug}`;

/** Which app page the rail is being drawn on, so it can mark itself. */
export type AppRoute = 'home' | 'history';

/* ---- the bar's quick actions ---- */

/**
 * The four editors, as the header's own quick actions.
 *
 * They are built here rather than written into each page's HTML: both app
 * pages carry the same bar, and the actions belong to the bar, not to whichever
 * page happens to be under it. The links are `/editor?new=<type>`, so a blank
 * document is one click from either page.
 */
function buildBarActions(): HTMLElement[] {
  return APP_TYPES.map(({ type, label, icon: mark }) =>
    View('a')
      .class('app-quick')
      .data('type', type)
      .attr('href', appUrl(`/editor?new=${type}`))
      // The title is the label rather than a hardcoded English word: this is the
      // one place the bar carries a word of its own, and the reader's language
      // applies to it like any other.
      .attr('title', label())
      .attr('aria-label', label())
      .children(icon(mark))
      .build(),
  );
}

/** Fill the `<span class="app-bar-actions">` the app pages leave in the bar. */
export function mountBarActions(): void {
  for (const slot of document.querySelectorAll('.app-bar-actions')) {
    slot.replaceChildren(...buildBarActions());
  }
}

/* ---- the rail ---- */

function newDocItems(): HTMLElement[] {
  return APP_TYPES.map(({ type, label, icon: mark }) =>
    View('a')
      .class('app-new-item')
      .data('type', type)
      .attr('href', appUrl(`/editor?new=${type}`))
      .children(icon(mark), Span().text(label()))
      .build(),
  );
}

function railItem(href: string, markId: string, label: string, current = false): HTMLElement {
  const builder = View('a')
    .class(`app-nav-item${current ? ' is-current' : ''}`)
    .attr('href', href)
    .children(icon(markId), Span().text(label));
  if (current) builder.attr('aria-current', 'page');
  return builder.build();
}

function buildRail(current: AppRoute): HTMLElement {
  const trigger = Span()
    .class('app-new-trigger')
    .children(icon('i-plus'), Span().text(t('homeNew')))
    .build();
  const list = Div()
    .class('app-new-list')
    .children(...newDocItems())
    .build();
  // The popover is the same component the bar's language menu uses, so the two
  // menus open, close and get out of the way identically.
  const popover = View('r-popover')
    .class('app-new')
    .attr('placement', 'bottom')
    .attr('trigger', 'click')
    .attr('role', 'button')
    .attr('aria-label', t('homeNew'))
    .children(trigger, View('r-content').children(list))
    .build();

  return Div()
    .class('app-side')
    .children(
      popover,
      View('nav')
        .class('app-nav')
        .attr('aria-label', t('homeNavOpen'))
        .children(
          railItem(appUrl('/home'), 'i-home', t('homeNavOpen'), current === 'home'),
          railItem(appUrl('/history'), 'i-layers', t('homeNavSaved'), current === 'history'),
          railItem(pageUrl('help'), 'i-help', t('homeNavHelp')),
          railItem(pageUrl('about'), 'i-info', t('homeNavAbout')),
        )
        .build(),
    )
    .build();
}

/* ---- the phone bar ---- */

function buildMobileNav(current: AppRoute): HTMLElement {
  const items: Array<[string, string, string, boolean]> = [
    [appUrl('/home'), 'i-home', t('homeNavOpen'), current === 'home'],
    [appUrl('/history'), 'i-layers', t('homeNavSaved'), current === 'history'],
    [pageUrl('help'), 'i-help', t('homeNavHelp'), false],
    [pageUrl('about'), 'i-info', t('homeNavAbout'), false],
  ];
  return View('nav')
    .class('app-mobile')
    .attr('aria-label', t('homeNavOpen'))
    .children(
      ...items.map(([href, mark, label, isCurrent]) => {
        const item = View('a')
          .class(`app-mobile-item${isCurrent ? ' is-current' : ''}`)
          .attr('href', href)
          .children(icon(mark), Span().text(label));
        if (isCurrent) item.attr('aria-current', 'page');
        return item.build();
      }),
    )
    .build();
}

/* ---- open a file ---- */

/**
 * The picker. `?open=local` is a one-shot hand-off: the editor reads the file
 * out of IndexedDB and deletes it, so failing to stash is not failing to open --
 * it is the difference between arriving with the document and arriving at an
 * empty editor, which is why the fallback URL drops the query.
 */
async function openPicked(file: File): Promise<void> {
  const stashed = await stashPendingFile(file);
  window.location.href = withLocale(stashed ? '/editor?open=local' : '/editor', getLanguage());
}

/** Ask the visitor for a file and hand it to the editor. */
export function pickFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = ACCEPT;
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (file) void openPicked(file);
  });
  document.body.appendChild(input);
  input.click();
}

/* ---- drop anywhere ---- */

function buildOverlay(): HTMLElement {
  return Div()
    .class('app-overlay')
    .id('app-overlay')
    .attr('aria-hidden', 'true')
    .children(
      Div()
        .class('app-overlay-inner')
        .children(
          icon('i-upload'),
          Div().class('app-overlay-title').text(t('homeDropOverlay')).build(),
          Div().class('app-overlay-hint').text(t('homeDropOverlayHint')).build(),
        )
        .build(),
    )
    .build();
}

/** Does this drag event carry files? Drags of text or a link must be left alone. */
function hasFiles(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  return types ? Array.from(types as ArrayLike<string>).includes('Files') : false;
}

function wireDragAndDrop(overlay: HTMLElement): void {
  // Counting enter/leave pairs, because dragging over a child fires leave on the
  // parent: without the count the overlay flickers off the moment the pointer
  // crosses a boundary inside the page.
  let depth = 0;

  document.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    depth += 1;
    overlay.classList.add('is-visible');
  });

  document.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    // Without preventDefault the browser navigates to the dropped file and the
    // page -- and the stash that was about to happen -- is gone.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });

  document.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    depth = Math.max(0, depth - 1);
    if (!depth) overlay.classList.remove('is-visible');
  });

  document.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    event.preventDefault();
    depth = 0;
    overlay.classList.remove('is-visible');
    void openPicked(file);
  });
}

/* ---- the pieces a page builds its own card out of ---- */

/** The card every app page's content sits in. */
export function card(...children: Array<HTMLElement | null>): HTMLElement {
  return Div()
    .class('app-card')
    .children(...children.filter((child): child is HTMLElement => !!child))
    .build();
}

/** How a block inside the card is introduced. */
export interface SectionOptions {
  /**
   * The heading level. A page's own title is an h1; the blocks under it are
   * h2, which is what the document outline on /home has to be.
   */
  tag?: 'h1' | 'h2';
  /**
   * A class on the heading, so a page keeps its own hook on its own title. The
   * shape is the shell's; the name is the page's, and a page that needs a
   * different one wants its own stylesheet, not a different shell.
   */
  titleClass?: string;
  /**
   * A control that belongs beside the heading rather than under it -- a count
   * on the right of "Saved documents", a link on the right of "Recent". It
   * shares the heading's baseline so the row reads as one line.
   */
  action?: HTMLElement;
}

/** A titled block inside the card. */
export function section(title: string, children: Array<HTMLElement | null>, options: SectionOptions = {}): HTMLElement {
  const heading = View(options.tag ?? 'h2')
    .class(options.titleClass ?? '')
    .text(title)
    .build();
  const head = Div()
    .class('app-sec-head')
    .children(heading, ...(options.action ? [options.action] : []))
    .build();
  return Div()
    .class('app-sec')
    .children(head, ...children.filter((child): child is HTMLElement => !!child))
    .build();
}

/**
 * One document, as a row in either list.
 *
 * The shape -- a tinted icon, the name, the age, controls that quieten until
 * the pointer is on the row -- is the shell's, and both pages use it so that a
 * document looks the same wherever it is listed. What differs is passed in: the
 * page's own class, the extra controls it wants on the row, and whether the
 * stored size is worth a reader's time (a list of eight needs no sizes; a
 * library of two hundred does).
 */
export interface DocRowOptions {
  /** The page's own class, added to the shared one. Its tests address this. */
  className: string;
  /** Extra class for the icon tile, if that page has hooks on it. */
  kindClass?: string;
  /** Extra class for the title link, if that page has hooks on it. */
  titleClass?: string;
  /** Extra class for the badge, if that page has hooks on it. */
  badgeClass?: string;
  /** The size of the stored copy, or null to leave it out. */
  size?: string | null;
  /** Tooltip on the title. */
  titleTip?: string;
  /** Controls before the remove button, in order. */
  actions?: Array<{ label: string; className?: string; icon: string; onClick: () => void }>;
  /** The remove control. The caller has already asked the visitor. */
  removeLabel: string;
  removeClass?: string;
  onRemove: () => void;
}

export function docRow(doc: HistoryDoc, options: DocRowOptions): HTMLElement {
  const title = View('a')
    .class(`app-row-title${options.titleClass ? ` ${options.titleClass}` : ''}`)
    // Carry the language: the page knows which one it is in, and the editor
    // should not have to guess it again from the browser.
    .attr('href', appUrl(`/editor?saved=${encodeURIComponent(doc.id)}`))
    .attr('title', options.titleTip ?? doc.title)
    .text(doc.title)
    .build();

  // "Never exported" is the fact worth interrupting a list for: this browser
  // holds the only copy of that work.
  const badge = hasUnsavedWork(doc)
    ? Div()
        .class(`app-badge${options.badgeClass ? ` ${options.badgeClass}` : ''}`)
        .children(View('i').class('app-dot').build(), Span().text(t('historyUnsaved')))
        .build()
    : null;

  const facts = Div()
    .class('app-row-facts')
    .children(
      Span().class('app-row-fact').text(formatRelativeTime(doc.updatedAt)).build(),
      ...(options.size ? [Span().class('app-row-fact app-row-fact-size').text(options.size).build()] : []),
    )
    .build();

  const control = (label: string, mark: string, className: string, onClick: () => void, danger = false): HTMLElement =>
    View('button')
      .class(`app-row-action${danger ? ' is-danger' : ''}${className ? ` ${className}` : ''}`)
      .attr('type', 'button')
      .attr('aria-label', label)
      .attr('title', label)
      .on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      })
      .children(icon(mark))
      .build();

  // The row's mark is the document icon, not the extension text: the icon is
  // what tells two rows apart at a glance, and the type is already in the name.
  const kind = APP_TYPES.find((candidate) => candidate.type === doc.ext)?.icon ?? 'i-doc';

  return Div()
    .class(`app-row ${options.className}`)
    .data('type', doc.ext)
    .children(
      Div()
        .class(`app-row-kind${options.kindClass ? ` ${options.kindClass}` : ''}`)
        .children(icon(kind))
        .build(),
      Div()
        .class('app-row-main')
        .children(
          Div()
            .class('app-row-title-line')
            .children(title, ...(badge ? [badge] : []))
            .build(),
          facts,
        )
        .build(),
      Div()
        .class('app-row-actions')
        .children(
          ...(options.actions ?? []).map((action) =>
            control(action.label, action.icon, action.className ?? '', action.onClick),
          ),
          control(options.removeLabel, 'i-x', options.removeClass ?? '', options.onRemove, true),
        )
        .build(),
    )
    .build();
}

/**
 * Empty space is a decision, not a gap where the product thinking should be: it
 * says why there is nothing here and offers the one thing to do next.
 */
export function emptyState(
  mark: string,
  title: string,
  body: string,
  action?: HTMLElement,
  options: { className?: string; id?: string } = {},
): HTMLElement {
  const panel = Div().class(`app-empty${options.className ? ` ${options.className}` : ''}`);
  if (options.id) panel.id(options.id);
  return panel
    .children(
      icon(mark),
      Div().class('app-empty-title').text(title).build(),
      Div().class('app-empty-body').text(body).build(),
      ...(action ? [action] : []),
    )
    .build();
}

/**
 * Put the shell together.
 *
 * One function, because this is the part the two pages must agree on: the rail
 * on the left, the page's card beside it, the same four destinations fixed to
 * the bottom of a phone, and a file dropped anywhere on the page opening. A
 * page that assembled its own would be a page whose rail could vanish at a
 * different width than its twin's.
 */
export function mountShell(root: HTMLElement, current: AppRoute, content: HTMLElement): void {
  const overlay = buildOverlay();
  // The frame class is also on the element in each page's HTML, so the first
  // paint is already in the grid; adding it here as well means a page that
  // forgets it still gets one frame.
  root.classList.add('app-shell');
  root.replaceChildren(buildRail(current), content, buildMobileNav(current), overlay);
  wireDragAndDrop(overlay);
}
