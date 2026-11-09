// View：右側說明面板
import { el } from '../utils/dom.js';

export class PanelView {
  /** @param {{ onReport(sym): void }} handlers */
  constructor(panelEl, handlers) {
    this.el = panelEl;
    this.handlers = handlers;
  }

  /**
   * 症狀衛教：這是什麼 → 相關部位 → 可能看到的徵兆 → 居家照護 → 依情況就醫（固定文字）
   * 不顯示「出現什麼就要就醫」的判斷，後端舊資料的 whenToSeeDoctor 也不顯示。
   */
  showSymptom(sym, note, partNames) {
    this.el.replaceChildren(...[
      el('h2', {}, sym.name),
      el('div', { class: 'part-tags', 'aria-label': '相關部位' },
        ...partNames.map((n) => el('span', { class: 'part-tag' }, n))),
      el('p', {}, sym.summary),
      el('h3', {}, '可能看到的徵兆'),
      el('ul', {}, ...sym.signs.map((x) => el('li', {}, x))),
      sym.care?.length ? el('h3', {}, '居家照護') : null,
      sym.care?.length ? el('ul', {}, ...sym.care.map((x) => el('li', {}, x))) : null,
      el('section', { class: 'care-note' }, el('h3', {}, note.title), el('p', {}, note.text)),
      el('p', { class: 'muted small' }, '以上為一般衛教，不能取代醫師診斷。'),
      el('button', { type: 'button', class: 'report-link', onclick: () => this.handlers.onReport(sym) }, '內容有誤？回報給我們'),
    ].filter(Boolean));
  }

  /** 只選了部位、還沒選症狀 */
  showPart(partName) {
    this.el.replaceChildren(el('h2', {}, partName), el('p', { class: 'muted' }, '從左邊清單選一個項目看說明。'));
  }

  /** 早產兒對比模式的預設說明 */
  showPreemieIntro(c) {
    this.el.replaceChildren(
      el('h2', {}, `${c.weeks} 週出生的寶寶`),
      el('p', {}, `出生體重約 ${c.preemie.weight.toLocaleString()} 公克，大概是足月寶寶的 ${Math.round(c.weightRatio * 100)}%。器官還在發育，所以比足月寶寶更容易出現呼吸、腸胃、眼睛、腦部等問題。`),
      el('h3', {}, '矯正年齡'),
      el('p', {}, `評估早產兒的生長和發展時，通常用「矯正年齡」：實際年齡減去提早出生的週數。例如 ${c.weeks} 週出生、現在 6 個月大，矯正年齡約為 ${c.correctedAt6Months} 個月。`),
      el('p', { class: 'muted' }, '點左邊早產兒身上的部位，或從清單選一個問題看說明。'),
    );
  }

  /** 一般模式的預設說明 */
  showWelcome() {
    this.el.replaceChildren(el('h2', {}, '從寶寶開始'), el('p', { class: 'muted' }, '拖曳可以旋轉寶寶，滾輪縮放。點身上任一部位，看看那裡可能出現哪些症狀。'));
  }
}
