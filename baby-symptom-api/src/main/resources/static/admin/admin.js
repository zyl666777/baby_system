// 管理表單。所有文字一律用 textContent 放進畫面，不用 innerHTML，避免資料庫裡的內容被當成程式執行（XSS）。

const SEVERITY = { EMERGENCY: '立即急診', SOON: '盡快就醫', HOME: '居家觀察', FOLLOW: '定期追蹤' };
const CATEGORY = { GENERAL: '一般', PREEMIE: '早產兒' };
const STATUS = { DRAFT: '草稿', PUBLISHED: '已發布', ARCHIVED: '已下架' };
const ACTION = {
  CREATE: '新增', UPDATE: '修改', STATUS: '改狀態', DELETE: '刪除',
  LOGIN_OK: '登入成功', LOGIN_FAIL: '登入失敗',
};

const $ = (sel) => document.querySelector(sel);
const form = $('#form');

const state = { session: null, parts: [], symptoms: [], editingId: null, version: null };

// ---------- 小工具 ----------
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k.includes('-')) node.setAttribute(k, v);
    else node[k] = v;
  }
  for (const c of children) node.append(c ?? '');
  return node;
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('zh-TW', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

let toastTimer;
function toast(msg, kind = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${kind}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && state.session) headers[state.session.csrfHeader] = state.session.csrfToken;
  const res = await fetch(path, {
    method, headers, credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    location.href = '/login';
    throw new Error('需要重新登入');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || (res.status === 403 ? '沒有權限，或登入已逾時，請重新整理頁面' : `錯誤 ${res.status}`));
    err.status = res.status;
    err.errors = data.errors || {};
    throw err;
  }
  return data;
}

// ---------- 列表 ----------
function badge(text, cls) {
  return el('span', { class: `badge ${cls}` }, text);
}

function renderList() {
  const q = $('#search').value.trim().toLowerCase();
  const fs = $('#filterStatus').value;
  const fv = $('#filterSeverity').value;
  const fc = $('#filterCategory').value;
  const rows = state.symptoms.filter((s) =>
    (!q || s.name.toLowerCase().includes(q) || s.code.includes(q)) &&
    (!fs || s.status === fs) && (!fv || s.severity === fv) && (!fc || s.category === fc));

  const tbody = $('#rows');
  tbody.replaceChildren(...rows.map((s) =>
    el('tr', {
      class: s.id === state.editingId ? 'active' : '',
      tabIndex: 0,
      onclick: () => edit(s.id),
      onkeydown: (e) => { if (e.key === 'Enter') edit(s.id); },
    },
      el('td', {}, el('div', { class: 'name' }, s.name), el('div', { class: 'code' }, s.code)),
      el('td', {}, badge(CATEGORY[s.category], `cat-${s.category}`)),
      el('td', {}, badge(SEVERITY[s.severity], `sev-${s.severity}`)),
      el('td', {}, badge(STATUS[s.status], `st-${s.status}`)),
      el('td', { class: 'small muted' }, fmtTime(s.updatedAt), el('br'), s.updatedBy),
    )));
  $('#listEmpty').hidden = rows.length > 0;
}

async function loadList() {
  state.symptoms = await api('/api/admin/symptoms');
  renderList();
}

// ---------- 表單 ----------
function renderPartChecks() {
  $('#partChecks').replaceChildren(...state.parts.map((p) =>
    el('label', { class: 'check' },
      el('input', { type: 'checkbox', name: 'parts', value: p.code }),
      el('span', {}, p.name))));
}

function addSignRow(value = '') {
  const li = el('li', {},
    el('input', { type: 'text', maxLength: 100, value, placeholder: '例如：眼白變黃', 'aria-label': '徵兆' }),
    el('button', { type: 'button', class: 'icon', title: '刪除這項', 'aria-label': '刪除這項', onclick: () => {
      li.remove();
      if (!$('#signs').children.length) addSignRow();
    } }, '✕'));
  $('#signs').append(li);
  return li;
}

function clearErrors() {
  form.querySelectorAll('[data-err]').forEach((e) => (e.textContent = ''));
  form.querySelectorAll('.invalid').forEach((e) => e.classList.remove('invalid'));
  $('#formError').hidden = true;
}

function showErrors(err) {
  $('#formError').textContent = err.message;
  $('#formError').hidden = false;
  for (const [field, msg] of Object.entries(err.errors || {})) {
    const slot = form.querySelector(`[data-err="${CSS.escape(field)}"]`);
    if (slot) {
      slot.textContent = msg;
      slot.closest('.field')?.classList.add('invalid');
    }
  }
  form.querySelector('.invalid input, .invalid textarea, .invalid select')?.focus();
}

function updateCounts() {
  form.querySelectorAll('[data-count]').forEach((c) => {
    const len = form.elements[c.dataset.count].value.length;
    c.textContent = `${len} / 500`;
  });
}

function updateReviewWarn() {
  $('#reviewWarn').hidden = !(form.elements.status.value === 'PUBLISHED' && !form.elements.reviewedBy.value.trim());
}

function fillForm(s) {
  clearErrors();
  form.reset();
  state.editingId = s?.id ?? null;
  state.version = s?.version ?? null;

  $('#formTitle').textContent = s ? `編輯：${s.name}` : '新增症狀';
  $('#formMeta').textContent = s ? `最後修改 ${fmtTime(s.updatedAt)}（${s.updatedBy}）` : '';
  $('#deleteBtn').hidden = !s;

  form.elements.name.value = s?.name ?? '';
  form.elements.code.value = s?.code ?? '';
  form.elements.summary.value = s?.summary ?? '';
  form.elements.whenToSeeDoctor.value = s?.whenToSeeDoctor ?? '';
  form.elements.status.value = s?.status ?? 'DRAFT';
  form.elements.reviewedBy.value = s?.reviewedBy ?? '';
  form.elements.reviewedAt.value = s?.reviewedAt ?? '';
  form.querySelectorAll('input[name="severity"]').forEach((r) => (r.checked = r.value === s?.severity));
  form.querySelectorAll('input[name="category"]').forEach((r) => (r.checked = r.value === (s?.category ?? 'GENERAL')));
  form.querySelectorAll('input[name="parts"]').forEach((c) => (c.checked = !!s?.parts.includes(c.value)));

  $('#signs').replaceChildren();
  (s?.signs?.length ? s.signs : ['']).forEach((x) => addSignRow(x));

  updateCounts();
  updateReviewWarn();
  renderList();
}

function readForm() {
  const f = form.elements;
  return {
    name: f.name.value.trim(),
    code: f.code.value.trim(),
    category: form.querySelector('input[name="category"]:checked')?.value ?? null,
    severity: form.querySelector('input[name="severity"]:checked')?.value ?? null,
    parts: [...form.querySelectorAll('input[name="parts"]:checked')].map((c) => c.value),
    summary: f.summary.value.trim(),
    signs: [...$('#signs').querySelectorAll('input')].map((i) => i.value.trim()).filter(Boolean),
    whenToSeeDoctor: f.whenToSeeDoctor.value.trim(),
    status: f.status.value,
    reviewedBy: f.reviewedBy.value.trim() || null,
    reviewedAt: f.reviewedAt.value || null,
    version: state.version,
  };
}

async function edit(id) {
  try {
    fillForm(await api(`/api/admin/symptoms/${id}`));
  } catch (e) {
    toast(e.message, 'err');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const data = readForm();
  const btn = $('#saveBtn');
  btn.disabled = true;
  try {
    const saved = state.editingId
      ? await api(`/api/admin/symptoms/${state.editingId}`, { method: 'PUT', body: data })
      : await api('/api/admin/symptoms', { method: 'POST', body: data });
    await loadList();
    fillForm(saved);
    toast(`已儲存「${saved.name}」`);
  } catch (err) {
    showErrors(err);
  } finally {
    btn.disabled = false;
  }
});

$('#deleteBtn').addEventListener('click', async () => {
  const s = state.symptoms.find((x) => x.id === state.editingId);
  if (!s || !confirm(`確定要刪除「${s.name}」嗎？刪除後無法復原。\n\n只是不想公開的話，建議把狀態改成「已下架」。`)) return;
  try {
    await api(`/api/admin/symptoms/${s.id}`, { method: 'DELETE' });
    await loadList();
    fillForm(null);
    toast(`已刪除「${s.name}」`);
  } catch (err) {
    toast(err.message, 'err');
  }
});

$('#addSign').addEventListener('click', () => addSignRow().querySelector('input').focus());
$('#newBtn').addEventListener('click', () => { fillForm(null); form.elements.name.focus(); });
$('#cancelBtn').addEventListener('click', () => (state.editingId ? edit(state.editingId) : fillForm(null)));
form.addEventListener('input', () => { updateCounts(); updateReviewWarn(); });
form.addEventListener('change', updateReviewWarn);
['#search', '#filterStatus', '#filterSeverity', '#filterCategory'].forEach((s) => $(s).addEventListener('input', renderList));

// ---------- 稽核紀錄 ----------
async function loadAudit() {
  try {
    const logs = await api('/api/admin/audit-logs');
    $('#auditRows').replaceChildren(...logs.map((l) =>
      el('tr', { class: l.action === 'LOGIN_FAIL' ? 'fail' : '' },
        el('td', { class: 'small' }, fmtTime(l.occurredAt)),
        el('td', {}, l.username),
        el('td', {}, badge(ACTION[l.action] ?? l.action, `act-${l.action}`)),
        el('td', { class: 'code' }, l.target ?? ''),
        el('td', {}, l.detail ?? ''),
        el('td', { class: 'small muted' }, l.ipAddress ?? ''))));
  } catch (e) {
    toast(e.message, 'err');
  }
}
$('#reloadAudit').addEventListener('click', loadAudit);

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
  $('#tab-symptoms').hidden = t.dataset.tab !== 'symptoms';
  $('#tab-audit').hidden = t.dataset.tab !== 'audit';
  if (t.dataset.tab === 'audit') loadAudit();
}));

// ---------- 啟動 ----------
(async function init() {
  try {
    state.session = await api('/api/admin/session');
    $('#whoami').textContent = state.session.username;
    $('#logoutCsrf').value = state.session.csrfToken;
    state.parts = await api('/api/parts');
    renderPartChecks();
    await loadList();
    fillForm(null);
  } catch (e) {
    toast(`載入失敗：${e.message}`, 'err');
  }
})();
