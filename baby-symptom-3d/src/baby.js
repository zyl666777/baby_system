import * as THREE from 'three';

// 「積木寶寶」：用基本形狀拼出寶寶，每個可點的部位都有 userData.partId。
// 之後換成 .glb 模型時，只要模型裡的物件名稱對應到 symptoms.js 的 parts，main.js 幾乎不用改。

export const SKIN = new THREE.Color(0xf3c9a8);
const DIAPER = 0xf6f3ee;
const ONESIE = 0xa9cce3;

function mat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0 });
}

function addPart(group, geometry, color, partId, { skin = false } = {}) {
  const mesh = new THREE.Mesh(geometry, mat(color));
  mesh.userData.partId = partId;
  mesh.userData.baseColor = mesh.material.color.clone();
  mesh.userData.isSkin = skin;
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function addDecor(group, geometry, color, partId) {
  const mesh = new THREE.Mesh(geometry, mat(color));
  mesh.userData.partId = partId;
  mesh.userData.decor = true; // 裝飾，不跟著變色
  group.add(mesh);
  return mesh;
}

/** 坐姿寶寶，高度約 2.6 單位，腳底在 y = -0.1 附近 */
export function createBaby({ onesie = ONESIE } = {}) {
  const baby = new THREE.Group();

  // 頭（寶寶的頭比例比大人大）
  const head = addPart(baby, new THREE.SphereGeometry(0.62, 48, 32), SKIN, 'head', { skin: true });
  head.position.set(0, 2.0, 0);

  for (const side of [-1, 1]) {
    const ear = addPart(baby, new THREE.SphereGeometry(0.13, 16, 12), SKIN, 'head', { skin: true });
    ear.position.set(side * 0.6, 2.0, 0);
    ear.scale.set(0.6, 1, 0.8);

    const eye = addDecor(baby, new THREE.SphereGeometry(0.06, 16, 12), 0x2b2b2b, 'head');
    eye.position.set(side * 0.2, 2.07, 0.57);

    const cheek = addDecor(baby, new THREE.SphereGeometry(0.09, 16, 12), 0xf2a7a0, 'head');
    cheek.position.set(side * 0.33, 1.9, 0.5);
    cheek.scale.set(1, 0.6, 0.4);
  }
  const mouth = addDecor(baby, new THREE.TorusGeometry(0.07, 0.018, 8, 24, Math.PI), 0x8a4b45, 'head');
  mouth.position.set(0, 1.85, 0.6);
  mouth.rotation.z = Math.PI;

  // 脖子：把頭和身體接起來
  const neck = addPart(baby, new THREE.CylinderGeometry(0.22, 0.26, 0.3, 24), SKIN, 'head', { skin: true });
  neck.position.set(0, 1.5, 0);

  // 胸部
  const chest = addPart(baby, new THREE.CapsuleGeometry(0.5, 0.25, 8, 24), onesie, 'chest');
  chest.position.set(0, 1.12, 0);
  chest.scale.set(1, 0.9, 0.8);

  // 肚子
  const belly = addPart(baby, new THREE.SphereGeometry(0.55, 32, 24), onesie, 'belly');
  belly.position.set(0, 0.66, 0.04);
  belly.scale.set(1, 0.75, 0.85);

  // 尿布區
  const diaper = addPart(baby, new THREE.SphereGeometry(0.52, 32, 24), DIAPER, 'diaper');
  diaper.position.set(0, 0.28, 0);
  diaper.scale.set(1.05, 0.6, 0.85);

  // 手臂：肩膀球 + 手臂 + 手，接在胸部兩側
  for (const side of [-1, 1]) {
    const shoulder = addPart(baby, new THREE.SphereGeometry(0.19, 20, 16), onesie, 'arms');
    shoulder.position.set(side * 0.46, 1.32, 0);

    const arm = addPart(baby, new THREE.CapsuleGeometry(0.15, 0.42, 8, 16), SKIN, 'arms', { skin: true });
    arm.position.set(side * 0.6, 1.02, 0.08);
    arm.rotation.z = side * 0.32;
    arm.rotation.x = -0.25;

    const hand = addPart(baby, new THREE.SphereGeometry(0.15, 16, 12), SKIN, 'arms', { skin: true });
    hand.position.set(side * 0.7, 0.72, 0.18);
  }

  // 腿：坐姿往前伸，腳掌朝上
  for (const side of [-1, 1]) {
    const leg = addPart(baby, new THREE.CapsuleGeometry(0.19, 0.55, 8, 16), SKIN, 'legs', { skin: true });
    leg.position.set(side * 0.3, 0.1, 0.5);
    leg.rotation.x = Math.PI / 2;

    const foot = addPart(baby, new THREE.SphereGeometry(0.17, 16, 12), SKIN, 'legs', { skin: true });
    foot.position.set(side * 0.31, 0.2, 0.98);
    foot.scale.set(0.85, 1.25, 0.75);
  }

  return baby;
}

/** 改變皮膚底色（早產兒皮膚較紅、較透） */
export function setSkinColor(baby, color) {
  baby.traverse((o) => {
    if (o.isMesh && o.userData.isSkin) o.userData.baseColor.copy(color);
  });
}

/** 計算某個部位在世界座標中的中心點，給鏡頭對焦用 */
export function partCenter(baby, partId) {
  baby.updateMatrixWorld(true);
  const box = new THREE.Box3();
  baby.traverse((obj) => {
    if (obj.isMesh && obj.userData.partId === partId) box.expandByObject(obj);
  });
  return box.isEmpty() ? baby.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
}
