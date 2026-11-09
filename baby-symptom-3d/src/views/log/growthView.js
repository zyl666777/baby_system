// View：生長紀錄表單、趨勢圖（SVG）、紀錄表格
import { el, svgEl } from '../../utils/dom.js';
import { dayKey } from '../../utils/date.js';

export class GrowthView {
  /**
   * @param els { form, tabs, chart, table }
   * @param {{ onAdd(values), onMetricChange(metric), onDelete(id) }} handlers
   * @param metrics { weight: { label, unit }, ... }
   */
  constructor(els, handlers, metrics) {
    this.els = els;
    this.handlers = handlers;
    this.metrics = metrics;
    this.resetForm();

    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = els.form;
      handlers.onAdd({ date: f.date.value, weight: f.weight.value, length: f.length.value, head: f.head.value });
    });
    els.tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-metric]');
      if (!b) return;
      els.tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      handlers.onMetricChange(b.dataset.metric);
    });
  }

  resetForm() {
    this.els.form.reset();
    this.els.form.date.value = dayKey(new Date());
  }

  /**
   * @param points [{ x, y, date }]
   * @param {{ metric, hasBirthDate, corrected }} opts corrected：橫軸是否為矯正週數
   */
  renderChart(points, { metric, hasBirthDate, corrected }) {
    const box = this.els.chart;
    const m = this.metrics[metric];
    if (!hasBirthDate) return box.replaceChildren(el('p', { class: 'empty' }, '請先填寫寶寶的出生日期'));
    if (!points.length) return box.replaceChildren(el('p', { class: 'empty' }, `還沒有${m.label}紀錄`));

    const W = 600, H = 270, L = 44, R = 12, T = 26, B = 34;
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    let x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (x1 - x0 < 4) { x0 -= 2; x1 += 2; }
    const padY = Math.max((Math.max(...ys) - Math.min(...ys)) * 0.15, metric === 'weight' ? 0.3 : 1);
    const y0 = Math.min(...ys) - padY, y1 = Math.max(...ys) + padY;
    const sx = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
    const sy = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${m.label}趨勢圖` });
    for (let i = 0; i <= 4; i++) {
      const y = y0 + ((y1 - y0) * i) / 4;
      svg.append(
        svgEl('line', { x1: L, x2: W - R, y1: sy(y), y2: sy(y), class: 'grid' }),
        svgEl('text', { x: L - 6, y: sy(y) + 4, 'text-anchor': 'end', class: 'tick' }, y.toFixed(metric === 'weight' ? 1 : 0)),
      );
      const x = x0 + ((x1 - x0) * i) / 4;
      svg.append(svgEl('text', { x: sx(x), y: H - 14, 'text-anchor': 'middle', class: 'tick' }, x.toFixed(0)));
    }
    svg.append(
      svgEl('text', { x: W - R, y: H - 1, 'text-anchor': 'end', class: 'tick' }, corrected ? '矯正週數' : '出生後週數'),
      svgEl('text', { x: 4, y: 12, class: 'tick' }, m.unit),
      svgEl('polyline', { points: points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' '), class: 'line' }),
    );
    for (const p of points) {
      const c = svgEl('circle', { cx: sx(p.x), cy: sy(p.y), r: 5, class: 'pt' });
      c.append(svgEl('title', {}, `${p.date}：${p.y} ${m.unit}`));
      svg.append(c);
    }
    box.replaceChildren(svg);
  }

  /** @param records 生長紀錄（新的在前） */
  renderTable(records) {
    const val = (v, unit) => (v != null ? `${v} ${unit}` : '—');
    const rows = records.map((g) => el('tr', {},
      el('td', {}, g.date),
      el('td', {}, val(g.weight, 'kg')),
      el('td', {}, val(g.length, 'cm')),
      el('td', {}, val(g.head, 'cm')),
      el('td', {}, el('button', {
        type: 'button', class: 'del', 'aria-label': `刪除 ${g.date} 的紀錄`,
        onclick: () => this.handlers.onDelete(g.id),
      }, '✕'))));
    this.els.table.replaceChildren(...(rows.length
      ? [el('thead', {}, el('tr', {}, ...['日期', '體重', '身長', '頭圍', ''].map((h) => el('th', {}, h)))), el('tbody', {}, ...rows)]
      : []));
  }
}
