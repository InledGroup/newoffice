/**
 * /home -- where a visitor starts work.
 *
 * The frame around this page is not this page's: the rail, the card, the rows,
 * the phone bar and the drop-anywhere overlay all come from lib/app-shell.ts,
 * because /history is built in the same frame and the two are reached from each
 * other. What is left here is the part only this page is for -- the file picker,
 * the four editors, and the recent list.
 */
import { Div, Span, View } from 'ranui/builder';
import '../styles/home-page.css';
import { applyDocumentLanguage, t } from '@ranuts/shared/i18n';
import { deleteDoc, listDocs } from './history/store';
import { type HistoryDoc } from './history/types';
import { confirmDialog } from './confirm-dialog';
import {
  APP_TYPES,
  appUrl,
  card,
  docRow,
  emptyState,
  icon,
  mountBarActions,
  mountShell,
  pickFile,
  section,
} from './app-shell';

/** How many cached documents the page offers before sending you to /history. */
const RECENT_LIMIT = 8;

async function removeDoc(doc: HistoryDoc, refresh: () => void): Promise<void> {
  // The X on a row is the only destructive control on the page, and it deletes
  // the stored bytes as well as the row -- so it asks first, like /history does.
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

function buildRow(doc: HistoryDoc, refresh: () => void): HTMLElement {
  return docRow(doc, {
    className: 'home-row',
    kindClass: 'home-row-kind',
    titleClass: 'home-row-title',
    badgeClass: 'home-row-unsaved',
    titleTip: t('homeReopenTip'),
    removeLabel: t('homeRemoveRecent'),
    removeClass: 'home-row-remove',
    onRemove: () => {
      void removeDoc(doc, refresh);
    },
  });
}

async function renderRecents(target: HTMLElement): Promise<void> {
  const refresh = () => void renderRecents(target);
  target.replaceChildren(emptyState('i-clock', t('homeRecentLoading'), '', undefined, { className: 'home-empty' }));

  let items: HistoryDoc[] = [];
  try {
    items = (await listDocs({ pageSize: RECENT_LIMIT })).items;
  } catch {
    // A browser that cannot read the database (private mode, storage disabled)
    // gets the empty state rather than an error: there is nothing here that the
    // visitor can act on, and the rest of the page still works.
    items = [];
  }

  if (!items.length) {
    const open = View('r-button')
      .attr('type', 'primary')
      .attr('id', 'home-open-file')
      .text(t('historyOpenFile'))
      .on('click', () => pickFile())
      .build();
    target.replaceChildren(
      emptyState('i-folder', t('homeRecentEmpty'), t('homeRecentEmptyHint'), open, { className: 'home-empty' }),
    );
    return;
  }

  target.replaceChildren(
    Div()
      .class('app-list home-recent-list')
      .children(...items.map((doc) => buildRow(doc, refresh)))
      .build(),
  );
}

function buildDropCard(): HTMLElement {
  const title = Div().class('home-drop-title').text(t('homeChooseFile')).build();
  const card = Div()
    .class('home-drop')
    .id('home-drop')
    .attr('role', 'button')
    .attr('tabindex', '0')
    .on('click', () => pickFile())
    .on('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      pickFile();
    })
    .on('dragover', () => {
      card.classList.add('is-over');
      title.textContent = t('homeDropHere');
    })
    .on('dragleave', () => {
      card.classList.remove('is-over');
      title.textContent = t('homeChooseFile');
    })
    .children(
      Div().class('home-drop-mark').children(icon('i-upload')).build(),
      title,
      Div().class('home-drop-hint').text(t('homeDropHint')).build(),
      Div().class('home-drop-formats').text(t('homeSupports')).build(),
    )
    .build();
  return card;
}

/* ---- the four editors ---- */

function buildTypes(): HTMLElement {
  return Div()
    .class('home-types')
    .children(
      ...APP_TYPES.map(({ type, label, icon: mark }) =>
        View('a')
          .class('home-type')
          .data('type', type)
          .attr('href', appUrl(`/editor?new=${type}`))
          .children(Div().class('app-type-mark home-type-mark').children(icon(mark)).build(), Span().text(label()))
          .build(),
      ),
    )
    .build();
}

function buildRecentSection(): { section: HTMLElement; body: HTMLElement } {
  const body = Div().class('home-recent-body').id('home-recent').build();
  const block = section(t('homeRecent'), [body], {
    action: View('a').class('home-recent-all').attr('href', appUrl('/history')).text(t('homeNavSaved')).build(),
  });
  return { section: block, body };
}

function start(root: HTMLElement): void {
  const recent = buildRecentSection();
  mountShell(root, 'home', card(buildDropCard(), section(t('homeNew'), [buildTypes()]), recent.section));
  void renderRecents(recent.body);
}

// Reflect the shell language on <html> (lang/dir) before anything is painted:
// the strings above were resolved with it, and a screen reader reads the page
// with the attribute, not with the words.
applyDocumentLanguage();

const homeRoot = document.getElementById('home-root');
if (homeRoot) {
  mountBarActions();
  start(homeRoot);
}
