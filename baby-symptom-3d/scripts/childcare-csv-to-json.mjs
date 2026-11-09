// 把官方名冊（CSV）轉成網站用的 public/data/childcare.json
//
// 用法：
//   node scripts/childcare-csv-to-json.mjs 名冊.csv
//   node scripts/childcare-csv-to-json.mjs 名冊.csv --geocode     # 另外用 OpenStreetMap 查座標
//
// CSV 第一列是欄位名稱，需要這些欄位（和衛福部名冊相同）：
//   縣市別,區域,機構名稱,設立別,地址,電話,核定收托人數
// 可選欄位：緯度,經度（有填就不會再查）
//
// 從 PDF 取得 CSV：用 Excel「資料 → 取得資料 → 從 PDF」匯入名冊，刪掉表頭以外的說明列後另存 CSV UTF-8。
//
// --geocode 說明：
// - 使用 Nominatim 免費服務，規定每秒最多 1 次、必須帶可聯絡的 User-Agent。
//   請把下面 CONTACT 改成你的專案網址或信箱再執行。
// - 查詢結果會存在 scripts/.geocode-cache.json，重跑不會重複查詢。
// - 地址查不到時座標留空，網站清單仍會顯示，只是不畫在地圖上。
// - 自動查到的座標可能有誤差，正式上線前建議抽查。

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTACT = 'baby-symptom-3d (請改成你的專案網址或聯絡信箱)';
const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../public/data/childcare.json');
const CACHE = resolve(here, '.geocode-cache.json');

const META = {
  title: '公設民營托嬰中心及社區公共托育家園名冊',
  publisher: '衛生福利部社會及家庭署',
  url: 'https://www.mohw.gov.tw/dl-101441-481ee16b-f55f-478d-8c6f-20da5e67b405.html',
  dataDate: '2025-12-31', // 名冊上的資料日期（114.12.31），換新版名冊時記得改
};

// ---------- CSV 解析（支援引號內逗號與換行） ----------
function parseCsv(text) {
  text = text.replace(/^﻿/, ''); // Excel 存的 UTF-8 會有 BOM
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const clean = (s = '') => s.replace(/\s+/g, ' ').trim();
const county = (s) => clean(s).replace(/^台/, '臺');

function toItems(rows) {
  const [header, ...body] = rows;
  const idx = Object.fromEntries(header.map((h, i) => [clean(h), i]));
  const need = ['縣市別', '機構名稱', '地址'];
  const missing = need.filter((k) => !(k in idx));
  if (missing.length) throw new Error(`CSV 缺少欄位：${missing.join('、')}（第一列要是欄位名稱）`);
  const get = (r, k) => (k in idx ? clean(r[idx[k]]) : '');

  const items = [];
  const problems = [];
  body.forEach((r, n) => {
    const item = {
      county: county(get(r, '縣市別')),
      district: get(r, '區域') || null,
      name: get(r, '機構名稱'),
      type: get(r, '設立別') || null,
      address: get(r, '地址').replace(/\s/g, ''), // 中文地址不需要空白，PDF 轉出的換行也一併去掉
      phone: get(r, '電話') || null,
      capacity: Number.parseInt(get(r, '核定收托人數'), 10) || null,
      lat: Number.parseFloat(get(r, '緯度')) || null,
      lng: Number.parseFloat(get(r, '經度')) || null,
    };
    if (!item.county || !item.name || !item.address) {
      problems.push(`第 ${n + 2} 列缺縣市、名稱或地址，略過`);
      return;
    }
    // 名冊地址常省略縣市，補上讓地圖查得到
    if (!item.address.startsWith(item.county)) item.address = item.county + item.address;
    items.push(item);
  });
  return { items, problems };
}

// ---------- 座標查詢 ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(items) {
  const cache = existsSync(CACHE) ? JSON.parse(await readFile(CACHE, 'utf8')) : {};
  let asked = 0;
  for (const it of items) {
    if (it.lat != null && it.lng != null) continue;
    // 去掉樓層、括號，地址比較容易查到
    const q = it.address.replace(/（.*?）|\(.*?\)/g, '').replace(/\d+(、\d+)*樓.*$/, '');
    if (!(q in cache)) {
      await sleep(1100); // 每秒最多 1 次
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tw&q=${encodeURIComponent(q)}`;
      try {
        const res = await fetch(url, { headers: { 'User-Agent': CONTACT, 'Accept-Language': 'zh-TW' } });
        const [hit] = res.ok ? await res.json() : [];
        cache[q] = hit ? [Number(hit.lat), Number(hit.lon)] : null;
      } catch (e) {
        console.warn(`查詢失敗：${q}（${e.message}）`);
        continue; // 不寫入快取，下次重試
      }
      asked++;
      if (asked % 20 === 0) await writeFile(CACHE, JSON.stringify(cache, null, 1));
      process.stdout.write(`\r已查詢 ${asked} 筆`);
    }
    if (cache[q]) [it.lat, it.lng] = cache[q];
  }
  await writeFile(CACHE, JSON.stringify(cache, null, 1));
  if (asked) process.stdout.write('\n');
}

// ---------- 主程式 ----------
const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.log('用法：node scripts/childcare-csv-to-json.mjs 名冊.csv [--geocode]');
  process.exit(1);
}
const { items, problems } = toItems(parseCsv(await readFile(file, 'utf8')));
problems.forEach((p) => console.warn(p));
if (flags.includes('--geocode')) await geocode(items);

const mapped = items.filter((i) => i.lat != null).length;
const data = {
  meta: {
    ...META,
    importedAt: new Date().toISOString().slice(0, 10),
    complete: true,
    note: `共 ${items.length} 筆，其中 ${mapped} 筆有座標。`,
  },
  items,
};
await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`);
console.log(`完成：${items.length} 筆（有座標 ${mapped} 筆）→ ${OUT}`);
