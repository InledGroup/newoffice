/**
 * A very small DOM builder.
 *
 * `document.createElement` plus four `setAttribute` calls, six times over, is
 * how a panel ends up unreadable. This is the whole abstraction: a tag, its
 * attributes, its children. No virtual DOM, no signals, no custom elements --
 * the UI here is built once and then updated through the nodes it keeps.
 */
export type Child = Node | string | null | undefined | false;

export type Attrs = Record<string, string | number | boolean | undefined>;

function append(parent: Node, children: Array<Child | Child[]>): void {
  for (const child of children) {
    if (Array.isArray(child)) append(parent, child);
    else if (child === null || child === undefined || child === false) continue;
    else if (typeof child === 'string') parent.appendChild(document.createTextNode(child));
    else parent.appendChild(child);
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Array<Child | Child[]>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  append(node, children);
  return node;
}

/** An SVG element, for icons written as markup. */
export function svg(innerHTML: string, size = 16): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', 'currentColor');
  node.setAttribute('stroke-width', '2');
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = innerHTML;
  return node;
}
