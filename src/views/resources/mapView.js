// View：Leaflet 地圖。只畫有座標的據點；用 circleMarker 避免打包後預設圖示路徑失效。
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export class MapView {
  /** @param {HTMLElement} node  @param {{ onPick(id:number):void, onCounty(id:string):void }} handlers */
  constructor(node, handlers) {
    this.handlers = handlers;
    this.map = L.map(node, { scrollWheelZoom: false }).setView([23.7, 121], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者',
    }).addTo(this.map);
    this.countyLayer = L.layerGroup().addTo(this.map); // 各縣市據點數（概略位置）
    this.layer = L.layerGroup().addTo(this.map); // 個別據點（有座標才畫）
    this.markers = new Map();
  }

  /** 縣市改變：移到該縣市；有據點座標時縮放到能看到全部 */
  render(county, facilities, selectedId) {
    this.layer.clearLayers();
    this.markers.clear();
    const pts = [];
    for (const f of facilities) {
      if (typeof f.lat !== 'number' || typeof f.lng !== 'number') continue;
      const m = L.circleMarker([f.lat, f.lng], style(f.id === selectedId))
        // Leaflet 會把字串當 HTML 放進 tooltip，所以改傳文字節點（防 XSS）
        .bindTooltip(textNode(f.name))
        .on('click', () => this.handlers.onPick(f.id));
      m.addTo(this.layer);
      this.markers.set(f.id, m);
      pts.push([f.lat, f.lng]);
    }
    if (pts.length > 1) this.map.fitBounds(pts, { padding: [24, 24], maxZoom: 14 });
    else if (pts.length === 1) this.map.setView(pts[0], 14);
    else this.map.setView([county.lat, county.lng], 11);
    return pts.length;
  }

  /** 每個有資料的縣市畫一個數字泡泡，點了就切換縣市。位置是縣市政府附近的概略點，不是據點本身。 */
  renderCounties(counties, counts, currentId) {
    this.countyLayer.clearLayers();
    for (const c of counties) {
      const n = counts.get(c.name);
      if (!n) continue;
      const icon = L.divIcon({
        className: `county-bubble${c.id === currentId ? ' active' : ''}`,
        html: String(n), // 數字，沒有使用者文字
        iconSize: [34, 34],
      });
      L.marker([c.lat, c.lng], { icon, keyboard: true, title: `${c.name} ${n} 處` })
        .on('click', () => this.handlers.onCounty(c.id))
        .addTo(this.countyLayer);
    }
  }

  highlight(selectedId) {
    for (const [id, m] of this.markers) m.setStyle(style(id === selectedId));
    const m = this.markers.get(selectedId);
    if (m) {
      m.bringToFront();
      this.map.panTo(m.getLatLng());
      m.openTooltip();
    }
  }

  /** 容器大小改變（例如手機轉向）後要通知 Leaflet */
  resize() {
    this.map.invalidateSize();
  }
}

function style(active) {
  return {
    radius: active ? 10 : 7,
    color: '#ffffff',
    weight: 2,
    fillColor: active ? '#c0392b' : '#3d6fd6',
    fillOpacity: 0.9,
  };
}

function textNode(s) {
  const span = document.createElement('span');
  span.textContent = s;
  return span;
}
