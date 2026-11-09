// 用 DOM API 建立元素，文字一律走 textContent，資料改由資料庫或使用者輸入提供時也不會被當成 HTML 執行（防 XSS）

/**
 * el('button', { class: 'x', dataset: { id: 1 }, onclick: fn }, '文字', childNode)
 * - class：className
 * - style：物件，支援 CSS 變數（'--c': 'red'）
 * - dataset：data-* 屬性
 * - on*：事件
 * - 含「-」的鍵：用 setAttribute（例如 aria-label）
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') Object.entries(v).forEach(([a, b]) => node.style.setProperty(a, b));
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k.includes('-')) node.setAttribute(k, v);
    else node[k] = v;
  }
  node.append(...children.filter((c) => c != null));
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

export const $ = (selector) => document.querySelector(selector);
