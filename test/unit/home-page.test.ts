/**
 * The /home page's recent list.
 *
 * The list itself is lib/history/store's -- the same rows /history shows -- so
 * what is worth pinning here is the part this page owns: that a document in
 * that store becomes a row, that the row opens the editor for that document,
 * and that a browser which cannot read the store shows the empty state rather
 * than an empty box. The icons are pinned at the same time because they are
 * built with createElementNS: an <svg> made with the HTML builder is an
 * unknown element that renders nothing at all, and the only way that failure
 * shows up is by looking for the stroke attribute here.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DB_NAME, resetHistoryDbForTests } from '../../lib/history/db';
import { putSnapshot, resetHistoryClockForTests } from '../../lib/history/store';

const HOME_PAGE = '../../lib/home-page.ts';

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

/** Load the page module with a fresh document, and hand back its root. */
async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = '<main id="home-root"></main>';
  vi.resetModules();
  await import(HOME_PAGE);
  const root = document.getElementById('home-root')!;
  // The page fills the root after an IndexedDB read, which is a transaction
  // rather than a promise: it needs a few macrotasks to settle, so a single
  // tick asserts against a half-drawn page and races the very database open
  // the empty state depends on.
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  return root;
}

/** Store one document, the way the editor's autosave would. */
async function seed(title: string, origin: 'local' | 'url' | 'new' = 'local'): Promise<string> {
  const doc = await putSnapshot({ title, origin, bytes: new Uint8Array([80, 75, 3, 4]) });
  // null means the write was refused (no room); in a test that is a failure of
  // the fixture, not an empty library the page is meant to cope with.
  if (!doc) throw new Error(`could not store ${title}`);
  return doc.id;
}

describe('/home recent list', () => {
  beforeEach(wipe);
  afterEach(wipe);

  it('draws a row per stored document, with its name and a link that opens it', async () => {
    await seed('Report.docx');
    await seed('Budget.xlsx');
    const root = await mount();

    const rows = root.querySelectorAll('.home-row');
    expect(rows).toHaveLength(2);
    const names = [...root.querySelectorAll('.home-row-title')].map((n) => n.textContent);
    expect(names).toEqual(expect.arrayContaining(['Report.docx', 'Budget.xlsx']));
    const href = root.querySelector('.home-row-title')!.getAttribute('href')!;
    expect(href).toMatch(/^\/editor\?saved=/);
  });

  it('tints the row by document type, which is what the icon colour is for', async () => {
    await seed('Report.docx');
    await seed('Deck.pptx');
    const root = await mount();

    const kinds = [...root.querySelectorAll('.home-row')].map((r) => r.getAttribute('data-type'));
    expect(kinds).toEqual(expect.arrayContaining(['docx', 'pptx']));
  });

  it('builds its icons with createElementNS, so they carry a real stroke', async () => {
    await seed('Report.docx');
    const root = await mount();

    const icon = root.querySelector('.home-row-kind svg');
    expect(icon, 'the row mark is an <svg>').toBeTruthy();
    // currentColor is what makes the tile's own colour reach the icon: a
    // missing or default stroke is exactly the "flat, uncoloured icon" bug.
    expect(icon!.getAttribute('stroke')).toBe('currentColor');
    expect(icon!.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(icon!.querySelectorAll('path, circle, polyline').length).toBeGreaterThan(0);
  });

  it('shows the empty state (and a way to open a file) when nothing is stored', async () => {
    const root = await mount();

    expect(root.querySelectorAll('.home-row')).toHaveLength(0);
    expect(root.querySelector('.home-empty')).toBeTruthy();
    expect(root.querySelector('#home-open-file')).toBeTruthy();
  });

  it('offers each editor on the page, each opening the editor with that type', async () => {
    const root = await mount();

    const hrefs = [...root.querySelectorAll('.home-type')].map((t) => t.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/editor?new=docx', '/editor?new=xlsx', '/editor?new=pptx', '/editor?new=pdf']),
    );
  });
});
