/**
 * The autosave status pill's one promise, and when it is allowed to make it.
 *
 * The pill is the visible half of a claim the landing pages make in words, and
 * it is the only place in the editor that says anything at all about whether
 * the work is being kept. That makes the timing the whole test: it must be up
 * while there is an edit this browser has not taken yet, and gone the moment
 * one lands -- a line that says "saving" after the save is the one that teaches
 * people not to believe it.
 *
 * The clock is pinned rather than waited on. The decision is a comparison
 * between two timestamps owned by two different modules, and a test that slept
 * long enough for both to move would prove less about the boundary than a test
 * that puts them a millisecond apart on purpose.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above the imports, so the doubles have to be too.
const { requestSaveDocument, getReadonlyMode } = vi.hoisted(() => ({
  requestSaveDocument: vi.fn(),
  getReadonlyMode: vi.fn(() => false),
}));
vi.mock('../../lib/onlyoffice/save-stream', () => ({ requestSaveDocument }));
vi.mock('../../lib/onlyoffice/readonly', () => ({ getReadonlyMode }));

import { t } from '@ranuts/shared/i18n';
import {
  beginAutosaveSession,
  isAutosaveEnabled,
  setAutosaveEnabled,
  stopAutosaveSession,
  takeSnapshot,
} from '../../lib/history/autosave';
import { resetHistoryDbForTests, DB_NAME } from '../../lib/history/db';
import { resetHistoryClockForTests } from '../../lib/history/store';
import { stopAutosaveIndicator, updateAutosaveIndicator } from '../../lib/autosave-indicator';
import { markDocumentDirty, markDocumentSaved, resetUnsavedGuardForTests } from '../../lib/unsaved-guard';

/** The instant every test starts from. Moved by hand, never by waiting. */
let clock = 1_000_000;
/** Move to a later instant, as if the given number of milliseconds passed. */
const advance = (ms: number): void => {
  clock += ms;
};

const pill = (): HTMLElement => {
  const el = document.getElementById('autosave-indicator');
  expect(el, 'the indicator pill should exist after the first refresh').toBeTruthy();
  return el!;
};

/** Open a document and type into it, the shape every test below starts from. */
async function openAndEdit(docId: string, title = 'Report.docx'): Promise<void> {
  await beginAutosaveSession({ docId, title, origin: 'new' });
  markDocumentDirty();
}

describe('autosave indicator', () => {
  beforeEach(async () => {
    vi.mocked(getReadonlyMode).mockReturnValue(false);
    vi.mocked(requestSaveDocument).mockResolvedValue(new File([new Uint8Array([1, 2, 3]).buffer], 'Report.docx'));
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    window.localStorage.clear();
    setAutosaveEnabled(true);
    resetHistoryClockForTests();
    resetHistoryDbForTests();
    document.body.innerHTML = '';
    clock = 1_000_000;
  });

  afterEach(async () => {
    stopAutosaveSession();
    stopAutosaveIndicator();
    resetUnsavedGuardForTests();
    vi.restoreAllMocks();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('says nothing on a document nobody has edited', async () => {
    await beginAutosaveSession({ docId: 'pill-fresh', title: 'New_Document.docx', origin: 'new' });

    updateAutosaveIndicator();
    // Not "reassured", not "saving": there is no work in the document, and a
    // line claiming otherwise is how this ended up promising on a blank page.
    expect(pill().getAttribute('hidden')).toBe('');
  });

  it('promises the save while an edit is waiting to be captured', async () => {
    await openAndEdit('pill-working');

    updateAutosaveIndicator();
    expect(pill().getAttribute('hidden')).toBeNull();
    expect(pill().getAttribute('data-state')).toBe('working');
    expect(pill().textContent).toBe(t('autosaveWorking'));
  });

  it('goes away the moment the copy lands, and comes back on the next edit', async () => {
    await openAndEdit('pill-landing');
    updateAutosaveIndicator();
    expect(pill().getAttribute('hidden')).toBeNull();

    // The lull the scheduler waits for, then the export it runs.
    advance(3_000);
    await takeSnapshot();

    // The work is in the browser now, so there is nothing left to say.
    updateAutosaveIndicator();
    expect(pill().getAttribute('hidden')).toBe('');

    // Typing again is new work, and the pill is back for it -- continuously,
    // not once. This is the behaviour the whole thing exists for.
    advance(1_000);
    markDocumentDirty();
    updateAutosaveIndicator();
    expect(pill().getAttribute('hidden')).toBeNull();
    expect(pill().textContent).toBe(t('autosaveWorking'));
  });

  it('reacts to the copy landing without being polled', async () => {
    await openAndEdit('pill-announced');
    updateAutosaveIndicator();
    expect(pill().getAttribute('hidden')).toBeNull();

    advance(3_000);
    await takeSnapshot();

    // No updateAutosaveIndicator() call: the scheduler announced the fact, and
    // a pill that lingers for one poll after the event it exists to report is
    // the stuck-toast this replaced.
    expect(pill().getAttribute('hidden')).toBe('');
  });

  it('stays quiet once the document is on the user own disk', async () => {
    await openAndEdit('pill-on-disk');
    updateAutosaveIndicator();
    markDocumentSaved();

    updateAutosaveIndicator();
    expect(pill().getAttribute('hidden')).toBe('');
  });

  it('warns instead of going quiet when autosave is off and there are edits', async () => {
    expect(isAutosaveEnabled()).toBe(true);
    await openAndEdit('pill-off');
    setAutosaveEnabled(false); // as /history's switch does

    updateAutosaveIndicator();
    // Silence here would be a lie: the edits are real and nothing is copying
    // them. The sentence is the one the switch's own help text uses.
    expect(pill().getAttribute('hidden')).toBeNull();
    expect(pill().getAttribute('data-state')).toBe('off');
    expect(pill().textContent).toBe(t('historyAutosaveOff'));
  });

  it('warns when the session stops under a document with edits in it', async () => {
    await openAndEdit('pill-locked');
    updateAutosaveIndicator();
    stopAutosaveSession(); // the lock went to a second tab

    updateAutosaveIndicator();
    expect(pill().getAttribute('data-state')).toBe('off');
    expect(pill().textContent).toBe(t('historyAutosaveOff'));
  });

  it('goes quiet on a readonly document', async () => {
    await beginAutosaveSession({ docId: 'pill-readonly', title: 'Report.docx', origin: 'local' });
    markDocumentDirty();
    vi.mocked(getReadonlyMode).mockReturnValue(true);

    updateAutosaveIndicator();
    expect(pill().getAttribute('hidden')).toBe('');
  });

  it('recreates itself after being removed (new document opened)', async () => {
    await openAndEdit('pill-recreated');
    updateAutosaveIndicator();

    stopAutosaveIndicator();
    updateAutosaveIndicator();
    expect(pill().textContent).toBe(t('autosaveWorking'));
  });
});
