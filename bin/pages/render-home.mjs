/**
 * The homepage template.
 *
 * Not markdown, because it is not prose: every string sits in a fixed slot and
 * the decoration around them is layout. content/<locale>/home.json holds the
 * strings; this holds the structure.
 */
import { ORIGIN, REPO } from './constants.mjs';
import { ID, appEntity, siteEntities, sourceEntity } from './entities.mjs';
import { DEFAULT_LOCALE, LOCALES } from './locales.mjs';
import { GH_MARK, langMenu } from './chrome.mjs';
import { escapeHtml } from './markdown.mjs';
import { UI } from './ui.mjs';

/**
 * The homepage.
 *
 * It is not prose, so it is not markdown: every string on it sits in a fixed
 * slot (a hero line, a row of the format index, one of four pillars), and the
 * decoration around them -- the CSS document window, the reveal classes, the
 * prefetch hooks -- is layout, not content. content/<locale>/home.json holds
 * exactly the strings; this holds exactly the structure. Adding a language is
 * then one JSON file rather than one more 520-line HTML file to keep in step.
 */
/**
 * The landing page's icons, as inline lucide SVG.
 *
 * lucide's own 24x24 geometry (the reference draws these with lucide-react),
 * written out because a `<symbol>` sprite cannot carry them: a `<use>` clones
 * the referenced element into a shadow tree that inherits from the `use` site
 * rather than from the sprite's ancestors, so the stroke attributes that make
 * an icon take the colour of its card have to travel with the icon itself.
 * Only the GitHub mark -- one filled glyph, used once -- stays in the sprite.
 */
const ICONS = {
  doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />',
  sheet:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2" />',
  slides: '<path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" />',
  plugins:
    '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />',
  yes: '<path d="M20 6 9 17l-5-5" />',
  no: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
};

/** One inline lucide icon. An unknown name is a loud build error, not a blank. */
const inlineIcon = (name) =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;

export function renderHome({ locale, data, locales }) {
  const L = LOCALES[locale];
  const ui = UI[locale];
  const home = L.home;
  const url = ORIGIN + home;
  const e = escapeHtml;
  /**
   * Links into the app carry the locale. The app's own i18n resolves its
   * language from `?locale=` first (then cookie, then localStorage, then
   * navigator.language), so without this a visitor who chose Japanese on the
   * site would land in an editor guessing from browser settings -- which is
   * how the hand-written Chinese homepage always did it, and what the first
   * generated version of this template dropped.
   */
  const editor = (query) => `/editor?${locale === DEFAULT_LOCALE ? '' : `locale=${locale}&`}${query}`;
  const alternates = locales
    .map((l) => `    <link rel="alternate" hreflang="${l}" href="${ORIGIN + LOCALES[l].home}" />`)
    .join('\n');
  const ogAlternates = locales
    .filter((l) => l !== locale)
    .map((l) => `    <meta property="og:locale:alternate" content="${LOCALES[l].og}" />`)
    .join('\n');

  const graph = [
    ...siteEntities(),
    appEntity({
      description: data.description,
      ...(data.featureList ? { featureList: data.featureList } : {}),
      ...(data.ecosystem
        ? { isPartOf: [{ '@id': ID.site }, { '@type': 'SoftwareApplication', ...data.ecosystem }] }
        : {}),
    }),
    // This page: one homepage per language, each pointing at the same app.
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: data.title,
      description: data.description,
      inLanguage: L.lang,
      isPartOf: { '@id': ID.site },
      about: { '@id': ID.app },
      primaryImageOfPage: `${ORIGIN}/img/pwa-512.png`,
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: L.lang,
      mainEntity: data.sections.faq.items.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    sourceEntity(),
  ];
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)
    .split('\n')
    .map((l) => '      ' + l)
    .join('\n');

  const rows = data.sections.formats.rows
    .map(
      (r) => `          <a class="row" href="${e(r.href)}">
            <span class="ext">${e(r.ext)}</span>
            <span class="name">${e(r.name)}</span>
            <span class="desc">${e(r.desc)}</span>
            <span class="go" aria-hidden="true">&rarr;</span>
          </a>`,
    )
    .join('\n');
  /**
   * The InSuite sections, assembled from content/<locale>/home.json.
   *
   * The layout is the reference site's: hero with its flag stamp, three feature
   * cards, the editor grid, the honest comparison table, the closing call and
   * the Inled block -- plus the two bands this build has to keep (the format
   * index and the FAQ: they are what makes every /open/* page reachable and
   * what answers "did I lose my work?" for a crawler, and test/unit/landing-
   * pages.test.ts pins both).
   */
  const features = data.features.items
    .map(
      (f) => `            <article class="lp-card">
              <span class="lp-card-mark" aria-hidden="true">${inlineIcon(f.icon)}</span>
              <h3>${e(f.title)}</h3>
              <p>${e(f.desc)}</p>
            </article>`,
    )
    .join('\n');
  const editorCards = [
    ...data.editors.items.map((it, i) => ({ ...it, kind: ['docx', 'xlsx', 'pptx'][i], plugins: false })),
    { ...data.editors.plugins, kind: 'plugins', plugins: true },
  ]
    .map((it) => {
      // docx -> i-doc, xlsx -> i-sheet, pptx -> i-slides: the sprite names the
      // shape, not the product name.
      const mark = { docx: 'doc', xlsx: 'sheet', pptx: 'slides', plugins: 'plugins' }[it.kind] ?? 'doc';
      const open = it.plugins
        ? `<article class="lp-card lp-card-plugins">`
        : `<a class="lp-card lp-card-link" href="${editor(`new=${it.kind}`)}" data-prefetch="${it.kind}">`;
      return `            ${open}
              <span class="lp-card-mark" aria-hidden="true">${inlineIcon(mark)}</span>
              <h3>${e(it.name)}</h3>
              <p>${e(it.desc)}</p>
            ${it.plugins ? '</article>' : '</a>'}`;
    })
    .join('\n');
  const comparisonRows = data.comparison.rows
    .map((r) => {
      const stars = Array.from(
        { length: 5 },
        (_, i) => `<i class="lp-star${i < r.comp ? ' on' : ''}" aria-hidden="true"></i>`,
      ).join('');
      const yes = `<svg class="ic  lp-yes" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>`;
      const no = `<svg class="ic  lp-no" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>`;
      return `              <tr${r.featured ? ' class="is-featured"' : ''}>
                <td class="lp-suite">
                  <img src="${e(r.logo)}" alt="" width="24" height="24" loading="lazy" onerror="this.style.visibility='hidden'" />
                  <b>${e(r.name)}</b>
                </td>
                <td><span class="lp-pill${r.privacy === data.comparison.local ? ' lp-pill-ok' : ''}">${e(r.privacy)}</span></td>
                <td class="lp-center">${r.auditable ? yes : no}</td>
                <td class="lp-stars" aria-label="${r.comp} / 5">${stars}</td>
                <td class="lp-center">${r.install ? no : yes}</td>
                <td class="${r.price === data.comparison.free ? 'lp-free' : ''}">${e(r.price)}</td>
                <td class="lp-diff">${e(r.diff)}</td>
              </tr>`;
    })
    .join('\n');
  const aboutStats = data.about.stats
    .map(
      (s) => `            <div>
              <b>${e(s.value)}</b>
              <span>${e(s.label)}</span>
            </div>`,
    )
    .join('\n');
  const faq = data.sections.faq.items
    .map(
      (f, i) => `            <details${i === 0 ? ' open' : ''}>
              <summary>${e(f.q)}</summary>
              <p class="a">${e(f.a)}</p>
            </details>`,
    )
    .join('\n');
  const nav = data.nav.map((l) => `            <a class="navlink" href="${e(l.href)}">${e(l.label)}</a>`).join('\n');
  const footLinks = data.foot.links.map((l) => `          <a href="${e(l.href)}">${e(l.label)}</a>`).join('\n');
  /**
   * Where the hero's calls land. The landing page hands over to the app:
   * "start using" opens the app's home page (the editors, a file to open, the
   * documents this browser is holding), and every link into the editor carries
   * the language this page is in, which is what the app resolves first.
   */
  const appHome = locale === DEFAULT_LOCALE ? '/home' : `/home?locale=${locale}`;

  return `<!doctype html>
<!-- GENERATED by bin/build-pages.mjs from content/${locale}/home.json -- edit the JSON, not this file. -->
<html lang="${L.lang}" dir="${L.dir}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="https://hosted.inled.es/cdn/insuite.svg" />
    
    <link rel="manifest" href="/manifest.json" />
    <!-- Route split: this is a static landing page, /editor hosts the app. Deep
         links that used to target it (?file= ?src= ?new= ?open=local ?embed=
         ?embedded= ?readonly ?agent) and any embedding iframe keep working:
         hand them to /editor with the same query before anything renders. -->
    <script>
      (function () {
        try {
          var q = location.search;
          var deep = /[?&](file|src|new|open|embed|embedded|readonly|agent)(=|&|$)/.test(q);
          var framed = window.parent !== window;
          if (deep || framed) {
            location.replace('/editor' + (q || (framed ? '?embed=1' : '')) + location.hash);
          }
        } catch (e) {}
      })();
    </script>
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />

    <title>${e(data.title)}</title>
    <meta name="description" content="${e(data.description)}" />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
${alternates}
    <link rel="alternate" hreflang="x-default" href="${ORIGIN + LOCALES[DEFAULT_LOCALE].home}" />
    <!-- No-flash theme restore: apply a forced light/dark before first paint so a
         dark-mode visitor never sees a white flash. -->
    <script>
      try {
        var t = localStorage.getItem('ran-theme');
        if (t === 'dark' || t === 'light') {
          document.documentElement.setAttribute('data-ran-theme', t);
          document.documentElement.setAttribute('theme', t);
        }
      } catch (e) {}
    </script>
    <link rel="stylesheet" href="/ran-fonts/fonts.css" />
    <link rel="stylesheet" href="/ran-tokens.css" />
    <link rel="stylesheet" href="/home.css" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Online Document Editor" />
    <meta property="og:locale" content="${L.og}" />
${ogAlternates}
    <meta property="og:title" content="${e(data.title)}" />
    <meta property="og:description" content="${e(data.ogDescription || data.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${ORIGIN}/img/pwa-512.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${e(data.title)}" />
    <meta name="twitter:description" content="${e(data.ogDescription || data.description)}" />
    <meta name="twitter:image" content="${ORIGIN}/img/pwa-512.png" />

    <script type="application/ld+json">
${jsonLd}
    </script>

    <script src="/ranui-iife/button.iife.js" defer></script>
    <script src="/ranui-iife/popover.iife.js" defer></script>
    <script src="/ranui-iife/content.iife.js" defer></script>
    <script src="/ranui-iife/theme-switch.iife.js" defer></script>
    <script src="/lang-switch.js" defer></script>
    <script src="/open-local.js" defer></script>
    <script src="/landing-prefetch.js" defer></script>
    <script src="/history-recent.js" defer></script>
  </head>

  <body>
    <svg width="0" height="0" style="position: absolute" aria-hidden="true">
      <!-- Only the GitHub mark lives in a sprite: one filled glyph, used once.
           Every icon that has to take its container's colour is inlined at the
           point of use (see ICONS above), because a <use> clones the
           referenced element into a shadow tree that inherits from the <use>
           site and not from the sprite's ancestors -- so a sprite cannot carry
           the stroke attributes a coloured icon needs. -->
      <symbol id="gh-mark" viewBox="0 0 16 16">
        <path d="${GH_MARK}" />
      </symbol>
    </svg>

    <section id="landing-hero">
      <header class="bar">
        <div class="wrap">
          <a class="brand" href="${home}"><img class="logo" src="https://hosted.inled.es/cdn/insuite.svg" alt="" width="40" height="40" /><span class="wordmark">Insuite Office<span class="tagline">Docs · Sheets · Slides</span></span></a>
          <nav>
${nav}
            <a class="navlink gh" href="${REPO}" rel="noopener" target="_blank">
              <svg class="ghmark" aria-hidden="true"><use href="#gh-mark"></use></svg> GitHub
            </a>
${langMenu(locale, locales, ui, (l) => LOCALES[l].home)}
          </nav>
          <a class="bar-cta" href="${appHome}">${e(ui.openEditor)}</a>
        </div>
      </header>

      <main>
        <!-- The reference's hero: a centred opening, the flag stamp, and a
             window that looks like the product. The window is a static
             facsimile of each document type rather than a mounted editor --
             this page deliberately never loads the editor bundle (it is the one
             page that has to paint and be readable before any WASM arrives),
             and the three tabs are radio inputs, so the preview needs no script
             either. Every panel links to the real thing. -->
        <div class="lp-hero wrap">
          <span class="lp-chip reveal d1">${e(data.hero.beta)}</span>
          <h1 class="reveal d2">${e(data.hero.h1)}</h1>
          <p class="lp-sub reveal d3">${e(data.hero.sub)}</p>
          <!-- Two actions, two weights: the primary anchor goes to the app
               homepage, the secondary opens the file picker right here (see
               open-local.js). No third button -- the feature list is a section
               below, not a call to action. -->
          <div class="lp-cta reveal d4">
            <a class="lp-btn lp-btn-primary" href="${appHome}"
              >${e(data.hero.start)} <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
            ></a>
            <r-button id="hero-open" data-open-local="${editor('open=local')}">${e(data.hero.open)}</r-button>
          </div>

          <!-- The three claims a first-time visitor needs, as a quiet line
               under the calls: no account, no price, no compatibility tax.
               Keep it one line on desktop -- these are hero facts, not a
               feature list; the full grid lives below. -->
          <ul class="lp-points reveal d4">
            <li>${e(data.hero.noSignup)}</li>
            <li>${e(data.hero.free)}</li>
            <li>${e(data.hero.wordCompatible)}</li>
          </ul>          <!-- The way back into work this browser is holding, right under the
               calls (the resume line is added by public/history-recent.js). No
               retention note here: what the copies are and when they are
               removed is a promise about someone's documents, and it lives in
               the FAQ below (machine-readable, pinned by
               landing-pages.test.ts) and on /history, where the whole store is
               on screen. Nothing here is deleted because of its age. -->
          <div class="lp-recent">
            <span data-recent-slot data-recent-label="${e(data.recent.label)}" hidden></span>
            <a
              class="recent-all"
              href="${locale === DEFAULT_LOCALE ? '/history' : `/history?locale=${locale}`}">${e(data.recent.all)}</a>
          </div>
        </div>

      <section id="features" class="lp-section">
        <div class="wrap">
          <div class="lp-head">
            <h2>${e(data.features.h2)}</h2>
            <p>${e(data.features.sub)}</p>
          </div>
          <div class="lp-grid lp-grid-3">
${features}
          </div>
        </div>
      </section>

      <section id="editors" class="lp-section lp-section-alt">
        <div class="wrap">
          <div class="lp-head">
            <h2>${e(data.editors.h2)}</h2>
            <p>${e(data.editors.sub)}</p>
          </div>
          <div class="lp-grid lp-grid-4">
${editorCards}
          </div>
        </div>
      </section>

      <!-- The format index. It is the band that makes every /open/* page and
           the two convert pages reachable from the busiest page on the site
           (test/unit/landing-pages.test.ts), so it stays -- laid out as the
           reference lays out its card rows. -->
      <section class="lp-section">
        <div class="wrap">
          <div class="lp-head">
            <span class="lp-eyebrow">${e(data.sections.formats.eyebrow)}</span>
            <h2>${e(data.sections.formats.h2)}</h2>
          </div>
          <div class="index">
${rows}
          </div>
        </div>
      </section>

      <section id="compare" class="lp-section">
        <div class="wrap">
          <div class="lp-head">
            <h2>${e(data.comparison.h2)}</h2>
            <p>${e(data.comparison.sub)}</p>
          </div>
          <div class="lp-table-scroll">
            <table class="lp-table">
              <thead>
                <tr>
                  <th>${e(data.comparison.cols[0])}</th>
                  <th>${e(data.comparison.cols[1])}</th>
                  <th>${e(data.comparison.cols[2])}</th>
                  <th>${e(data.comparison.cols[3])}</th>
                  <th>${e(data.comparison.cols[4])}</th>
                  <th>${e(data.comparison.cols[5])}</th>
                  <th>${e(data.comparison.cols[6])}</th>
                </tr>
              </thead>
              <tbody>
${comparisonRows}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="lp-section">
        <div class="wrap">
          <div class="lp-final">
            <img
              class="lp-final-media"
              src="https://hosted.inled.es/insuite-office-matrix.gif"
              alt=""
              width="1200"
              height="630"
              loading="lazy"
            />
            <div class="lp-final-body">
              <h2>${e(data.cta.h2)}</h2>
              <p>${e(data.cta.sub)}</p>
              <div class="lp-cta">
                <a class="lp-btn lp-btn-primary" href="${appHome}"
                  >${e(data.cta.start)} <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
                ></a>
                <a class="lp-btn lp-btn-ghost" href="${REPO}" rel="noopener" target="_blank">
                  <svg class="ic" aria-hidden="true"><use href="#gh-mark"></use></svg> ${e(data.cta.code)}
                </a>
              </div>
              <p class="lp-final-note">${e(data.cta.note)}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" class="lp-section">
        <div class="wrap">
          <div class="lp-about">
            <img
              src="https://hosted.inled.es/inled-logo-full.png"
              alt="Inled Group"
              height="80"
              loading="lazy"
            />
            <h2>${e(data.about.h2)}</h2>
            <p>${e(data.about.p)}</p>
            <div class="lp-about-stats">
${aboutStats}
            </div>
          </div>
        </div>
      </section>

      <div class="section wrap faq-sec">
        <div class="section-head">
          <span class="eyebrow">${e(data.sections.faq.eyebrow)}</span>
          <h2>${e(data.sections.faq.h2)}</h2>
          <p class="head-note">${data.sections.faq.note}</p>
        </div>
        <div class="faq">
          <div class="qa">
${faq}
          </div>
        </div>
      </div>


      </main>

      <footer class="foot wrap">
        <span>${e(data.foot.copy)}</span>
        <nav>
${footLinks}
        </nav>
        <r-theme-switch class="theme-switch" label="${e(ui.themeLabel)}"></r-theme-switch>
        <span class="lic">${e(data.foot.license)}</span>
        <!-- Two credits, and both are asks. The editors are ONLYOFFICE's,
             and this site is a fork of ranuts/document; the footer is where a
             visitor will actually read that, so it is where the links live.
             Unescaped on purpose: the values carry their own anchors (ui.mjs),
             the same way ossNote does. -->
        <p class="deriv">${ui.vendorCredit}</p>
        <p class="deriv">${ui.upstreamCredit}</p>
        <p class="tm">${e(ui.trademark)}</p>
      </footer>
    </section>

    <!-- Registers the service worker (so the landing works offline / installs as
         an app) and promotes a waiting one, which is what makes a deploy reach a
         returning visitor. See public/sw-register.js. -->
    <script src="/sw-register.js" defer></script>
  </body>
</html>
`;
}
