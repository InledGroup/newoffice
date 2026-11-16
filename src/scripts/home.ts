/**
 * /home -- the recent list and the hover-intent prefetch.
 *
 * Eight rows, because this is a way back into yesterday's work rather than a
 * file manager; /history is the library and the rail links to it.
 */
import { t } from '@ranuts/shared/i18n';
import { prefetchOnIntent, type EditorKind } from '../../lib/prefetch';
import { deleteDoc, listDocs } from '../../lib/history/store';
import { confirmDialog } from '../../lib/confirm-dialog';
import type { HistoryDoc } from '../../lib/history/types';
import { pickFile } from '../../lib/open-file';
import { docRow, emptyState } from './doc-row';

const RECENT_LIMIT = 8;
const host = document.getElementById('home-recent');

async function removeDoc(doc: HistoryDoc, refresh: () => void): Promise<void> {
  const confirmed = await confirmDialog({
    title: t('historyDeleteTitle'),
    body: t('historyDeleteConfirm', { title: doc.title }),
    confirmLabel: t('historyDelete'),
    cancelLabel: t('historyCancel'),
    danger: true,
  });
  if (!confirmed) return;
  await deleteDoc(doc.id);
  refresh();
}

async function render(): Promise<void> {
  if (!host) return;
  const refresh = () => void render();

  let items: HistoryDoc[] = [];
  try {
    items = (await listDocs({ pageSize: RECENT_LIMIT })).items;
  } catch {
    // A browser that cannot read the database (private mode, storage off) gets
    // the empty state: there is nothing here the visitor could act on, and the
    // rest of the page still works.
    items = [];
  }

  if (!items.length) {
    host.replaceChildren(
      emptyState(t('homeRecentEmpty'), t('homeRecentEmptyHint'), { label: t('historyOpenFile'), onClick: pickFile }),
    );
    return;
  }

  const list = document.createElement('div');
  list.className = 'doc-list';
  list.id = 'home-recent-list';
  for (const doc of items) {
    list.appendChild(
      docRow(doc, {
        className: 'home-row',
        removeLabel: t('homeRemoveRecent'),
        onRemove: () => void removeDoc(doc, refresh),
      }),
    );
  }
  host.replaceChildren(list);
}

void render();

// Hovering "Document" is intent: start pulling that engine now, so the editor
// opens without waiting for a 6.9 MB WASM download after the click.
for (const trigger of document.querySelectorAll<HTMLElement>('[data-prefetch]')) {
  prefetchOnIntent(trigger, trigger.dataset.prefetch as EditorKind);
}
