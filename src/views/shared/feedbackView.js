// View：「回報資訊錯誤」對話框。兩個頁面共用，第一次打開時才建立。
import { el } from '../../utils/dom.js';
import { CATEGORIES, LIMITS } from '../../models/feedbackModel.js';
import './feedback.css';

export class FeedbackView {
  /** @param {{ onSubmit(values): void, onCopy(values): void }} handlers */
  constructor(handlers) {
    this.handlers = handlers;
    this.dialog = null;
  }

  build() {
    const field = (label, input, name, hint) =>
      el('label', { class: 'fb-field' },
        el('span', {}, label),
        input,
        hint ? el('small', { class: 'fb-hint' }, hint) : null,
        el('small', { class: 'fb-err', dataset: { err: name } }));

    this.target = el('p', { class: 'fb-target' });
    this.form = el('form', { class: 'fb-form', noValidate: true },
      field('問題類型', el('select', { name: 'category' },
        ...Object.entries(CATEGORIES).map(([v, label]) => el('option', { value: v }, label))), 'category'),
      field('哪裡有誤？', el('textarea', { name: 'message', rows: 4, maxLength: LIMITS.message, required: true,
        placeholder: '例如：臺中市第 1 胎生育津貼已改為 3 萬元' }), 'message'),
      field('正確資訊的來源網址（選填）', el('input', { name: 'sourceUrl', type: 'url', maxLength: LIMITS.sourceUrl,
        placeholder: 'https://（政府公告、衛教單張等）' }), 'sourceUrl', '有官方來源的回報會優先處理'),
      field('聯絡方式（選填）', el('input', { name: 'contact', maxLength: LIMITS.contact, autocomplete: 'off',
        placeholder: 'Email 或 LINE ID，需要確認細節時才會聯絡' }), 'contact'),
      // 蜜罐：畫面上看不到，機器人才會填
      el('input', { name: 'website', class: 'fb-hp', tabIndex: -1, autocomplete: 'off', 'aria-hidden': 'true' }),
    );
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlers.onSubmit(this.values());
    });

    this.status = el('div', { class: 'fb-status', role: 'status', 'aria-live': 'polite' });
    this.actions = el('div', { class: 'fb-actions' });
    this.dialog = el('dialog', { class: 'fb-dialog', 'aria-labelledby': 'fbTitle' },
      el('div', { class: 'fb-head' },
        el('h2', { id: 'fbTitle' }, '回報資訊錯誤'),
        el('button', { type: 'button', class: 'fb-close', 'aria-label': '關閉', onclick: () => this.close() }, '✕')),
      this.target, this.form, this.status, this.actions,
      el('p', { class: 'fb-note' }, '請不要填寫寶寶或家人的病歷、身分證字號等個人資料。這裡只收網站內容的修正，寶寶的狀況請依情況就醫。'));
    // 點對話框外面的背景也能關閉
    this.dialog.addEventListener('click', (e) => { if (e.target === this.dialog) this.close(); });
    document.body.append(this.dialog);
  }

  /**
   * @param {{ name: string }} context 回報的對象
   * @param {{ api: string|null, form: string|null, line: string|null }} ch 可用管道
   */
  open(context, ch) {
    if (!this.dialog) this.build();
    this.form.reset();
    this.form.hidden = false;
    this.showErrors({});
    this.status.replaceChildren();
    this.target.textContent = context.name ? `項目：${context.name}` : '';
    this.form.elements.message.placeholder = context.page === 'SYMPTOM'
      ? '例如：「居家照護」第 2 點和衛福部衛教單張的說法不同'
      : '例如：臺中市第 1 胎生育津貼已改為 3 萬元';
    this.renderActions(ch);
    this.dialog.showModal();
    this.form.elements.message.focus();
  }

  close() {
    this.dialog?.close();
  }

  values() {
    const f = this.form.elements;
    return { category: f.category.value, message: f.message.value, sourceUrl: f.sourceUrl.value,
      contact: f.contact.value, website: f.website.value };
  }

  renderActions(ch) {
    const btns = [];
    if (ch.api) btns.push(el('button', { type: 'button', class: 'fb-btn primary', onclick: () => this.form.requestSubmit() }, '送出'));
    if (ch.form || ch.line) {
      btns.push(el('button', { type: 'button', class: 'fb-btn', onclick: () => this.handlers.onCopy(this.values()) }, '複製內容'));
      if (ch.form) btns.push(el('a', { class: 'fb-btn', href: ch.form, target: '_blank', rel: 'noopener' }, '開啟回報表單 ↗'));
      if (ch.line) btns.push(el('a', { class: 'fb-btn line', href: ch.line, target: '_blank', rel: 'noopener' }, '用 LINE 回報 ↗'));
    }
    if (!btns.length) {
      btns.push(el('p', { class: 'fb-hint' }, '網站管理者還沒設定回報管道（見 README「回報資訊錯誤」）。'));
    } else if (!ch.api) {
      btns.unshift(el('p', { class: 'fb-hint' }, '填好後按「複製內容」，再貼到表單或 LINE 訊息裡。'));
    }
    this.actions.replaceChildren(...btns);
  }

  setBusy(busy) {
    this.actions.querySelectorAll('button').forEach((b) => (b.disabled = busy));
  }

  showErrors(errors) {
    this.form.querySelectorAll('[data-err]').forEach((s) => (s.textContent = errors[s.dataset.err] ?? ''));
    const first = Object.keys(errors)[0];
    if (first) this.form.elements[first]?.focus();
  }

  showStatus(text, kind = 'ok') {
    this.status.replaceChildren(el('p', { class: `fb-msg ${kind}` }, text));
  }

  /** 後端送出成功：收起表單，只留感謝訊息 */
  showDone() {
    this.form.hidden = true;
    this.actions.replaceChildren(el('button', { type: 'button', class: 'fb-btn primary', onclick: () => this.close() }, '關閉'));
    this.showStatus('已收到，謝謝你！管理者確認來源後會更新網站內容。');
  }
}
