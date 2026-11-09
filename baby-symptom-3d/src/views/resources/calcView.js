// View：補助試算表單與結果
import { el } from '../../utils/dom.js';
import { money } from './policyView.js';

export class CalcView {
  /** @param {{ form: HTMLFormElement, result: HTMLElement }} nodes */
  constructor(nodes, handlers) {
    this.nodes = nodes;
    const emit = () => handlers.onChange(this.values());
    nodes.form.addEventListener('change', emit);
    nodes.form.addEventListener('submit', (e) => e.preventDefault());
    this.incomeRow = nodes.form.querySelector('[data-income-row]');
  }

  values() {
    const f = new FormData(this.nodes.form);
    return { parity: Number(f.get('parity')), care: f.get('care'), income: f.get('income') };
  }

  render(countyName, r, care) {
    // 自己帶時，收入加碼不適用，先藏起來
    this.incomeRow.hidden = care === 'home';
    this.nodes.result.replaceChildren(...[
      el('div', { class: 'calc-block' },
        el('h3', {}, '出生時一次領'),
        list(r.once),
        el('p', { class: 'total' }, '合計 ', el('strong', {}, r.onceTotal == null ? '部分待查' : money(r.onceTotal))),
      ),
      el('div', { class: 'calc-block' },
        el('h3', {}, care === 'home' ? '每月（自己帶）' : '每月（送托，0–2 歲）'),
        list(r.monthly),
        el('p', { class: 'total' }, '合計 ', el('strong', {}, `${money(r.monthlyTotal)}／月`)),
      ),
      r.notes.length ? el('ul', { class: 'notes small' }, ...r.notes.map((n) => el('li', {}, n))) : null,
      el('p', { class: 'small muted' }, `以${countyName}試算，金額只供參考，申請資格與實際金額以主管機關公告為準。`),
    ].filter(Boolean)); // replaceChildren 會把 null 印成文字，先濾掉
  }
}

function list(items) {
  return el('ul', { class: 'calc-list' },
    ...items.map((x) =>
      el('li', {},
        el('span', {}, x.label, x.unverified ? el('span', { class: 'tag warn tiny' }, '待查證') : null),
        el('span', {}, money(x.amount)),
      ),
    ),
  );
}
