// ================================================
// Cyber Formula Mini Race - 遊戲引擎
// ================================================

console.log('[game.js] 遊戲引擎加載中...');

try {


        const SCALE = 5;
        const CARWIDTH = 90;
        const CARHEIGHT = 150;
        
        const canvas = document.getElementById('game');
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
		
		// 新增儀表板 Context
		const dashCanvas = document.getElementById('dashboardCanvas');
		const dashCtx = dashCanvas.getContext('2d');
		
        
        let player = null, allCars = [], gameState = 'title', mode = '', countdown = 0;
        let selectedCar = 0, playerCarImg = new Image(), trackImg = null;
        let keys = {}, touch = {}, lap = 0, totalLaps = 3, raceFinished = false, currentTrack = 0;
        let boostParticles = []; // 加速特效粒子
		let tireMarks = [];      // 新增：胎痕/飄移痕跡
		let dustParticles = [];  // 新增：塵土粒子
		
		// 在 init 或 script 開頭加入這個變數
		let sandPattern = null;
		
		const miniCanvas = document.getElementById('minimapCanvas');
		const miniCtx = miniCanvas.getContext('2d');
		const MW = miniCanvas.width, MH = miniCanvas.height;
		let mapScale = 0.5; // Minimap 縮放比例 (會在 loadTrack 時計算)
		let mapOffsetX = 0, mapOffsetY = 0; // Minimap 繪製偏移量
		
		
		// 新增一個函數：預先產生沙地材質 (只執行一次，效能更好)
		function createSandPattern() {
			const pCanvas = document.createElement('canvas');
			pCanvas.width = 64;
			pCanvas.height = 64;
			const pCtx = pCanvas.getContext('2d');

			// 1. 填滿底色 (不透明)
			pCtx.fillStyle = '#C2B280'; // 沙色
			pCtx.fillRect(0, 0, 64, 64);

			// 2. 畫雜點 (SFC 風格)
			pCtx.fillStyle = '#B0A070'; // 深一點的沙色
			for(let i=0; i<40; i++) {
				pCtx.fillRect(Math.random()*64, Math.random()*64, 2, 2);
			}
			pCtx.fillStyle = '#D6C690'; // 淺一點的沙色
			for(let i=0; i<40; i++) {
				pCtx.fillRect(Math.random()*64, Math.random()*64, 2, 2);
			}

			return ctx.createPattern(pCanvas, 'repeat');
		}
		
		
		// 1. 視覺升級：繪製沙地背景 (替代原本的單色背景)
		function drawSandBackground(ctx, offsetX, offsetY) {
			const patternSize = 100;
			ctx.save();
			ctx.fillStyle = '#C2B280'; // 沙地底色
			ctx.fillRect(0, 0, W, H);
			
			// 畫一點雜點質感
			ctx.fillStyle = 'rgba(160, 140, 80, 0.3)';
			for (let i=0; i<W; i+=50) {
				for (let j=0; j<H; j+=50) {
					// 根據位置偏移製造流動感，或者固定紋理
					if ((i+j)%100 === 0) ctx.fillRect(i, j, 50, 50);
				}
			}
			ctx.restore();
		}

		// 2. 視覺升級：改進的賽道繪製 (加入紅白路緣石)
		function drawCurrentTrackRoad(ctx, offsetX, offsetY) {
			const t = TRACKS[currentTrack];
			const wps = t.waypoints;
			if (!wps || !wps.length) return;

			ctx.save();
			ctx.lineJoin = 'round';
			// 修正 1：將 lineCap 從 'round' 改為 'butt'，防止在閉合點產生白色溢出
			ctx.lineCap = 'butt'; 

			// 建立路徑 (只做一次路徑，重複描邊)
			ctx.beginPath();
			ctx.moveTo(wps[0].x * SCALE - offsetX, wps[0].y * SCALE - offsetY);
			for (let i = 1; i < wps.length; i++) {
				ctx.lineTo(wps[i].x * SCALE - offsetX, wps[i].y * SCALE - offsetY);
			}
			ctx.closePath();
			
			// --- 修正 2：新增：第零層 (最底層) 黑色邊界 ---
			// 寬度設為 720，比路緣石 700 寬 20px，確保能包住所有溢出
			ctx.lineWidth = 720; 
			ctx.strokeStyle = '#000000'; // 純黑色，用於覆蓋任何白色邊緣
			ctx.stroke();

			// --- 第一層：路緣石底色 (紅色) ---
			ctx.lineWidth = 700; 
			ctx.strokeStyle = '#d32f2f'; // 賽車紅
			ctx.stroke(); 

			// --- 第二層：路緣石相間色 (白色虛線) ---
			ctx.lineWidth = 700;
			ctx.strokeStyle = '#ffffff';
			ctx.setLineDash([50, 50]); 
			ctx.lineDashOffset = -Date.now() / 20; 
			ctx.stroke(); 
			
			ctx.setLineDash([]); // 重置虛線

			// --- 第三層：柏油路面 (灰色) ---
			// 寬度 550，左右各留 75px 紅白路緣石
			ctx.lineWidth = 550;
			ctx.strokeStyle = '#555555'; // 深灰路面
			ctx.stroke(); 

			// --- 第四層：中央分隔線 ---
			ctx.lineWidth = 6;
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
			ctx.setLineDash([80, 100]);
			ctx.stroke();
			
			ctx.restore();
		}
        
		// 導入完整的飄移物理模型
		function updateCarPhysics(car, acceleration, steering) {
			// 保持上次微調後的最佳參數
			const MAX_SPEED = 23; 
			const sideFrictionFactor = 0.95; 
			// 【修正 1：極限甩尾力度 (2.5 -> 3.0)】
			const sideSpeedGeneration = 3.0; 
			
			// 轉向角度限制
			steering = Math.max(-0.4, Math.min(steering, 0.4));
			
			car.forwardSpeed = (car.forwardSpeed || car.speed || 0) + acceleration;
			car.forwardSpeed = Math.max(-10, Math.min(car.forwardSpeed, MAX_SPEED));

			// 車輛旋轉 (Car Rotation)
			car.angle += steering * car.forwardSpeed / 10; 

			// 飄移物理 (Drift Physics)
			car.sideSpeed = car.sideSpeed || 0;
			if(Math.abs(steering) > 0.01) {
				// 側滑方向反轉 (維持車尾向外甩的效果)
				car.sideSpeed -= car.forwardSpeed * steering * sideSpeedGeneration; 
			}
			
			car.sideSpeed *= sideFrictionFactor; 
			
			// 阻力
			car.forwardSpeed *= 0.992; 
			
			// 轉換為實際的 X/Y 移動
			const totalSpeed = Math.hypot(car.forwardSpeed, car.sideSpeed);
			const driftAngle = Math.atan2(car.sideSpeed, car.forwardSpeed);
			const actualAngle = car.angle + driftAngle;

			car.x += Math.cos(actualAngle) * totalSpeed;
			car.y += Math.sin(actualAngle) * totalSpeed;
			
			car.speed = totalSpeed; 
			car.driftAngle = driftAngle; 
		}

		// 3. HUD 升級：繪製類比儀表板
		function drawDashboard(speed) {
			const w = dashCanvas.width;
			const h = dashCanvas.height;
			const cx = w / 2;
			const cy = h - 20;
			const radius = 160;

			// 1. 重要：完全清除畫布，保持透明背景
			dashCtx.clearRect(0, 0, w, h);

			const startAngle = Math.PI;       // 180度 (左)
			const endAngle = Math.PI * 2;     // 360度 (右)
			const maxSpeed = 30; 
			const speedPct = Math.min(Math.abs(speed), maxSpeed) / maxSpeed;
			const currentAngle = startAngle + (endAngle - startAngle) * speedPct;

			// 2. 畫儀表背板 (半透明黑色弧形，而非矩形)
			dashCtx.beginPath();
			dashCtx.arc(cx, cy, radius, startAngle, endAngle);
			dashCtx.lineWidth = 40;
			dashCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)'; // 只有刻度條後面有半透明黑
			dashCtx.stroke();

			// 3. 畫顏色漸層條
			const grad = dashCtx.createLinearGradient(0, 0, w, 0);
			grad.addColorStop(0.2, '#00ff00');
			grad.addColorStop(0.6, '#ffff00');
			grad.addColorStop(1.0, '#ff0000');

			dashCtx.beginPath();
			dashCtx.arc(cx, cy, radius, startAngle, endAngle);
			dashCtx.lineWidth = 20;
			dashCtx.lineCap = 'butt';
			dashCtx.strokeStyle = 'rgba(255,255,255,0.1)'; // 未亮起的底色
			dashCtx.stroke();

			// 亮起的部分
			dashCtx.beginPath();
			dashCtx.arc(cx, cy, radius, startAngle, currentAngle);
			dashCtx.lineWidth = 20;
			dashCtx.strokeStyle = grad;
			dashCtx.stroke();

			// 4. 畫指針 (更銳利)
			dashCtx.save();
			dashCtx.translate(cx, cy);
			dashCtx.rotate(currentAngle);
			
			dashCtx.beginPath();
			dashCtx.moveTo(0, 0);
			dashCtx.lineTo(radius + 10, 0); // 指針稍微凸出一點
			dashCtx.lineWidth = 4;
			dashCtx.strokeStyle = '#fff';
			dashCtx.shadowBlur = 10;
			dashCtx.shadowColor = '#fff';
			dashCtx.stroke();
			dashCtx.restore();

			// 5. 數字速度 (科幻字體)
			dashCtx.font = 'italic bold 60px Orbitron';
			dashCtx.fillStyle = '#fff';
			dashCtx.textAlign = 'center';
			dashCtx.shadowBlur = 15;
			dashCtx.shadowColor = '#00ffff';
			const kmh = Math.round(Math.abs(speed) * 20);
			dashCtx.fillText(kmh, cx, cy - 50);
			
			dashCtx.font = '20px Rajdhani';
			dashCtx.fillStyle = '#aaa';
			dashCtx.shadowBlur = 0;
			dashCtx.fillText("KM/H", cx, cy - 25);
		}
		
		// 導入完整的飄移物理模型
		function updateCarPhysics(car, acceleration, steeringAngle) {
			// 1. 轉向角度限制
			steeringAngle = Math.max(-0.4, Math.min(steeringAngle, 0.4));
			
			// 2. 應用加速度 (forwardSpeed 是車頭指向的速度)
			car.forwardSpeed = (car.forwardSpeed || car.speed) + acceleration;

			// 3. 車速限制
			const maxSpeed = 26;
			car.forwardSpeed = Math.max(-10, Math.min(car.forwardSpeed, maxSpeed));

			// 4. 轉向與前進速度
			// 讓轉向更敏感
			car.angle += steeringAngle * car.forwardSpeed / 15; 

			// 5. 飄移物理 (極端化飄移感)
			
			// 【極端修正 1.1：基礎摩擦力極低 (0.05)】
			// 數值越接近 0，車輛側滑的距離越長/愈滑。
			const frictionFactor = 0.05 - (car.spec.handling || 1) * 0.02; 
			
			// 飄移側滑速度生成
			car.sideSpeed = car.sideSpeed || 0;
			if(Math.abs(steeringAngle) > 0.01) {
				// 【極端修正 1.2：大幅增加側滑速度生成率 (0.2)】
				car.sideSpeed += car.forwardSpeed * steeringAngle * 0.2; 
			}
			
			// 應用摩擦力
			car.sideSpeed *= frictionFactor; 
			
			// 6. 空氣阻力/減速 
			car.forwardSpeed *= 0.99;
			
			// 7. 將 forwardSpeed 和 sideSpeed 轉換為實際的 X/Y 移動
			const totalSpeed = Math.hypot(car.forwardSpeed, car.sideSpeed);
			const driftAngle = Math.atan2(car.sideSpeed, car.forwardSpeed);
			const actualAngle = car.angle + driftAngle;

			car.x += Math.cos(actualAngle) * totalSpeed;
			car.y += Math.sin(actualAngle) * totalSpeed;
			
			// 更新 car 物件的屬性以供其他函數使用 (例如 HUD 和火花判斷)
			car.speed = totalSpeed;
			car.driftAngle = driftAngle;
		}
				
				

		// 【Minimap 函數：繪製地圖與車輛點】
		function drawMinimap() {
			// 清理畫布
			miniCtx.clearRect(0, 0, MW, MH);
			
			const t = TRACKS[currentTrack];
			
			// 1. 繪製賽道輪廓
			miniCtx.save();
			
			// **修正點 1: 增大線寬，確保可見**
			miniCtx.lineWidth = 4; // 調整為固定的 2 像素線寬，確保在小圖上清晰可見
			miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; // 調高透明度
			miniCtx.lineJoin = 'round';
			miniCtx.lineCap = 'round';
			
			const wps = t.waypoints;
			if (wps.length > 0) {
				miniCtx.beginPath();
				
				// 轉換第一個點
				// 座標轉換公式: 遊戲座標 * mapScale + mapOffset
				miniCtx.moveTo(
					wps[0].x * SCALE * mapScale + mapOffsetX,
					wps[0].y * SCALE * mapScale + mapOffsetY
				);
				
				// 連接所有路點
				for (let i = 1; i < wps.length; i++) {
					miniCtx.lineTo(
						wps[i].x * SCALE * mapScale + mapOffsetX,
						wps[i].y * SCALE * mapScale + mapOffsetY
					);
				}
				
				// **修正點 2: 繪製線條並閉合路徑**
				miniCtx.closePath(); // 將最後一個點連回第一個點
				miniCtx.stroke();    // 繪製線條
			}
			miniCtx.restore();
			
			// 2. 繪製所有車輛點
			const carsToDraw = [...allCars, player];
			const pointSize = 5; 
			
			carsToDraw.forEach(car => {
				// 將遊戲座標轉換為 Minimap 座標
				const miniX = car.x * mapScale + mapOffsetX;
				const miniY = car.y * mapScale + mapOffsetY;
				
				// 設置顏色和點形狀 (玩家: 紅色，AI: 黃色)
				miniCtx.fillStyle = (car === player) ? 'red' : 'yellow';
				miniCtx.beginPath();
				miniCtx.arc(miniX, miniY, pointSize, 0, Math.PI * 2);
				miniCtx.fill();
				
				// 讓玩家點更突出
				if (car === player) {
					miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
					miniCtx.lineWidth = 1.5;
					miniCtx.stroke();
				}
			});
		}	
		
        
        // 碰撞檢測函數
		function checkCollisions(car1, car2) {
		  const dx = car2.x - car1.x;
		  const dy = car2.y - car1.y;
		  const dist = Math.hypot(dx, dy);
		  // 保持碰撞半徑不變
		  const minDist = (CARWIDTH + CARHEIGHT) / 3;

		  if (dist < minDist) {
			const push = (minDist - dist) * 0.4;
			const nx = dx / (dist || 1);
			const ny = dy / (dist || 1);

			car1.x -= nx * push;
			car1.y -= ny * push;
			car2.x += nx * push;
			car2.y += ny * push;

			// 只係略略衰減速度，唔交換
			// 在新物理模型下，直接衰減 forwardSpeed 
			car1.forwardSpeed *= 0.9;
			car2.forwardSpeed *= 0.9;
		  }
		}

		// 改進的AI超車邏輯
		function followWaypoints(car) {
		  if (car.waypointIndex == null) car.waypointIndex = 0;
		  const wp = TRACKS[currentTrack].waypoints;
		  if (!wp.length) return;

		  const baseTarget = wp[car.waypointIndex];
		  let tx = baseTarget.x * SCALE;
		  let ty = baseTarget.y * SCALE;

		  const nextIndex = (car.waypointIndex + 1) % wp.length;
		  const nx = wp[nextIndex].x * SCALE;
		  const ny = wp[nextIndex].y * SCALE;
		  let dirX = nx - tx;
		  let dirY = ny - ty;
		  const len = Math.hypot(dirX, dirY) || 1;
		  dirX /= len; dirY /= len;
		  const nX = -dirY;
		  const nY = dirX;

		  const baseOffset = car.laneOffset || 0; // 基礎的左右偏移 (例如 +60 或 -60)

		  // --- 1. 找前車 ---
		  let frontCar = null;
		  let minDist = Infinity;
		  const candidates = [...allCars, player].filter(c => c !== car);
		  candidates.forEach(other => {
			const dx = other.x - car.x;
			const dy = other.y - car.y;
			const dist = Math.hypot(dx, dy);
			const rel = dx * dirX + dy * dirY;   // 前後
			if (rel > 0 && dist < 260 && dist < minDist) {
			  minDist = dist;
			  frontCar = other;
			}
		  });

		  // --- 2. 決定有冇進入 overtake 模式 ---
		  const wantOvertake = frontCar &&
			minDist < 280 &&                    // 幾近
			car.forwardSpeed > (frontCar.forwardSpeed || 0) + 1;  // 明顯快過前面 (使用 forwardSpeed)

		  if (car.overtakeTimer <= 0 && wantOvertake) {
			// 開始一個 1~2 秒嘅超車窗口
			car.overtakeTimer = 60 + Math.random() * 60;
			// 決定超車方向: 盡量向著前車冇嘅方向
			const sideRaw = Math.sign((frontCar.x - car.x) * nX + (frontCar.y - car.y) * nY);
			car.overtakeSide = sideRaw === 0 ? (Math.random() < 0.5 ? -1 : 1) : sideRaw;
		  }

		  if (car.overtakeTimer > 0) {
			car.overtakeTimer--;
		  } else {
			car.overtakeSide = 0;
		  }

		  // --- 3. 計最終 targetOffset ---
		  let targetOffset = baseOffset; 
		  const AVOID_OFFSET = 150;
		  const OVERTAKE_OFFSET = 400; 

		  if (car.overtakeSide !== 0) {
			targetOffset = baseOffset + car.overtakeSide * OVERTAKE_OFFSET;
		  } else if (frontCar && minDist < 280) {
			const side = Math.sign((frontCar.x - car.x) * nX + (frontCar.y - frontCar.y) * nY) || 1;
			targetOffset = baseOffset + side * AVOID_OFFSET;
		  }

		  // 平滑過渡到 targetOffset
		  car.currentOffset = car.currentOffset || baseOffset;
		  car.currentOffset += (targetOffset - car.currentOffset) * 0.05; 

		  // 使用平滑過渡後的 currentOffset 來計算最終目標點
		  const targetX = tx + nX * car.currentOffset;
		  const targetY = ty + nY * car.currentOffset;

		  const dx = targetX - car.x;
		  const dy = targetY - car.y;
		  const distToWp = Math.hypot(dx, dy);
		  if (distToWp < 500) {
			car.waypointIndex = (car.waypointIndex + 1) % wp.length;
		  }

		  const targetAngle = Math.atan2(dy, dx);
		  let angleDiff = targetAngle - car.angle;
		  angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
		  
		  // **新：AI 轉向角輸入 (給物理函數用)**
		  let steeringAngle = angleDiff * 0.25; 
		  

		  // --- 4. 速度控制 (使用 acceleration 代替直接修改 speed) ---
		  const sf = car.speedFactor || 1;
		  const maxSpeedBase = (26 + Math.random() * 4) * sf; // **AI 最高速與玩家同步**
		  let acceleration = 0;

		  if (frontCar && minDist < 120 && car.overtakeSide === 0) {
			// 跟車時，如果速度太快，則剎車
			if (car.forwardSpeed > maxSpeedBase * 0.5) {
				 acceleration = -3; // 剎車減速
			} else {
				 acceleration = car.spec.acceleration * 0.03;
			}
		  } else {
			// 正常 / 超車
			acceleration = car.spec.acceleration * 0.06;
			if (car.forwardSpeed > maxSpeedBase) {
				 acceleration = 0; // 達到最高速
			}
		  }

		  // 呼叫新的物理函數，更新 car 的位置和速度
		  updateCarPhysics(car, acceleration, steeringAngle);
		}


        
        function loadTrack(i) {
            currentTrack = i;
            trackImg = new Image();
            trackImg.onload = () => {
                document.getElementById('hud').textContent = `TRACK: ${TRACKS[i].name}`;
            };
            trackImg.src = TRACKS[i].bgImage;
			
			// **【Minimap 修正 1：計算縮放比例與偏移】**
			const t = TRACKS[i];
			const waypointsX = t.waypoints.map(w => w.x);
			const waypointsY = t.waypoints.map(w => w.y);
			
			// 找出賽道的最大/最小座標 (單位：像素)
			const minX = Math.min(...waypointsX) * SCALE;
			const maxX = Math.max(...waypointsX) * SCALE;
			const minY = Math.min(...waypointsY) * SCALE;
			const maxY = Math.max(...waypointsY) * SCALE;

			const trackWidth = maxX - minX;
			const trackHeight = maxY - minY;

			// 計算縮放比例，以適應 200x200 的 Minimap 空間
			mapScale = Math.min(
				(MW - 10) / trackWidth, // 左右留 5px 邊距
				(MH - 10) / trackHeight // 上下留 5px 邊距
			);
			
			// 計算繪製偏移量，讓地圖居中
			mapOffsetX = (MW / 2) - ((minX + maxX) / 2) * mapScale;
			mapOffsetY = (MH / 2) - ((minY + maxY) / 2) * mapScale;
			
        }
		
        
        function openTrackSelect(m) {
            mode = m;
            document.getElementById('mainMenu').classList.remove('active');
            document.getElementById('trackSelect').classList.add('active');
            const grid = document.getElementById('trackGrid');
            grid.innerHTML = '';
            TRACKS.forEach((t, i) => {
                const d = document.createElement('div');
                d.className = `track-card ${i === currentTrack ? 'selected' : ''}`;
                d.innerHTML = `<img src="${t.bgImage}"><br>${t.name}`;
                d.onclick = () => {
                    currentTrack = i;
                    grid.querySelectorAll('.track-card').forEach(c => c.classList.remove('selected'));
                    d.classList.add('selected');
                    loadTrack(i);
                };
                grid.appendChild(d);
            });
        }

		// **【修正後的 buildCarList 邏輯】**
		function buildCarList() {
			const container = document.getElementById('carList'); 
			container.innerHTML = ''; 

			// 1. 按車隊分組
			const teams = {};
			CARSPECS.forEach((spec, index) => {
				// 修正：使用 [^/] 匹配任何非斜線的字符，以確保可以捕獲包含空格的資料夾名稱 (如 UNION SAVIOR)
				const teamNameMatch = spec.image.match(/^([^/]+)\//); 
				
				// 由於您要求移除 'Others'，我們假設所有路徑都應包含資料夾名稱
				let teamName = teamNameMatch ? teamNameMatch[1] : 'ERROR_NO_FOLDER'; 
				
				// 處理多字元隊名並首字母大寫
				// 步驟1: 將底線和連字符替換成空格
				teamName = teamName.replace(/[-_]/g, ' '); 
				// 步驟2: 將所有單詞的首字母大寫，並將其餘字母轉為小寫
				teamName = teamName.split(' ').map(word => 
					 word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
				).join(' ');

				if (!teams[teamName]) {
					teams[teamName] = [];
				}
				teams[teamName].push({ ...spec, index: index });
			});

			// 2. 遍歷分組並生成 HTML 結構
			Object.keys(teams).sort().forEach(teamName => { // 加上 .sort() 讓車隊按字母排序
				
				// 確保不顯示任何錯誤分類
				if (teamName === 'Error No Folder') return; 

				const carsInTeam = teams[teamName];

				// 創建車隊標題
				const header = document.createElement('div');
				header.className = 'team-header';
				header.textContent = teamName + ' Team';
				container.appendChild(header);

				// 創建車輛列表容器
				const ul = document.createElement('ul');
				ul.className = 'car-list-container';

				carsInTeam.forEach(car => {
					const li = document.createElement('li');
					li.className = `card ${car.index === selectedCar ? 'selected' : ''}`;
					li.setAttribute('data-index', car.index);

					// 圖像元素
					const img = document.createElement('img');
					img.src = car.image;
					img.alt = car.image;

					// 簡單的車名顯示
					const baseName = car.image.split('/').pop().replace('.png', '').replace(/_/g, ' ');
					const carName = document.createElement('p');
					carName.textContent = baseName;
					carName.style.fontSize = '12px';
					carName.style.margin = '5px 0 0';
					carName.style.color = '#ccc';
					carName.style.fontFamily = 'Rajdhani, sans-serif';

					li.appendChild(img);
					li.appendChild(carName);

					// 處理選中狀態的點擊事件
					li.onclick = () => {
						const selectedIndex = parseInt(li.getAttribute('data-index'));
						selectedCar = selectedIndex;

						// 更新所有車輛的選中狀態
						document.querySelectorAll('#carMenu .card').forEach(item => {
							item.classList.remove('selected');
						});
						li.classList.add('selected');
					};

					ul.appendChild(li);
				});

				container.appendChild(ul);
			});
		}
		// **【修正後的 buildCarList 邏輯 結束】**

        
		function startRace() {
			allCars = [];
			const t = TRACKS[currentTrack];
			if (mode === 'championship') {
				const a = CARSPECS.map((_, i) => i).filter(i => i !== selectedCar);
				const chosen = [];
				while (chosen.length < 10 && a.length > 0) {
					chosen.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
				}
				chosen.forEach((idx, i) => {
					const img = new Image();
					img.src = CARSPECS[idx].image;
					const p = t.gridPositions[i];
					allCars.push({
					  x: p.x * SCALE,
					  y: p.y * SCALE,
					  angle: t.playerStart.angle, 
					  // **新增飄移物理屬性**
					  forwardSpeed: 0, 
					  sideSpeed: 0,
					  speed: 0, // 保持為總速度，用於 HUD
					  spec: CARSPECS[idx],
					  img: img,
					  waypointIndex: 0,
					  overtakeTimer: 0,
					  overtakeSide: 0,
					  laneOffset: (i % 2 === 0 ? -60 : 60),
					  currentOffset: (i % 2 === 0 ? -60 : 60), 
					  speedFactor: 0.9 + Math.random() * 0.3  
					});
				});
			}
			player = {
				x: t.playerStart.x * SCALE, y: t.playerStart.y * SCALE,
				angle: t.playerStart.angle , speed: 0,
				spec: CARSPECS[selectedCar], img: playerCarImg,
				raceTime: 0,
                forwardSpeed: 0, // 新增
                sideSpeed: 0,    // 新增
                driftAngle: 0    // 新增
			};
			countdown = 5;
			gameState = 'countdown';
			lap = 0;
			totalLaps = 3;
			raceFinished = false;
			
			player.prevY = player.y;
			document.getElementById('lapHud').textContent = `LAP 0/${totalLaps}`;
			
		}
        
        function drawTrackFromWaypoints(ctx, track, scale = 1, offsetX = 0, offsetY = 0) {
            const wps = track.waypoints;
            if (!wps || !wps.length) return;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(wps[0].x * scale + offsetX, wps[0].y * scale + offsetY);
            for (let i = 1; i < wps.length; i++) {
                ctx.lineTo(wps[i].x * scale + offsetX, wps[i].y * scale + offsetY);
            }
            ctx.lineTo(wps[0].x * scale + offsetX, wps[0].y * scale + offsetY);
            const roadWidth = 250;
            const edgeWidth = 10;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = roadWidth;
            ctx.stroke();
            ctx.strokeStyle = '#bbbbbb';
            ctx.lineWidth = roadWidth - edgeWidth * 2;
            ctx.stroke();
            ctx.restore();
        }
        
        function drawStartGrid(ctx, track, scale, offsetX, offsetY) {
            const grid = track.gridPositions;
            if (!grid || !grid.length || !track.start || !track.playerStart) return;
            ctx.save();
            // Start line
            const sx0 = track.start.x;
            const sy0 = track.start.y;
            const px0 = track.playerStart.x;
            const py0 = track.playerStart.y;
            let dirX = sx0 - px0;
            let dirY = sy0 - py0;
            const len = Math.hypot(dirX, dirY);
            dirX /= len;
            dirY /= len;
            const perpX = -dirY;
            const perpY = dirX;
            const sx = sx0 * scale - offsetX;
            const sy = sy0 * scale - offsetY;
            const lineLen = 650 * scale;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(sx - perpX * lineLen / 2, sy - perpY * lineLen / 2);
            ctx.lineTo(sx + perpX * lineLen / 2, sy + perpY * lineLen / 2);
            ctx.stroke();
            
            // Grid positions
            const boxL = 220;
            const boxW = 90;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 4;
            ctx.fillStyle = '#ffffff';
            ctx.font = '26px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            grid.forEach((p, idx) => {
                const gx = p.x * scale - offsetX;
                const gy = p.y * scale - offsetY;
                const halfL = boxL / 2;
                const halfW = boxW / 2;
                const p1x = gx - halfL * dirX - halfW * perpX;
                const p1y = gy - halfL * dirY - halfW * perpY;
                const p2x = gx + halfL * dirX - halfW * perpX;
                const p2y = gy + halfL * dirY - halfW * perpY;
                const p3x = gx + halfL * dirX + halfW * perpX;
                const p3y = gy + halfL * dirY + halfW * perpY;
                const p4x = gx - halfL * dirX + halfW * perpX;
                const p4y = gy - halfL * dirY + halfW * perpY;
                ctx.beginPath();
                ctx.moveTo(p1x, p1y);
                ctx.lineTo(p2x, p2y);
                ctx.lineTo(p3x, p3y);
                ctx.lineTo(p4x, p4y);
                ctx.closePath();
                ctx.stroke();
                ctx.fillText(idx + 1, gx, gy);
            });
            ctx.restore();
        }
		
		// 【修正點 2 & 3: 特效調整與火花修復】
		function emitBoostForCar(car, isPlayer) {

			// 生成火焰粒子
				for (let i = 0; i < 2; i++) { // 增加粒子數量到 4 讓效果更明顯
					boostParticles.push({
						x: car.x + Math.cos(car.angle + Math.PI) * 40,
						y: car.y + Math.sin(car.angle + Math.PI) * 40,
						vx: (Math.random() - 0.5) * 2,
						vy: (Math.random() - 0.5) * 2 + 1,
						life: 20, 
						maxLife: 20,
						isSpark: false // 標記為非火花
					});
				}
			}
        
		function emitDustForCar(car, isPlayer, carMaxSpeed) {
			const TIRE_MARK_THRESHOLD = 1.0; 
			let DRIFT_SPEED_THRESHOLD;

			// 玩家的特效需要在較高速度 (60%) 才能觸發
			if (isPlayer) {
				DRIFT_SPEED_THRESHOLD = carMaxSpeed * 0.6; 
			} else {
				// AI 的特效需要極低速度 (40%) 就能觸發
				DRIFT_SPEED_THRESHOLD = carMaxSpeed * 0.4; 
			}
			
			// 塵土觸發條件 (與胎痕相同)
			const isDrifting = car.speed > DRIFT_SPEED_THRESHOLD && Math.abs(car.sideSpeed) > TIRE_MARK_THRESHOLD;
			
			if (!isDrifting) return;
			
			const REAR_OFFSET = CARHEIGHT / 2;
			const rearX = car.x + Math.cos(car.angle + Math.PI) * REAR_OFFSET;
			const rearY = car.y + Math.sin(car.angle + Math.PI) * REAR_OFFSET;
			
			const sideDirection = car.sideSpeed > 0 ? 1 : -1;
			
			for (let i = 0; i < 4; i++) {
				dustParticles.push({
					x: rearX + (Math.random() - 0.5) * 15,
					y: rearY + (Math.random() - 0.5) * 15,
					vx: -Math.cos(car.angle) * 1 + Math.cos(car.angle + Math.PI / 2) * sideDirection * (1 + Math.random() * 2),
					vy: -Math.sin(car.angle) * 1 + Math.sin(car.angle + Math.PI / 2) * sideDirection * (1 + Math.random() * 2),
					life: 30, 
					maxLife: 30
				});
			}
		}
				
				
		function loop() {
			// 使用沙地 Pattern 填滿背景，解決透明格問題
			if (sandPattern) {
				ctx.fillStyle = sandPattern;
				ctx.fillRect(0, 0, W, H);
			} else {
				ctx.fillStyle = '#C2B280'; // 後備顏色
				ctx.fillRect(0, 0, W, H);
			}
			if (!player) {
				requestAnimationFrame(loop);
				return;
			}
			
			const offsetX = player.x - W / 2;
			const offsetY = player.y - H / 2;
			
			ctx.drawImage(trackImg, -offsetX, -offsetY, TRACKS[currentTrack].originalWidth * SCALE, TRACKS[currentTrack].originalHeight * SCALE);
			
			// 賽道路徑
			drawCurrentTrackRoad(ctx, offsetX, offsetY);
			drawStartGrid(ctx, TRACKS[currentTrack], SCALE, offsetX, offsetY);

			// 繪製胎痕 (線段繪製)
			ctx.save();
			tireMarks.forEach(mark => {
				const alpha = Math.min(1, mark.life / 60); 
				const size = 10; 
				
				ctx.strokeStyle = `rgba(0, 0, 0, ${0.8 * alpha})`; 
				ctx.lineWidth = size; 
				ctx.lineCap = 'round'; 
				
				ctx.beginPath();
				ctx.moveTo(mark.x1 - offsetX, mark.y1 - offsetY);
				ctx.lineTo(mark.x2 - offsetX, mark.y2 - offsetY);
				ctx.stroke(); 
			});
			ctx.restore();
			
			// 繪製塵土特效
			ctx.save();
			dustParticles.forEach(p => {
				const alpha = p.life / p.maxLife;
				const size = alpha * 10; 
				const color = `rgba(180, 180, 180, ${alpha * 0.6})`; 
				
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(p.x - offsetX, p.y - offsetY, size / 2, 0, Math.PI * 2);
				ctx.fill();
			});
			ctx.restore();
			
			// 繪製所有AI車輛
			allCars.forEach(car => {
					ctx.save();
					ctx.translate(car.x - offsetX, car.y - offsetY);
					ctx.rotate(car.angle + Math.PI / 2);
					if (car.img && car.img.complete) {
						ctx.drawImage(car.img, -CARWIDTH / 2, -CARHEIGHT / 2, CARWIDTH, CARHEIGHT);
					}
					ctx.restore();
				});
				
			// AI邏輯更新
			if (gameState === 'racing' && !raceFinished) {
				
				// AI 獨立摩擦力設定 (已調整)
				const FORWARD_DAMPING_AI = 0.985; 

				allCars.forEach(car => {
					
					const prevAngle = car.angle;
					
					followWaypoints(car); 
					
					// 計算實際轉彎率 (Angular Change)
					let rawTurnRate = car.angle - prevAngle;

					// 處理角度環繞 (例如從 359度到 1度)
					if (rawTurnRate > Math.PI) rawTurnRate -= 2 * Math.PI;
					if (rawTurnRate < -Math.PI) rawTurnRate += 2 * Math.PI;
					
					let steering = rawTurnRate; 
					
					// 如果轉彎率極小，視為直行
					if (Math.abs(steering) < 0.0001) {
						steering = 0;
					} else {
						// *** 暴力放大轉向輸入，強制甩尾 (已減半) ***
						steering *= 100.0; 
					}

					
					// ---------------------
					// --- AI 飄移物理：決定實際位置 ---
					// ---------------------
					const sideFrictionFactor = 0.85; // 側滑摩擦力增加
					const sideSpeedGeneration = 0.5; 
					
					car.forwardSpeed = car.speed || 0; 
					car.sideSpeed = car.sideSpeed || 0;
					
					// 強制觸發甩尾物理：只要有轉向意圖 (steering != 0) 就一定會產生側滑速度
					if (Math.abs(steering) > 0) {
						 // *** 側滑產生乘數從 0.1 減少到 0.05 ***
						 car.sideSpeed -= car.forwardSpeed * steering * sideSpeedGeneration * 0.07; 
					}
					
					// 應用側滑摩擦力
					car.sideSpeed *= sideFrictionFactor; 
					
					// 應用前進阻力
					car.forwardSpeed *= FORWARD_DAMPING_AI; 
					
					// 轉換為實際的 X/Y 移動
					const totalSpeed = Math.hypot(car.forwardSpeed, car.sideSpeed);
					const driftAngle = Math.atan2(car.sideSpeed, car.forwardSpeed);
					const actualAngle = car.angle + driftAngle; 

					// 這裡負責更新 AI 車輛的位置
					car.x += Math.cos(actualAngle) * totalSpeed;
					car.y += Math.sin(actualAngle) * totalSpeed;
					
					car.speed = totalSpeed; // 更新實際移動速度
					car.driftAngle = driftAngle; 
					
					
					// ---------------------
					// --- 內聯 AI 胎痕/塵土生成 ---
					// ---------------------
					const TIRE_MARK_THRESHOLD = 1.0; 
					const AI_MAX_SPEED = 11.0; 
					const DRIFT_SPEED_THRESHOLD = AI_MAX_SPEED * 0.4; 
					
					const isDrifting = car.speed > DRIFT_SPEED_THRESHOLD && Math.abs(car.sideSpeed) > TIRE_MARK_THRESHOLD;

					const rearX = car.x + Math.cos(car.angle + Math.PI) * (CARHEIGHT / 2);
					const rearY = car.y + Math.sin(car.angle + Math.PI) * (CARHEIGHT / 2);
					const perpX = Math.cos(car.angle + Math.PI / 2);
					const perpY = Math.sin(car.angle + Math.PI / 2);
					const lateralOffset = CARWIDTH / 2 * 0.7; 
					
					const currentX_L = rearX + perpX * lateralOffset;
					const currentY_L = rearY + perpY * lateralOffset;
					const currentX_R = rearX - perpX * lateralOffset;
					const currentY_R = rearY - perpY * lateralOffset;

					const lastX_L = car.lastTireMarkPosL ? car.lastTireMarkPosL.x : currentX_L;
					const lastY_L = car.lastTireMarkPosL ? car.lastTireMarkPosL.y : currentY_L;
					const lastX_R = car.lastTireMarkPosR ? car.lastTireMarkPosR.x : currentX_R;
					const lastY_R = car.lastTireMarkPosR ? car.lastTireMarkPosR.y : currentY_R;

					if (isDrifting) {
						// 胎痕壽命 60 幀
						const TIRE_MARK_LIFE = 60; 

						tireMarks.push({
							x1: lastX_L, y1: lastY_L, x2: currentX_L, y2: currentY_L,
							life: TIRE_MARK_LIFE 
						});
						tireMarks.push({
							x1: lastX_R, y1: lastY_R, x2: currentX_R, y2: currentY_R,
							life: TIRE_MARK_LIFE 
						});
						
						emitDustForCar(car, false, AI_MAX_SPEED);
					}
					
					car.lastTireMarkPosL = {x: currentX_L, y: currentY_L};
					car.lastTireMarkPosR = {x: currentX_R, y: currentY_R};
					
					// AI 加速特效
					const AI_BOOST_THRESHOLD = AI_MAX_SPEED * 0.8; 
					if (car.speed > AI_BOOST_THRESHOLD) emitBoostForCar(car, false);
				});
				
				// 玩家加速特效
				const MAX_SPEED = 25; // 玩家極速
				const PLAYER_BOOST_THRESHOLD = MAX_SPEED * 0.8;
				if (player.speed > PLAYER_BOOST_THRESHOLD) emitBoostForCar(player, false); 
			}
					
			
			// 更新粒子和胎痕
			boostParticles = boostParticles.filter(p => {
				p.x += p.vx;
				p.y += p.vy;
				p.life--;
				p.vy += 0.1; // 重力
				return p.life > 0;
			});

			tireMarks = tireMarks.filter(mark => {
				mark.life--;
				return mark.life > 0;
			});
			
			dustParticles = dustParticles.filter(p => {
				p.x += p.vx;
				p.y += p.vy;
				p.life--;
				p.vx *= 0.9; 
				p.vy *= 0.9;
				return p.life > 0;
			});

			// 繪製加速特效
			ctx.save();
			boostParticles.forEach(p => {
				const alpha = p.life / p.maxLife;
				const size = alpha * 8;
				const hue = 20 + alpha * 30;
				ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
				ctx.shadowBlur = 10;
				ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
				ctx.beginPath();
				ctx.arc(p.x - offsetX, p.y - offsetY, size, 0, Math.PI * 2);
				ctx.fill();
			});
			ctx.restore();
			
			
			// 玩家車輛
			ctx.save();
			ctx.translate(W / 2, H / 2);
			ctx.rotate(player.angle + Math.PI / 2);
			if (player.img && player.img.complete) {
				ctx.drawImage(player.img, -CARWIDTH / 2, -CARHEIGHT / 2, CARWIDTH, CARHEIGHT);
			}
			ctx.restore();
			
			// 倒數計時
			if (gameState === 'countdown') {
					countdown -= 1 / 60;
					const el = document.getElementById('countdown');
					el.style.display = 'block';
					if (countdown > 4) el.textContent = '3';
					else if (countdown > 3) el.textContent = '2';
					else if (countdown > 2) el.textContent = '1';
					else if (countdown > 1) {
						el.textContent = 'GO!';
						el.style.color = '#0f0';
					} else {
						if (countdown <= 0) { 
							gameState = 'racing';
						}
					}
				} else {
					 document.getElementById('countdown').style.display = 'none';
				}
				
				// 玩家控制邏輯
				if (gameState === 'racing' && !raceFinished) {
					
					player.raceTime++; 
					
					// 獨立的摩擦力設定
					const FORWARD_DAMPING_PLAYER = 0.999; 

					// 1. 設置轉向率和加速度
					const STEERING_RATE = 0.038 * player.spec.handling;
					const ACCEL_RATE = player.spec.acceleration * 0.060; 
					const MAX_SPEED = 25; 
					
					let acceleration = 0;
					let steering = 0;
					
					if (keys.ArrowUp || touch.up) acceleration = ACCEL_RATE;
					if (keys.ArrowDown || touch.down) acceleration = -1.8;
					if (keys.ArrowLeft || touch.left) steering = -STEERING_RATE;
					if (keys.ArrowRight || touch.right) steering = STEERING_RATE;

					// --- 玩家【高級飄移物理模型】---
					
					steering = Math.max(-0.4, Math.min(steering, 0.4));
					
					player.forwardSpeed = (player.forwardSpeed || player.speed || 0) + acceleration;
					player.forwardSpeed = Math.max(-10, Math.min(player.forwardSpeed, MAX_SPEED));

					player.angle += steering * player.forwardSpeed / 10; 

					// 飄移物理
					const sideFrictionFactor = 0.95; 
					const sideSpeedGeneration = 1.8; 
					
					player.sideSpeed = player.sideSpeed || 0;
					if(Math.abs(steering) > 0.01) { 
						player.sideSpeed -= player.forwardSpeed * steering * sideSpeedGeneration; 
					}
					
					player.sideSpeed *= sideFrictionFactor; 
					player.forwardSpeed *= FORWARD_DAMPING_PLAYER; 
					
					const totalSpeed = Math.hypot(player.forwardSpeed, player.sideSpeed);
					const driftAngle = Math.atan2(player.sideSpeed, player.forwardSpeed);
					const actualAngle = player.angle + driftAngle;

					player.x += Math.cos(actualAngle) * totalSpeed;
					player.y += Math.sin(actualAngle) * totalSpeed;
					
					player.speed = totalSpeed; 
					player.driftAngle = driftAngle; 

					// --- 胎痕/塵土生成 (玩家) ---
					const TIRE_MARK_THRESHOLD = 8.0; 
					const DRIFT_SPEED_THRESHOLD = MAX_SPEED * 0.6; 
					
					const isDrifting = player.speed > DRIFT_SPEED_THRESHOLD && Math.abs(player.sideSpeed) > TIRE_MARK_THRESHOLD;

					const rearX = player.x + Math.cos(player.angle + Math.PI) * (CARHEIGHT / 2);
					const rearY = player.y + Math.sin(player.angle + Math.PI) * (CARHEIGHT / 2);
					const perpX = Math.cos(player.angle + Math.PI / 2);
					const perpY = Math.sin(player.angle + Math.PI / 2);
					const lateralOffset = CARWIDTH / 2 * 0.7; 
					
					const currentX_L = rearX + perpX * lateralOffset;
					const currentY_L = rearY + perpY * lateralOffset;
					const currentX_R = rearX - perpX * lateralOffset;
					const currentY_R = rearY - perpY * lateralOffset;

					const lastX_L = player.lastTireMarkPosL ? player.lastTireMarkPosL.x : currentX_L;
					const lastY_L = player.lastTireMarkPosL ? player.lastTireMarkPosL.y : currentY_L;
					const lastX_R = player.lastTireMarkPosR ? player.lastTireMarkPosR.x : currentX_R;
					const lastY_R = player.lastTireMarkPosR ? player.lastTireMarkPosR.y : currentY_R;

					if (isDrifting) {
						// 胎痕壽命 60 幀
						const TIRE_MARK_LIFE = 60; 

						tireMarks.push({
							x1: lastX_L, y1: lastY_L, x2: currentX_L, y2: currentY_L,
							life: TIRE_MARK_LIFE 
						});
						tireMarks.push({
							x1: lastX_R, y1: lastY_R, x2: currentX_R, y2: currentY_R,
							life: TIRE_MARK_LIFE
						});
						
						emitDustForCar(player, true, MAX_SPEED);
					}
					
					player.lastTireMarkPosL = {x: currentX_L, y: currentY_L};
					player.lastTireMarkPosR = {x: currentX_R, y: currentY_R};


					// 碰撞檢測 
					if (player.speed > 0) {
						for (let car of allCars) {
							checkCollisions(player, car);
						}
						
						if (player.raceTime > 120) { 
							for (let i = 0; i < allCars.length; i++) {
								for (let j = i + 1; j < allCars.length; j++) {
									checkCollisions(allCars[i], allCars[j]);
								}
							}
						}
					}
				
					drawDashboard(player.speed);
					
					
					// 完賽檢測
					const startLineY = TRACKS[currentTrack].start.y * SCALE;

					if (player.prevY >= startLineY && player.y < startLineY && player.speed > 1) {
						lap++;

						if (lap > totalLaps) {
							raceFinished = true;
							gameState = 'finished';

							const sorted = [player, ...allCars].sort((a, b) => a.y - b.y);
							const pos = sorted.findIndex(c => c === player) + 1;
							document.getElementById('finalPos').textContent =
							  `FINAL POS #${pos}/${allCars.length + 1}`;
							document.getElementById('finishScreen').style.display = 'flex';
						}
					}

					player.prevY = player.y;

					
					// 更新HUD
					const sorted = [player, ...allCars].sort((a, b) => a.y - b.y);
					const pos = sorted.findIndex(c => c === player) + 1;
					document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;
					document.getElementById('posHud').textContent = `POS #${pos}/${allCars.length + 1}`;
					document.getElementById('speedHud').textContent = `${Math.round(Math.abs(player.speed) * 10)} kmh`;
				}
				
				if (gameState !== 'title') {
					drawMinimap(); 
				}
						
				requestAnimationFrame(loop);
		}

      
        // 事件監聽器
        window.addEventListener('load', () => {
			sandPattern = createSandPattern();
            // 生成棋盤格
            const checkered = document.getElementById('checkered');
            for (let i = 0; i < 60; i++) {
                const div = document.createElement('div');
                checkered.appendChild(div);
            }
            
            document.getElementById('startTitleBtn').onclick = () => {
                document.getElementById('titleScreen').style.display = 'none';
                document.getElementById('mainMenu').classList.add('active');
            };
            
            document.getElementById('champBtn').onclick = () => openTrackSelect('championship');
            document.getElementById('timeBtn').onclick = () => openTrackSelect('timeattack');
            
            document.getElementById('confirmTrackBtn').onclick = () => {
                document.getElementById('trackSelect').classList.remove('active');
                document.getElementById('carMenu').classList.add('active');
                buildCarList();
            };
            
            document.getElementById('confirmBtn').onclick = () => {
                document.getElementById('carMenu').classList.remove('active');
                playerCarImg.src = CARSPECS[selectedCar].image;
                playerCarImg.onload = startRace;
            };
            
            document.getElementById('backToMenuBtn').onclick = () => {
                document.getElementById('finishScreen').style.display = 'none';
                document.getElementById('mainMenu').classList.add('active');
                raceFinished = false;
            };
            
            // 觸控控制
            if ('ontouchstart' in window && navigator.maxTouchPoints > 0 && screen.width <= 1024) {
                document.getElementById('mobileControls').style.display = 'flex';
                ['Up', 'Down', 'Left', 'Right'].forEach(d => {
                    const b = document.getElementById(`btn${d}`);
                    b.addEventListener('touchstart', e => {
                        e.preventDefault();
                        touch[d.toLowerCase()] = true;
                    });
                    b.addEventListener('touchend', () => {
                        touch[d.toLowerCase()] = false;
                    });
                });
            }
            
            window.addEventListener('keydown', e => {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    keys[e.key] = true;
                }
            });
            window.addEventListener('keyup', e => {
                keys[e.key] = false;
            });
            
            loadTrack(0);
            requestAnimationFrame(loop);
        });
    

    console.log('[game.js] ✅ 遊戲引擎加載完成');

} catch(error) {
    console.error('[game.js] ❌ 錯誤:', error);
    console.error('[game.js] 堆棧:', error.stack);
}
