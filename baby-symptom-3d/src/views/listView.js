// View：左側的嚴重程度篩選和症狀清單
import { el } from '../utils/dom.js';

export const badge = (info) => el('span', { class: 'badge', style: { '--c': info.color } }, info.label);

export class ListView {
  /**
   * @param {{ filters: HTMLElement, list: HTMLElement }} els
   * @param {{ onToggleSeverity(key), onSelectSymptom(id), onClear() }} handlers
   */
  constructor(els, handlers) {
    this.els = els;
    els.filters.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sev]');
      if (btn) handlers.onToggleSeverity(btn.dataset.sev);
    });
    els.list.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear]')) return handlers.onClear();
      const btn = e.target.closest('[data-id]');
      if (btn) handlers.onSelectSymptom(btn.dataset.id);
    });
  }

  /** @param severities [{ key, label, color, on }] */
  renderFilters(severities) {
    this.els.filters.replaceChildren(...severities.map((s) => el('button', {
      type: 'button', class: `chip ${s.on ? 'on' : ''}`, style: { '--c': s.color },
      dataset: { sev: s.key }, 'aria-pressed': s.on,
    }, s.label)));
  }

  /**
   * @param items [{ id, name, severityInfo }]
   * @param {{ selectedId, heading }} opts heading：選了部位時顯示的標題
   */
  renderList(items, { selectedId, heading }) {
    const nodes = [];
    if (heading) {
      nodes.push(el('li', { class: 'list-heading' }, heading,
        el('button', { type: 'button', class: 'link', dataset: { clear: '' } }, '顯示全部')));
    }
    if (!items.length) nodes.push(el('li', { class: 'empty' }, '這個條件下沒有項目'));
    for (const s of items) {
      nodes.push(el('li', {}, el('button', {
        type: 'button', class: `symptom ${s.id === selectedId ? 'active' : ''}`, dataset: { id: s.id },
      }, el('span', {}, s.name), badge(s.severityInfo))));
    }
    this.els.list.replaceChildren(...nodes);
  }
}
