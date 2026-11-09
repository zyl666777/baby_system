// View：寶寶資料卡（顯示／編輯表單）
import { el } from '../../utils/dom.js';

export class ProfileView {
  /** @param {{ onEdit(), onSave(values) }} handlers */
  constructor(cardEl, handlers) {
    this.el = cardEl;
    this.handlers = handlers;
  }

  show(profile, ageText) {
    const meta = [
      profile.sex === 'M' ? '男' : profile.sex === 'F' ? '女' : null,
      profile.gaWeeks ? `${profile.gaWeeks} 週出生` : null,
    ].filter(Boolean).join('・');
    this.el.replaceChildren(
      el('div', { class: 'card-head' },
        el('h2', {}, profile.name || '寶寶'),
        el('button', { type: 'button', class: 'link', onclick: () => this.handlers.onEdit() }, '編輯')),
      el('p', { class: 'muted' }, meta),
      el('p', { class: 'age' }, ageText),
    );
  }

  edit(profile) {
    const f = el('form', { class: 'profile-form' },
      el('label', {}, '暱稱', el('input', { name: 'name', maxLength: 20, value: profile?.name ?? '', placeholder: '例如：小寶' })),
      el('label', {}, '出生日期', el('input', { name: 'birthDate', type: 'date', required: true, value: profile?.birthDate ?? '' })),
      el('label', {}, '性別',
        el('select', { name: 'sex' },
          el('option', { value: '' }, '不填'), el('option', { value: 'M' }, '男'), el('option', { value: 'F' }, '女'))),
      el('label', {}, '出生週數', el('input', { name: 'gaWeeks', type: 'number', min: 22, max: 42, value: profile?.gaWeeks ?? 40 })),
      el('button', { type: 'submit', class: 'primary' }, '儲存'),
    );
    f.sex.value = profile?.sex ?? '';
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlers.onSave({ name: f.name.value, birthDate: f.birthDate.value, sex: f.sex.value, gaWeeks: f.gaWeeks.value });
    });
    this.el.replaceChildren(el('h2', {}, profile ? '編輯寶寶資料' : '先建立寶寶資料'), f);
  }
}
