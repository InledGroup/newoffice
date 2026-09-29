/**
 * Wiring for the local history feature. Kept in one place so the editor entry
 * has a single call, and so the pieces that must not import each other -- the
 * save channel and the autosave scheduler -- stay uncoupled.
 */
import { setDiskWriter, setSavedToDiskListener } from '../onlyoffice/save-stream';
import { saveToDiskFile } from '../save-target';
import { getAutosaveDocId } from './autosave';
import { markSavedToDisk } from './store';

export function initDocumentHistory(): void {
  // Nothing is collected here, and that is the design: a document leaves the
  // library when the user deletes it, clears the history, or the browser runs
  // out of room for it. An earlier version swept rows seven days old on every
  // boot, which meant the site quietly threw away work nobody had asked it to.

  // Saving writes back to the file the document came from, once the user has
  // pointed at one. The document id is what links the two, which is why this
  // is wired here rather than inside the save channel.
  setDiskWriter(async (file) => {
    const docId = getAutosaveDocId();
    if (!docId) return false;
    const outcome = await saveToDiskFile(docId, file, 'Document');
    // 'cancelled' means the user closed the picker: they decided not to save,
    // so downloading a copy anyway would be answering a question they declined.
    if (outcome === 'cancelled') return true;
    return outcome === 'written';
  });

  setSavedToDiskListener(() => {
    // The document now exists on disk, so its history row has nothing left to
    // offer back. Without this the recovery bar would keep flagging a document
    // the user already saved.
    const id = getAutosaveDocId();
    if (id) void markSavedToDisk(id);
  });
}

export { beginAutosaveSession, isAutosaveEnabled, setAutosaveEnabled, stopAutosaveSession } from './autosave';
export { clearAllHistory, deleteDoc, getLatestSnapshot, listDocs } from './store';
export type { HistoryDoc } from './types';
