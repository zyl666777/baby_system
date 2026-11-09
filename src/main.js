// 症狀圖解頁的進入點：只負責啟動 Controller
import { mountEmergencyTicker } from './views/shared/emergencyTicker.js';
import { startSymptomApp } from './controllers/symptomController.js';

mountEmergencyTicker();
startSymptomApp();
