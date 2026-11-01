// 出生時的身長、體重、頭圍（男女平均的約略值）
// 參考 Fenton 早產兒生長曲線第 50 百分位，只用於視覺比較；正式衛教請對照原始曲線並請醫護確認。
const TABLE = [
  // 週數, 體重(g), 身長(cm), 頭圍(cm)
  [24, 650, 30.5, 22.0],
  [26, 900, 34.0, 24.0],
  [28, 1150, 37.0, 26.0],
  [30, 1450, 39.5, 27.5],
  [32, 1750, 42.0, 29.5],
  [34, 2200, 44.5, 31.0],
  [36, 2650, 46.5, 32.5],
  [38, 3050, 48.5, 33.8],
  [40, 3450, 50.5, 35.0],
];

export const FULL_TERM_WEEKS = 40;
export const MIN_WEEKS = 24;
export const MAX_PRETERM_WEEKS = 36; // 未滿 37 週出生即為早產

/** 依週數內插出身長、體重、頭圍 */
export function sizeAt(weeks) {
  const w = Math.min(Math.max(weeks, TABLE[0][0]), TABLE[TABLE.length - 1][0]);
  for (let i = 0; i < TABLE.length - 1; i++) {
    const [w0, g0, l0, h0] = TABLE[i];
    const [w1, g1, l1, h1] = TABLE[i + 1];
    if (w >= w0 && w <= w1) {
      const t = (w - w0) / (w1 - w0);
      return {
        weeks: w,
        weight: Math.round(g0 + (g1 - g0) * t),
        length: +(l0 + (l1 - l0) * t).toFixed(1),
        head: +(h0 + (h1 - h0) * t).toFixed(1),
      };
    }
  }
}

/** 早產分類 */
export function pretermCategory(weeks) {
  if (weeks < 28) return '極度早產';
  if (weeks < 32) return '非常早產';
  if (weeks < 37) return '中晚期早產';
  return '足月';
}
