import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Uploading a file, and remembering it.
 *
 * The point of the library is that a file you opened yesterday is one click
 * away today. Opening used to hand the bytes to the editor and nothing more, so
 * a reader who only ever opens files had no rows at all -- the file dialog was
 * the only way back. So the picker writes the bytes as the document's first
 * snapshot and navigates to `?saved=<id>`.
 *
 * What is pinned here is that choice and its fallback: the hand-off is still
 * used when the library refuses the write (private mode, storage off), because
 * not being able to remember a file must not stop it from opening.
 */

const putSnapshot = vi.fn();
const markSavedToDisk = vi.fn();
const stashPendingFile = vi.fn();

vi.mock('../../lib/history/store', () => ({ putSnapshot, markSavedToDisk }));
vi.mock('../../lib/pending-open', () => ({ stashPendingFile }));

const file = () => new File([new Uint8Array([1, 2, 3])], 'Report.docx', { type: 'application/octet-stream' });

describe('openPicked', () => {
  beforeEach(() => {
    vi.resetModules();
    putSnapshot.mockReset();
    markSavedToDisk.mockReset();
    stashPendingFile.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '/home', search: '' },
    });
  });

  it('stores the upload and opens it from the library', async () => {
    putSnapshot.mockResolvedValue({ id: 'doc-1', title: 'Report.docx' });
    markSavedToDisk.mockResolvedValue(null);

    const { openPicked } = await import('../../lib/open-file');
    await openPicked(file());

    expect(putSnapshot).toHaveBeenCalledTimes(1);
    const input = putSnapshot.mock.calls[0][0] as { title: string; origin: string; bytes: ArrayBuffer };
    expect(input.title).toBe('Report.docx');
    expect(input.origin).toBe('local');
    expect(new Uint8Array(input.bytes)).toEqual(new Uint8Array([1, 2, 3]));
    // The bytes are on the user's disk, so the row must not claim it holds the
    // only copy.
    expect(markSavedToDisk).toHaveBeenCalledWith('doc-1');
    expect(window.location.href).toBe('/editor?saved=doc-1');
  });

  it('falls back to the one-shot hand-off when the library refuses', async () => {
    putSnapshot.mockResolvedValue(null);
    stashPendingFile.mockResolvedValue(true);

    const { openPicked } = await import('../../lib/open-file');
    await openPicked(file());

    expect(stashPendingFile).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/editor?open=local');
  });

  it('still opens when the write throws', async () => {
    putSnapshot.mockRejectedValue(new Error('QuotaExceededError'));
    stashPendingFile.mockResolvedValue(false);

    const { openPicked } = await import('../../lib/open-file');
    await openPicked(file());

    // No hand-off either: straight to an empty editor rather than nowhere.
    expect(window.location.href).toBe('/editor');
  });
});
