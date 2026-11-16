import { t } from '@ranuts/shared/i18n';
import { onCreateNew, onOpenDocument } from './document';
import { showLoading } from './loading';
import { prefetchOnIntent, type EditorKind } from './prefetch';

/**
 * The editor route's home state.
 *
 * A document is what this page is for, so most visits open one and never see
 * this. It is what is left on screen when there is nothing to show: the URL
 * named a document that failed, or the user closed one. Four actions, in the
 * same order and with the same labels as the app's home page, so the two entry
 * points do not read as different products.
 *
 * Hidden rather than removed, and hidden before the document mounts: an empty
 * panel painted over a loading document is the flash this guards against.
 */

let panel: HTMLElement | null = null;

const getPanel = (): HTMLElement => (panel ??= buildPanel());

const action = (id: string, label: string, onClick: () => void): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = 'control-panel-button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

function buildPanel(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'control-panel-container';
  container.className = 'control-panel-container';

  const group = document.createElement('div');
  group.className = 'control-panel-button-group';

  const upload = action('upload-button', t('uploadDocument'), () => onOpenDocument());
  prefetchOnIntent(upload);

  const create = (id: string, label: string, kind: EditorKind): HTMLButtonElement => {
    const button = action(id, label, () => {
      hideControlPanel();
      const { removeLoading } = showLoading();
      void onCreateNew(`.${kind}`)
        .catch((error: unknown) => {
          console.error(`Error creating new document (.${kind}):`, error);
          showControlPanel();
        })
        .finally(removeLoading);
    });
    // Hovering "New" is intent: start pulling that engine now.
    prefetchOnIntent(button, kind);
    return button;
  };

  group.append(
    upload,
    create('new-word-button', t('newWord'), 'docx'),
    create('new-excel-button', t('newExcel'), 'xlsx'),
    create('new-pptx-button', t('newPowerPoint'), 'pptx'),
  );
  container.appendChild(group);
  document.body.appendChild(container);
  return container;
}

/** A document is taking over the screen. */
export const hideControlPanel = (): void => {
  const element = getPanel();
  element.hidden = true;
};

/** Back to the empty state. */
export const showControlPanel = (): void => {
  const element = getPanel();
  element.hidden = false;
  // Whatever the URL said it would open did not happen (or was closed): the
  // panel is the home state again, so the flag that keeps it off the loading
  // screen has to go.
  document.body.classList.remove('opening-document');
};

export const createControlPanel = (): void => {
  getPanel();
};
