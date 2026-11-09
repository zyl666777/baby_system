// 育兒資源頁的進入點：只負責啟動 Controller
import { mountEmergencyTicker } from './views/shared/emergencyTicker.js';
import './resources.css';
import { startResourceApp } from './controllers/resourceController.js';

mountEmergencyTicker();
startResourceApp();
