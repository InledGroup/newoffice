# InSuite landing/editor session: hero, theme, /home redirect, autosave pill

Date: 2026-09-29 · Branch: `insuite-landing-editor` (on top of the uncommitted
InSuite rebranding work from a prior session)

## What changed and why

1. **Hero down to two calls to action.** The landing hero carried three
   buttons (Start using / View features / Open a file) and a rotated
   "Made in Spain" stamp inside the `<h1>`. Product decision: two buttons, two
   weights -- `lp-btn-primary` Start using, and "Open a file" promoted from a
   bare `type="text"` ranui button to a real secondary (no type attribute) with
   the same box as its neighbour (`16px/32px`, `16.5px`, weight 700). The flag
   and the "View features" ghost button are gone from the template
   (`bin/pages/render-home.mjs`), the copy source (`bin/fill-landing-copy.mjs`
   dropped `hero.flag`/`hero.features`, `h1` is now the full sentence), and
   every `content/<locale>/home.json` was regenerated with
   `node bin/fill-landing-copy.mjs && node bin/build-pages.mjs`. The
   slot-equality test in landing-pages.test.ts kept all seven locales honest.
   `#hero-open` kept its id: three E2E specs and `landing-prefetch.js` hold it.
   The dead `#landing-hero .cta r-button` rules in home.css (the hero uses
   `.lp-cta`, not `.cta`) were repointed to `.lp-cta`, which is also what makes
   the host-radius rule cover the new secondary button.
2. **Editor theme: classic → modern.** `DEFAULT_UI_THEME` flipped
   `theme-classic-light` → `theme-white` (the vendor's own light default). The
   site-follow logic (`lib/editor-theme.ts`) is untouched: dark site still gets
   `theme-dark`, a user's in-editor pick still wins. Three pins flipped:
   onlyoffice-editor.test.ts, editor-theme.test.ts (`LIGHT` const),
   main-site.spec.ts (`body` class). Consequence found by E2E, not by reading:
   vendor-branding.spec.ts expected the logo's background image to be
   `header-logo_s.svg`; on `theme-white` the vendor paints `dark-logo_s.svg`
   (the light-chrome variant). The assertion now accepts either -- both are the
   product mark the license cares about.
3. **`/editor` with nothing to open goes to `/home`.** index.ts's three
   `location.replace('/')` bail-outs (bare editor, stale `?open=local`, dead
   `?saved=`) now go to `/home`, the app homepage the cline session added.
   app-smoke's "bare /editor" case updated (was: wait for `/` + `#landing-hero`).
   `documentIsExpected` was left alone -- embed and document-bearing URLs must
   not bounce, and none of these three bail-outs runs in those cases.
4. **The autosave pill (visible autosave).** "I don't see the autosave" was the
   user's report; autosave itself was fine, it was just silent. New
   `lib/autosave-indicator.ts`: a fixed pill at the bottom of the editor page
   that mirrors the scheduler's state -- `autosaveWorking` ("your work is being
   saved in this browser") while the dirty bit is set or the document is
   untouched, `autosaveSavedInBrowser` once edits exist but nothing is left
   unsaved (disk save or snapshot -- distinguished by `getLastEditAt() > 0`,
   so a never-edited new document keeps promising instead of claiming a save
   that never happened). Hidden when there is no session (embed, disabled,
   lock lost to a second tab) or the document is readonly; CSS also hides it
   under `body.landing-active` so it cannot outlive its document. index.ts
   starts it after each successful open path and refreshes every 5 s (a
   one-way mirror: the indicator reads scheduler state, the scheduler never
   learns about the UI -- no cycle with the autosave module). Two i18n keys in
   all seven locales plus the `I18nMessages` interface; the site is not
   code-frozen for UI copy, so the split EN/ES copy file was not used.
   Reverse-verified: stubbing `updateAutosaveIndicator` to a no-op turns all 6
   unit cases red; restored, they pass (7 with the unedited-document case).
5. **Stale href in the branding E2E.** vendor-branding.spec.ts still expected
   the About pane's source link to be `https://github.com/ranuts/document`
   while the unit half and the guard both point at InledGroup/newoffice. Now
   consistent. The 152 remaining `ranuts/document` matches are history
   (CHANGELOG, docs/, README translations) and are not this session's business.

## The logo decision

The user's ask was to replace `section.logo > #header-logo` with the InSuite
logo linking to /home. Investigation (grep into the minified vendor app.js)
showed that element **is** the ONLYOFFICE product mark: `<section class="logo">`
wraps `#header-logo` (the `i` carries header-logo_s.svg / dark-logo_s.svg), the
one CLAUDE.md says must stay (AGPL §7(b); it was removed once and reverted, see
docs/explorations/2026-08-23-onlyoffice-attribution-agpl-section-7.md). Asked;
the user chose **not to touch the logo**. Nothing in the editor header changed.
If the ask ever comes back, the compliant shape is vendor's own
`branding.logo` config or an image swap inside `#header-logo` -- never removal.

## Second pass (same day, user review)

- The autosave sentence came OUT of the hero (the seven-day promise stays
  machine-readable where it belongs: the FAQ JSON-LD, pinned by
  landing-pages.test.ts, and per-row on /history). The "Saved documents" link
  and the history-recent resume line stay.
- The hero claims moved to their own line with checks (`no sign-up / free /
Word-compatible`), a full beat under the CTAs (48px gap), and "Saved
  documents" a further 30px below -- measured on the built page.
- The Open-file button was ~5px shorter than its neighbour because ranui's
  content line-height is 22px against the anchors' 1.65; both now resolve to
  the same box, and both are 12px-cornered rectangles.
- Why the user still saw the classic theme: the old default had been persisted
  into `ui-theme-id` by the editor itself, and the resolution logic read it as
  a deliberate pick. One-shot migration (`ui-theme-retired-default-migrated`)
  clears it per browser; a later genuine classic pick sticks. E2E pins the
  exact browser state -- seeding localStorage has one trap: an unfiltered
  `addInitScript` runs in the editor iframe too and re-seeds the key AFTER the
  migration cleared it, an artifact no real browser has.

## Third pass (same day, three follow-up asks)

Three things came back after the first two passes, and all three turned out to
be about the same failure: **the interface saying something the code had not
earned.**

1. **"The saving toast must disappear once it has saved, and stay gone."** It did
   not disappear, and the reason was not cosmetic. Reproduced with a script
   rather than guessed at: the pill said "your work is being saved" for 100+
   seconds with `docs.count === 0` in the store, and the first
   `putSnapshot -> OK rev=1` landed at t≈61s. The scheduler was pacing its
   first snapshot like a later one. The fix is that the first snapshot is not
   interval-gated at all -- only by the 2s idle grace -- and the poll period
   now comes from `tickInterval(lastExportMs)`, which is `UNPROTECTED_TICK_MS`
   (3s) while `lastExportMs === null` and `TICK_MS` (15s) after it, on a chained
   `setTimeout` rather than an interval.

   The pill's states were then rewritten to be unprovable only if they are false.
   It keys on "is there an edit newer than the newest stored copy"
   (`getLastEditAt() > getLastSnapshotAt()`) rather than on the dirty bit, which
   stays set for the whole session and produced a toast that could never
   resolve. Precedence is warning first: `hasUncapturedWork()` wins, then
   `working` only when something is actually copying (`isAutosaveEnabled() &&
isAutosaveSessionActive()`), and `off` otherwise. The earlier ordering did
   show `working` with nothing being copied -- a unit test caught it. There is
   deliberately **no** "saved" state: a pill that says "saved" and then says it
   again after the next keystroke is a pill that has to be trusted between
   updates, and a silent one is not that. Autosave-off reuses the existing
   `historyAutosaveOff` key because silence with pending edits in the document
   is a lie by omission. Repaints come from a one-way `onSnapshotStored()`
   seam on the scheduler rather than a 5s poll.

   Two new fields, because the two clocks are not the same clock:
   `lastSnapshotAt` (pre-seeded with the session start, so the pacing window is
   measured) and `lastStoredAt` (0 until a `putSnapshot` actually completes --
   a watcher must not believe in a recovery point that does not exist).

2. **"7 days should be indefinite."** The timer is gone entirely, not widened:
   `MAX_AGE_MS`, `expiresAt()`, `daysUntilExpiry()`, `sweepExpired()` and
   `pruneExpired()` are deleted, and `expiresAt` is no longer a column. What
   remains is eviction on quota (500MB, or 50% of the quota, whichever is
   smaller; least-recently-opened first), the per-row delete, and clear-all.
   Only three things ever remove a document now, and all three are someone's
   decision.

   This is the pass where the copy had to be found rather than searched for.
   The promise lived in seven message files, the seven landing-page FAQ answers
   (machine-readable, and the one place an assistant can read it), eight
   READMEs, and the CHANGELOG -- where it was _not_ history: the "it clears
   itself" entry is still rendered on `public/changelog.html`, so it was
   rewritten rather than left to age. The dead `historyColExpires` /
   `historyExpiresIn*` keys went with the feature. `landing-pages.test.ts` used
   to assert the string "7 days" was present; it now asserts no retention
   window is named at all _and_ that the replacement sentence says what is
   true, because a subtraction alone would pass a blank answer.

3. **"Design /history like the home page."** The two pages each drew their own
   frame and had drifted -- a card on one and a bare column on the other, two
   different document rows, two nav lists. So the frame was extracted:
   `lib/app-shell.ts` + `styles/app-shell.css` (`app-*` classes) now hold the
   rail, the New popover, the nav, the phone bar, the drop-anywhere overlay, the
   card, the row, the empty state, the per-type tints and the bar's four quick
   actions. `/home` and `/history` are two contents in one frame.

   The controls moving is the part worth recording. The autosave switch and
   delete-everything lived in `/history`'s right-hand rail, and the shell's rail
   is `display: none` below 768px -- so keeping them there would have taken them
   away from phones, which the old page did not do. They are now the card's last
   section: still below the list, never beside the search box.

   The four quick actions used to be hand-written SVG in `home.html`. They are
   in the shell now, because the bar is shared chrome and the actions belong to
   it; both HTML files carry an empty `<span class="app-bar-actions">`. That
   also let their `title`s become translated instead of English literals.

   What was kept deliberately: every DOM hook the e2e specs address
   (`.history-row`, `.history-badge`, `.history-download`, `.history-delete`,
   `.history-open`, `#history-empty`, `#history-next`, `#history-prev`,
   `#history-page-info`, `#history-clear-all`, `#history-filter-unsaved`,
   `#history-open-file`, `#history-search`, and home's `.home-row` /
   `.home-row-kind` / `.home-row-title` / `.home-empty` / `.home-type` /
   `#home-open-file`). Each page's class is layered on the shared one
   (`.app-row.history-row`), so neither page's hooks can override the other's
   shape and neither test had to be rewritten. The shell class is in the HTML
   _and_ added by `mountShell()`, so the first paint is already in the grid and
   a page that forgets it still gets one frame.

   `design-contract.test.ts` gained an "app shell" block for the thing that
   actually drifts: both pages are built in the shared frame, neither
   stylesheet declares a width of 1152 or a `-shell` class of its own, and both
   modules import from `lib/app-shell`.

## Fourth pass (same day: the row size, the classic-theme leak, the logo and the credits)

Four asks arrived together, and three of them turned out to be one class of bug:
a CSS declaration that reads as if it works and does not.

- The saved-document row was "diminuta": its padding was
  `14px var(--ran-space-5)`, and **`--ran-space-5` does not exist** -- the scale
  is 1, 2, 3, 4, 6, 8, 10, 16, 24. An undefined custom property with no fallback
  makes the whole declaration invalid at computed-value time, so the padding
  collapsed to zero and the row was a 43px strip with a 32px icon and a name
  ellipsised to one line. `.app-card` had the same defect with `--radius-lg`, so
  the card had never been rounded. Both are fixed: the row is
  `var(--ran-space-4) var(--ran-space-6)` with a 44px icon tile, a 15px title
  clamped to two lines, 12px facts and 34px action buttons (104px tall at

  > =768px, 91px at <=430px); and the reference's real shadcn radius scale is now
  > declared in the `.app-shell` palette rather than half-invented with fallbacks.
  > `styles-contract.test.ts` gained a guard for the whole class of bug: it
  > collects every `--x` a stylesheet reads and every `--x` the project (or
  > ranui) defines, and fails on any bare `var(--x)` that is undefined. Proved
  > non-vacuous by re-injecting `--ran-space-5`.

- The dark editor was still classic. The vendor ships two theme _families_ that
  share naming: the modern flat one (`theme-white`, `theme-night`, icons
  `mod2`) and the legacy skeleton (`theme-classic-light`, `theme-dark`).
  `DARK_UI_THEME` was `'theme-dark'`, so **every dark site was on the classic
  chrome** even after the light default was fixed. The vendor's own loader says
  it plainly
  (`public/web-apps/apps/spreadsheeteditor/main/index.html`:
  `DEFAULT_DARK_THEME_ID = !isIEBrowser ? "theme-night" : "theme-dark"`), and
  `RETIRED_DEFAULT_THEMES` now carries both classic ids so the migration
  self-heals either stale value a browser may hold.

- The ONLYOFFICE logo was the only mark in the editor header, and the only way
  back to the site was the browser's back button. The license constrains the
  fix: Section 7(b) requires the product logo to be retained, so it cannot be
  deleted or hidden. What it does not specify is size. `guards/brand.ts`
  (guard 17) adds the Insuite mark as an `<a>` to `/home` as the first child of
  the logo section -- the same asset and lockup the app bar uses -- and scales
  the vendor `#header-logo i` from 86x20 to 65x15: the same image, aspect ratio
  preserved, never cropped. `vendor-branding.spec.ts` asserts the mark is
  painted at `width > 20`, `height > 8`; 65x15 clears that with room to spare,
  and the guard is pinned to never contain `display: none`.

- The footers credited "Inled InSuite Office" and stopped there. They now carry
  the two debts separately, in all seven languages: ONLYOFFICE / Ascensio System
  SIA, who wrote the editors, and `github.com/ranuts/document`, the project this
  site was forked from -- and both lines ask for a star on their own repository,
  because that is the only currency an AGPL project collects. `VENDOR_REPO` and
  `UPSTREAM_REPO` live in `bin/pages/constants.mjs`; the copy is in
  `bin/pages/ui.mjs` (`vendorCredit`, `upstreamCredit`) and is deliberately
  unescaped HTML, the same way `ossNote` is, because each string carries its own
  anchor.

## Verification

- `pnpm run lint:ts` clean; `@ranuts/shared` rebuilt so the new keys are visible
  to `dist` importers (same convention as the converter package). Worth
  remembering from the third pass: `@ranuts/shared/i18n` resolves to
  `packages/shared/dist`, so a change to a message file is invisible to the dev
  server until `tsc -p packages/shared` runs. The probe served the _old_ Spanish
  seven-day copy from a stale `dist` and looked for a while like the rewrite had
  failed.
- Unit: 3475/3475, 59 files. Prettier clean after `--write` on the 12 files the
  regeneration touched (some were pre-existing unformatted files from the
  uncommitted rebranding).
- E2E targeted: app-smoke, main-site, vendor-branding, entry-paths,
  autosave-recovery, save-to-file -- all green after installing this
  Playwright version's Chromium (the dependency bump from the prior session
  had left the browser cache stale; that was also what failed the first run's
  17 cases, not the code).
- main-site's "New Excel" case no longer clicks `#hero-new-xlsx` (the hero
  does not have one since the rebranding); it now enters through `/home`'s
  quick action, which is the path users have.
- Third pass: `pnpm vitest run test/unit/{autosave-indicator,history-autosave,history-store,editor-theme,home-page,design-contract,landing-pages}.test.ts`
  green (the pill's 9 cases pin `Date.now`; the autosave integration case keeps
  real timers on purpose -- `fake-indexeddb` drives transactions through the
  macrotask queue, so faking `setTimeout` stalls it). `/home` and `/history`
  measured off the rendered pages rather than screenshotted -- headless
  Chromium cannot produce an image in this environment at all, which fails on a
  blank page too: both pages resolve to the same `224px 848px` grid at 1280 and
  the same single 358px column at 390, the rail and the phone bar swap at the
  breakpoint, `scrollWidth - clientWidth` is 0 on both, the five tinted rows
  carry the right per-type ink, and the settings block and delete-all are both
  inside the card at every width. `test/e2e/history-page.spec.ts` 15/15.
- Two hooks the redesign did not carry over, both found by running the spec
  rather than by reading it: `SectionOptions` has no room for a per-page class
  on its own heading until it was added (`titleClass`, so `/history` keeps
  `.history-title`, which two cases address), and the hero's resume block is
  `.lp-recent` -- the test that checks the landing page never promises a
  deadline had been looking for `.recent`, which no markup has had for a while.
  `bin/design-audit.mjs` was measuring `.history-page` as a container and
  `.history-title` as a heading; both are now `.app-card` and `h1`.
- Fourth pass: `pnpm vitest run` green at **3483/3483, 59 files**;
  `pnpm lint:ts`, `oxlint --deny-warnings` and `prettier --check` clean.
  `guards-numbering.test.ts` caught the one thing the label pick got wrong --
  `bad-image-url.ts` already owned 13, so the brand guard is 17.
  Targeted e2e: `vendor-branding.spec.ts` 6/6 (including the two AGPL-3.0
  Section 7(b) cases that measure the retained logo), `main-site.spec.ts` +
  `history-page.spec.ts` 19/19.
- The fourth pass was verified on the running editor rather than by reading:
  a script opened `/editor?new=docx` in both `colorScheme` values, waited for
  `#oo-home-brand`, and measured the header. The brand is 128x28 at the top
  left (`flex`, its box hit-testable at the centre, its `<img>` loaded --
  `naturalWidth` 500), `href` is `/home?locale=es`, `target="_top"`, and
  clicking it navigates the top window to `/home?locale=es`. Beside it the
  vendor mark is 65x15 with `dark-logo_s.svg` on the light theme and
  `header-logo_s.svg` on `theme-night` -- both of which the branding spec's
  regex accepts. The document title loses about 110px of width to the new
  mark; that was judged the right trade for a way home.
- `--ran-space-5` is the kind of bug a test has to catch, not a reviewer: it
  looked like every other token in the file, and the row it broke was reported
  as "diminuta" -- a size problem, not a typo problem. The
  `styles-contract.test.ts` guard is deliberately about the _class_ (any bare
  `var(--x)` that no stylesheet defines), not about that one token.
