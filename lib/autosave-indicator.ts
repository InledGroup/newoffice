/**
 * The autosave status pill.
 *
 * Autosave (lib/history/autosave.ts) has always worked, and the landing page
 * promises it in words -- but inside the editor there was nothing on screen
 * proving it, so users believed it was not happening. This pill is the visible
 * half of that promise: it answers "is my work being kept?" at a glance, in
 * the editor, in the user's language.
 *
 * It appears while there is an edit the browser has not captured yet, and goes
 * away the moment one lands. That is the whole contract, and it is why the
 * decision below is not "is this document dirty": the dirty bit is about the
 * file on the user's disk, and it deliberately stays set through a session
 * that is being snapshotted every minute. A pill keyed to it would read
 * "saving" for as long as the tab was open, which is what made it feel like a
 * stuck toast. The question this pill actually answers is narrower -- is there
 * a recovery point in this browser that is at least as new as the newest edit?
 * -- and it goes quiet the instant the answer is yes.
 *
 * It mirrors the autosave scheduler's own state; it never drives anything.
 * The scheduler emits the moment a copy lands (onSnapshotStored) and this
 * repaints, so the pill does not sit around waiting out a poll after the very
 * event it exists to announce. Everything else is read, not pushed.
 */
import { t } from '@ranuts/shared/i18n';
import { getLastEditAt, hasUnsavedChanges } from './unsaved-guard';
import { getReadonlyMode } from './onlyoffice/readonly';
import { getLastSnapshotAt, isAutosaveEnabled, isAutosaveSessionActive, onSnapshotStored } from './history/autosave';

const ID = 'autosave-indicator';

/** The one pill. Created on first update, reused for every later one. */
let pill: HTMLElement | null = null;

/**
 * Is there an edit this browser has not taken yet?
 *
 * Both timestamps come from the modules that own them, and the comparison is
 * the honest one: `lastEditAt` is when the editor last reported a change, and
 * `lastSnapshotAt` is when a copy of the document finished landing in
 * IndexedDB. A snapshot that never happened leaves the second at 0, so a first
 * edit is pending by construction rather than by luck.
 *
 * `hasUnsavedChanges()` gates the whole thing, and it does two jobs. It keeps
 * a document that is already on the user's disk out of it -- there is nothing
 * for the browser to be doing about that, and the file the user chose is the
 * copy that matters. And it takes a document nobody has touched out of it: the
 * dirty bit is false there too, and without the gate a freshly opened file
 * would announce work being saved for a session that has not started.
 */
function hasUncapturedWork(): boolean {
  if (!hasUnsavedChanges()) return false;
  const lastEdit = getLastEditAt();
  return lastEdit > 0 && lastEdit > getLastSnapshotAt();
}

/** Paint the current autosave state into the pill (creating it if needed). */
export function updateAutosaveIndicator(): void {
  if (typeof document === 'undefined') return;
  if (!pill || !pill.isConnected) {
    const el = document.createElement('div');
    el.id = ID;
    el.setAttribute('hidden', '');
    document.body.appendChild(el);
    pill = el;
  }

  // Readonly (snapshots are pointless there) and embed mode (the host owns its
  // own chrome) both go quiet rather than promise something not happening.
  if (getReadonlyMode()) {
    pill.setAttribute('hidden', '');
    return;
  }

  if (hasUncapturedWork()) {
    // Whether a session is running decides which of the two sentences is true,
    // and asking that first is the difference between a warning and a lie.
    // Autosave switched off, or the lock handed to a second tab: the edits are
    // real and nothing is copying them, and the user cannot act on that without
    // being told. The wording is the sentence /history already shows under the
    // same switch, so the two read the same way.
    const copying = isAutosaveEnabled() && isAutosaveSessionActive();
    pill.removeAttribute('hidden');
    pill.textContent = copying ? t('autosaveWorking') : t('historyAutosaveOff');
    pill.setAttribute('data-state', copying ? 'working' : 'off');
    return;
  }

  // Nothing pending: the newest edit is in the browser, or the document is on
  // the user's own disk, or nobody has touched it. Nothing to say.
  pill.setAttribute('hidden', '');
}

if (typeof document !== 'undefined') {
  // The scheduler announces a landed copy; without this the pill would sit on
  // screen for up to one poll after the event it exists to report. A one-way
  // subscription: the scheduler emits a fact, it never learns who is listening.
  onSnapshotStored(() => updateAutosaveIndicator());
}

/** The document is closing / the app is back to its home state: lose the pill. */
export function stopAutosaveIndicator(): void {
  pill?.remove();
  pill = null;
}
