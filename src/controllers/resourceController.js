// Controller：育兒資源頁。接收 View 的操作 → 更新 ResourceModel → 叫 View 重畫。
import { CENTRAL, COUNTY_BONUS_SOURCE, CHILDCARE_LINKS } from '../data/policies.js';
import { ResourceModel, estimate } from '../models/resourceModel.js';
import { $ } from '../utils/dom.js';
import { PolicyView } from '../views/resources/policyView.js';
import { CalcView } from '../views/resources/calcView.js';
import { MapView } from '../views/resources/mapView.js';
import { FacilityListView } from '../views/resources/facilityListView.js';
import { createFeedback } from './feedbackController.js';

// 相對路徑：部署在 GitHub Pages 子路徑（/repo-name/）時也找得到
const FACILITY_URL = `${import.meta.env.BASE_URL}data/childcare.json`;
const STORE_KEY = 'baby-resources-county';

export async function startResourceApp() {
  const model = new ResourceModel();
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) model.setCounty(saved);
  } catch { /* 無痕模式等情況讀不到，就用預設 */ }

  // ---------- 畫面更新 ----------
  function renderCalc() {
    const v = calc.values();
    calc.render(model.county.name, estimate({ countyId: model.countyId, ...v }), v.care);
  }

  function renderFacilities() {
    const items = model.visibleFacilities();
    const all = model.facilities.filter((f) => f.county === model.county.name);
    map.renderCounties(model.counties, model.countByCounty(), model.countyId);
    const mapped = map.render(model.county, items, model.selectedFacility);
    facilities.render(items, model.selectedFacility, model.county.name);
    facilities.renderMeta(model.facilityMeta, mapped, all.length);
  }

  function renderCounty() {
    policy.renderSelect(model.counties, model.countyId, model.countByCounty());
    policy.renderCounty(model.county, COUNTY_BONUS_SOURCE);
    renderCalc();
    renderFacilities();
  }

  function pick(id) {
    model.selectedFacility = id;
    facilities.render(model.visibleFacilities(), id, model.county.name);
    facilities.scrollTo(id);
    map.highlight(id);
  }

  // ---------- 建立 View，接上操作 ----------
  function changeCounty(id) {
    model.setCounty(id);
    try { localStorage.setItem(STORE_KEY, id); } catch { /* 存不了不影響使用 */ }
    renderCounty();
  }

  const report = createFeedback();

  const policy = new PolicyView(
    { central: $('#central'), select: $('#county'), county: $('#countyCard') },
    { onCounty: changeCounty, onReport: (t) => report({ page: 'RESOURCE', ...t }) },
  );

  const calc = new CalcView({ form: $('#calcForm'), result: $('#calcResult') }, { onChange: renderCalc });

  const map = new MapView($('#map'), { onPick: pick, onCounty: changeCounty });

  const facilities = new FacilityListView(
    { list: $('#facilityList'), search: $('#facilitySearch'), meta: $('#facilityMeta'), links: $('#childcareLinks') },
    {
      onSearch(q) {
        model.setQuery(q);
        model.selectedFacility = null;
        renderFacilities();
      },
      onPick: pick,
      onReport: (f) => report({ page: 'RESOURCE', code: model.countyId, name: `托育據點：${f.name}` }),
    },
  );

  // ---------- 啟動 ----------
  policy.renderCentral(CENTRAL);
  facilities.renderLinks(CHILDCARE_LINKS);
  renderCounty(); // 先畫政策與試算，托育資料讀完再補

  try {
    await model.loadFacilities(FACILITY_URL);
  } catch (err) {
    console.warn(err);
  }
  renderCounty();
  window.addEventListener('resize', () => map.resize());
}
