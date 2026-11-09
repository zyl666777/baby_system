// View：模式切換按鈕、說明文字、早產兒對比卡（週數滑桿與比較表）
import { el } from '../utils/dom.js';

const HINTS = {
  general: '點寶寶身上的部位，或從下方清單選一個症狀。',
  preemie: '左邊是早產兒、右邊是足月寶寶。拉動週數比較大小，點早產兒身上的部位看常見問題。',
};

export class CompareView {
  /**
   * @param {{ modeButtons: NodeList, hint, card, weeks, weeksOut, weeksCat, statsBody, reset }} els
   * @param {{ onModeChange(mode), onWeeksChange(weeks), onReset() }} handlers
   */
  constructor(els, handlers) {
    this.els = els;
    els.modeButtons.forEach((b) => b.addEventListener('click', () => handlers.onModeChange(b.dataset.mode)));
    els.weeks.addEventListener('input', (e) => handlers.onWeeksChange(Number(e.target.value)));
    els.reset.addEventListener('click', () => handlers.onReset());
  }

  setMode(mode) {
    this.els.modeButtons.forEach((b) => {
      b.classList.toggle('on', b.dataset.mode === mode);
      b.setAttribute('aria-selected', b.dataset.mode === mode);
    });
    this.els.hint.textContent = HINTS[mode];
    this.els.card.hidden = mode !== 'preemie';
  }

  renderComparison(c) {
    this.els.weeksOut.textContent = `${c.weeks} 週`;
    this.els.weeksCat.textContent = c.category;
    const rows = [
      ['身長', `${c.preemie.length} cm`, `${c.term.length} cm`, c.lengthRatio],
      ['體重', `${c.preemie.weight.toLocaleString()} g`, `${c.term.weight.toLocaleString()} g`, c.weightRatio],
      ['頭圍', `${c.preemie.head} cm`, `${c.term.head} cm`, c.headRatio],
    ];
    this.els.statsBody.replaceChildren(...rows.map(([name, a, b, r]) => {
      const pct = `${Math.round(r * 100)}%`;
      return el('tr', {},
        el('td', {}, name), el('td', {}, a), el('td', {}, b),
        el('td', {}, el('div', { class: 'bar', style: { '--w': pct }, dataset: { pct } })));
    }));
  }
}
