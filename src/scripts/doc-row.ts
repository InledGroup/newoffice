/**
 * One stored document, as a row.
 *
 * /home shows eight of them and /history shows the library, so the row is
 * written once: two implementations drift, and the drift is what makes two
 * lists of the same files look like two products.
 *
 * The mark is the product logo rather than the extension as text -- at a
 * glance, "which of these is a spreadsheet" is the only question the column
 * has to answer.
 */
import { getLanguage, t, withLocale } from '@ranuts/shared/i18n';
import { iconEl } from '../lib/icon-element';
import { formatRelativeTime } from '../../lib/history/recovery';
import { hasUnsavedWork, type HistoryDoc } from '../../lib/history/types';

const EXT_TO_KIND: Record<string, string> = {
  docx: 'word',
  doc: 'word',
  xlsx: 'excel',
  xls: 'excel',
  pptx: 'powerpoint',
  ppt: 'powerpoint',
};

/** The product logo for a file type, or a neutral page glyph. */
function mark(ext: string): SVGSVGElement | HTMLImageElement {
  const kind = EXT_TO_KIND[ext];
  if (kind || ext === 'pdf') {
    const img = document.createElement('img');
    img.src = `/img/office/${kind ?? 'pdf'}.svg`;
    img.alt = '';
    img.width = 24;
    img.height = 24;
    return img;
  }
  return iconEl('document', 22);
}

export interface DocRowOptions {
  /** The page's own class, so each list keeps its hooks. */
  className: string;
  /** The stored size, when the list is long enough for it to matter. */
  size?: string | null;
  /** Extra controls before the delete button. */
  actions?: Array<{ label: string; className: string; icon: string; onClick: () => void }>;
  removeLabel: string;
  onRemove: () => void;
  /** The remove control's own hook (the library's tests click it by name). */
  removeClassName?: string;
}

/** The row's own controls, kept in one place so both lists agree. */
const ICONS = {
  download: 'download',
  remove: 'trash',
} as const;

export function docRow(doc: HistoryDoc, options: DocRowOptions): HTMLElement {
  const row = document.createElement('div');
  row.className = `doc-row ${options.className}`;
  row.dataset.type = doc.ext;

  const kind = document.createElement('span');
  kind.className = 'doc-icon';
  kind.appendChild(mark(doc.ext));

  const main = document.createElement('div');
  main.className = 'doc-main';

  const title = document.createElement('a');
  title.className = options.className === 'history-row' ? 'doc-title history-row-title history-open' : 'doc-title';
  title.href = withLocale(`/editor?saved=${encodeURIComponent(doc.id)}`, getLanguage());
  title.title = doc.title;
  title.textContent = doc.title;
  main.appendChild(title);

  if (hasUnsavedWork(doc)) {
    const badge = document.createElement('span');
    // The library names its own hook so a list can style the badge on its own
    // without matching the shared one; /home shows the same mark unqualified.
    badge.className = options.className === 'history-row' ? 'doc-badge history-badge' : 'doc-badge';
    badge.textContent = t('historyUnsaved');
    main.appendChild(badge);
  }

  const meta = document.createElement('span');
  meta.className = 'doc-meta';
  const edited = document.createElement('span');
  edited.textContent = formatRelativeTime(doc.updatedAt);
  meta.appendChild(edited);
  if (options.size) {
    const size = document.createElement('span');
    size.textContent = options.size;
    meta.appendChild(size);
  }

  const actions = document.createElement('div');
  actions.className = 'doc-actions';

  const control = (label: string, className: string, body: SVGElement, onClick: () => void, danger = false): void => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `icon-btn${danger ? ' is-danger' : ''} ${className}`;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.appendChild(body);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    actions.appendChild(button);
  };

  for (const action of options.actions ?? []) {
    const body = iconEl(action.icon === 'download' ? ICONS.download : ICONS.remove, 16);
    control(action.label, action.className, body, action.onClick);
  }
  control(
    options.removeLabel,
    options.removeClassName ?? 'doc-remove',
    iconEl(ICONS.remove, 16),
    options.onRemove,
    true,
  );

  row.append(kind, main, meta, actions);
  return row;
}

/**
 * Empty space is a decision, not a gap: it says why there is nothing here and
 * offers the one thing to do next.
 */
export function emptyState(title: string, body: string, action?: { label: string; onClick: () => void }): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.id = 'history-empty';

  const glyph = iconEl('document', 28);

  const heading = document.createElement('p');
  heading.className = 'empty-title';
  heading.textContent = title;

  const text = document.createElement('p');
  text.textContent = body;

  empty.append(glyph, heading, text);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    empty.appendChild(button);
  }
  return empty;
}

export { ICONS as DOC_ROW_ICONS };
