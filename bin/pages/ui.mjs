/**
 * Per-locale chrome strings: everything in the shell that is words rather
 * than content. The pages themselves come from markdown; this is the frame
 * around them.
 */
import { REPO, UPSTREAM_REPO, VENDOR_REPO } from './constants.mjs';

export const UI = {
  en: {
    siteName: 'Document Editor',
    langAria: 'Language',
    themeLabel: 'Theme',
    home: 'Home',
    openEditor: 'Open editor',
    onThisPage: 'On this page',
    more: 'Related pages',
    sideNote: 'Runs on your device. No upload, no sign-up.',
    footer: [
      ['/', 'Open editor'],
      ['/help', 'Help'],
      ['/changelog', 'Changelog'],
      ['/about', 'About'],
      ['/contact', 'Contact'],
      ['/open/docx', 'Open DOCX'],
      ['/open/xlsx', 'Open XLSX'],
      ['/open/pptx', 'Open PPTX'],
      ['/open/pdf', 'Open PDF'],
      ['/convert/xlsx-to-csv', 'XLSX to CSV'],
      ['/convert/csv-to-xlsx', 'CSV to XLSX'],
      ['/no-signup-document-editor', 'No sign-up'],
      ['/private-document-editor', 'Private editor'],
      ['/offline-document-editor', 'Offline'],
      ['/onlyoffice-online-free', 'ONLYOFFICE online'],
      ['/edit-documents-without-account', 'No account'],
      ['/embed-document-editor', 'Embed API'],
    ],
    generatedNote: (src) => `Source: ${src} in the repository`,
    ossNote: `<strong>Open source &amp; self-hostable.</strong> Under AGPL-3.0 — verify that nothing is uploaded, or run your own copy: <a href="${REPO}" rel="noopener">github.com/InledGroup/newoffice</a>.`,
    trademark: `ONLYOFFICE is a trademark of Ascensio System SIA. This site is not an official ONLYOFFICE product and is not affiliated with or endorsed by Ascensio System SIA.`,
    // Two debts, stated separately: who built the editors, and the
    // project this one forked from. Both get the ask, because a star
    // is the only currency an AGPL project actually has.
    vendorCredit: `The document editors are <a href="${VENDOR_REPO}" rel="noopener" target="_blank">ONLYOFFICE</a>, by Ascensio System SIA. If they are useful to you, star their repository.`,
    upstreamCredit: `This site is a fork of <a href="${UPSTREAM_REPO}" rel="noopener" target="_blank">ranuts/document</a>, the project it started from. A star there is the credit that counts.`,
  },
  'zh-CN': {
    siteName: 'Document Editor',
    langAria: '语言',
    themeLabel: '主题',
    home: '首页',
    openEditor: '打开编辑器',
    onThisPage: '本页目录',
    more: '相关页面',
    sideNote: '在你的设备上运行，不上传、免注册。',
    footer: [
      ['/zh-CN/', '打开编辑器'],
      ['/zh-CN/help', '帮助'],
      ['/zh-CN/changelog', '更新日志'],
      ['/zh-CN/about', '关于'],
      ['/zh-CN/contact', '联系'],
      ['/zh-CN/open/docx', '打开 DOCX'],
      ['/zh-CN/open/xlsx', '打开 XLSX'],
      ['/zh-CN/open/pptx', '打开 PPTX'],
      ['/zh-CN/open/pdf', '打开 PDF'],
      ['/zh-CN/convert/xlsx-to-csv', 'XLSX 转 CSV'],
      ['/zh-CN/convert/csv-to-xlsx', 'CSV 转 XLSX'],
      ['/zh-CN/no-signup-document-editor', '免注册'],
      ['/zh-CN/private-document-editor', '隐私编辑器'],
      ['/zh-CN/offline-document-editor', '离线'],
      ['/zh-CN/onlyoffice-online-free', 'OnlyOffice 在线版'],
      ['/zh-CN/edit-documents-without-account', '免账号'],
      ['/zh-CN/embed-document-editor', 'Embed API'],
    ],
    generatedNote: (src) => `来源：仓库中的 ${src}`,
    ossNote: `<strong>开源 · 可自托管。</strong>采用 AGPL-3.0——你可以核实没有任何上传，或者自建一份：<a href="${REPO}" rel="noopener">github.com/InledGroup/newoffice</a>。`,
    trademark: `ONLYOFFICE 是 Ascensio System SIA 的商标。本站并非官方 ONLYOFFICE 产品，与 Ascensio System SIA 无隶属关系，也未获其背书。`,
    // Two debts, stated separately: who built the editors, and the
    // project this one forked from. Both get the ask, because a star
    // is the only currency an AGPL project actually has.
    vendorCredit: `文档编辑器是 Ascensio System SIA 出品的 <a href="${VENDOR_REPO}" rel="noopener" target="_blank">ONLYOFFICE</a>。如果它对你有用，请给他们的仓库点一个 star。`,
    upstreamCredit: `本站 fork 自 <a href="${UPSTREAM_REPO}" rel="noopener" target="_blank">ranuts/document</a>，即最初的项目。给它点 star 就是最好的支持。`,
  },
  ja: {
    siteName: 'Document Editor',
    langAria: '言語',
    themeLabel: 'テーマ',
    home: 'ホーム',
    openEditor: 'エディタを開く',
    onThisPage: 'このページの目次',
    more: '関連ページ',
    sideNote: 'お使いの端末で動作します。アップロードなし、登録不要。',
    footer: [
      ['/ja/', 'エディタを開く'],
      ['/ja/help', 'ヘルプ'],
      ['/ja/changelog', '変更履歴'],
      ['/ja/about', 'このエディタについて'],
      ['/ja/contact', 'お問い合わせ'],
      ['/ja/open/docx', 'DOCX を開く'],
      ['/ja/open/xlsx', 'XLSX を開く'],
      ['/ja/open/pptx', 'PPTX を開く'],
      ['/ja/open/pdf', 'PDF を開く'],
      ['/ja/convert/xlsx-to-csv', 'XLSX を CSV に'],
      ['/ja/convert/csv-to-xlsx', 'CSV を XLSX に'],
      ['/ja/no-signup-document-editor', '登録不要'],
      ['/ja/private-document-editor', 'プライバシー'],
      ['/ja/offline-document-editor', 'オフライン'],
      ['/ja/edit-documents-without-account', 'アカウント不要'],
      ['/ja/embed-document-editor', 'Embed API'],
    ],
    generatedNote: (src) => `ソース: リポジトリの ${src}`,
    ossNote: `<strong>オープンソース・セルフホスト可能。</strong>AGPL-3.0 のもとで公開——何もアップロードされないことを自分で確認でき、自分で運用することもできます: <a href="${REPO}" rel="noopener">github.com/InledGroup/newoffice</a>。`,
    trademark: `ONLYOFFICE は Ascensio System SIA の商標です。本サイトは公式の ONLYOFFICE 製品ではなく、Ascensio System SIA との提携も推奨関係もありません。`,
    // Two debts, stated separately: who built the editors, and the
    // project this one forked from. Both get the ask, because a star
    // is the only currency an AGPL project actually has.
    vendorCredit: `ドキュメントエディタは Ascensio System SIA の <a href="${VENDOR_REPO}" rel="noopener" target="_blank">ONLYOFFICE</a> です。役に立ったら、ぜひリポジトリにスターを。`,
    upstreamCredit: `このサイトは最初のプロジェクト <a href="${UPSTREAM_REPO}" rel="noopener" target="_blank">ranuts/document</a> のフォークです。スターが何よりの支えになります。`,
  },
  de: {
    siteName: 'Document Editor',
    langAria: 'Sprache',
    themeLabel: 'Design',
    home: 'Startseite',
    openEditor: 'Editor öffnen',
    onThisPage: 'Auf dieser Seite',
    more: 'Verwandte Seiten',
    sideNote: 'Läuft auf Ihrem Gerät. Kein Upload, keine Anmeldung.',
    footer: [
      ['/de/', 'Editor öffnen'],
      ['/de/help', 'Hilfe'],
      ['/de/changelog', 'Änderungen'],
      ['/de/about', 'Über uns'],
      ['/de/contact', 'Kontakt'],
      ['/de/open/docx', 'DOCX öffnen'],
      ['/de/open/xlsx', 'XLSX öffnen'],
      ['/de/open/pptx', 'PPTX öffnen'],
      ['/de/open/pdf', 'PDF öffnen'],
      ['/de/convert/xlsx-to-csv', 'XLSX zu CSV'],
      ['/de/convert/csv-to-xlsx', 'CSV zu XLSX'],
      ['/de/no-signup-document-editor', 'Ohne Anmeldung'],
      ['/de/private-document-editor', 'Datenschutz'],
      ['/de/offline-document-editor', 'Offline'],
      ['/de/edit-documents-without-account', 'Ohne Konto'],
      ['/de/embed-document-editor', 'Embed API'],
    ],
    generatedNote: (src) => `Quelle: ${src} im Repository`,
    ossNote: `<strong>Open Source &amp; selbst hostbar.</strong> Unter AGPL-3.0 — prüfen Sie selbst, dass nichts hochgeladen wird, oder betreiben Sie eine eigene Kopie: <a href="${REPO}" rel="noopener">github.com/InledGroup/newoffice</a>.`,
    trademark: `ONLYOFFICE ist eine Marke von Ascensio System SIA. Diese Website ist kein offizielles ONLYOFFICE-Produkt und steht in keiner Verbindung zu Ascensio System SIA.`,
    // Two debts, stated separately: who built the editors, and the
    // project this one forked from. Both get the ask, because a star
    // is the only currency an AGPL project actually has.
    vendorCredit: `Die Dokument-Editoren sind <a href="${VENDOR_REPO}" rel="noopener" target="_blank">ONLYOFFICE</a> von Ascensio System SIA. Wenn sie dir nützlich sind, gib ihrem Repository einen Stern.`,
    upstreamCredit: `Diese Seite ist ein Fork von <a href="${UPSTREAM_REPO}" rel="noopener" target="_blank">ranuts/document</a>, dem ursprünglichen Projekt. Ein Stern dort ist die Anerkennung, die zählt.`,
  },
  es: {
    siteName: 'Document Editor',
    langAria: 'Idioma',
    themeLabel: 'Tema',
    home: 'Inicio',
    openEditor: 'Abrir el editor',
    onThisPage: 'En esta página',
    more: 'Páginas relacionadas',
    sideNote: 'Funciona en tu dispositivo. Sin subidas, sin registro.',
    footer: [
      ['/es/', 'Abrir el editor'],
      ['/es/help', 'Ayuda'],
      ['/es/changelog', 'Novedades'],
      ['/es/about', 'Acerca de'],
      ['/es/contact', 'Contacto'],
      ['/es/open/docx', 'Abrir DOCX'],
      ['/es/open/xlsx', 'Abrir XLSX'],
      ['/es/open/pptx', 'Abrir PPTX'],
      ['/es/open/pdf', 'Abrir PDF'],
      ['/es/convert/xlsx-to-csv', 'XLSX a CSV'],
      ['/es/convert/csv-to-xlsx', 'CSV a XLSX'],
      ['/es/no-signup-document-editor', 'Sin registro'],
      ['/es/private-document-editor', 'Privacidad'],
      ['/es/offline-document-editor', 'Sin conexión'],
      ['/es/edit-documents-without-account', 'Sin cuenta'],
      ['/es/embed-document-editor', 'Embed API'],
    ],
    generatedNote: (src) => `Fuente: ${src} en el repositorio`,
    ossNote: `<strong>Código abierto y autoalojable.</strong> Bajo AGPL-3.0: comprueba que no se sube nada, o ejecuta tu propia copia: <a href="${REPO}" rel="noopener">github.com/InledGroup/newoffice</a>.`,
    trademark: `ONLYOFFICE es una marca de Ascensio System SIA. Este sitio no es un producto oficial de ONLYOFFICE ni está afiliado a Ascensio System SIA ni respaldado por ella.`,
    // Two debts, stated separately: who built the editors, and the
    // project this one forked from. Both get the ask, because a star
    // is the only currency an AGPL project actually has.
    vendorCredit: `Los editores de documentos son <a href="${VENDOR_REPO}" rel="noopener" target="_blank">ONLYOFFICE</a>, de Ascensio System SIA. Si te resultan útiles, dale una estrella a su repositorio.`,
    upstreamCredit: `Este sitio es un fork de <a href="${UPSTREAM_REPO}" rel="noopener" target="_blank">ranuts/document</a>, el proyecto del que nació. Una estrella allí es el reconocimiento que cuenta.`,
  },
  ko: {
    siteName: 'Document Editor',
    langAria: '언어',
    themeLabel: '테마',
    home: '홈',
    openEditor: '편집기 열기',
    onThisPage: '이 페이지의 목차',
    more: '관련 페이지',
    sideNote: '기기에서 실행됩니다. 업로드 없음, 가입 불필요.',
    footer: [
      ['/ko/', '편집기 열기'],
      ['/ko/help', '도움말'],
      ['/ko/changelog', '변경 내역'],
      ['/ko/about', '소개'],
      ['/ko/contact', '문의'],
      ['/ko/open/docx', 'DOCX 열기'],
      ['/ko/open/xlsx', 'XLSX 열기'],
      ['/ko/open/pptx', 'PPTX 열기'],
      ['/ko/open/pdf', 'PDF 열기'],
      ['/ko/convert/xlsx-to-csv', 'XLSX를 CSV로'],
      ['/ko/convert/csv-to-xlsx', 'CSV를 XLSX로'],
      ['/ko/no-signup-document-editor', '가입 불필요'],
      ['/ko/private-document-editor', '개인정보'],
      ['/ko/offline-document-editor', '오프라인'],
      ['/ko/edit-documents-without-account', '계정 불필요'],
      ['/ko/embed-document-editor', 'Embed API'],
    ],
    generatedNote: (src) => `출처: 저장소의 ${src}`,
    ossNote: `<strong>오픈 소스이며 직접 호스팅할 수 있습니다.</strong> AGPL-3.0으로 공개되어 있어, 아무것도 업로드되지 않는다는 것을 직접 확인하거나 직접 운영할 수 있습니다: <a href="${REPO}" rel="noopener">github.com/InledGroup/newoffice</a>.`,
    trademark: `ONLYOFFICE는 Ascensio System SIA의 상표입니다. 이 사이트는 공식 ONLYOFFICE 제품이 아니며 Ascensio System SIA와 제휴하거나 후원받지 않았습니다.`,
    // Two debts, stated separately: who built the editors, and the
    // project this one forked from. Both get the ask, because a star
    // is the only currency an AGPL project actually has.
    vendorCredit: `문서 편집기는 Ascensio System SIA의 <a href="${VENDOR_REPO}" rel="noopener" target="_blank">ONLYOFFICE</a>입니다. 유용했다면 그들의 저장소에 스타를 남겨 주세요.`,
    upstreamCredit: `이 사이트는 처음 시작된 프로젝트 <a href="${UPSTREAM_REPO}" rel="noopener" target="_blank">ranuts/document</a>의 포크입니다. 그곳의 스타가 가장 큰 힘이 됩니다.`,
  },
  pt: {
    siteName: 'Document Editor',
    langAria: 'Idioma',
    themeLabel: 'Tema',
    home: 'Início',
    openEditor: 'Abrir o editor',
    onThisPage: 'Nesta página',
    more: 'Páginas relacionadas',
    sideNote: 'Roda no seu dispositivo. Sem uploads, sem cadastro.',
    footer: [
      ['/pt/', 'Abrir o editor'],
      ['/pt/help', 'Ajuda'],
      ['/pt/changelog', 'Novidades'],
      ['/pt/about', 'Sobre'],
      ['/pt/contact', 'Contato'],
      ['/pt/open/docx', 'Abrir DOCX'],
      ['/pt/open/xlsx', 'Abrir XLSX'],
      ['/pt/open/pptx', 'Abrir PPTX'],
      ['/pt/open/pdf', 'Abrir PDF'],
      ['/pt/convert/xlsx-to-csv', 'XLSX para CSV'],
      ['/pt/convert/csv-to-xlsx', 'CSV para XLSX'],
      ['/pt/no-signup-document-editor', 'Sem cadastro'],
      ['/pt/private-document-editor', 'Privacidade'],
      ['/pt/offline-document-editor', 'Offline'],
      ['/pt/edit-documents-without-account', 'Sem conta'],
      ['/pt/embed-document-editor', 'Embed API'],
    ],
    generatedNote: (src) => `Fonte: ${src} no repositório`,
    ossNote: `<strong>Código aberto e auto-hospedável.</strong> Sob a AGPL-3.0 — confira você mesmo que nada é enviado, ou rode a sua própria cópia: <a href="${REPO}" rel="noopener">github.com/InledGroup/newoffice</a>.`,
    trademark: `ONLYOFFICE é uma marca da Ascensio System SIA. Este site não é um produto oficial do ONLYOFFICE nem tem afiliação ou endosso da Ascensio System SIA.`,
    // Two debts, stated separately: who built the editors, and the
    // project this one forked from. Both get the ask, because a star
    // is the only currency an AGPL project actually has.
    vendorCredit: `Os editores de documentos são o <a href="${VENDOR_REPO}" rel="noopener" target="_blank">ONLYOFFICE</a>, da Ascensio System SIA. Se te forem úteis, deixa uma estrela no repositório deles.`,
    upstreamCredit: `Este site é um fork do <a href="${UPSTREAM_REPO}" rel="noopener" target="_blank">ranuts/document</a>, o projeto de onde nasceu. Uma estrela lá é o reconhecimento que conta.`,
  },
};

/**
 * Pages to generate. `sources` may point at any markdown file in the repo;
 * frontmatter (title / description / eyebrow / breadcrumb) is optional and
 * can be overridden per locale in `meta`. When a locale has no source of its
 * own it may reuse another (e.g. the changelog is maintained in English only)
 * -- `notice` is then rendered above the body.
 */
/**
 * Landing-page slugs, in the order they were written. The list is explicit
 * rather than a directory scan so a stray markdown file cannot quietly become
 * a public page, and so the order the sitemap and llms.txt see is stable.
 */
