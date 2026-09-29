#!/usr/bin/env node
// Fill the InSuite landing sections into every content/<locale>/home.json.
//
// en and es carry the reference site's wording (taken from its message
// catalogs); the other five locales reuse the English text, because only
// Spanish and English are being done. Slots must be identical in every
// locale (test/unit/landing-pages.test.ts), and no string may be blank.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './pages/constants.mjs';

const EN = {
  hero: {
    beta: 'Beta',
    h1: 'The free, open Office',
    sub: 'Total privacy without installations. Open, edit and save your documents directly in your browser. Your files never leave your computer.',
    start: 'Start using for free',
    open: 'Open a file',
    noSignup: 'No sign-up required',
    free: 'Free',
    wordCompatible: 'Fully compatible with Word',
    tryIt: 'Try it!',
    tabs: ['Word', 'Excel', 'PowerPoint'],
    noteLead: 'Interact with the editor. It is a',
    noteStrong: 'real instance',
    noteTail: 'running 100% in your browser via WebAssembly.',
    selection: 'Everything you type stays on this device.',
    openCta: 'Open the real editor',
  },
  features: {
    h2: 'Why choose InSuite?',
    sub: 'Because it is made thinking of you, not for profit. Because it is free, private and made in Spain.',
    items: [
      {
        icon: 'flag',
        title: 'Made in Spain',
        desc: 'The free, no-install, free of charge and 100% compatible office created in Spain for Spain.',
      },
      {
        icon: 'shield',
        title: '100% Private',
        desc: 'Nothing is uploaded to the server. Everything stays in your browser. We comply with the strictest European and Spanish privacy regulations by not collecting a single piece of data.',
      },
      {
        icon: 'cloud',
        title: 'No installation needed',
        desc: 'Everything works in the browser, you only need a file explorer to upload documents and a browser to use the editor.',
      },
    ],
  },
  editors: {
    h2: 'Professional Tools',
    sub: 'Powerful desktop editors, now in your browser. 100% compatible with your usual files.',
    items: [
      {
        name: 'Documents',
        desc: 'Compatible with .docx. The same power as Microsoft Word, but a thousand times better than Google Docs.',
      },
      {
        name: 'Spreadsheets',
        desc: 'Compatible with .xlsx. Realize complex analysis and formulas with total compatibility.',
      },
      {
        name: 'Presentations',
        desc: 'Compatible with .pptx. Create impactful slides directly in your browser.',
      },
    ],
    plugins: {
      name: 'Plugins',
      desc: 'Translation, local AI, spell check and more. Customize your office with our catalog.',
    },
  },
  comparison: {
    h2: 'Honest Comparison',
    sub: 'The best way for you to see why InSuite is the best option is by comparing it with the rest of the options in the market.',
    cols: ['Suite', 'Privacy', 'Auditable', 'Compatibility', 'No Install', 'Price', 'Key Differences'],
    local: 'Local',
    free: 'Free',
    rows: [
      {
        name: 'InSuite',
        logo: '/img/64.png',
        privacy: 'Local',
        auditable: true,
        comp: 5,
        install: false,
        price: 'Free',
        diff: 'Supports Export PDF, IndexedDB',
        featured: true,
      },
      {
        name: 'Ziziyi Office',
        logo: 'https://hosted.inled.es/ziziyi-office-insuite.png',
        privacy: 'Local',
        auditable: true,
        comp: 5,
        install: false,
        price: 'Freemium',
        diff: 'Cannot export to PDF. No browser saving.',
        featured: false,
      },
      {
        name: 'OnlyOffice',
        logo: 'https://hosted.inled.es/onlyoffice-insuite.png',
        privacy: 'Cloud',
        auditable: false,
        comp: 5,
        install: true,
        price: 'Freemium',
        diff: 'Certain components are not auditable.',
        featured: false,
      },
      {
        name: 'LibreOffice',
        logo: 'https://hosted.inled.es/libreoffice-insuite.png',
        privacy: 'Local',
        auditable: true,
        comp: 3,
        install: true,
        price: 'Free',
        diff: 'Paltry interface, installation needed, low compatibility',
        featured: false,
      },
      {
        name: 'MS Office',
        logo: 'https://hosted.inled.es/microslop-insuite.png',
        privacy: 'Low (Cloud)',
        auditable: false,
        comp: 5,
        install: true,
        price: 'Subscription',
        diff: 'Proprietary, expensive, data spying',
        featured: false,
      },
    ],
  },
  cta: {
    h2: "It's time, you decide.",
    sub: "Don't let your data stay in storage, be charged for simply editing documents, be forced to install something or be made to go through foreign countries' regulations.",
    start: 'Start Now',
    code: 'Review the code',
    note: 'By using InSuite, you are using free, private and Spanish software',
  },
  about: {
    h2: 'About Inled Group',
    p: 'Inled Group is a software brand focused on privacy, Spanish technological sovereignty and local AI. We use free technologies, AI agents to develop and we are fans of Linux.',
    stats: [
      { value: '100%', label: 'Private' },
      { value: 'Libre', label: 'Free Open Source' },
      { value: 'ES', label: 'Made in Spain' },
    ],
  },
};

const ES = {
  hero: {
    beta: 'Beta',
    h1: 'El Office gratuito y abierto',
    sub: 'Privacidad total sin instalaciones. Abre, edita y guarda tus documentos directamente en el navegador. Tus archivos nunca abandonan tu ordenador.',
    start: 'Empezar a usar gratis',
    open: 'Abrir un archivo',
    noSignup: 'Sin necesidad de registrarse',
    free: 'Gratis',
    wordCompatible: 'Totalmente compatible con Word',
    tryIt: '¡Pruébalo!',
    tabs: ['Word', 'Excel', 'PowerPoint'],
    noteLead: 'Interactúa con el editor. Es una',
    noteStrong: 'instancia real',
    noteTail: 'ejecutándose 100% en tu navegador vía WebAssembly.',
    selection: 'Todo lo que escribas se queda en este equipo.',
    openCta: 'Abrir el editor real',
  },
  features: {
    h2: '¿Por qué elegir InSuite?',
    sub: 'Porque está hecho pensando en tí, no en sacar rédito económico. Porque es libre, privado y está hecho en España.',
    items: [
      {
        icon: 'flag',
        title: 'Made in Spain',
        desc: 'El office libre, sin instalación, gratuito y 100% compatible que ha sido creado en España para España.',
      },
      {
        icon: 'shield',
        title: 'Privado 100%',
        desc: 'Nada se sube al servidor. Todo se queda en tu navegador. Cumplimos con las normativas de privacidad europeas y españolas más estrictas al no recoger ni un solo dato.',
      },
      {
        icon: 'cloud',
        title: 'Sin instalar nada',
        desc: 'Todo funciona en el navegador, no necesitas más que un explorador de archivos con el que subir documentos y un navegador para usar el editor.',
      },
    ],
  },
  editors: {
    h2: 'Herramientas Profesionales',
    sub: 'Editores de escritorio potentes, ahora en tu navegador. 100% compatibles con tus archivos de siempre.',
    items: [
      {
        name: 'Documentos',
        desc: 'Compatible con .docx. La misma potencia que Microsoft Word, pero mil veces mejor que Google Docs.',
      },
      {
        name: 'Hojas de Cálculo',
        desc: 'Compatible con .xlsx. Realiza análisis complejos y fórmulas con total compatibilidad.',
      },
      {
        name: 'Presentaciones',
        desc: 'Compatible con .pptx. Crea slides impactantes directamente en tu navegador.',
      },
    ],
    plugins: {
      name: 'Plugins',
      desc: 'Traducción, IA local, corrección ortográfica y más. Personaliza tu oficina con nuestro catálogo.',
    },
  },
  comparison: {
    h2: 'Comparativa honesta',
    sub: 'La mejor forma de que veas por qué InSuite es la mejor opción es comparándolo con el resto de opciones del mercado.',
    cols: ['Suite', 'Privacidad', 'Auditable', 'Compatibilidad', 'Sin Instalar', 'Precio', 'Diferencias clave'],
    local: 'Local',
    free: 'Gratis',
    rows: [
      {
        name: 'InSuite',
        logo: '/img/64.png',
        privacy: 'Local',
        auditable: true,
        comp: 5,
        install: false,
        price: 'Gratis',
        diff: 'Soporta Export PDF, IndexedDB',
        featured: true,
      },
      {
        name: 'Ziziyi Office',
        logo: 'https://hosted.inled.es/ziziyi-office-insuite.png',
        privacy: 'Local',
        auditable: true,
        comp: 5,
        install: false,
        price: 'Freemium',
        diff: 'No puedes exportar a PDF. Sin guardado en navegador.',
        featured: false,
      },
      {
        name: 'OnlyOffice',
        logo: 'https://hosted.inled.es/onlyoffice-insuite.png',
        privacy: 'Almacenamiento',
        auditable: false,
        comp: 5,
        install: true,
        price: 'Freemium',
        diff: 'Ciertos componentes no son auditables.',
        featured: false,
      },
      {
        name: 'LibreOffice',
        logo: 'https://hosted.inled.es/libreoffice-insuite.png',
        privacy: 'Local',
        auditable: true,
        comp: 3,
        install: true,
        price: 'Gratis',
        diff: 'Interfaz pésima, necesidad de instalación, baja compatibilidad',
        featured: false,
      },
      {
        name: 'MS Office',
        logo: 'https://hosted.inled.es/microslop-insuite.png',
        privacy: 'Baja (Nube)',
        auditable: false,
        comp: 5,
        install: true,
        price: 'Suscripción',
        diff: 'Propietario, caro, espionaje de datos',
        featured: false,
      },
    ],
  },
  cta: {
    h2: 'Es el momento, tú decides.',
    sub: 'No permitas que tus datos se queden en el almacenamiento, que te cobren por simplemente editar documentos, que te obliguen a instalar algo o que te hagan pasar por regulaciones de países extranjeros.',
    start: 'Empezar ahora',
    code: 'Revisa el código',
    note: 'Al usar InSuite, estás usando software libre, privado y español',
  },
  about: {
    h2: 'Acerca de Inled Group',
    p: 'Inled Group es una marca de software enfocada en la privacidad, la soberanía tecnológica Española y la IA local. Usamos tecnologías libres, agentes de IA para desarrollar y somos fans de Linux.',
    stats: [
      { value: '100%', label: 'Privado' },
      { value: 'Libre', label: 'Libre Open Source' },
      { value: 'ES', label: 'Made in Spain' },
    ],
  },
};

/** Slots the InSuite landing does not carry any more. Their strings are gone. */
const REMOVED = ['chip', 'h1', 'sub', 'cta', 'trust', 'docwin'];

for (const locale of ['en', 'es', 'de', 'ja', 'ko', 'pt', 'zh-CN']) {
  const path = resolve(ROOT, `content/${locale}/home.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  for (const key of REMOVED) delete data[key];
  if (data.sections) {
    delete data.sections.pillars;
    delete data.sections.steps;
  }
  const fill = locale === 'es' ? ES : EN;
  Object.assign(data, structuredClone(fill));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  ${locale}`);
}

export { EN };
