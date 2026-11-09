export const DAY = 86400000;

const pad = (n) => String(n).padStart(2, '0');

/** <input type="datetime-local"> 用的格式：2026-11-05T08:30 */
export const toLocalInput = (d) => `${dayKey(d)}T${hhmm(d)}`;
/** 以當地時間分日：2026-11-05 */
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
