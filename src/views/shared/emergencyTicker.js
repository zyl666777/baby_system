// 三個頁面最上方的「緊急情況請撥 119」跑馬燈
// 用 CSS 動畫捲動（不用已淘汰的 <marquee>）；系統設定「減少動態效果」時改成靜止顯示。
import { el } from '../../utils/dom.js';
import './emergencyTicker.css';

const TEXT = '緊急情況請撥 119';
const REPEAT = 6; // 一組的重複次數，要夠寬才能填滿大螢幕

export function mountEmergencyTicker() {
  const group = () => el('div', { class: 'ticker-group' },
    ...Array.from({ length: REPEAT }, () => el('span', {}, TEXT)));
  const bar = el('div', { class: 'ticker', role: 'note', 'aria-label': TEXT },
    // 兩組一模一樣的文字接在一起，捲到一半時剛好無縫接回開頭；螢幕閱讀器只念 aria-label 一次
    el('div', { class: 'ticker-track', 'aria-hidden': 'true' }, group(), group()));
  document.body.prepend(bar);
  document.body.classList.add('has-ticker');
}
