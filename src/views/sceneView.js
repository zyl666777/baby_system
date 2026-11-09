// View：Three.js 3D 場景。只負責畫面和偵測點擊，不知道症狀資料；
// 使用者的操作透過 handlers 回報給 Controller。
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createBaby, partCenter, setSkinColor, SKIN } from './babyMesh.js';

const CAMERA_VIEWS = {
  general: { target: new THREE.Vector3(0, 1.05, 0), pos: new THREE.Vector3(2.6, 2.4, 5.2) },
  preemie: { target: new THREE.Vector3(0, 0.75, 0), pos: new THREE.Vector3(0, 2.3, 7.4) },
};
const PREEMIE_SKIN = new THREE.Color(0xeaa49b); // 週數越小，皮膚越紅、越薄
const DIM = new THREE.Color('#e8e4df');
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class SceneView {
  /**
   * @param {{ viewport: HTMLElement, tooltip: HTMLElement, labels: HTMLElement }} els
   * @param {{ onHover(hit): string|null, onPick(hit), onEmptyClick() }} handlers
   *   hit = { part, role } 或 null；onHover 回傳提示框要顯示的文字
   */
  constructor(els, handlers) {
    this.els = els;
    this.handlers = handlers;
    this.mode = 'general';
    this.camAnim = null;
    this.#setupScene();
    this.#setupBabies();
    this.#setupPointer();
    new ResizeObserver(() => this.resize()).observe(els.viewport);
  }

  #setupScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.els.viewport.appendChild(this.renderer.domElement);

    const c = (this.controls = new OrbitControls(this.camera, this.renderer.domElement));
    Object.assign(c, { enableDamping: true, minDistance: 2, maxDistance: 14, enablePan: false, maxPolarAngle: Math.PI * 0.55 });

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfc4, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 7, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
    this.scene.add(sun);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.ShadowMaterial({ opacity: 0.12 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  // 三個寶寶：一般模式用 main；對比模式用 preemie + term
  #setupBabies() {
    this.babies = { main: createBaby(), preemie: createBaby({ onesie: 0xf4c7d4 }), term: createBaby() };
    this.holders = {};
    for (const [role, baby] of Object.entries(this.babies)) {
      const holder = new THREE.Group(); // 外層負責位置，內層負責縮放
      holder.add(baby);
      baby.traverse((o) => o.isMesh && (o.userData.role = role));
      this.scene.add(holder);
      this.holders[role] = holder;
    }
    this.holders.preemie.position.x = -1.35;
    this.holders.term.position.x = 1.35;

    const label = (cls) => this.els.labels.appendChild(Object.assign(document.createElement('div'), { className: cls }));
    this.labelEls = { preemie: label('label preemie'), term: label('label') };
  }

  #setupPointer() {
    const canvas = this.renderer.domElement;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    let downAt = null;

    canvas.addEventListener('pointermove', (e) => {
      const hit = this.#pick(e);
      const label = this.handlers.onHover(hit);
      canvas.style.cursor = hit && hit.role !== 'term' ? 'pointer' : 'grab';
      this.#showTooltip(e, label);
    });
    canvas.addEventListener('pointerleave', () => {
      this.els.tooltip.hidden = true;
      this.handlers.onHover(null);
    });
    canvas.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      // 移動超過 5px 視為拖曳旋轉，不算點擊
      if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
      const hit = this.#pick(e);
      if (hit) this.handlers.onPick(hit);
      else this.handlers.onEmptyClick();
    });
  }

  #meshes(baby) {
    const list = [];
    baby.traverse((o) => o.isMesh && list.push(o));
    return list;
  }

  get #activeBaby() {
    return this.mode === 'general' ? this.babies.main : this.babies.preemie;
  }

  #pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = this.mode === 'preemie'
      ? [...this.#meshes(this.babies.preemie), ...this.#meshes(this.babies.term)]
      : this.#meshes(this.babies.main);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    return hit ? { part: hit.object.userData.partId, role: hit.object.userData.role } : null;
  }

  #showTooltip(e, label) {
    const tip = this.els.tooltip;
    if (!label) {
      tip.hidden = true;
      return;
    }
    const rect = this.els.viewport.getBoundingClientRect();
    tip.textContent = label;
    tip.style.left = `${e.clientX - rect.left + 14}px`;
    tip.style.top = `${e.clientY - rect.top + 14}px`;
    tip.hidden = false;
  }

  // ---------- 給 Controller 呼叫的方法 ----------
  resize() {
    const { clientWidth: w, clientHeight: h } = this.els.viewport;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    this.mode = mode;
    this.holders.main.visible = mode === 'general';
    this.holders.preemie.visible = this.holders.term.visible = mode === 'preemie';
    this.els.labels.hidden = mode !== 'preemie';
  }

  /** 依早產兒與足月的比例縮放模型、調整膚色 */
  setPreemieSize({ weeks, termWeeks, lengthRatio, weightRatio }) {
    // 身長照比例縮；寬度依體重再縮一點，早產兒看起來比較瘦
    const widthRatio = Math.sqrt(weightRatio / lengthRatio);
    this.babies.preemie.scale.set(widthRatio, lengthRatio, widthRatio);
    const redness = Math.min(1, Math.max(0, (37 - weeks) / 13)) * 0.75;
    setSkinColor(this.babies.preemie, SKIN.clone().lerp(PREEMIE_SKIN, redness));
    this.labelEls.preemie.textContent = `早產兒 ${weeks} 週`;
    this.labelEls.term.textContent = `足月 ${termWeeks} 週`;
  }

  /** @param {Record<string,string>} highlight { partId: '#hex' }；@param hoverPart 滑過的部位 */
  paint(highlight, hoverPart) {
    const colors = Object.fromEntries(Object.entries(highlight).map(([k, v]) => [k, new THREE.Color(v)]));
    const any = Object.keys(colors).length > 0;
    for (const baby of Object.values(this.babies)) {
      const active = baby === this.#activeBaby;
      baby.traverse((m) => {
        if (!m.isMesh || m.userData.decor) return;
        const id = m.userData.partId;
        const base = m.userData.baseColor;
        m.material.emissive.setRGB(0, 0, 0);
        if (active && colors[id]) {
          m.material.color.copy(base).lerp(colors[id], 0.6);
          m.material.emissive.copy(colors[id]).multiplyScalar(0.15);
        } else if (active && any) {
          m.material.color.copy(base).lerp(DIM, 0.55); // 其他部位淡化
        } else {
          m.material.color.copy(base);
        }
        if (active && id === hoverPart) m.material.emissive.addScalar(0.08);
      });
    }
  }

  /** 鏡頭回到預設位置；畫面較窄（手機直式）時拉遠 */
  flyHome({ instant = false } = {}) {
    const v = CAMERA_VIEWS[this.mode];
    const need = this.mode === 'preemie' ? 1.05 : 0.75;
    const k = Math.max(1, need / this.camera.aspect);
    const pos = v.target.clone().add(v.pos.clone().sub(v.target).multiplyScalar(k));
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(v.target);
    } else this.#flyTo(v.target, pos);
  }

  focusParts(partIds) {
    const baby = this.#activeBaby;
    const center = new THREE.Vector3();
    partIds.forEach((p) => center.add(partCenter(baby, p)));
    center.divideScalar(partIds.length);
    const distance = partIds.length > 2 ? 4.6 : this.mode === 'preemie' ? 3.6 : 3.2;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.#flyTo(center, center.clone().add(dir.multiplyScalar(distance)));
  }

  #flyTo(target, pos) {
    this.camAnim = { fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(), toTarget: target.clone(), toPos: pos.clone(), t: 0 };
  }

  #placeLabel(label, baby) {
    const p = new THREE.Vector3(0, 2.85, 0);
    baby.localToWorld(p);
    p.project(this.camera);
    label.style.display = p.z < 1 ? '' : 'none';
    const { clientWidth: w, clientHeight: h } = this.els.viewport;
    label.style.transform = `translate(-50%, -100%) translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px)`;
  }

  start() {
    const clock = new THREE.Clock();
    const { main, preemie, term } = this.babies;
    const loop = () => {
      const dt = clock.getDelta();
      if (this.camAnim) {
        const a = this.camAnim;
        a.t = Math.min(1, a.t + dt / 0.8);
        const k = ease(a.t);
        this.camera.position.lerpVectors(a.fromPos, a.toPos, k);
        this.controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
        if (a.t >= 1) this.camAnim = null;
      }
      // 呼吸起伏：早產兒呼吸比較快
      const time = clock.elapsedTime;
      main.position.y = term.position.y = Math.sin(time * 1.6) * 0.015;
      preemie.position.y = Math.sin(time * 2.6) * 0.012;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      if (this.mode === 'preemie') {
        this.#placeLabel(this.labelEls.preemie, preemie);
        this.#placeLabel(this.labelEls.term, term);
      }
      requestAnimationFrame(loop);
    };
    loop();
  }
}
