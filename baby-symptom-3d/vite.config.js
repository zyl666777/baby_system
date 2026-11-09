import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// base: './' 讓打包後的檔案用相對路徑，
// 放在 GitHub Pages 的子路徑（https://帳號.github.io/repository名稱/）也能正常載入
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // 三個頁面：症狀圖解、寶寶紀錄、育兒資源
      input: {
        main: resolve(__dirname, 'index.html'),
        log: resolve(__dirname, 'log.html'),
        resources: resolve(__dirname, 'resources.html'),
      },
    },
  },
});
