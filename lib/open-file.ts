/**
 * Asking for a file and handing it to the editor.
 *
 * Shared by every surface that can open something (the landing page's button,
 * the app pages' "create or upload", a drop anywhere on the app). The file is
 * stashed in IndexedDB and the editor picks it up through `?open=local`, so this
 * module never needs the editor bundle -- which is the whole reason a 6.9 MB
 * WASM download waits until there is a document to put in it.
 */
import { getLanguage, withLocale } from '@ranuts/shared/i18n';
import { stashPendingFile } from './pending-open';
import { markSavedToDisk, putSnapshot } from './history/store';

/** Keep in step with the app's own picker and public/open-local.js. */
export const ACCEPT = '.docx,.xlsx,.pptx,.doc,.xls,.ppt,.csv,.pdf';

/**
 * Open a picked file, and keep a copy of it in this browser's library.
 *
 * Opening without storing is what the old hand-off did, and it left a reader
 * who only ever opens files with an empty library: the file they used
 * yesterday was a second trip through the file dialog. So the bytes are written
 * as the document's first snapshot and the editor is sent to `?saved=<id>`,
 * which restores that copy -- same bytes, one click next time.
 *
 * The one-shot hand-off is still the fallback, for a browser where IndexedDB
 * refuses (private mode, storage off). Not being able to remember a file must
 * not be the same thing as not being able to open it.
 */
export async function openPicked(file: File): Promise<void> {
  const lang = getLanguage();
  try {
    const doc = await putSnapshot({ title: file.name, origin: 'local', bytes: await file.arrayBuffer() });
    if (doc) {
      // The file exists on the user's disk, so this is not work that only lives
      // in the browser: without this the row reads as "not exported" the moment
      // it appears.
      await markSavedToDisk(doc.id);
      window.location.href = withLocale(`/editor?saved=${encodeURIComponent(doc.id)}`, lang);
      return;
    }
  } catch {
    // Fall through to the hand-off below.
  }
  const stashed = await stashPendingFile(file);
  window.location.href = withLocale(stashed ? '/editor?open=local' : '/editor', lang);
}

/** Ask the visitor for a file. */
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

/** Does this drag carry files? Text and link drags must be left alone. */
function hasFiles(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  return types ? Array.from(types as ArrayLike<string>).includes('Files') : false;
}

/**
 * Wire the page: every `[data-open-file]`, and a drop anywhere.
 *
 * Drag depth is counted because dragging over a child fires `leave` on the
 * parent; without it the overlay flickers off at every boundary inside the page.
 */
export function installOpenHandlers(): void {
  for (const trigger of document.querySelectorAll('[data-open-file]')) {
    trigger.addEventListener('click', () => pickFile());
  }

  const overlay = document.querySelector<HTMLElement>('.overlay');
  if (!overlay) return;

  let depth = 0;

  document.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    depth += 1;
    overlay.classList.add('is-visible');
  });

  document.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    // Without preventDefault the browser navigates to the dropped file and the
    // stash that was about to happen is gone.
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
