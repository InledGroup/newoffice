import './toast';

/**
 * The full-screen loading overlay.
 *
 * A document that takes a few seconds to arrive needs something on screen that
 * says so, or the click reads as ignored. The visuals are `.loading-mask` in
 * styles/base.css -- a light surface with a spinner, in the same palette as the
 * rest of the app.
 */
export const showLoading = (): { removeLoading: () => void } => {
  const mask = document.createElement('div');
  mask.className = 'loading-mask';
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  mask.appendChild(spinner);
  document.body.appendChild(mask);
  return {
    removeLoading: () => {
      mask.remove();
    },
  };
};
