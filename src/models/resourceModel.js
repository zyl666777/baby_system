// Model：育兒資源頁。縣市選擇、補助試算、托育據點篩選。不碰 DOM。
import { CENTRAL, COUNTIES } from '../data/policies.js';

/** 胎次 1、2、3 以上 → 1 / 2 / 3 */
const parityKey = (n) => Math.min(3, Math.max(1, Number(n) || 1));
const BONUS_KEY = { 1: 'first', 2: 'second', 3: 'third' };

/**
 * 補助試算（純函式，方便單獨測試）
 * @param {object} input
 * @param {string} input.countyId  縣市 id
 * @param {number} input.parity    第幾胎（3 代表第 3 胎以上）
 * @param {'home'|'public'|'quasi'} input.care  自己帶／公共化托育／準公共托育
 * @param {'normal'|'midLow'|'low'} input.income 一般／中低收入戶／低收入戶
 * @returns {{ once: object[], onceTotal: number|null, monthly: object[], monthlyTotal: number, notes: string[] }}
 */
export function estimate({ countyId, parity, care, income }) {
  const p = parityKey(parity);
  const county = COUNTIES.find((c) => c.id === countyId);
  const notes = [];

  // 一次性：中央生育補助 + 縣市生育獎勵
  const once = [{ label: '中央生育補助', amount: CENTRAL.birthSubsidy }];
  const local = county?.bonus[BONUS_KEY[p]] ?? null;
  once.push({ label: `${county?.name ?? '縣市'}生育獎勵`, amount: local, unverified: true });
  if (local == null) notes.push(`${county?.name ?? '這個縣市'}第 ${p} 胎的金額資料不明確，請洽縣市政府。`);
  if (county?.note) notes.push(`${county.name}：${county.note}`);
  const onceTotal = local == null ? null : once.reduce((s, x) => s + x.amount, 0);

  // 每月：育兒津貼與托育補助只能擇一
  const monthly = [];
  if (care === 'home') {
    monthly.push({ label: '育兒津貼（0 至未滿 6 歲）', amount: CENTRAL.childAllowance[p] });
  } else {
    const c = CENTRAL.childcare;
    const kind = c[care];
    monthly.push({ label: `托育補助：${care === 'public' ? '公共化' : '準公共'}`, amount: kind.base });
    if (c.parityBonus[p]) monthly.push({ label: `第 ${p} 名${p === 3 ? '以上' : ''}子女加碼`, amount: c.parityBonus[p] });
    if (c.incomeBonus[income]) {
      monthly.push({ label: income === 'low' ? '低收入戶加碼' : '中低收入戶加碼', amount: c.incomeBonus[income] });
    }
    notes.push('送托期間領托育補助，就不能同時領育兒津貼；滿 2 歲後依幼兒園方案另計。');
  }
  const monthlyTotal = monthly.reduce((s, x) => s + x.amount, 0);

  return { once, onceTotal, monthly, monthlyTotal, notes };
}

export class ResourceModel {
  constructor() {
    this.countyId = 'newtaipei'; // 示範資料目前只有新北市
    this.facilities = [];
    this.facilityMeta = null;
    this.query = '';
    this.selectedFacility = null; // index in facilities
  }

  get county() {
    return COUNTIES.find((c) => c.id === this.countyId);
  }

  get counties() {
    return COUNTIES;
  }

  setCounty(id) {
    if (COUNTIES.some((c) => c.id === id)) this.countyId = id;
    this.selectedFacility = null;
  }

  setQuery(q) {
    this.query = q.trim();
  }

  /** 讀取托育據點 JSON（放在 public/data，打包時原樣複製） */
  async loadFacilities(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`讀取托育資料失敗（${res.status}）`);
    const data = await res.json();
    this.facilityMeta = data.meta ?? null;
    this.facilities = (data.items ?? []).map((f, i) => ({ ...f, id: i, county: normalizeCounty(f.county) }));
  }

  /** 每個縣市有幾筆，用在下拉選單 */
  countByCounty() {
    const m = new Map();
    for (const f of this.facilities) m.set(f.county, (m.get(f.county) ?? 0) + 1);
    return m;
  }

  /** 目前縣市＋搜尋字串篩選後的據點 */
  visibleFacilities() {
    const name = this.county?.name;
    const q = this.query;
    return this.facilities.filter(
      (f) => f.county === name && (!q || f.name.includes(q) || f.district?.includes(q) || f.address?.includes(q)),
    );
  }
}

/** 「台北市」→「臺北市」，讓 CSV 不論寫哪種都對得上 */
export function normalizeCounty(name = '') {
  return name.trim().replace(/^台/, '臺');
}

/** Google 地圖地址搜尋連結（不需要 API key） */
export function mapsLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
