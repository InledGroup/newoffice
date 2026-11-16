/**
 * The chat component's whole DOM abstraction: a tag, its attributes, its
 * children. It lives in the package rather than being imported from the app so
 * that @ranuts/chat-ui has no dependency on the host's layout or design system.
 */
export type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: Array<Child | Child[]>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}
