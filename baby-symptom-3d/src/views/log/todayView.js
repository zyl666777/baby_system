// View：今天的統計與時間軸、最近 7 天長條圖
import { el } from '../../utils/dom.js';
import { hhmm } from '../../utils/date.js';

export class TodayView {
  /**
   * @param els { stats, since, timeline, week }
   * @param {{ onDelete(id) }} handlers
   */
  constructor(els, handlers) {
    this.els = els;
    this.handlers = handlers;
  }

  /**
   * @param summary { feeds, bottleMl, wet, dirty }
   * @param items [{ id, time: Date, type, text }]（新的在前）
   * @param minutesSince 距上次餵食幾分鐘，或 null
   */
  renderToday(summary, items, minutesSince) {
    const stat = (n, label, sub) => el('div', { class: 'stat' },
      el('b', {}, String(n)), el('span', {}, label), sub ? el('small', {}, sub) : null);
    this.els.stats.replaceChildren(
      stat(summary.feeds, '次餵食', summary.bottleMl ? `瓶餵 ${summary.bottleMl} ml` : null),
      stat(summary.wet, '片濕尿布'),
      stat(summary.dirty, '次大便'),
    );

    this.els.since.textContent = minutesSince == null
      ? ''
      : `距上次餵食 ${Math.floor(minutesSince / 60)} 小時 ${minutesSince % 60} 分`;

    const rows = items.map((it) => el('li', { class: it.type },
      el('time', {}, hhmm(it.time)),
      el('span', {}, it.text),
      el('button', {
        type: 'button', class: 'del', 'aria-label': `刪除 ${hhmm(it.time)} ${it.text}`,
        onclick: () => this.handlers.onDelete(it.id),
      }, '✕')));
    this.els.timeline.replaceChildren(...(rows.length ? rows : [el('li', { class: 'empty' }, '今天還沒有紀錄')]));
  }

  /** @param days [{ date, feeds, wet, dirty }]（由舊到新，最後一天是今天） */
  renderWeek(days) {
    const max = Math.max(8, ...days.flatMap((d) => [d.feeds, d.wet, d.dirty]));
    const bar = (n, cls) => el('i', { class: `b ${cls}`, style: { height: `${(n / max) * 100}%` }, title: String(n) },
      n ? el('em', {}, String(n)) : null);
    this.els.week.replaceChildren(...days.map((d, i) => el('div', { class: 'day' },
      el('div', { class: 'bars' }, bar(d.feeds, 'feed'), bar(d.wet, 'wet'), bar(d.dirty, 'dirty')),
      el('span', {}, i === days.length - 1 ? '今天' : `${d.date.getMonth() + 1}/${d.date.getDate()}`))));
  }
}
