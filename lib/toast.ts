/**
 * Toasts.
 *
 * Four verbs, one look, no component library: a small card in the corner that
 * says what happened and leaves on its own. The API is deliberately the shape
 * the app already spoke -- `window.message.success(...)` -- because that call
 * is made from the editor bridge, the save path and the converter, and a toast
 * utility that forced every one of them to import a module would be a worse
 * trade than a global with four members.
 *
 * Errors stay longer than confirmations: a message you have to read twice is
 * gone too soon at the speed of a confirmation.
 */
type ToastKind = 'success' | 'error' | 'info' | 'warning';

const LIFETIME_MS: Record<ToastKind, number> = {
  success: 3200,
  info: 3600,
  warning: 6000,
  error: 7000,
};

const MAX_VISIBLE = 3;

/** One toast element is on screen at a time per kind; newer text replaces it. */
const showing = new Map<ToastKind, HTMLElement>();

function notify(kind: ToastKind, text: string): void {
  if (typeof document === 'undefined' || !text) return;

  showing.get(kind)?.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${kind}${kind === 'error' ? ' is-error' : ''}`;
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.textContent = text;
  document.body.appendChild(toast);
  showing.set(kind, toast);

  // A stack of old errors is noise, and noise is what makes a real one
  // invisible. Keep the newest few and drop the rest.
  const all = [...document.querySelectorAll<HTMLElement>('.toast')];
  for (const stale of all.slice(0, Math.max(0, all.length - MAX_VISIBLE))) stale.remove();

  window.setTimeout(() => {
    toast.remove();
    if (showing.get(kind) === toast) showing.delete(kind);
  }, LIFETIME_MS[kind]);
}

declare global {
  interface Window {
    message?: Record<ToastKind, (text: string) => void>;
  }
}

window.message = {
  success: (text) => notify('success', text),
  error: (text) => notify('error', text),
  info: (text) => notify('info', text),
  warning: (text) => notify('warning', text),
};

export { notify };
