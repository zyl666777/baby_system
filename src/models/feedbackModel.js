// Model：回報資訊錯誤。驗證規則和後端 FeedbackRequest 一致，送出方式依設定決定。不碰 DOM。

export const CATEGORIES = {
  WRONG: '內容錯誤',
  OUTDATED: '資料過期（例如補助金額改了）',
  LINK: '連結失效',
  OTHER: '其他',
};

export const LIMITS = { message: 1000, sourceUrl: 500, contact: 100 };

/** 目前可用的回報管道（Vite 打包時把 .env 的值寫進來） */
export function channels() {
  const env = import.meta.env;
  return {
    api: env.VITE_API_URL || null,
    form: safeUrl(env.VITE_FEEDBACK_FORM_URL),
    line: safeUrl(env.VITE_LINE_URL),
  };
}

/** @returns {Record<string,string>} 欄位 → 錯誤訊息；空物件代表通過 */
export function validate(v) {
  const errors = {};
  const msg = (v.message ?? '').trim();
  if (msg.length < 5) errors.message = '請說明哪裡有誤（至少 5 個字）';
  else if (msg.length > LIMITS.message) errors.message = `請在 ${LIMITS.message} 字以內`;
  if (!(v.category in CATEGORIES)) errors.category = '請選問題類型';
  const url = (v.sourceUrl ?? '').trim();
  if (url && !safeUrl(url)) errors.sourceUrl = '來源網址要以 http:// 或 https:// 開頭';
  else if (url.length > LIMITS.sourceUrl) errors.sourceUrl = '網址太長';
  if ((v.contact ?? '').length > LIMITS.contact) errors.contact = `聯絡方式請在 ${LIMITS.contact} 字以內`;
  return errors;
}

/** 組成給後端的資料（欄位名稱和後端 FeedbackRequest 相同） */
export function toPayload(context, v) {
  return {
    page: context.page,
    targetCode: context.code ?? null,
    targetName: context.name ?? null,
    category: v.category,
    message: v.message.trim(),
    sourceUrl: v.sourceUrl.trim() || null,
    contact: v.contact.trim() || null,
    website: v.website ?? '', // 蜜罐欄位
  };
}

/** 給 Google 表單／LINE 用：把回報整理成一段可以貼上的文字 */
export function toText(context, v) {
  return [
    `【資訊回報】${context.name ?? ''}`,
    `頁面：${location.href}`,
    `類型：${CATEGORIES[v.category] ?? ''}`,
    `說明：${v.message.trim()}`,
    v.sourceUrl.trim() ? `正確資訊來源：${v.sourceUrl.trim()}` : null,
  ].filter(Boolean).join('\n');
}

/** 送到後端；失敗時丟出帶中文訊息的 Error */
export async function submitToApi(base, payload) {
  let res;
  try {
    res = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('連不上伺服器，請稍後再試，或改用下方其他管道');
  }
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  const err = new Error(data.message || `送出失敗（${res.status}）`);
  err.errors = data.errors || {};
  throw err;
}

function safeUrl(s) {
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}
