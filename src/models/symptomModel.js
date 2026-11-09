// Model：症狀資料與畫面狀態。不碰 DOM、不碰 Three.js，只管資料和規則。
import { parts, CARE_NOTE, symptoms as localSymptoms } from '../data/symptoms.js';
import { sizeAt, pretermCategory, FULL_TERM_WEEKS } from '../data/growth.js';

const SELECT_COLOR = '#5b8def';
const SYMPTOM_COLOR = '#e07a5f'; // 選了症狀時相關部位的顏色（不代表嚴重程度）

/** 讀取症狀：設定 VITE_API_URL 就讀 Spring Boot 後端，沒設定或失敗就用本機資料 */
export async function loadSymptoms() {
  const base = import.meta.env.VITE_API_URL;
  if (!base) return localSymptoms;
  try {
    const res = await fetch(`${base}/api/symptoms`);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn('讀取後端失敗，改用本機資料', e);
    return localSymptoms;
  }
}

export class SymptomModel {
  constructor(symptoms) {
    this.symptoms = symptoms;
    this.mode = 'general'; // general | preemie
    this.weeks = 28;
    this.selectedPart = null;
    this.selectedSymptomId = null;
    this.hoverPart = null;
  }

  // ---------- 讀取 ----------
  get selectedSymptom() {
    return this.symptoms.find((s) => s.id === this.selectedSymptomId) ?? null;
  }

  partName(id) {
    return parts[id]?.name ?? id;
  }

  symptomsInMode() {
    return this.symptoms.filter((s) => (s.category ?? 'general') === this.mode);
  }

  /** 清單要顯示的項目：模式、選取的部位（順序照資料） */
  visibleSymptoms() {
    return this.symptomsInMode().filter((s) => !this.selectedPart || s.parts.includes(this.selectedPart));
  }

  /** 哪些部位要上什麼顏色：{ partId: '#hex' } */
  highlight() {
    const sym = this.selectedSymptom;
    if (sym) return Object.fromEntries(sym.parts.map((p) => [p, SYMPTOM_COLOR]));
    if (this.selectedPart) return { [this.selectedPart]: SELECT_COLOR };
    return {};
  }

  /** 早產兒對比資料 */
  comparison() {
    const p = sizeAt(this.weeks);
    const t = sizeAt(FULL_TERM_WEEKS);
    return {
      weeks: this.weeks,
      termWeeks: FULL_TERM_WEEKS,
      category: pretermCategory(this.weeks),
      preemie: p,
      term: t,
      lengthRatio: p.length / t.length,
      weightRatio: p.weight / t.weight,
      headRatio: p.head / t.head,
      correctedAt6Months: this.correctedMonths(6),
    };
  }

  /** 矯正年齡（月）：實際月齡減去提早出生的週數 */
  correctedMonths(actualMonths) {
    const earlyMonths = (FULL_TERM_WEEKS - this.weeks) / 4.345;
    return Math.max(0, actualMonths - earlyMonths).toFixed(1).replace(/\.0$/, '');
  }

  // ---------- 修改 ----------
  selectPart(id) {
    this.selectedPart = id;
    this.selectedSymptomId = null;
  }

  selectSymptom(id) {
    this.selectedSymptomId = id;
  }

  clearSelection() {
    this.selectedPart = null;
    this.selectedSymptomId = null;
  }

  /** 切換模式；模式沒變回傳 false */
  setMode(mode) {
    if (mode === this.mode) return false;
    this.mode = mode;
    this.clearSelection();
    this.hoverPart = null;
    return true;
  }

  setWeeks(weeks) {
    this.weeks = weeks;
  }

  /** 回傳 hover 是否改變 */
  setHover(part) {
    if (part === this.hoverPart) return false;
    this.hoverPart = part;
    return true;
  }

}

export { CARE_NOTE };
