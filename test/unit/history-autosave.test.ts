import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above the imports, so the doubles have to be too.
const { requestSaveDocument, getReadonlyMode } = vi.hoisted(() => ({
  requestSaveDocument: vi.fn(),
  getReadonlyMode: vi.fn(() => false),
}));

vi.mock('../../lib/onlyoffice/save-stream', () => ({ requestSaveDocument }));
vi.mock('../../lib/onlyoffice/readonly', () => ({ getReadonlyMode }));

import {
  EXPORT_DUTY_CYCLE,
  IDLE_GRACE_MS,
  MAX_SNAPSHOT_INTERVAL_MS,
  MIN_SNAPSHOT_INTERVAL_MS,
  SNAPSHOT_INTERVAL_MS,
  TICK_MS,
  UNPROTECTED_TICK_MS,
  snapshotInterval,
  tickInterval,
  beginAutosaveSession,
  getAutosaveDocId,
  getLastSnapshotAt,
  isAutosaveSessionActive,
  onSnapshotStored,
  setAutosaveEnabled,
  shouldSnapshot,
  stopAutosaveSession,
  takeSnapshot,
} from '../../lib/history/autosave';
import { DB_NAME, resetHistoryDbForTests } from '../../lib/history/db';
import { getLatestSnapshot, listDocs, resetHistoryClockForTests } from '../../lib/history/store';
import { markDocumentDirty, resetUnsavedGuardForTests } from '../../lib/unsaved-guard';

/** A document that already has a recovery point, so the interval rules apply. */
const ready: import('../../lib/history/autosave').SnapshotDecision = {
  now: 1_000_000,
  enabled: true,
  dirty: true,
  readonly: false,
  holdsLock: true,
  lastSnapshotAt: 1_000_000 - SNAPSHOT_INTERVAL_MS,
  lastEditAt: 1_000_000 - IDLE_GRACE_MS,
  exporting: false,
  lastExportMs: 200,
};

/** The same document, one tick after its first edit and before its first export. */
const firstLull: import('../../lib/history/autosave').SnapshotDecision = {
  ...ready,
  // Opened, then edited a moment ago: the interval has barely started, and
  // there is nothing stored to fall back on.
  lastSnapshotAt: 1_000_000 - 1_000,
  lastExportMs: null,
};

function fileOf(values: number[], name = 'Report.docx'): File {
  return new File([new Uint8Array(values).buffer], name);
}

async function wipe(): Promise<void> {
  resetHistoryDbForTests();
  resetHistoryClockForTests();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe('snapshot interval', () => {
  it('spends a fixed fraction of the session exporting', () => {
    // 200 ms of work every 60 s is 1/300 of the time.
    expect(snapshotInterval(200)).toBe(200 * EXPORT_DUTY_CYCLE);
  });

  it('does not chase a fast machine below the floor', () => {
    // Measured desktop cost: 42 ms for a small docx would earn a 13 s interval,
    // which buys little and interrupts often, so the floor takes over. The
    // heaviest measured shape (123 ms, a 20k-row workbook) lands above it on
    // its own -- the duty cycle, not the floor, is doing the work there.
    expect(snapshotInterval(42)).toBe(MIN_SNAPSHOT_INTERVAL_MS);
    expect(snapshotInterval(123)).toBe(123 * EXPORT_DUTY_CYCLE);
    expect(snapshotInterval(123)).toBeGreaterThan(MIN_SNAPSHOT_INTERVAL_MS);
  });

  it('backs off on a slow device instead of fighting it', () => {
    // A phone taking 600 ms per export gets 180 s, not 30 s. The device tells
    // us it is slow by being slow; nothing has to detect it.
    expect(snapshotInterval(600)).toBe(MAX_SNAPSHOT_INTERVAL_MS);
    expect(snapshotInterval(5_000)).toBe(MAX_SNAPSHOT_INTERVAL_MS);
  });

  it('has an answer before the first export is timed', () => {
    expect(snapshotInterval(null)).toBe(SNAPSHOT_INTERVAL_MS);
    expect(snapshotInterval(0)).toBe(SNAPSHOT_INTERVAL_MS);
  });
});

describe('autosave scheduling rule', () => {
  it('fires when there is work, a lull, and time since the last snapshot', () => {
    expect(shouldSnapshot(ready)).toBe(true);
  });

  it('takes the first snapshot of a session on the first lull, not a minute in', () => {
    // The bug this pins. A document with nothing stored has no interval to
    // respect -- there is no cost measurement yet and nothing to lose but the
    // work in front of the user -- so the lull in the typing is the condition.
    // Waiting a minute for the first snapshot is how a twenty-second editing
    // session loses all twenty seconds while the UI says it is being saved.
    expect(shouldSnapshot(firstLull)).toBe(true);
    // It is still not on top of active typing, and still waits for the lull.
    expect(shouldSnapshot({ ...firstLull, lastEditAt: firstLull.now })).toBe(false);
  });

  it('holds off for every reason on its own', () => {
    expect(shouldSnapshot({ ...ready, enabled: false })).toBe(false);
    expect(shouldSnapshot({ ...ready, dirty: false })).toBe(false);
    expect(shouldSnapshot({ ...ready, readonly: true })).toBe(false);
    expect(shouldSnapshot({ ...ready, holdsLock: false })).toBe(false);
    expect(shouldSnapshot({ ...ready, exporting: true })).toBe(false);
    // Too soon after the previous snapshot.
    expect(shouldSnapshot({ ...ready, lastSnapshotAt: ready.now - 1 })).toBe(false);
    // And "too soon" moves with the machine: an export that cost 600 ms buys
    // the ceiling, so an interval that was long enough a moment ago is not.
    expect(
      shouldSnapshot({ ...ready, lastExportMs: 600, lastSnapshotAt: ready.now - MIN_SNAPSHOT_INTERVAL_MS - 1 }),
    ).toBe(false);
    // Still typing: an export on top of active editing is felt.
    expect(shouldSnapshot({ ...ready, lastEditAt: ready.now })).toBe(false);
  });
});

describe('autosave session', () => {
  beforeEach(async () => {
    await wipe();
    resetUnsavedGuardForTests();
    requestSaveDocument.mockReset();
    getReadonlyMode.mockReturnValue(false);
    setAutosaveEnabled(true);
    window.history.replaceState(null, '', '/editor');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    stopAutosaveSession();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('exports the document in its own format and stores the bytes', async () => {
    requestSaveDocument.mockResolvedValue(fileOf([1, 2, 3]));
    await beginAutosaveSession({ docId: 'report', title: 'Report.docx', origin: 'local' });

    const doc = await takeSnapshot();

    expect(requestSaveDocument).toHaveBeenCalledWith('DOCX');
    expect(doc?.title).toBe('Report.docx');
    expect(Array.from((await getLatestSnapshot(doc!.id))!.bytes)).toEqual([1, 2, 3]);
    expect(getAutosaveDocId()).toBe(doc!.id);
  });

  it('keeps appending to the same row across snapshots', async () => {
    requestSaveDocument.mockResolvedValue(fileOf([1]));
    await beginAutosaveSession({ docId: 'report', title: 'Report.docx', origin: 'local' });

    const first = await takeSnapshot();
    const second = await takeSnapshot();

    expect(second?.id).toBe(first?.id);
    expect(second?.revCount).toBe(2);
    expect((await listDocs()).total).toBe(1);
  });

  it('reports when a copy landed, and nothing before one has', async () => {
    requestSaveDocument.mockResolvedValue(fileOf([1]));
    await beginAutosaveSession({ docId: 'report', title: 'Report.docx', origin: 'local' });

    // 0, not the session's start time: the pacing clock has a value from the
    // first millisecond, but nothing is stored until an export finishes, and a
    // watcher told otherwise would believe in a recovery point that is not there.
    expect(getLastSnapshotAt()).toBe(0);

    await takeSnapshot();

    expect(getLastSnapshotAt()).toBeGreaterThan(0);
  });

  it('announces a landed copy, and the end of a session, to whoever watches', async () => {
    requestSaveDocument.mockResolvedValue(fileOf([1]));
    await beginAutosaveSession({ docId: 'report', title: 'Report.docx', origin: 'local' });

    const seen: string[] = [];
    const unsubscribe = onSnapshotStored(() => seen.push('changed'));

    await takeSnapshot();
    stopAutosaveSession();
    unsubscribe();
    // A session that ends is the other moment a watcher has to hear about: the
    // document still has edits and nothing is copying them any more.
    expect(seen).toEqual(['changed', 'changed']);
  });

  it('takes a snapshot on its own within seconds of the first edit', async () => {
    // The scheduling rule and the poll that runs it are two halves of the same
    // promise. Even with the rule fixed, a 15 s poll would leave a first edit
    // unprotected for up to a quarter of a minute -- and the user closes tabs
    // without warning. Real timers here on purpose: faking them stalls
    // fake-indexeddb, which drives its transactions through the same queue.
    requestSaveDocument.mockResolvedValue(fileOf([1]));
    await beginAutosaveSession({ docId: 'quick', title: 'Quick.docx', origin: 'local' });

    // The user types, and stops.
    markDocumentDirty();

    await vi.waitFor(async () => expect((await listDocs()).total).toBe(1), {
      timeout: UNPROTECTED_TICK_MS + IDLE_GRACE_MS + 5_000,
    });
    expect(requestSaveDocument).toHaveBeenCalledTimes(1);
  });

  it('polls fast only while there is nothing stored, and slowly once there is', () => {
    // Otherwise every document re-exports on a 3 s beat for the whole session,
    // which is the cost the adaptive interval exists to avoid.
    expect(tickInterval(null)).toBe(UNPROTECTED_TICK_MS);
    expect(tickInterval(200)).toBe(TICK_MS);
    // Still comfortably inside the "no reason to hurry" range, but short
    // enough that a first edit is not left unprotected for a quarter minute.
    expect(UNPROTECTED_TICK_MS).toBeLessThan(TICK_MS);
  });

  it('does not start in embed mode', async () => {
    window.history.replaceState(null, '', '/editor?embed=1');

    await beginAutosaveSession({ docId: 'report', title: 'Report.docx', origin: 'local' });

    expect(isAutosaveSessionActive()).toBe(false);
  });

  it('does not start when the user turned autosave off', async () => {
    setAutosaveEnabled(false);

    await beginAutosaveSession({ docId: 'report', title: 'Report.docx', origin: 'local' });

    expect(isAutosaveSessionActive()).toBe(false);
    setAutosaveEnabled(true);
  });

  it('stays quiet when another tab holds the document lock', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      // The Web Locks contract for ifAvailable: the callback runs with null
      // when someone else already holds the lock.
      locks: { request: (_name: string, _opts: unknown, cb: (lock: null) => unknown) => Promise.resolve(cb(null)) },
    });
    requestSaveDocument.mockResolvedValue(fileOf([1]));

    await beginAutosaveSession({ docId: 'shared', title: 'Shared.docx', origin: 'local' });
    markDocumentDirty();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // The other tab is the one writing this document's history; two tabs
    // taking turns would interleave two divergent documents into one row.
    expect(requestSaveDocument).not.toHaveBeenCalled();
  });

  it('takes a snapshot when the page is hidden, without waiting for the interval', async () => {
    requestSaveDocument.mockResolvedValue(fileOf([9]));
    await beginAutosaveSession({ docId: 'hidden', title: 'Hidden.docx', origin: 'local' });
    markDocumentDirty();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    // The handler starts the export without awaiting; let it settle.
    await vi.waitFor(async () => expect((await listDocs()).total).toBe(1));
  });

  it('does not snapshot a read-only document', async () => {
    getReadonlyMode.mockReturnValue(true);
    requestSaveDocument.mockResolvedValue(fileOf([1]));
    await beginAutosaveSession({ docId: 'locked', title: 'Locked.docx', origin: 'local' });
    markDocumentDirty();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(requestSaveDocument).not.toHaveBeenCalled();
  });

  it('gives up after repeated export failures instead of retrying forever', async () => {
    requestSaveDocument.mockRejectedValue(new Error('export failed'));
    await beginAutosaveSession({ docId: 'broken', title: 'Broken.docx', origin: 'local' });

    await takeSnapshot();
    await takeSnapshot();
    expect(isAutosaveSessionActive()).toBe(true);
    await takeSnapshot();

    expect(isAutosaveSessionActive()).toBe(false);
  });

  it('waits its turn while a user-initiated save owns the channel', async () => {
    requestSaveDocument.mockRejectedValue(new Error('A save request is already in progress'));
    await beginAutosaveSession({ docId: 'busy', title: 'Busy.docx', origin: 'local' });

    await takeSnapshot();
    await takeSnapshot();
    await takeSnapshot();
    await takeSnapshot();

    // Losing the race to the user is not a failure, so the session survives.
    expect(isAutosaveSessionActive()).toBe(true);
  });

  it('keeps writing to the row its id names, across sessions', async () => {
    requestSaveDocument.mockResolvedValue(fileOf([1]));
    await beginAutosaveSession({ docId: 'daily', title: 'Daily.docx', origin: 'local' });
    const first = await takeSnapshot();

    stopAutosaveSession();
    await beginAutosaveSession({ docId: 'daily', title: 'Daily.docx', origin: 'local' });
    const second = await takeSnapshot();

    expect(second?.id).toBe(first?.id);
    expect((await listDocs()).total).toBe(1);
  });

  it('keeps documents with the same name apart', async () => {
    // Every blank document is called New_Document.docx, and plenty of people
    // have two unrelated Report.docx files. Identity is the id, never the name.
    requestSaveDocument.mockResolvedValue(fileOf([1], 'New_Document.docx'));
    await beginAutosaveSession({ docId: 'first-blank', title: 'New_Document.docx', origin: 'new' });
    const first = await takeSnapshot();

    stopAutosaveSession();
    await beginAutosaveSession({ docId: 'second-blank', title: 'New_Document.docx', origin: 'new' });
    const second = await takeSnapshot();

    expect(second?.id).not.toBe(first?.id);
    expect((await listDocs()).total).toBe(2);
  });
});
