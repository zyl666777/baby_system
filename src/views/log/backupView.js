// View：匯出、匯入、清除按鈕，以及提示訊息
import { el } from '../../utils/dom.js';

export class BackupView {
  /**
   * @param els { exportBtn, importFile, clearBtn, toast }
   * @param {{ onExport(), onImport(text), onClear() }} handlers
   */
  constructor(els, handlers) {
    this.els = els;
    els.exportBtn.addEventListener('click', () => handlers.onExport());
    els.clearBtn.addEventListener('click', () => handlers.onClear());
    els.importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) handlers.onImport(await file.text());
    });
  }

  download(text, filename) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  confirm(message) {
    return window.confirm(message);
  }

  toast(message, isError = false) {
    const t = this.els.toast;
    t.textContent = message;
    t.className = `toast${isError ? ' err' : ''}`;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (t.hidden = true), 2400);
  }
}
