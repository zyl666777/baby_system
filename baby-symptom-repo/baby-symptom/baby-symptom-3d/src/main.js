import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createBaby, partCenter, setSkinColor, SKIN } from './baby.js';
import { parts, severityInfo, categories, symptoms as localSymptoms } from './symptoms.js';
import { sizeAt, pretermCategory, FULL_TERM_WEEKS } from './growth.js';

// ---------- 資料來源 ----------
// 在 .env 設定 VITE_API_URL=http://localhost:8080 就會改讀 Spring Boot 後端；沒設定或連不到就用本機資料
async function loadSymptoms() {
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

// ---------- 3D 場景 ----------
const viewport = document.getElementById('viewport');
const tooltip = document.getElementById('tooltip');
const labelsEl = document.getElementById('labels');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 2;
controls.maxDistance = 14;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.55;

scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfc4, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(3, 7, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
scene.add(sun);

const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.ShadowMaterial({ opacity: 0.12 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.1;
floor.receiveShadow = true;
scene.add(floor);

// 三個寶寶：一般模式用 main；對比模式用 preemie + term
const main = createBaby();
const preemie = createBaby({ onesie: 0xf4c7d4 });
const term = createBaby();
const holders = {};
for (const [role, baby] of Object.entries({ main, preemie, term })) {
  const holder = new THREE.Group(); // 外層負責位置，內層負責縮放
  holder.add(baby);
  baby.traverse((o) => o.isMesh && (o.userData.role = role));
  scene.add(holder);
  holders[role] = holder;
}
holders.preemie.position.x = -1.35;
holders.term.position.x = 1.35;

// 對比模式的名牌
const labels = {
  preemie: labelsEl.appendChild(Object.assign(document.createElement('div'), { className: 'label preemie' })),
  term: labelsEl.appendChild(Object.assign(document.createElement('div'), { className: 'label' })),
};

function resize() {
  const { clientWidth: w, clientHeight: h } = viewport;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);

// ---------- 狀態 ----------
const state = {
  symptoms: [],
  mode: 'general', // general | preemie
  weeks: 28,
  selectedPart: null,
  selectedSymptom: null,
  hoverPart: null,
  severityFilter: new Set(Object.keys(severityInfo)),
};

const VIEWS = {
  general: { target: new THREE.Vector3(0, 1.05, 0), pos: new THREE.Vector3(2.6, 2.4, 5.2) },
  preemie: { target: new THREE.Vector3(0, 0.75, 0), pos: new THREE.Vector3(0, 2.3, 7.4) },
};

// 被點選、會變色的寶寶
const activeBaby = () => (state.mode === 'general' ? main : preemie);
const pickables = () => {
  const list = [];
  activeBaby().traverse((o) => o.isMesh && list.push(o));
  return list;
};

// ---------- 早產兒大小 ----------
const PREEMIE_SKIN = new THREE.Color(0xeaa49b); // 週數越小，皮膚越紅、越薄

function applyWeeks() {
  const p = sizeAt(state.weeks);
  const t = sizeAt(FULL_TERM_WEEKS);
  const lengthRatio = p.length / t.length;
  const weightRatio = p.weight / t.weight;
  // 身長照比例縮；寬度依體重再縮一點，早產兒看起來比較瘦
  const widthRatio = Math.sqrt(weightRatio / lengthRatio);
  preemie.scale.set(widthRatio, lengthRatio, widthRatio);

  const redness = Math.min(1, Math.max(0, (37 - state.weeks) / 13)) * 0.75;
  setSkinColor(preemie, SKIN.clone().lerp(PREEMIE_SKIN, redness));

  document.getElementById('weeksOut').textContent = `${state.weeks} 週`;
  document.getElementById('weeksCat').textContent = pretermCategory(state.weeks);
  labels.preemie.textContent = `早產兒 ${state.weeks} 週`;
  labels.term.textContent = `足月 ${FULL_TERM_WEEKS} 週`;

  const rows = [
    ['身長', `${p.length} cm`, `${t.length} cm`, p.length / t.length],
    ['體重', `${p.weight.toLocaleString()} g`, `${t.weight.toLocaleString()} g`, p.weight / t.weight],
    ['頭圍', `${p.head} cm`, `${t.head} cm`, p.head / t.head],
  ];
  document.getElementById('statsBody').replaceChildren(...rows.map(([name, a, b, r]) => {
    const tr = document.createElement('tr');
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.setProperty('--w', `${Math.round(r * 100)}%`);
    bar.dataset.pct = `${Math.round(r * 100)}%`;
    for (const v of [name, a, b]) tr.append(Object.assign(document.createElement('td'), { textContent: v }));
    const td = document.createElement('td');
    td.append(bar);
    tr.append(td);
    return tr;
  }));
  paint();
}

// ---------- 上色 ----------
const DIM = new THREE.Color('#e8e4df');
function paint() {
  const sym = state.symptoms.find((s) => s.id === state.selectedSymptom);
  const highlight = new Map();
  if (sym) sym.parts.forEach((p) => highlight.set(p, new THREE.Color(severityInfo[sym.severity].color)));
  else if (state.selectedPart) highlight.set(state.selectedPart, new THREE.Color('#5b8def'));

  for (const baby of [main, preemie, term]) {
    const active = baby === activeBaby();
    baby.traverse((m) => {
      if (!m.isMesh || m.userData.decor) return;
      const id = m.userData.partId;
      const base = m.userData.baseColor;
      m.material.emissive.setRGB(0, 0, 0);
      if (active && highlight.has(id)) {
        m.material.color.copy(base).lerp(highlight.get(id), 0.6);
        m.material.emissive.copy(highlight.get(id)).multiplyScalar(0.15);
      } else if (active && highlight.size) {
        m.material.color.copy(base).lerp(DIM, 0.55);
      } else {
        m.material.color.copy(base);
      }
      if (active && id === state.hoverPart) m.material.emissive.addScalar(0.08);
    });
  }
}

// ---------- 鏡頭動畫 ----------
let camAnim = null;
function flyTo(target, pos) {
  camAnim = {
    fromPos: camera.position.clone(), fromTarget: controls.target.clone(),
    toTarget: target.clone(), toPos: pos.clone(), t: 0,
  };
}
// 畫面比較窄（手機直式）時把鏡頭拉遠，兩個寶寶才放得下
function homeView() {
  const v = VIEWS[state.mode];
  const need = state.mode === 'preemie' ? 1.05 : 0.75;
  const k = Math.max(1, need / camera.aspect);
  return { target: v.target, pos: v.target.clone().add(v.pos.clone().sub(v.target).multiplyScalar(k)) };
}
function flyHome() {
  const v = homeView();
  flyTo(v.target, v.pos);
}
function focusParts(partIds) {
  const baby = activeBaby();
  const center = new THREE.Vector3();
  partIds.forEach((p) => center.add(partCenter(baby, p)));
  center.divideScalar(partIds.length);
  const distance = partIds.length > 2 ? 4.6 : state.mode === 'preemie' ? 3.6 : 3.2;
  const dir = camera.position.clone().sub(controls.target).normalize();
  flyTo(center, center.clone().add(dir.multiplyScalar(distance)));
}

// ---------- 點選與滑過 ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;

function pick(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const targets = state.mode === 'preemie' ? [...pickables(), ...meshesOf(term)] : pickables();
  const hit = raycaster.intersectObjects(targets, false)[0];
  return hit ? { part: hit.object.userData.partId, role: hit.object.userData.role } : null;
}
function meshesOf(baby) {
  const list = [];
  baby.traverse((o) => o.isMesh && list.push(o));
  return list;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  const hit = pick(e);
  const activeHit = hit && hit.role !== 'term' ? hit.part : null;
  if (activeHit !== state.hoverPart) {
    state.hoverPart = activeHit;
    paint();
  }
  renderer.domElement.style.cursor = activeHit ? 'pointer' : 'grab';
  if (hit) {
    const rect = viewport.getBoundingClientRect();
    tooltip.textContent = hit.role === 'term' ? '足月寶寶（對照用）' : parts[hit.part].name;
    tooltip.style.left = `${e.clientX - rect.left + 14}px`;
    tooltip.style.top = `${e.clientY - rect.top + 14}px`;
    tooltip.hidden = false;
  } else tooltip.hidden = true;
});
renderer.domElement.addEventListener('pointerleave', () => {
  tooltip.hidden = true;
  state.hoverPart = null;
  paint();
});
renderer.domElement.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
  const hit = pick(e);
  if (hit && hit.role !== 'term') selectPart(hit.part);
  else if (!hit) clearSelection();
});

// ---------- 介面 ----------
const listEl = document.getElementById('symptomList');
const panelEl = document.getElementById('panel');
const filtersEl = document.getElementById('filters');

// 用 DOM API 建立元素：資料改由資料庫提供後，文字不會被當成 HTML 執行
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') Object.entries(v).forEach(([a, b]) => node.style.setProperty(a, b));
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.includes('-')) node.setAttribute(k, v);
    else node[k] = v;
  }
  node.append(...children.filter((c) => c != null));
  return node;
}
const badge = (sev) => el('span', { class: 'badge', style: { '--c': severityInfo[sev].color } }, severityInfo[sev].label);
const inMode = (s) => (s.category ?? 'general') === state.mode;

function selectPart(id) {
  state.selectedPart = id;
  state.selectedSymptom = null;
  focusParts([id]);
  render();
}
function selectSymptom(id) {
  const sym = state.symptoms.find((s) => s.id === id);
  state.selectedSymptom = id;
  focusParts(sym.parts);
  render();
}
function clearSelection() {
  state.selectedPart = null;
  state.selectedSymptom = null;
  flyHome();
  render();
}

function setMode(mode) {
  if (mode === state.mode) return;
  state.mode = mode;
  state.selectedPart = null;
  state.selectedSymptom = null;
  state.hoverPart = null;
  document.querySelectorAll('.mode').forEach((b) => {
    b.classList.toggle('on', b.dataset.mode === mode);
    b.setAttribute('aria-selected', b.dataset.mode === mode);
  });
  holders.main.visible = mode === 'general';
  holders.preemie.visible = holders.term.visible = mode === 'preemie';
  labelsEl.hidden = mode !== 'preemie';
  document.getElementById('compare').hidden = mode !== 'preemie';
  document.getElementById('modeHint').textContent = mode === 'preemie'
    ? '左邊是早產兒、右邊是足月寶寶。拉動週數比較大小，點早產兒身上的部位看常見問題。'
    : '點寶寶身上的部位，或從下方清單選一個症狀。';
  flyHome();
  render();
}

function renderFilters() {
  const used = new Set(state.symptoms.filter(inMode).map((s) => s.severity));
  filtersEl.replaceChildren(...Object.entries(severityInfo)
    .filter(([key]) => used.has(key))
    .map(([key, s]) => el('button', {
      type: 'button', class: `chip ${state.severityFilter.has(key) ? 'on' : ''}`,
      style: { '--c': s.color }, dataset: { sev: key }, 'aria-pressed': state.severityFilter.has(key),
    }, s.label)));
}

function renderList() {
  const visible = state.symptoms
    .filter(inMode)
    .filter((s) => state.severityFilter.has(s.severity))
    .filter((s) => !state.selectedPart || s.parts.includes(state.selectedPart))
    .sort((a, b) => severityInfo[a.severity].rank - severityInfo[b.severity].rank);

  const items = [];
  if (state.selectedPart) {
    items.push(el('li', { class: 'list-heading' },
      `${parts[state.selectedPart].name}的相關${state.mode === 'preemie' ? '問題' : '症狀'}`,
      el('button', { type: 'button', class: 'link', dataset: { clear: '' } }, '顯示全部')));
  }
  if (!visible.length) items.push(el('li', { class: 'empty' }, '這個條件下沒有項目'));
  for (const s of visible) {
    items.push(el('li', {}, el('button', {
      type: 'button', class: `symptom ${s.id === state.selectedSymptom ? 'active' : ''}`, dataset: { id: s.id },
    }, el('span', {}, s.name), badge(s.severity))));
  }
  listEl.replaceChildren(...items);
}

function renderPanel() {
  const sym = state.symptoms.find((s) => s.id === state.selectedSymptom);
  const nodes = [];
  if (sym) {
    nodes.push(
      el('div', { class: 'panel-head' }, badge(sym.severity), el('h2', {}, sym.name)),
      el('p', {}, sym.summary),
      el('h3', {}, '可能看到的徵兆'),
      el('ul', {}, ...sym.signs.map((x) => el('li', {}, x))),
      el('h3', { class: 'see-doctor', style: { '--c': severityInfo[sym.severity].color } }, '什麼時候要就醫'),
      el('p', {}, sym.whenToSeeDoctor),
      el('p', { class: 'muted small' }, `相關部位：${sym.parts.map((p) => parts[p]?.name ?? p).join('、')}`),
    );
  } else if (state.selectedPart) {
    nodes.push(el('h2', {}, parts[state.selectedPart].name), el('p', { class: 'muted' }, '從左邊清單選一個項目看說明。'));
  } else if (state.mode === 'preemie') {
    const p = sizeAt(state.weeks);
    nodes.push(
      el('h2', {}, `${state.weeks} 週出生的寶寶`),
      el('p', {}, `出生體重約 ${p.weight.toLocaleString()} 公克，大概是足月寶寶的 ${Math.round((p.weight / sizeAt(FULL_TERM_WEEKS).weight) * 100)}%。器官還在發育，所以比足月寶寶更容易出現呼吸、腸胃、眼睛、腦部等問題。`),
      el('h3', {}, '矯正年齡'),
      el('p', {}, `評估早產兒的生長和發展時，通常用「矯正年齡」：實際年齡減去提早出生的週數。例如 ${state.weeks} 週出生、現在 6 個月大，矯正年齡約為 ${correctedMonths(state.weeks, 6)} 個月。`),
      el('p', { class: 'muted' }, '點左邊早產兒身上的部位，或從清單選一個問題看說明。'),
    );
  } else {
    nodes.push(el('h2', {}, '從寶寶開始'), el('p', { class: 'muted' }, '拖曳可以旋轉寶寶，滾輪縮放。點身上任一部位，看看那裡可能出現哪些症狀。'));
  }
  panelEl.replaceChildren(...nodes);
}

function correctedMonths(weeks, actualMonths) {
  const earlyMonths = (FULL_TERM_WEEKS - weeks) / 4.345;
  return Math.max(0, actualMonths - earlyMonths).toFixed(1).replace(/\.0$/, '');
}

function render() {
  renderFilters();
  renderList();
  renderPanel();
  paint();
}

document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.getElementById('weeks').addEventListener('input', (e) => {
  state.weeks = Number(e.target.value);
  applyWeeks();
  if (!state.selectedPart && !state.selectedSymptom) renderPanel();
});
filtersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sev]');
  if (!btn) return;
  const k = btn.dataset.sev;
  state.severityFilter.has(k) ? state.severityFilter.delete(k) : state.severityFilter.add(k);
  render();
});
listEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-clear]')) return clearSelection();
  const btn = e.target.closest('[data-id]');
  if (btn) selectSymptom(btn.dataset.id);
});
document.getElementById('resetView').addEventListener('click', clearSelection);

// ---------- 主迴圈 ----------
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();

function placeLabel(label, baby) {
  tmp.set(0, 2.85, 0);
  baby.localToWorld(tmp);
  tmp.project(camera);
  const visible = tmp.z < 1;
  label.style.display = visible ? '' : 'none';
  label.style.transform = `translate(-50%, -100%) translate(${((tmp.x + 1) / 2) * viewport.clientWidth}px, ${((1 - tmp.y) / 2) * viewport.clientHeight}px)`;
}

function loop() {
  const dt = clock.getDelta();
  if (camAnim) {
    camAnim.t = Math.min(1, camAnim.t + dt / 0.8);
    const k = ease(camAnim.t);
    camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, k);
    controls.target.lerpVectors(camAnim.fromTarget, camAnim.toTarget, k);
    if (camAnim.t >= 1) camAnim = null;
  }
  // 呼吸起伏：早產兒呼吸比較快
  const time = clock.elapsedTime;
  main.position.y = Math.sin(time * 1.6) * 0.015;
  term.position.y = Math.sin(time * 1.6) * 0.015;
  preemie.position.y = Math.sin(time * 2.6) * 0.012;
  controls.update();
  renderer.render(scene, camera);
  if (state.mode === 'preemie') {
    placeLabel(labels.preemie, preemie);
    placeLabel(labels.term, term);
  }
  requestAnimationFrame(loop);
}

// ---------- 啟動 ----------
(async function init() {
  state.symptoms = await loadSymptoms();
  holders.preemie.visible = holders.term.visible = false;
  labelsEl.hidden = true;
  resize();
  const home = homeView();
  camera.position.copy(home.pos);
  controls.target.copy(home.target);
  applyWeeks();
  render();
  loop();
})();
