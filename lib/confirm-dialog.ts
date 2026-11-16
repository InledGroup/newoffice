/**
 * A confirmation dialog.
 *
 * The native `<dialog>` element, in the site's own colours: it is modal to the
 * page inside the document instead of to the whole tab, Escape closes it for
 * free, focus is trapped by the platform, and dismissing it can never be
 * mistaken for a yes.
 *
 * Resolves true only when the confirm button (or the form's submit) is used;
 * cancel, Escape and a click on the backdrop are all false.
 */
import '../styles/confirm-dialog.css';

export interface ConfirmOptions {
  title: string;
  body: string;
  /** Label of the confirming action, e.g. "Delete". */
  confirmLabel: string;
  cancelLabel: string;
  /** Marks the confirming action as destructive. */
  danger?: boolean;
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';

    const heading = document.createElement('h2');
    heading.className = 'confirm-title';
    heading.textContent = options.title;

    const body = document.createElement('p');
    body.className = 'confirm-body';
    body.textContent = options.body;

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn confirm-cancel';
    cancel.textContent = options.cancelLabel;

    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = `btn ${options.danger ? 'btn-danger' : 'btn-primary'} confirm-ok`;
    confirm.textContent = options.confirmLabel;
    // The confirming action starts focused for a harmless prompt, but a
    // destructive one starts on Cancel: a stray Enter must not delete anything.
    if (!options.danger) confirm.autofocus = true;
    else cancel.autofocus = true;

    let settled = false;
    const finish = (confirmed: boolean): void => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      resolve(confirmed);
    };

    cancel.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });
    // A click on the backdrop lands on the dialog itself, never on its content.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) finish(false);
    });

    actions.append(cancel, confirm);
    dialog.append(heading, body, actions);
    document.body.appendChild(dialog);
    dialog.showModal();
  });
}
