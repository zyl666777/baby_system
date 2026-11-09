// 寶寶紀錄頁的進入點：只負責啟動 Controller
import { mountEmergencyTicker } from './views/shared/emergencyTicker.js';
import { startLogApp } from './controllers/logController.js';

mountEmergencyTicker();
startLogApp();
