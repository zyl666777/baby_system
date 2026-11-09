// Controller：寶寶紀錄頁。接收 View 的操作 → 更新 LogModel → 叫 View 重畫。
import { LogModel } from '../models/logModel.js';
import { FEED, DIAPER, STOOL_COLORS, STOOL_WARNINGS, GROWTH_METRICS, ML } from '../data/logOptions.js';
import { dayKey } from '../utils/date.js';
import { $ } from '../utils/dom.js';
import { ProfileView } from '../views/log/profileView.js';
import { RecordView } from '../views/log/recordView.js';
import { TodayView } from '../views/log/todayView.js';
import { GrowthView } from '../views/log/growthView.js';
import { BackupView } from '../views/log/backupView.js';

const SYMPTOM_PAGE = './index.html';

/** 時間軸上每筆紀錄要顯示的文字 */
function describe(e) {
  if (e.type === 'feed') return `${FEED[e.kind]}${e.ml ? ` ${e.ml} ml` : ''}`;
  const color = STOOL_COLORS.find((c) => c.id === e.color);
  return `尿布：${DIAPER[e.kind]}${color ? `（${color.label}）` : ''}`;
}

export function startLogApp() {
  // 介面暫存狀態（不需要存檔的部分）
  let ml = ML.initial;
  let pendingDiaper = null;
  let metric = 'weight';

  const backup = new BackupView(
    { exportBtn: $('#exportBtn'), importFile: $('#importFile'), clearBtn: $('#clearBtn'), toast: $('#toast') },
    {
      onExport() {
        backup.download(model.exportJson(), `寶寶紀錄-${dayKey(new Date())}.json`);
      },
      onImport(text) {
        let data;
        try {
          data = LogModel.parseBackup(text);
        } catch {
          return backup.toast('檔案格式不正確', true);
        }
        if (!backup.confirm('匯入會取代目前這台裝置上的所有紀錄，確定嗎？')) return;
        model.replaceAll(data);
        renderAll();
        backup.toast('已匯入備份');
      },
      onClear() {
        if (!backup.confirm('確定要清除這台裝置上的所有紀錄嗎？建議先匯出備份。')) return;
        model.clear();
        renderAll();
      },
    },
  );
  const model = new LogModel((msg) => backup.toast(msg, true));

  // ---------- 畫面更新 ----------
  function renderProfile() {
    if (model.profile) profile.show(model.profile, model.ageText());
    else profile.edit(null);
  }

  function renderRecords() {
    const { events, summary } = model.today();
    today.renderToday(
      summary,
      events.map((e) => ({ id: e.id, time: new Date(e.t), type: e.type, text: describe(e) })),
      model.minutesSinceLastFeed(),
    );
    today.renderWeek(model.recentDays(7));
  }

  function renderGrowth() {
    growth.renderChart(model.growthPoints(metric), {
      metric, hasBirthDate: Boolean(model.profile?.birthDate), corrected: model.isPreterm(),
    });
    growth.renderTable([...model.growth].reverse());
  }

  function renderAll() {
    renderProfile();
    renderRecords();
    renderGrowth();
  }

  function addEvent(ev) {
    model.addEvent(record.time, ev);
    record.resetTime();
    renderRecords();
  }

  // ---------- 建立 View，接上操作 ----------
  const profile = new ProfileView($('#profileCard'), {
    onEdit: () => profile.edit(model.profile),
    onSave(values) {
      model.setProfile(values);
      renderProfile();
      renderGrowth();
      backup.toast('已儲存寶寶資料');
    },
  });

  const record = new RecordView(
    {
      when: $('#when'), mlOut: $('#mlOut'), colorPick: $('#colorPick'), colorBtns: $('#colorBtns'),
      colorSkip: $('#colorSkip'), alert: $('#stoolAlert'),
      feedButtons: document.querySelectorAll('[data-feed]'),
      mlButtons: document.querySelectorAll('[data-ml]'),
      diaperButtons: document.querySelectorAll('[data-diaper]'),
    },
    {
      onFeed(kind) {
        addEvent({ type: 'feed', kind, ...(kind === 'bottle' ? { ml } : {}) });
        backup.toast(`已記錄：${FEED[kind]}${kind === 'bottle' ? ` ${ml} ml` : ''}`);
      },
      onMlStep(delta) {
        ml = Math.min(ML.max, Math.max(ML.min, ml + delta));
        record.setMl(ml);
      },
      onDiaper(kind) {
        record.showAlert(null);
        if (kind === 'wet') {
          addEvent({ type: 'diaper', kind });
          backup.toast('已記錄：濕尿布');
          return;
        }
        pendingDiaper = kind; // 有大便：先問顏色
        record.showColorPicker(true);
      },
      onStoolColor(color) {
        addEvent({ type: 'diaper', kind: pendingDiaper, ...(color ? { color: color.id } : {}) });
        backup.toast(`已記錄：${DIAPER[pendingDiaper]}${color ? `（${color.label}）` : ''}`);
        record.showColorPicker(false);
        pendingDiaper = null;
        if (color?.warn) record.showAlert(STOOL_WARNINGS[color.warn], SYMPTOM_PAGE);
      },
    },
    STOOL_COLORS,
  );

  const today = new TodayView(
    { stats: $('#todayStats'), since: $('#sinceFeed'), timeline: $('#timeline'), week: $('#week') },
    {
      onDelete(id) {
        model.deleteEvent(id);
        renderRecords();
      },
    },
  );

  const growth = new GrowthView(
    { form: $('#growthForm'), tabs: $('#chartTabs'), chart: $('#growthChart'), table: $('#growthTable') },
    {
      onAdd(values) {
        if (!model.addGrowth(values)) return backup.toast('至少填一項數值', true);
        growth.resetForm();
        renderGrowth();
        backup.toast('已新增生長紀錄');
      },
      onMetricChange(m) {
        metric = m;
        renderGrowth();
      },
      onDelete(id) {
        model.deleteGrowth(id);
        renderGrowth();
      },
    },
    GROWTH_METRICS,
  );

  // ---------- 啟動 ----------
  renderAll();
  setInterval(renderRecords, 60000); // 每分鐘更新「距上次餵食」
}
