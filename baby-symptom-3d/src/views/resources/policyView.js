// View：中央政策表、縣市選單、縣市生育獎勵卡
import { el } from '../../utils/dom.js';

export const money = (n) => (n == null ? '待查' : `${n.toLocaleString('zh-TW')} 元`);

export class PolicyView {
  /** @param {{ central: HTMLElement, select: HTMLSelectElement, county: HTMLElement }} nodes */
  constructor(nodes, handlers) {
    this.nodes = nodes;
    nodes.select.addEventListener('change', () => handlers.onCounty(nodes.select.value));
  }

  renderCentral(central) {
    const rows = central.items.map((it) =>
      el('tr', {}, el('th', { scope: 'row' }, it.name), el('td', {}, it.target), el('td', {}, it.amount)),
    );
    this.nodes.central.replaceChildren(
      el('div', { class: 'table-scroll' },
        el('table', { class: 'policy-table' },
          el('thead', {}, el('tr', {}, el('th', {}, '項目'), el('th', {}, '對象'), el('th', {}, '金額'))),
          el('tbody', {}, ...rows),
        ),
      ),
      sourceLine(central.source, true),
    );
  }

  /** @param {Map<string, number>} counts 每個縣市的據點數 */
  renderSelect(counties, currentId, counts) {
    this.nodes.select.replaceChildren(
      ...counties.map((c) => {
        const n = counts.get(c.name);
        return el('option', { value: c.id, selected: c.id === currentId }, n ? `${c.name}（${n} 處）` : c.name);
      }),
    );
  }

  renderCounty(county, source) {
    const b = county.bonus;
    this.nodes.county.replaceChildren(...[
      el('div', { class: 'card-head' },
        el('h2', {}, `${county.name}生育獎勵`),
        source.verified ? null : el('span', { class: 'tag warn' }, '民間整理・待查證'),
      ),
      el('p', { class: 'muted small' }, '縣市另外加發，與中央的 10 萬元分開計算。'),
      el('div', { class: 'bonus-grid' },
        bonusCell('第 1 胎', b.first),
        bonusCell('第 2 胎', b.second),
        bonusCell('第 3 胎以上', b.third),
      ),
      county.note ? el('p', { class: 'small' }, `備註：${county.note}`) : null,
      sourceLine(source, source.verified),
      el('p', { class: 'small' },
        el('a', { href: `https://www.google.com/search?q=${encodeURIComponent(`${county.name} 生育津貼 政府`)}`, target: '_blank', rel: 'noopener' },
          `搜尋${county.name}政府公告 ↗`),
      ),
    ].filter(Boolean)); // replaceChildren 會把 null 印成文字，先濾掉
  }
}

function bonusCell(label, amount) {
  return el('div', { class: 'bonus' }, el('span', { class: 'muted small' }, label), el('strong', {}, money(amount)));
}

function sourceLine(src, official) {
  return el('p', { class: 'source small muted' },
    `${official ? '來源' : '參考來源'}：`,
    el('a', { href: src.url, target: '_blank', rel: 'noopener' }, src.title),
    `（${src.checkedAt} 查證）。實際以主管機關公告為準。`,
  );
}
