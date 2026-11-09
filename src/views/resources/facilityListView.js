// View：托育據點清單、搜尋框、資料來源說明
import { el } from '../../utils/dom.js';
import { mapsLink } from '../../models/resourceModel.js';

export class FacilityListView {
  /** @param {{ list: HTMLElement, search: HTMLInputElement, meta: HTMLElement, links: HTMLElement }} nodes */
  constructor(nodes, handlers) {
    this.nodes = nodes;
    this.handlers = handlers;
    nodes.search.addEventListener('input', () => handlers.onSearch(nodes.search.value));
  }

  renderLinks(links) {
    this.nodes.links.replaceChildren(
      ...links.map((l) => el('li', {}, el('a', { href: l.url, target: '_blank', rel: 'noopener' }, `${l.label} ↗`))),
    );
  }

  renderMeta(meta, mappedCount, total) {
    if (!meta) return this.nodes.meta.replaceChildren();
    this.nodes.meta.replaceChildren(...[
      el('p', { class: 'small muted' },
        '資料：',
        el('a', { href: meta.url, target: '_blank', rel: 'noopener' }, `${meta.publisher}〈${meta.title}〉`),
        `，資料日期 ${meta.dataDate}。`,
        total ? `這個縣市 ${total} 處，地圖上有座標的 ${mappedCount} 處。` : '',
      ),
      meta.complete ? null : el('p', { class: 'small notice' }, meta.note),
    ].filter(Boolean));
  }

  render(items, selectedId, countyName) {
    if (!items.length) {
      this.nodes.list.replaceChildren(
        el('li', { class: 'empty' },
          `目前沒有${countyName}的據點資料。`,
          el('br'),
          '可以先用上方「全國查詢」連結，或把官方名冊轉成 JSON 放進來（見 README）。',
        ),
      );
      return;
    }
    this.nodes.list.replaceChildren(
      ...items.map((f) =>
        el('li', { class: `facility${f.id === selectedId ? ' active' : ''}`, dataset: { id: f.id } },
          el('button', { type: 'button', class: 'facility-main', onclick: () => this.handlers.onPick(f.id) },
            el('strong', {}, f.name),
            el('span', { class: 'small muted' }, [f.district, f.type, f.capacity ? `收托 ${f.capacity} 人` : null].filter(Boolean).join('・')),
            el('span', { class: 'small' }, f.address),
            typeof f.lat === 'number' ? null : el('span', { class: 'tag tiny' }, '尚無座標'),
          ),
          el('div', { class: 'facility-actions small' },
            el('a', { href: mapsLink(f.address), target: '_blank', rel: 'noopener' }, '在 Google 地圖開啟 ↗'),
            f.phone ? el('a', { href: `tel:${f.phone.replace(/[^\d+#]/g, '')}` }, f.phone) : null,
            el('button', { type: 'button', class: 'report-link', onclick: () => this.handlers.onReport(f) }, '資料有誤'),
          ),
        ),
      ),
    );
  }

  scrollTo(id) {
    this.nodes.list.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
