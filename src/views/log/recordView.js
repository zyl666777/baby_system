// View：快速紀錄（時間、餵食、瓶餵量、尿布、大便顏色、提醒）
import { el } from '../../utils/dom.js';
import { toLocalInput } from '../../utils/date.js';

export class RecordView {
  /**
   * @param els { when, mlOut, colorPick, colorBtns, colorSkip, alert, feedButtons, mlButtons, diaperButtons }
   * @param {{ onFeed(kind), onMlStep(delta), onDiaper(kind), onStoolColor(color|null) }} handlers
   * @param colors 大便顏色選項
   */
  constructor(els, handlers, colors) {
    this.els = els;
    this.whenTouched = false;

    els.feedButtons.forEach((b) => b.addEventListener('click', () => handlers.onFeed(b.dataset.feed)));
    els.mlButtons.forEach((b) => b.addEventListener('click', () => handlers.onMlStep(Number(b.dataset.ml))));
    els.diaperButtons.forEach((b) => b.addEventListener('click', () => handlers.onDiaper(b.dataset.diaper)));
    els.colorBtns.append(...colors.map((c) => el('button', {
      type: 'button', class: 'chip', onclick: () => handlers.onStoolColor(c),
    }, el('i', { class: 'dot', style: { background: c.hex } }), c.label)));
    els.colorSkip.addEventListener('click', () => handlers.onStoolColor(null));

    // 時間欄：沒被使用者改過時，跟著現在時間走
    els.when.addEventListener('input', () => (this.whenTouched = true));
    setInterval(() => { if (!this.whenTouched) els.when.value = toLocalInput(new Date()); }, 30000);
    this.resetTime();
  }

  /** 使用者選的紀錄時間；沒填或格式錯就用現在 */
  get time() {
    const d = this.els.when.value ? new Date(this.els.when.value) : new Date();
    return isNaN(d) ? new Date() : d;
  }

  resetTime() {
    this.whenTouched = false;
    this.els.when.value = toLocalInput(new Date());
  }

  setMl(ml) {
    this.els.mlOut.textContent = ml;
  }

  showColorPicker(show) {
    this.els.colorPick.hidden = !show;
  }

  /** 顯示大便顏色的提醒；text 為 null 時隱藏 */
  showAlert(text, linkHref) {
    const a = this.els.alert;
    if (!text) {
      a.hidden = true;
      return;
    }
    a.replaceChildren(text, ' ', el('a', { href: linkHref }, '看症狀說明'));
    a.hidden = false;
  }
}
