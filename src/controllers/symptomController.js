// Controller：接收 View 回報的操作 → 更新 Model → 叫 View 重畫。
// 這裡沒有畫面細節，也沒有資料規則，只負責串接。
import { SymptomModel, loadSymptoms, CARE_NOTE } from '../models/symptomModel.js';
import { SceneView } from '../views/sceneView.js';
import { ListView } from '../views/listView.js';
import { PanelView } from '../views/panelView.js';
import { CompareView } from '../views/compareView.js';
import { createFeedback } from './feedbackController.js';

export async function startSymptomApp() {
  const model = new SymptomModel(await loadSymptoms());
  const byId = (id) => document.getElementById(id);

  // ---------- 畫面更新 ----------
  function renderSidebar() {
    list.renderList(
      model.visibleSymptoms().map((s) => ({ id: s.id, name: s.name })),
      {
        selectedId: model.selectedSymptomId,
        heading: model.selectedPart
          ? `${model.partName(model.selectedPart)}的相關${model.mode === 'preemie' ? '問題' : '症狀'}`
          : null,
      },
    );
  }

  function renderPanel() {
    const sym = model.selectedSymptom;
    if (sym) panel.showSymptom(sym, CARE_NOTE, sym.parts.map((p) => model.partName(p)));
    else if (model.selectedPart) panel.showPart(model.partName(model.selectedPart));
    else if (model.mode === 'preemie') panel.showPreemieIntro(model.comparison());
    else panel.showWelcome();
  }

  const paint = () => scene.paint(model.highlight(), model.hoverPart);

  function renderAll() {
    renderSidebar();
    renderPanel();
    paint();
  }

  function renderComparison() {
    const c = model.comparison();
    compare.renderComparison(c);
    scene.setPreemieSize(c);
    paint();
  }

  // ---------- 使用者操作 ----------
  const actions = {
    selectPart(part) {
      model.selectPart(part);
      scene.focusParts([part]);
      renderAll();
    },
    selectSymptom(id) {
      model.selectSymptom(id);
      scene.focusParts(model.selectedSymptom.parts);
      renderAll();
    },
    clear() {
      model.clearSelection();
      scene.flyHome();
      renderAll();
    },
    setMode(mode) {
      if (!model.setMode(mode)) return;
      scene.setMode(mode);
      compare.setMode(mode);
      scene.flyHome();
      renderAll();
    },
    setWeeks(weeks) {
      model.setWeeks(weeks);
      renderComparison();
      if (!model.selectedPart && !model.selectedSymptomId) renderPanel();
    },
  };

  // ---------- 建立 View，把操作接到 actions ----------
  const scene = new SceneView(
    { viewport: byId('viewport'), tooltip: byId('tooltip'), labels: byId('labels') },
    {
      onHover(hit) {
        const part = hit && hit.role !== 'term' ? hit.part : null;
        if (model.setHover(part)) paint();
        if (!hit) return null;
        return hit.role === 'term' ? '足月寶寶（對照用）' : model.partName(hit.part);
      },
      onPick(hit) {
        if (hit.role !== 'term') actions.selectPart(hit.part); // 足月寶寶只是對照，點了不動作
      },
      onEmptyClick: actions.clear,
    },
  );
  const list = new ListView(
    { list: byId('symptomList') },
    { onSelectSymptom: actions.selectSymptom, onClear: actions.clear },
  );
  const report = createFeedback();
  const panel = new PanelView(byId('panel'), {
    onReport: (sym) => report({ page: 'SYMPTOM', code: sym.id, name: sym.name }),
  });
  const compare = new CompareView(
    {
      modeButtons: document.querySelectorAll('.mode'), hint: byId('modeHint'), card: byId('compare'),
      weeks: byId('weeks'), weeksOut: byId('weeksOut'), weeksCat: byId('weeksCat'),
      statsBody: byId('statsBody'), reset: byId('resetView'),
    },
    { onModeChange: actions.setMode, onWeeksChange: actions.setWeeks, onReset: actions.clear },
  );

  // ---------- 啟動 ----------
  scene.setMode(model.mode);
  scene.resize();
  scene.flyHome({ instant: true });
  renderComparison();
  renderAll();
  scene.start();
}
