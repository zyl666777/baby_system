-- 初始資料：6 個部位 + 10 個一般症狀 + 9 個早產兒常見問題（狀態為 PUBLISHED，正式上線前請由兒科醫護審閱）

INSERT INTO body_part (code, name, sort_order) VALUES
  ('head', '頭部與臉', 1),
  ('chest', '胸部', 2),
  ('belly', '肚子', 3),
  ('diaper', '尿布區', 4),
  ('arms', '手臂', 5),
  ('legs', '腿', 6);

-- 呼吸困難
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (1, 'breathing', '呼吸困難', 'GENERAL', 'EMERGENCY', '寶寶呼吸費力或太快，可能是下呼吸道感染等狀況，需要立刻處理。', '出現任何一項都應立即前往急診，情況危急請撥 119。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (1, 'chest'), (1, 'head');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (1, 0, '呼吸明顯變快'),
  (1, 1, '鼻翼搧動'),
  (1, 2, '吸氣時肋骨間或胸骨下方凹陷'),
  (1, 3, '呼吸時發出呻吟聲'),
  (1, 4, '嘴唇或臉色發紫');

-- 抽搐
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (2, 'seizure', '抽搐', 'GENERAL', 'EMERGENCY', '全身或部分肢體不自主抽動，有時伴隨意識不清。', '讓寶寶側躺、不要往嘴裡塞東西，記下抽搐時間，立即就醫或撥 119。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (2, 'head'), (2, 'arms'), (2, 'legs');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (2, 0, '四肢規律抽動或僵直'),
  (2, 1, '眼睛上吊或凝視'),
  (2, 2, '叫不醒、沒有反應'),
  (2, 3, '嘴唇發紫');

-- 發燒
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (3, 'fever', '發燒', 'GENERAL', 'SOON', '體溫 38°C 以上通常視為發燒，是身體對抗感染的反應。', '未滿 3 個月的寶寶發燒應立即就醫。精神很差、叫不太醒、發燒超過 48 小時，也應盡快就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (3, 'head');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (3, 0, '摸起來發燙'),
  (3, 1, '活動力下降、比平常愛睡'),
  (3, 2, '喝奶量減少'),
  (3, 3, '持續哭鬧不易安撫');

-- 新生兒黃疸
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (4, 'jaundice', '新生兒黃疸', 'GENERAL', 'SOON', '新生兒常見，皮膚和眼白偏黃，多數在出生後幾天出現並逐漸消退。', '出生 24 小時內就變黃、黃到肚子以下或手腳、大便顏色偏白（可對照兒童健康手冊的嬰兒大便辨識卡），或寶寶嗜睡吃不好，應盡快就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (4, 'head'), (4, 'chest'), (4, 'belly'), (4, 'legs');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (4, 0, '黃色從臉部往身體、手腳蔓延'),
  (4, 1, '眼白變黃'),
  (4, 2, '大便顏色變淡或呈灰白色');

-- 脫水
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (5, 'dehydration', '脫水', 'GENERAL', 'SOON', '腹瀉、嘔吐或喝奶量減少時，寶寶容易流失水分。', '超過 6 小時沒有尿、精神變差或持續嘔吐喝不下，應盡快就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (5, 'head'), (5, 'diaper');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (5, 0, '前囟門凹陷'),
  (5, 1, '嘴唇和口腔乾燥'),
  (5, 2, '哭的時候眼淚很少'),
  (5, 3, '尿布濕的次數明顯變少');

-- 嘔吐
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (6, 'vomiting', '嘔吐', 'GENERAL', 'SOON', '喝奶後少量溢奶很常見；用力、大量或反覆的嘔吐則需要注意。', '吐出綠色或帶血、肚子鼓脹、反覆噴射狀嘔吐，請立即就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (6, 'belly');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (6, 0, '噴射狀嘔吐'),
  (6, 1, '每次餵完都吐'),
  (6, 2, '吐出物帶綠色或血絲'),
  (6, 3, '肚子鼓脹、摸起來硬');

-- 鼻塞與咳嗽
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (7, 'cold', '鼻塞與咳嗽', 'GENERAL', 'HOME', '感冒常見症狀，多數在一到兩週內改善。', '呼吸變喘、發燒、喝奶量明顯減少，或症狀超過兩週沒有改善，應就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (7, 'head'), (7, 'chest');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (7, 0, '流鼻水、鼻塞'),
  (7, 1, '喝奶時因鼻塞中斷'),
  (7, 2, '輕微咳嗽');

-- 腸絞痛
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (8, 'colic', '腸絞痛', 'GENERAL', 'HOME', '健康的寶寶每天長時間哭鬧、難以安撫，常在傍晚發生，通常幾個月大後會改善。', '伴隨發燒、嘔吐、血便、體重增加不良，或哭聲和平常明顯不同，應就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (8, 'belly');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (8, 0, '大哭時臉漲紅'),
  (8, 1, '雙腿縮向肚子'),
  (8, 2, '握拳、身體用力');

-- 尿布疹
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (9, 'diaper-rash', '尿布疹', 'GENERAL', 'HOME', '尿布區皮膚因潮濕、摩擦而發紅，勤換尿布、保持乾燥通常會改善。', '破皮流湯、出現膿疱、範圍擴大，或照護 3 天仍未改善，應就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (9, 'diaper');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (9, 0, '屁股或鼠蹊部發紅'),
  (9, 1, '皮膚粗糙或小紅點'),
  (9, 2, '換尿布時哭鬧');

-- 濕疹
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (10, 'eczema', '濕疹', 'GENERAL', 'HOME', '皮膚乾燥、發紅發癢，常出現在臉頰、手肘和膝蓋。', '範圍擴大、滲液結痂、疑似感染，或影響睡眠時，應就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (10, 'head'), (10, 'arms'), (10, 'legs');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (10, 0, '皮膚乾燥脫屑'),
  (10, 1, '紅色粗糙斑塊'),
  (10, 2, '寶寶會磨蹭或抓癢');

-- 呼吸窘迫症候群
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (11, 'rds', '呼吸窘迫症候群', 'PREEMIE', 'EMERGENCY', '肺部還沒發育成熟、缺少讓肺泡撐開的表面張力素，肺泡容易塌陷，出生後不久就呼吸困難，通常在新生兒加護病房治療。', '多在出生後住院期間處理。出院後若再出現呼吸費力、胸部凹陷或膚色發紫，請立即就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (11, 'chest');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (11, 0, '呼吸急促'),
  (11, 1, '吸氣時胸部凹陷'),
  (11, 2, '呼氣時發出呻吟聲'),
  (11, 3, '膚色發紫');

-- 早產兒呼吸暫停
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (12, 'apnea', '早產兒呼吸暫停', 'PREEMIE', 'EMERGENCY', '控制呼吸的腦部還沒成熟，呼吸會短暫停止，常伴隨心跳變慢，出生週數越小越常見。', '在家發現寶寶停止呼吸或膚色發紫，立即輕拍刺激寶寶並撥 119。出院前可請醫護人員教導嬰兒急救。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (12, 'chest'), (12, 'head');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (12, 0, '呼吸停止約 20 秒以上'),
  (12, 1, '膚色發白或發紫'),
  (12, 2, '身體變軟、沒有反應');

-- 壞死性腸炎
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (13, 'nec', '壞死性腸炎', 'PREEMIE', 'EMERGENCY', '腸道受損發炎，嚴重時腸壁會壞死，多發生在開始餵食之後的早產兒。', '肚子脹合併嘔吐綠色液體、血便或活動力變差，請立即就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (13, 'belly');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (13, 0, '肚子鼓脹、摸起來緊繃'),
  (13, 1, '嘔吐，或吐出綠色液體'),
  (13, 2, '大便帶血'),
  (13, 3, '活動力和吸奶力變差');

-- 支氣管肺發育不良
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (14, 'bpd', '支氣管肺發育不良', 'PREEMIE', 'SOON', '早產兒長時間需要氧氣或呼吸器後，肺部發育受到影響，出院後可能仍需氧氣，也比較容易因呼吸道感染而加重。', '依醫囑使用氧氣與藥物。感冒時呼吸變喘應盡快就醫；出現胸部凹陷或膚色發紫請立即就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (14, 'chest');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (14, 0, '呼吸比一般寶寶快'),
  (14, 1, '容易喘'),
  (14, 2, '感冒時症狀比較嚴重');

-- 體溫調節不佳
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (15, 'hypothermia', '體溫調節不佳', 'PREEMIE', 'SOON', '早產兒皮下脂肪少、體表面積相對大，比足月寶寶容易失溫。', '先幫寶寶保暖並量體溫。體溫持續偏低（腋溫低於 36.5°C）或合併活動力變差，請盡快就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (15, 'head'), (15, 'chest'), (15, 'belly'), (15, 'arms'), (15, 'legs');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (15, 0, '身體或手腳摸起來冰涼'),
  (15, 1, '膚色發白或出現花斑'),
  (15, 2, '活動力和吸奶力變差');

-- 早產兒視網膜病變
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (16, 'rop', '早產兒視網膜病變', 'PREEMIE', 'FOLLOW', '眼睛的視網膜血管還沒長完，可能長得不正常，嚴重時會影響視力。符合條件的早產兒需由眼科醫師定期篩檢。', '依醫師安排的時間回診做眼底檢查，不要錯過。長大後若發現眼睛對不到焦、斜視或對光線反應差，請就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (16, 'head');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (16, 0, '早期通常看不出異狀'),
  (16, 1, '需靠眼科檢查才能發現');

-- 腦室內出血
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (17, 'ivh', '腦室內出血', 'PREEMIE', 'FOLLOW', '早產兒腦部的血管很脆弱，可能在腦室周圍出血，多發生在出生後頭幾天，住院期間會用頭部超音波追蹤。', '依醫師安排做頭部超音波與發展評估。在家發現前囟門鼓起、頭圍增加過快或抽搐，請立即就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (17, 'head');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (17, 0, '輕度時常沒有明顯症狀'),
  (17, 1, '嚴重時可能抽搐、活動力差'),
  (17, 2, '前囟門鼓起');

-- 開放性動脈導管
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (18, 'pda', '開放性動脈導管', 'PREEMIE', 'FOLLOW', '心臟附近一條出生後應該關閉的血管（動脈導管）沒有關閉，可能增加心臟和肺的負擔。', '依小兒心臟科安排追蹤。出現呼吸變喘、吸奶量明顯減少時請就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (18, 'chest');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (18, 0, '醫師聽到心雜音'),
  (18, 1, '呼吸比較喘'),
  (18, 2, '吸奶容易累'),
  (18, 3, '體重增加慢');

-- 早產兒貧血
INSERT INTO symptom (id, code, name, category, severity, summary, when_to_see_doctor, status, created_at, updated_at, updated_by) VALUES
  (19, 'anemia', '早產兒貧血', 'PREEMIE', 'FOLLOW', '早產兒體內儲存的鐵質少、製造紅血球的速度慢，常會貧血，醫師可能會開鐵劑。', '依醫囑補充鐵劑並回診抽血追蹤。明顯蒼白合併呼吸喘、活動力差時請就醫。', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system');
INSERT INTO symptom_body_part (symptom_id, part_code) VALUES (19, 'head'), (19, 'chest');
INSERT INTO symptom_sign (symptom_id, sort_order, content) VALUES
  (19, 0, '膚色蒼白'),
  (19, 1, '比較容易累'),
  (19, 2, '吸奶時容易喘'),
  (19, 3, '體重增加較慢');

-- 讓自動編號從 11 開始，避免和上面手動指定的 id 衝突
ALTER TABLE symptom ALTER COLUMN id RESTART WITH 20;
