/**
 * The site's own copy, in the languages the marketing pages are served in.
 *
 * Kept apart from @ranuts/shared/i18n on purpose. That table is the app's UI
 * (toasts, dialogs, the editor shell) and it is complete in seven languages;
 * these pages need four, one per URL, and the page has to be readable before
 * any script runs -- so the text is chosen at build time from the route, not by
 * rewriting the DOM after paint.
 *
 * Adding a language here means adding one entry below and one route under
 * src/pages/[locale]/, and the language menu picks it up from SITE_LOCALES.
 */

export const SITE_LOCALES = ['en', 'es', 'fr', 'it'] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];
export const DEFAULT_LOCALE: SiteLocale = 'en';

/** The endonym, because a language menu is read in each language. */
export const LOCALE_NAMES: Record<SiteLocale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
};

/** `https://office.inled.es` plus the locale's prefix; English is the root. */
export function localePrefix(locale: SiteLocale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/** The landing page for a language: `/`, `/es`, `/fr`, `/it`. */
export function landingPath(locale: SiteLocale): string {
  return localePrefix(locale) || '/';
}

/** The app home for a language: `/home`, `/es/home`, ... */
export function homePath(locale: SiteLocale): string {
  return `${localePrefix(locale)}/home`;
}

/**
 * An editor URL that opens in the page's language.
 *
 * The editor resolves `?locale=` first, so a French landing page hands the
 * visitor a French editor toolbar even though the page's route has no query of
 * its own. English is the default and stays unadorned.
 */
export function editorPath(path: string, locale: SiteLocale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return `${path}${path.includes('?') ? '&' : '?'}locale=${locale}`;
}

export function isSiteLocale(value: string | undefined): value is SiteLocale {
  return !!value && (SITE_LOCALES as readonly string[]).includes(value);
}

export interface SiteCopy {
  /** `<html lang>`, the Open Graph locale and the hreflang prefix. */
  htmlLang: string;
  meta: { landingTitle: string; landingDescription: string; homeTitle: string };
  nav: { home: string; saved: string; github: string; openApp: string; newDoc: string };
  landing: {
    heroTitle: string;
    heroLede: string;
    openFile: string;
    goEditors: string;
    savedDocs: string;
    recentLabel: string;
    startTitle: string;
    startSub: string;
    products: {
      word: string;
      wordHint: string;
      excel: string;
      excelHint: string;
      powerpoint: string;
      powerpointHint: string;
      forms: string;
      formsHint: string;
      pdf: string;
      pdfHint: string;
    };
    whyTitle: string;
    why: Array<{ title: string; body: string }>;
    recoverTitle: string;
    recoverBody: string;
    recoverCta: string;
  };
  home: {
    title: string;
    upload: string;
    newTitle: string;
    recentTitle: string;
    savedDocs: string;
    /** The rail's create-or-upload menu. */
    pickerLabel: string;
    pickerCreate: string;
    pickerUpload: string;
    document: string;
    spreadsheet: string;
    presentation: string;
    forms: string;
    formsHint: string;
    pdf: string;
    pdfHint: string;
  };
  footer: { tagline: string };
}

const en: SiteCopy = {
  htmlLang: 'en',
  meta: {
    landingTitle: 'Insuite Office — edit Word, Excel and PowerPoint in your browser',
    landingDescription:
      'Open, edit and save Word, Excel and PowerPoint files directly in your browser. No installation, no account, and the file never leaves your computer.',
    homeTitle: 'Home — Insuite Office',
  },
  nav: { home: 'Home', saved: 'Saved documents', github: 'GitHub', openApp: 'Open the app', newDoc: 'New document' },
  landing: {
    heroTitle: 'Your Office, in the browser.',
    heroLede:
      'Open, edit and save Word, Excel and PowerPoint files without installing anything. The document is read and written on your own device — there is no server to send it to.',
    openFile: 'Open a file',
    goEditors: 'Go to the editors',
    savedDocs: 'Saved documents',
    recentLabel: 'Continue editing',
    startTitle: 'Start something',
    startSub: 'A blank document, or one of your own.',
    products: {
      word: 'Word',
      wordHint: 'Documents · .docx',
      excel: 'Excel',
      excelHint: 'Spreadsheets · .xlsx',
      powerpoint: 'PowerPoint',
      powerpointHint: 'Presentations · .pptx',
      forms: 'Forms',
      formsHint: 'Surveys · forms.inled.es',
      pdf: 'PDF',
      pdfHint: 'Read, annotate, save',
    },
    whyTitle: 'Why it is built this way',
    why: [
      {
        title: 'Your files stay yours',
        body: 'Everything runs in this tab. Open the network panel while you edit: there is no upload, no telemetry and no account to tie a document to.',
      },
      {
        title: 'Nothing to install',
        body: 'A browser is the whole requirement. It also installs as an app and keeps working with no connection.',
      },
      {
        title: 'Real Office files',
        body: 'Word, Excel, PowerPoint, CSV and PDF, opened by the ONLYOFFICE engine compiled to WebAssembly — the same formatting, tables and formulas.',
      },
    ],
    recoverTitle: 'Come back to your work',
    recoverBody:
      'Edits are kept in this browser as you work, so a closed tab is not a lost document. The copies never leave the device and are removed when you delete them.',
    recoverCta: 'See saved documents',
  },
  home: {
    title: 'Start',
    upload: 'Upload',
    newTitle: 'New',
    recentTitle: 'Recent',
    savedDocs: 'Saved documents',
    pickerLabel: 'Create or upload',
    pickerCreate: 'Create new',
    pickerUpload: 'Upload a file',
    document: 'Document',
    spreadsheet: 'Spreadsheet',
    presentation: 'Presentation',
    forms: 'Forms',
    formsHint: 'Surveys · forms.inled.es',
    pdf: 'PDF',
    pdfHint: 'Open a file',
  },
  footer: { tagline: 'runs entirely on your device' },
};

const es: SiteCopy = {
  htmlLang: 'es',
  meta: {
    landingTitle: 'Insuite Office — edita Word, Excel y PowerPoint en el navegador',
    landingDescription:
      'Abre, edita y guarda archivos de Word, Excel y PowerPoint directamente en tu navegador. Sin instalación, sin cuenta y sin que el archivo salga de tu ordenador.',
    homeTitle: 'Inicio — Insuite Office',
  },
  nav: {
    home: 'Inicio',
    saved: 'Documentos guardados',
    github: 'GitHub',
    openApp: 'Abrir la app',
    newDoc: 'Nuevo documento',
  },
  landing: {
    heroTitle: 'Tu Office, en el navegador.',
    heroLede:
      'Abre, edita y guarda archivos de Word, Excel y PowerPoint sin instalar nada. El documento se lee y se escribe en tu propio dispositivo: no hay ningún servidor al que enviarlo.',
    openFile: 'Abrir un archivo',
    goEditors: 'Ir a los editores',
    savedDocs: 'Documentos guardados',
    recentLabel: 'Seguir editando',
    startTitle: 'Empieza algo',
    startSub: 'Un documento en blanco, o uno de los tuyos.',
    products: {
      word: 'Word',
      wordHint: 'Documentos · .docx',
      excel: 'Excel',
      excelHint: 'Hojas de cálculo · .xlsx',
      powerpoint: 'PowerPoint',
      powerpointHint: 'Presentaciones · .pptx',
      forms: 'Forms',
      formsHint: 'Encuestas · forms.inled.es',
      pdf: 'PDF',
      pdfHint: 'Leer, anotar, guardar',
    },
    whyTitle: 'Por qué está hecho así',
    why: [
      {
        title: 'Tus archivos siguen siendo tuyos',
        body: 'Todo ocurre en esta pestaña. Abre el panel de red mientras editas: no hay subida, ni telemetría, ni una cuenta que ate un documento a tu nombre.',
      },
      {
        title: 'Nada que instalar',
        body: 'Con un navegador basta. Además se instala como aplicación y sigue funcionando sin conexión.',
      },
      {
        title: 'Archivos de Office de verdad',
        body: 'Word, Excel, PowerPoint, CSV y PDF, abiertos por el motor de ONLYOFFICE compilado a WebAssembly: el mismo formato, las mismas tablas y las mismas fórmulas.',
      },
    ],
    recoverTitle: 'Vuelve a tu trabajo',
    recoverBody:
      'Los cambios se guardan en este navegador mientras trabajas, así que cerrar una pestaña no es perder el documento. Las copias no salen del dispositivo y se borran cuando tú las borras.',
    recoverCta: 'Ver documentos guardados',
  },
  home: {
    title: 'Empezar',
    upload: 'Subir',
    newTitle: 'Nuevo',
    recentTitle: 'Reciente',
    savedDocs: 'Documentos guardados',
    pickerLabel: 'Crear o subir',
    pickerCreate: 'Crear nuevo',
    pickerUpload: 'Subir un archivo',
    document: 'Documento',
    spreadsheet: 'Hoja de cálculo',
    presentation: 'Presentación',
    forms: 'Forms',
    formsHint: 'Encuestas · forms.inled.es',
    pdf: 'PDF',
    pdfHint: 'Abrir un archivo',
  },
  footer: { tagline: 'todo ocurre en tu dispositivo' },
};

const fr: SiteCopy = {
  htmlLang: 'fr',
  meta: {
    landingTitle: 'Insuite Office — modifiez Word, Excel et PowerPoint dans le navigateur',
    landingDescription:
      'Ouvrez, modifiez et enregistrez des fichiers Word, Excel et PowerPoint directement dans votre navigateur. Sans installation, sans compte, et le fichier ne quitte jamais votre ordinateur.',
    homeTitle: 'Accueil — Insuite Office',
  },
  nav: {
    home: 'Accueil',
    saved: 'Documents enregistrés',
    github: 'GitHub',
    openApp: "Ouvrir l'application",
    newDoc: 'Nouveau document',
  },
  landing: {
    heroTitle: 'Votre Office, dans le navigateur.',
    heroLede:
      "Ouvrez, modifiez et enregistrez des fichiers Word, Excel et PowerPoint sans rien installer. Le document est lu et écrit sur votre propre appareil : il n'y a aucun serveur auquel l'envoyer.",
    openFile: 'Ouvrir un fichier',
    goEditors: 'Aller aux éditeurs',
    savedDocs: 'Documents enregistrés',
    recentLabel: 'Reprendre la modification',
    startTitle: 'Commencez quelque chose',
    startSub: 'Un document vierge, ou l’un des vôtres.',
    products: {
      word: 'Word',
      wordHint: 'Documents · .docx',
      excel: 'Excel',
      excelHint: 'Feuilles de calcul · .xlsx',
      powerpoint: 'PowerPoint',
      powerpointHint: 'Présentations · .pptx',
      forms: 'Forms',
      formsHint: 'Sondages · forms.inled.es',
      pdf: 'PDF',
      pdfHint: 'Lire, annoter, enregistrer',
    },
    whyTitle: 'Pourquoi c’est conçu ainsi',
    why: [
      {
        title: 'Vos fichiers restent les vôtres',
        body: 'Tout se passe dans cet onglet. Ouvrez le panneau réseau pendant que vous modifiez : aucun envoi, aucune télémétrie, aucun compte auquel rattacher un document.',
      },
      {
        title: 'Rien à installer',
        body: "Un navigateur suffit. Le site s'installe aussi comme application et continue de fonctionner hors connexion.",
      },
      {
        title: 'De vrais fichiers Office',
        body: 'Word, Excel, PowerPoint, CSV et PDF, ouverts par le moteur ONLYOFFICE compilé en WebAssembly : la même mise en forme, les mêmes tableaux et les mêmes formules.',
      },
    ],
    recoverTitle: 'Revenez à votre travail',
    recoverBody:
      'Les modifications sont conservées dans ce navigateur pendant que vous travaillez : un onglet fermé n’est donc pas un document perdu. Les copies ne quittent jamais l’appareil et disparaissent quand vous les supprimez.',
    recoverCta: 'Voir les documents enregistrés',
  },
  home: {
    title: 'Démarrer',
    upload: 'Importer',
    newTitle: 'Nouveau',
    recentTitle: 'Récents',
    savedDocs: 'Documents enregistrés',
    pickerLabel: 'Créer ou importer',
    pickerCreate: 'Créer',
    pickerUpload: 'Importer un fichier',
    document: 'Document',
    spreadsheet: 'Feuille de calcul',
    presentation: 'Présentation',
    forms: 'Forms',
    formsHint: 'Sondages · forms.inled.es',
    pdf: 'PDF',
    pdfHint: 'Ouvrir un fichier',
  },
  footer: { tagline: 'tout se passe sur votre appareil' },
};

const it: SiteCopy = {
  htmlLang: 'it',
  meta: {
    landingTitle: 'Insuite Office — modifica Word, Excel e PowerPoint nel browser',
    landingDescription:
      'Apri, modifica e salva file Word, Excel e PowerPoint direttamente nel browser. Nessuna installazione, nessun account e il file non lascia mai il tuo computer.',
    homeTitle: 'Home — Insuite Office',
  },
  nav: { home: 'Home', saved: 'Documenti salvati', github: 'GitHub', openApp: "Apri l'app", newDoc: 'Nuovo documento' },
  landing: {
    heroTitle: 'Il tuo Office, nel browser.',
    heroLede:
      'Apri, modifica e salva file Word, Excel e PowerPoint senza installare nulla. Il documento viene letto e scritto sul tuo dispositivo: non c’è nessun server a cui inviarlo.',
    openFile: 'Apri un file',
    goEditors: 'Vai agli editor',
    savedDocs: 'Documenti salvati',
    recentLabel: 'Riprendi la modifica',
    startTitle: 'Inizia qualcosa',
    startSub: 'Un documento vuoto, o uno dei tuoi.',
    products: {
      word: 'Word',
      wordHint: 'Documenti · .docx',
      excel: 'Excel',
      excelHint: 'Fogli di calcolo · .xlsx',
      powerpoint: 'PowerPoint',
      powerpointHint: 'Presentazioni · .pptx',
      forms: 'Forms',
      formsHint: 'Sondaggi · forms.inled.es',
      pdf: 'PDF',
      pdfHint: 'Leggi, annota, salva',
    },
    whyTitle: 'Perché è fatto così',
    why: [
      {
        title: 'I tuoi file restano tuoi',
        body: 'Tutto avviene in questa scheda. Apri il pannello di rete mentre modifichi: nessun caricamento, nessuna telemetria e nessun account a cui legare un documento.',
      },
      {
        title: 'Niente da installare',
        body: 'Basta un browser. Si installa anche come applicazione e continua a funzionare senza connessione.',
      },
      {
        title: 'Veri file Office',
        body: 'Word, Excel, PowerPoint, CSV e PDF, aperti dal motore ONLYOFFICE compilato in WebAssembly: la stessa formattazione, le stesse tabelle e le stesse formule.',
      },
    ],
    recoverTitle: 'Torna al tuo lavoro',
    recoverBody:
      'Le modifiche restano in questo browser mentre lavori, quindi una scheda chiusa non è un documento perso. Le copie non lasciano il dispositivo e spariscono quando le elimini.',
    recoverCta: 'Vedi i documenti salvati',
  },
  home: {
    title: 'Inizia',
    upload: 'Carica',
    newTitle: 'Nuovo',
    recentTitle: 'Recenti',
    savedDocs: 'Documenti salvati',
    pickerLabel: 'Crea o carica',
    pickerCreate: 'Crea nuovo',
    pickerUpload: 'Carica un file',
    document: 'Documento',
    spreadsheet: 'Foglio di calcolo',
    presentation: 'Presentazione',
    forms: 'Forms',
    formsHint: 'Sondaggi · forms.inled.es',
    pdf: 'PDF',
    pdfHint: 'Apri un file',
  },
  footer: { tagline: 'tutto avviene sul tuo dispositivo' },
};

export const SITE_COPY: Record<SiteLocale, SiteCopy> = { en, es, fr, it };

/** The origin every canonical and alternate link is written against. */
export const SITE_ORIGIN = 'https://office.inled.es';

/**
 * `<link rel="alternate" hreflang>` for one family of routes.
 *
 * Every language links to every other, itself included: an alternate set that
 * omits the page you are on is how a search engine decides the pages are not
 * translations of each other.
 */
export function alternateLinks(kind: 'landing' | 'home'): string {
  const path = (locale: SiteLocale): string => (kind === 'landing' ? landingPath(locale) : homePath(locale));
  const lines = SITE_LOCALES.map(
    (locale) => `<link rel="alternate" hreflang="${locale}" href="${SITE_ORIGIN}${path(locale)}" />`,
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${path(DEFAULT_LOCALE)}" />`);
  return lines.join('\n    ');
}
