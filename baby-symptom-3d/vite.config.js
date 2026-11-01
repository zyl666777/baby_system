import { defineConfig } from 'vite';

// base: './' 讓打包後的檔案用相對路徑，
// 放在 GitHub Pages 的子路徑（https://帳號.github.io/repository名稱/）也能正常載入
export default defineConfig({
  base: './',
});
