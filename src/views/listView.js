// View：左側的症狀清單
import { el } from '../utils/dom.js';

export class ListView {
  /**
   * @param {{ list: HTMLElement }} els
   * @param {{ onSelectSymptom(id), onClear() }} handlers
   */
  constructor(els, handlers) {
    this.els = els;
    els.list.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear]')) return handlers.onClear();
      const btn = e.target.closest('[data-id]');
      if (btn) handlers.onSelectSymptom(btn.dataset.id);
    });
  }

  /**
   * @param items [{ id, name }]
   * @param {{ selectedId, heading }} opts heading：選了部位時顯示的標題
   */
  renderList(items, { selectedId, heading }) {
    const nodes = [];
    if (heading) {
      nodes.push(el('li', { class: 'list-heading' }, heading,
        el('button', { type: 'button', class: 'link', dataset: { clear: '' } }, '顯示全部')));
    }
    if (!items.length) nodes.push(el('li', { class: 'empty' }, '這個部位沒有相關項目'));
    for (const s of items) {
      nodes.push(el('li', {}, el('button', {
        type: 'button', class: `symptom ${s.id === selectedId ? 'active' : ''}`, dataset: { id: s.id },
      }, el('span', {}, s.name), el('span', { class: 'chev', 'aria-hidden': 'true' }, '›'))));
    }
    this.els.list.replaceChildren(...nodes);
  }
}
