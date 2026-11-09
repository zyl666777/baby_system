// Model：寶寶紀錄。資料只存在瀏覽器 localStorage，不上傳任何地方；不碰 DOM。
import { DAY, dayKey } from '../utils/date.js';
import { GROWTH_METRICS } from '../data/logOptions.js';

const KEY = 'baby-log-v1';
const empty = () => ({ version: 1, profile: null, events: [], growth: [] });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export class LogModel {
  /** @param {(msg: string) => void} onSaveError 儲存失敗時通知（例如無痕模式） */
  constructor(onSaveError = () => {}) {
    this.onSaveError = onSaveError;
    this.data = this.#load();
  }

  // ---------- 儲存 ----------
  #load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.events)) return { ...empty(), ...d };
    } catch { /* 讀不到就用空資料 */ }
    return empty();
  }

  #save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      this.onSaveError('無法儲存：瀏覽器可能是無痕模式或儲存空間已滿');
    }
  }

  // ---------- 寶寶資料 ----------
  get profile() {
    return this.data.profile;
  }

  setProfile({ name, birthDate, sex, gaWeeks }) {
    this.data.profile = { name: name.trim(), birthDate, sex, gaWeeks: Number(gaWeeks) || null };
    this.#save();
  }

  isPreterm() {
    const ga = this.profile?.gaWeeks;
    return Boolean(ga && ga < 37);
  }

  /** 出生天數與矯正年齡的文字 */
  ageText(now = Date.now()) {
    const p = this.profile;
    if (!p?.birthDate) return '';
    const days = Math.floor((now - new Date(p.birthDate)) / DAY);
    if (days < 0) return '';
    const text = [`出生第 ${days} 天`];
    if (this.isPreterm()) {
      const corrected = days / 7 - (40 - p.gaWeeks);
      text.push(corrected < 0
        ? `矯正 ${(40 + corrected).toFixed(1)} 週（尚未到預產期）`
        : `矯正年齡約 ${(corrected / 4.345).toFixed(1)} 個月`);
    }
    return text.join('　');
  }

  // ---------- 餵食與尿布 ----------
  addEvent(time, ev) {
    this.data.events.push({ id: uid(), t: time.toISOString(), ...ev });
    this.data.events.sort((a, b) => a.t.localeCompare(b.t));
    this.#save();
  }

  deleteEvent(id) {
    this.data.events = this.data.events.filter((e) => e.id !== id);
    this.#save();
  }

  eventsOn(date) {
    const k = dayKey(date);
    return this.data.events.filter((e) => dayKey(new Date(e.t)) === k);
  }

  static summarize(list) {
    const feeds = list.filter((e) => e.type === 'feed');
    const diapers = list.filter((e) => e.type === 'diaper');
    return {
      feeds: feeds.length,
      bottleMl: feeds.reduce((s, e) => s + (e.ml || 0), 0),
      wet: diapers.filter((e) => e.kind === 'wet' || e.kind === 'both').length,
      dirty: diapers.filter((e) => e.kind === 'dirty' || e.kind === 'both').length,
    };
  }

  today(now = new Date()) {
    const list = this.eventsOn(now);
    return { events: [...list].reverse(), summary: LogModel.summarize(list) };
  }

  /** 距上次餵食幾分鐘；沒有紀錄回傳 null */
  minutesSinceLastFeed(now = Date.now()) {
    const last = [...this.data.events].reverse().find((e) => e.type === 'feed' && new Date(e.t) <= now);
    return last ? Math.floor((now - new Date(last.t)) / 60000) : null;
  }

  /** 最近 n 天每天的統計（由舊到新） */
  recentDays(n = 7, now = Date.now()) {
    return Array.from({ length: n }, (_, i) => {
      const date = new Date(now - (n - 1 - i) * DAY);
      return { date, ...LogModel.summarize(this.eventsOn(date)) };
    });
  }

  // ---------- 生長紀錄 ----------
  /** 新增一筆；全部空白時回傳 false */
  addGrowth({ date, ...values }) {
    const rec = { id: uid(), date };
    for (const k of Object.keys(GROWTH_METRICS)) if (values[k] !== '' && values[k] != null) rec[k] = Number(values[k]);
    if (rec.weight == null && rec.length == null && rec.head == null) return false;
    this.data.growth.push(rec);
    this.data.growth.sort((a, b) => a.date.localeCompare(b.date));
    this.#save();
    return true;
  }

  deleteGrowth(id) {
    this.data.growth = this.data.growth.filter((g) => g.id !== id);
    this.#save();
  }

  get growth() {
    return this.data.growth;
  }

  /** 畫圖用的點：橫軸為出生後週數，早產兒用矯正週數 */
  growthPoints(metric) {
    const p = this.profile;
    if (!p?.birthDate) return [];
    const offset = this.isPreterm() ? 40 - p.gaWeeks : 0;
    return this.data.growth
      .filter((g) => g[metric] != null)
      .map((g) => ({ x: (new Date(g.date) - new Date(p.birthDate)) / DAY / 7 - offset, y: g[metric], date: g.date }));
  }

  // ---------- 備份 ----------
  exportJson() {
    return JSON.stringify(this.data, null, 2);
  }

  /** 檢查並取代全部資料；格式錯誤會丟出例外 */
  static parseBackup(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.events) || !Array.isArray(d.growth)) throw new Error('格式不正確');
    return { version: 1, profile: d.profile ?? null, events: d.events, growth: d.growth };
  }

  replaceAll(data) {
    this.data = data;
    this.#save();
  }

  clear() {
    this.data = empty();
    this.#save();
  }
}
