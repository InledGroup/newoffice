/**
 * /history -- the local document library.
 *
 * Everything listed here lives in this browser's IndexedDB and has never left
 * the device, which is exactly why the page leads with a way to delete it:
 * the feature's whole privacy cost is that a shared machine now remembers what
 * was edited on it, and the answer to that is a delete on every row and a
 * clear-everything that empties the bytes as well as the index.
 *
 * The page is an app surface, not a landing page: no per-language HTML file,
 * no sitemap entry, noindex. Its language follows the app's i18n the way the
 * editor's does.
 *
 * The frame is not this page's. It is built in lib/app-shell.ts and drawn by
 * styles/app-shell.css, because /home is built in the same one and the two are
 * reached from each other: the rail's "Saved documents" is how you get here, and
 * the recent list's "Saved documents" is how you get back. So the rail, the
 * card, the document rows, the phone bar and the drop-anywhere overlay are one
 * implementation, and what is left in this file is the library: the search, the
 * one filter, the pager, and the settings that govern the whole store.
 *
 * One consequence of sharing the frame is worth stating, because it moved a
 * control: the autosave switch and the delete-everything used to sit in a rail
 * beside the list. They are now the card's last section. That is not a
 * demotion -- the rail is hidden below the breakpoint, and these are controls
 * rather than navigation, so a version of this page that put them in the rail
 * would lose them on a phone. Putting them at the foot of the card means they
 * are where they were on a phone all along, and where the reading of the page
 * has always put a decision about all of it: below the list, never beside the
 * search box, where "delete everything" is a mis-click waiting to happen.
 */
import 'ranui/button';
import 'ranui/input';
import 'ranui/icon';
import 'ranui/message';
import { Div, View } from 'ranui/builder';
import '../styles/history.css';
import { saveFileToDisk } from 'ranuts/utils';
import { applyDocumentLanguage, t } from '@ranuts/shared/i18n';
import { getDocumentMimeType } from '@ranuts/shared/document-utils';
import { clearAllHistory, deleteDoc, getLatestSnapshot, historyUsage, listDocs } from './history/store';
import { isAutosaveEnabled, setAutosaveEnabled } from './history/autosave';
import { type HistoryDoc } from './history/types';
import { confirmDialog } from './confirm-dialog';
import { card, docRow, emptyState, mountBarActions, mountShell, pickFile, section } from './app-shell';

const SEARCH_DEBOUNCE_MS = 200;

let query = '';
let page = 1;
let searchTimer = 0;
/** Filter: only documents whose latest edit was never exported to disk. */
let unsavedOnly = false;

function root(): HTMLElement {
  return document.getElementById('history-root') as HTMLElement;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Keep the view in the URL so a search or a page survives a reload and can be shared. */
function syncUrl(): void {
  const url = new URL(window.location.href);
  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');
  if (unsavedOnly) url.searchParams.set('unsaved', '1');
  else url.searchParams.delete('unsaved');
  if (page > 1) url.searchParams.set('page', String(page));
  else url.searchParams.delete('page');
  window.history.replaceState(null, '', url);
}

function readUrl(): void {
  const params = new URLSearchParams(window.location.search);
  query = params.get('q') ?? '';
  unsavedOnly = params.get('unsaved') === '1';
  page = Math.max(1, Number(params.get('page') ?? '1') || 1);
}

function button(
  label: string,
  onClick: () => void,
  options: { type?: string; id?: string; class?: string } = {},
): HTMLElement {
  const builder = View('r-button').text(label).on('click', onClick);
  if (options.id) builder.id(options.id);
  if (options.class) builder.class(options.class);
  builder.attr('type', options.type ?? 'default');
  return builder.build();
}

/**
 * Write the newest snapshot of one document to disk.
 *
 * It deliberately does NOT mark the document as exported: what lands on disk
 * is the last autosaved revision, which is not necessarily what the editor
 * would produce from the live session, and claiming "exported" for a copy the
 * user has not seen would silence the badge that says work is at risk.
 */
async function downloadDoc(doc: HistoryDoc): Promise<void> {
  try {
    const snapshot = await getLatestSnapshot(doc.id);
    if (!snapshot) throw new Error('no snapshot');
    await saveFileToDisk(snapshot.bytes, doc.title, { mimeType: getDocumentMimeType(doc.title) });
  } catch {
    (window as unknown as { message?: { error?: (msg: string) => void } }).message?.error?.(t('historyDownloadFailed'));
  }
}

function buildRow(doc: HistoryDoc, refresh: () => void): HTMLElement {
  return docRow(doc, {
    className: 'history-row',
    // `history-open` is the row's title as an action, and the name the e2e spec
    // reaches it by; `history-badge` is the "only copy is here" flag it checks.
    titleClass: 'history-row-title history-open',
    badgeClass: 'history-badge',
    // Size is worth a reader's time in a library of two hundred and not in the
    // eight on /home, which is the only other place this row is drawn.
    size: formatBytes(doc.size),
    actions: [
      // Getting the work out is the reason most people open this page, and
      // until now the only way was to open the editor and save from there. The
      // bytes are already in IndexedDB; this writes them straight to disk (File
      // System Access where available, download elsewhere).
      {
        label: t('historyDownload'),
        className: 'history-download',
        icon: 'i-download',
        onClick: () => void downloadDoc(doc),
      },
    ],
    removeLabel: t('historyDelete'),
    removeClass: 'history-delete',
    onRemove: () => {
      void confirmDialog({
        title: t('historyDeleteTitle'),
        body: t('historyDeleteConfirm', { title: doc.title }),
        confirmLabel: t('historyDelete'),
        cancelLabel: t('historyCancel'),
        danger: true,
      }).then((ok) => (ok ? deleteDoc(doc.id).then(refresh) : undefined));
    },
  });
}

function buildToolbar(refresh: () => void): HTMLElement {
  const search = View('r-input')
    .id('history-search')
    .class('history-search')
    .attr('placeholder', t('historySearchPlaceholder'))
    .attr('value', query)
    .on('input', (event: Event) => {
      const value = (event as CustomEvent<{ value?: string }>).detail?.value ?? '';
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        query = value;
        // A new search starts at the top; staying on page 4 of the previous
        // result set shows an empty page more often than not.
        page = 1;
        refresh();
      }, SEARCH_DEBOUNCE_MS);
    })
    .build();

  // One filter, and it is the one that matters: a document that was never
  // exported is the only kind whose bytes exist nowhere else, and it is the
  // reason someone opens this page in a hurry.
  const filter = View('button')
    .attr('type', 'button')
    .id('history-filter-unsaved')
    .class(`history-filter${unsavedOnly ? ' is-on' : ''}`)
    .attr('aria-pressed', unsavedOnly ? 'true' : 'false')
    .on('click', () => {
      unsavedOnly = !unsavedOnly;
      page = 1;
      refresh();
    })
    .children(View('i').class('app-dot history-dot').build(), View('span').text(t('historyOnlyUnsaved')).build())
    .build();

  return Div().class('history-toolbar').children(search, filter).build();
}

function buildPager(current: number, pages: number, refresh: () => void): HTMLElement {
  // Writes the module's page, not a parameter shadowing it: a pager that moved
  // a local copy would re-render the same page for ever.
  const goTo = (target: number): void => {
    page = Math.min(Math.max(1, target), pages);
    refresh();
  };
  const prev = button(t('historyPrev'), () => goTo(current - 1), { id: 'history-prev' });
  const next = button(t('historyNext'), () => goTo(current + 1), { id: 'history-next' });
  if (current <= 1) prev.setAttribute('disabled', '');
  if (current >= pages) next.setAttribute('disabled', '');

  return Div()
    .class('history-pager')
    .children(
      prev,
      Div()
        .class('history-page-info')
        .text(t('historyPageInfo', { page: String(current), pages: String(pages) }))
        .build(),
      next,
    )
    .build();
}

function buildAutosaveToggle(refresh: () => void): HTMLElement {
  const enabled = isAutosaveEnabled();
  const toggle = View('input')
    .id('history-autosave')
    .class('history-switch')
    .attr('type', 'checkbox')
    .attr('role', 'switch')
    .on('change', (event: Event) => {
      setAutosaveEnabled((event.target as HTMLInputElement).checked);
      refresh();
    })
    .build() as HTMLInputElement;
  toggle.checked = enabled;

  return View('label')
    .class('history-autosave')
    .attr('for', 'history-autosave')
    .children(toggle, View('span').text(t('historyAutosaveLabel')).build())
    .build();
}

async function render(): Promise<void> {
  const [{ items, total, page: current, pageSize }, usage] = await Promise.all([
    listDocs({ query, page, unsavedOnly }),
    historyUsage(),
  ]);
  page = current;
  syncUrl();

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const refresh = () => void render();
  // How much is being kept is a fact about the store, not about the search, so
  // it sits on the heading's own line rather than beside the search box, where
  // it competed with the filter for the same row.
  const usageLine = Div()
    .class('history-usage')
    .text(
      total
        ? `${t('historyCount', { count: String(total) })} · ${t('historyUsage', { size: formatBytes(usage) })}`
        : '',
    )
    .build();

  const narrowed = !!query || unsavedOnly;
  const list = items.length
    ? Div()
        .class('app-list history-list')
        .id('history-list')
        .children(...items.map((doc) => buildRow(doc, refresh)))
        .build()
    : emptyState(
        'i-folder',
        narrowed ? t('historyEmptySearchTitle') : t('historyEmptyTitle'),
        narrowed ? t('historyEmptySearch') : t('historyEmpty'),
        button(
          narrowed ? t('historyClearSearch') : t('historyOpenFile'),
          () => {
            if (!narrowed) {
              pickFile();
              return;
            }
            query = '';
            unsavedOnly = false;
            page = 1;
            refresh();
          },
          {
            type: narrowed ? 'text' : 'primary',
            id: narrowed ? undefined : 'history-open-file',
            class: 'history-empty-action',
          },
        ),
        { className: 'history-empty', id: 'history-empty' },
      );

  mountShell(
    root(),
    'history',
    card(
      // chip -> title -> intro: the opening the homepage's own hero uses, so the
      // page a visitor reaches from it is recognisably the same product rather
      // than an admin screen that happens to share a header.
      Div()
        .class('history-chip')
        .children(View('i').class('history-chip-dot').build(), View('span').text(t('historyChip')).build())
        .build(),
      section(
        t('historyTitle'),
        [
          View('p').class('history-intro').text(t('historyIntro')).build(),
          buildToolbar(refresh),
          list,
          ...(pages > 1 ? [buildPager(page, pages, refresh)] : []),
        ],
        { tag: 'h1', titleClass: 'history-title', action: usageLine },
      ),
      section(t('historyRailSettings'), [
        buildAutosaveToggle(refresh),
        ...(isAutosaveEnabled()
          ? []
          : [Div().class('history-note history-note-warn').text(t('historyAutosaveOff')).build()]),
        button(
          t('historyClearAll'),
          () => {
            void confirmDialog({
              title: t('historyClearTitle'),
              body: t('historyClearConfirm'),
              confirmLabel: t('historyClearAll'),
              cancelLabel: t('historyCancel'),
              danger: true,
            }).then((ok) => (ok ? clearAllHistory().then(refresh) : undefined));
          },
          { type: 'text', id: 'history-clear-all', class: 'history-clear' },
        ),
      ]),
      section(t('historyRailRetention'), [
        Div().class('history-note').text(t('historyRetention')).build(),
        Div().class('history-note').text(t('historyNotBackup')).build(),
      ]),
    ),
  );
}

/**
 * The chrome around this page is hand-written (history.html), so its <title>
 * and the language switch's current entry ship as English literals while the
 * body is translated at runtime -- a Chinese reader got a Chinese page whose
 * switch still read "English" and whose tab still read "Local history".
 *
 * The endonyms are already in the DOM, one per <a class="lang-option" lang>,
 * so the current entry is copied from the link that matches <html lang>
 * rather than from a second table that would have to be kept in step with
 * bin/pages/locales.mjs.
 */
function syncPageChrome(): void {
  document.title = t('historyTitle');
  const lang = document.documentElement.getAttribute('lang');
  const options = [...document.querySelectorAll<HTMLAnchorElement>('a.lang-option')];
  const current = options.find((option) => option.getAttribute('lang') === lang);
  if (!current) return;
  for (const option of options) {
    option.classList.toggle('is-current', option === current);
    if (option === current) option.setAttribute('aria-current', 'page');
    else option.removeAttribute('aria-current');
  }
  const label = document.querySelector('.lang-current');
  if (label) label.textContent = current.textContent?.trim() ?? '';
}

applyDocumentLanguage();
syncPageChrome();
mountBarActions();
readUrl();
void render();
