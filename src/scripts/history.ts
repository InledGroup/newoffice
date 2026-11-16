/**
 * /history -- the library's behaviour: search, the unsaved filter, the pager,
 * the autosave switch and delete-everything.
 *
 * The view is in the URL (`?q=`, `?unsaved=1`, `?page=`) so a reload comes back
 * to the same rows and a link can be shared; the store owns the paging maths,
 * this file only asks for a page and draws it.
 */
import { t } from '@ranuts/shared/i18n';
import { saveFileToDisk } from 'ranuts/utils';
import { getDocumentMimeType } from '@ranuts/shared/document-utils';
import { clearAllHistory, deleteDoc, getLatestSnapshot, historyUsage, listDocs } from '../../lib/history/store';
import { isAutosaveEnabled, setAutosaveEnabled } from '../../lib/history/autosave';
import type { HistoryDoc } from '../../lib/history/types';
import { confirmDialog } from '../../lib/confirm-dialog';
import { pickFile } from '../../lib/open-file';
import { docRow, emptyState } from './doc-row';

const SEARCH_DEBOUNCE_MS = 200;

let query = '';
let page = 1;
let unsavedOnly = false;
let searchTimer = 0;

const listHost = document.getElementById('history-list-host') as HTMLElement;
const pager = document.getElementById('history-pager') as HTMLElement;
const pagerInfo = pager.querySelector('.history-page-info') as HTMLElement;
const prev = document.getElementById('history-prev') as HTMLButtonElement;
const next = document.getElementById('history-next') as HTMLButtonElement;
const usageLine = document.getElementById('history-usage') as HTMLElement;
const search = document.getElementById('history-search') as HTMLInputElement;
const filter = document.getElementById('history-filter-unsaved') as HTMLButtonElement;
const autosave = document.getElementById('history-autosave') as HTMLInputElement;
const autosaveNote = document.getElementById('history-autosave-note') as HTMLElement;

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

/** Keep the view in the URL. */
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
  search.value = query;
}

/**
 * Write the newest snapshot of one document to disk.
 *
 * It deliberately does NOT mark the document as exported: what lands on disk is
 * the last autosaved revision, which is not necessarily what the editor would
 * produce from the live session, and claiming "exported" for a copy the user
 * has not seen would silence the badge that says work is at risk.
 */
async function downloadDoc(doc: HistoryDoc): Promise<void> {
  try {
    const snapshot = await getLatestSnapshot(doc.id);
    if (!snapshot) throw new Error('no snapshot');
    await saveFileToDisk(snapshot.bytes, doc.title, { mimeType: getDocumentMimeType(doc.title) });
  } catch {
    window.message?.error(t('historyDownloadFailed'));
  }
}

async function removeDoc(doc: HistoryDoc): Promise<void> {
  const confirmed = await confirmDialog({
    title: t('historyDeleteTitle'),
    body: t('historyDeleteConfirm', { title: doc.title }),
    confirmLabel: t('historyDelete'),
    cancelLabel: t('historyCancel'),
    danger: true,
  });
  if (!confirmed) return;
  await deleteDoc(doc.id);
  void render();
}

async function render(): Promise<void> {
  const [{ items, total, page: current, pageSize }, usage] = await Promise.all([
    listDocs({ query, page, unsavedOnly }),
    historyUsage(),
  ]);
  page = current;
  syncUrl();

  const pages = Math.max(1, Math.ceil(total / pageSize));
  usageLine.textContent = total
    ? `${t('historyCount', { count: String(total) })} · ${t('historyUsage', { size: formatBytes(usage) })}`
    : '';

  const narrowed = Boolean(query) || unsavedOnly;
  if (!items.length) {
    listHost.replaceChildren(
      emptyState(
        narrowed ? t('historyEmptySearchTitle') : t('historyEmptyTitle'),
        narrowed ? t('historyEmptySearch') : t('historyEmpty'),
        narrowed
          ? {
              label: t('historyClearSearch'),
              onClick: () => {
                query = '';
                unsavedOnly = false;
                page = 1;
                search.value = '';
                syncFilter();
                void render();
              },
            }
          : { label: t('historyOpenFile'), onClick: pickFile },
      ),
    );
  } else {
    const list = document.createElement('div');
    list.className = 'doc-list history-list';
    list.id = 'history-list';
    for (const doc of items) {
      list.appendChild(
        docRow(doc, {
          className: 'history-row',
          removeClassName: 'history-delete',
          size: formatBytes(doc.size),
          actions: [
            {
              label: t('historyDownload'),
              className: 'history-download',
              icon: 'download',
              onClick: () => void downloadDoc(doc),
            },
          ],
          removeLabel: t('historyDelete'),
          onRemove: () => void removeDoc(doc),
        }),
      );
    }
    listHost.replaceChildren(list);
  }

  pager.hidden = pages <= 1;
  pagerInfo.textContent = t('historyPageInfo', { page: String(page), pages: String(pages) });
  prev.disabled = page <= 1;
  next.disabled = page >= pages;
}

function syncFilter(): void {
  filter.classList.toggle('is-on', unsavedOnly);
  filter.setAttribute('aria-pressed', unsavedOnly ? 'true' : 'false');
}

function syncAutosave(): void {
  const enabled = isAutosaveEnabled();
  autosave.checked = enabled;
  autosaveNote.hidden = enabled;
}

search.addEventListener('input', (event) => {
  // A native input fires `input` with no detail; the E2E harness drives the
  // field by dispatching the same event with a `detail.value` (the contract the
  // old component had). Accept both rather than making the test know the tag.
  const detail = (event as unknown as CustomEvent<{ value?: string } | undefined>).detail;
  const value = detail?.value ?? search.value;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    query = value;
    // A new search starts at the top; staying on page 4 of the previous result
    // set shows an empty page more often than not.
    page = 1;
    void render();
  }, SEARCH_DEBOUNCE_MS);
});

filter.addEventListener('click', () => {
  unsavedOnly = !unsavedOnly;
  page = 1;
  syncFilter();
  void render();
});

prev.addEventListener('click', () => {
  page = Math.max(1, page - 1);
  void render();
});

next.addEventListener('click', () => {
  page += 1;
  void render();
});

autosave.addEventListener('change', () => {
  setAutosaveEnabled(autosave.checked);
  syncAutosave();
});

document.getElementById('history-clear-all')?.addEventListener('click', () => {
  void confirmDialog({
    title: t('historyClearTitle'),
    body: t('historyClearConfirm'),
    confirmLabel: t('historyClearAll'),
    cancelLabel: t('historyCancel'),
    danger: true,
  }).then((ok) => {
    if (!ok) return;
    void clearAllHistory().then(() => render());
  });
});

readUrl();
syncFilter();
syncAutosave();
void render();
