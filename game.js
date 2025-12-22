// ================================================
// Cyber Formula Mini Race - 遊戲引擎
// ================================================

// Main game initialization
document.addEventListener('DOMContentLoaded', () => {
        const SCALE = 5.0; // Scale factor for game coordinates to pixels
        const WORLD_SPEED_SCALE = 0.5;
        const SPEED_UNIT_SCALE = 34 / 18;
        const MOVE_SCALE = WORLD_SPEED_SCALE / SPEED_UNIT_SCALE;
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
        let keys = {}, touch = {}, lap = 0, totalLaps = 5, raceFinished = false, currentTrack = 0;
        let boostParticles = []; // 加速特效粒子
		let tireMarks = [];      // 新增：胎痕/飄移痕跡
		let dustParticles = [];  // 新增：塵土粒子
		
		let wantsToPit = false; // 玩家按下按鈕決定入 Pit
		let playerAutoDriving = false; // 玩家是否處於 Pit 站自動駕駛狀態
		let playerPitWaypointIndex = 0; // 玩家 Pit 站路徑 Waypoint 索引
		
        
        // Speed calculation constants
        const BASE_MAX_SPEED = 30;  // Base max speed for all cars
        const MAX_SPEED_BONUS = 4;  // Maximum speed bonus from acceleration
        
        // Calculate car's max speed based on its specs
        function getCarMaxSpeed(car) {
            if (!car.spec) return BASE_MAX_SPEED; // Fallback if no spec
            
            // Calculate speed based on acceleration (0-1 range) and scale it
            // Normalize acceleration to 0-1 range based on min/max values in CARSPECS
            const minAccel = 4.5;  // Minimum acceleration in CARSPECS
            const maxAccel = 5.3;  // Maximum acceleration in CARSPECS
            const normalizedAccel = (car.spec.acceleration - minAccel) / (maxAccel - minAccel);
            
            // Calculate speed bonus based on normalized acceleration
            const speedBonus = normalizedAccel * MAX_SPEED_BONUS;
            
            return BASE_MAX_SPEED + speedBonus;
        }
        
        // Boost system variables
        let isBoosting = false;
        let boostMeter = 1.0;
        const BOOST_DRAIN_RATE = 0.0015; // Reduced drain rate for longer boost
        const BOOST_RECHARGE_RATE = 0.0015; // Slightly reduced recharge rate to balance
        const BOOST_SPEED_MULTIPLIER = 1.4; // 40% speed increase
        let boostCooldown = 0;
		// 新增: 輪胎狀態和 Pit 相關變數
		let tireHealth = [100, 100, 100, 100]; // 0:FL, 1:FR, 2:RL, 3:RR (範圍 0-100, 僅供玩家使用)
		let inPit = false; // 玩家是否正在 Pit 站
		let pitTimer = 0; // 記錄 Pit 站換胎時間 (秒)
		const PIT_STOP_DURATION = 5.0; // Pit 站換胎時間 (秒)
		const MUST_PIT_THRESHOLD = 30; // 輪胎血量低於此值 AI 必須進 Pit
		const PIT_LANE_SPEED_LIMIT = 20.0; // Pit Lane 的速度限制
		const PIT_PARKING_DIST_SCALED = 15; // 停車距離 (未縮放，我們會在邏輯中乘以 SCALE)
		const CRITICAL_HEALTH = 5; // 輪胎血量低於此值玩家將強制停止 (Game Over)

		// 輪胎損耗常數
		const NORMAL_WEAR_RATE = 0.05; // 基礎損耗 (每秒)
		const DRIFT_WEAR_MULTIPLIER = 1.0; // 漂移額外損耗乘數 (1.0 = 雙倍損耗)
		const PIT_ENTRY_WAYPOINT_INDEX = -2; // **Placeholder: Pit 站入口點** (實際應根據賽道 Waypoints 決定)
		const PIT_STOP_WAYPOINT_INDEX = -1; // **Placeholder: Pit 站停車點** (實際應根據賽道 Waypoints 決定)
		
		// 在 init 或 script 開頭加入這個變數
		let sandPattern = null;
		
		const miniCanvas = document.getElementById('minimapCanvas');
		const miniCtx = miniCanvas.getContext('2d');
		const MW = miniCanvas.width, MH = miniCanvas.height;
		let mapScale = 0.5; // Minimap 縮放比例 (會在 loadTrack 時計算)
		let mapOffsetX = 0, mapOffsetY = 0; // Minimap 繪製偏移量
		// Add this with other global variables at the top of the file
		let lastCountdownTime = 0;  // Add this line
		let countdownInterval = null;
		let countdownStartTime = 0;	

		const tireMonitorCanvas = document.getElementById('tireMonitorCanvas');
		const tireMonitorCtx = tireMonitorCanvas ? tireMonitorCanvas.getContext('2d') : null;		
		
		
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
			const MAX_SPEED = (car && typeof car.maxSpeedLimit === 'number') ? car.maxSpeedLimit : 34; 
			const sideFrictionFactor = (car && car.isAI) ? 0.94 : 0.95; 
			// 【修正 1：極限甩尾力度 (2.5 -> 3.0)】
			const sideSpeedGeneration = (car && car.isAI) ? 3.8 : 3.0; 
			const track = TRACKS[currentTrack];
			const trackX = track.playerStart.x * SCALE;
			const trackY = track.playerStart.y * SCALE;
			const distanceToStart = Math.hypot(player.x - trackX, player.y - trackY);
			if (distanceToStart > 100) { // If player gets too far from start
				// Reset player position
				player.x = trackX;
				player.y = trackY;
				player.angle = track.playerStart.angle;
				player.speed = 0;
			}
			
			// 轉向角度限制
			const steeringClamp = (car && car.isAI) ? 0.6 : 0.4;
			steering = Math.max(-steeringClamp, Math.min(steering, steeringClamp));
			
			car.forwardSpeed = (car.forwardSpeed || car.speed || 0) + acceleration;
			car.forwardSpeed = Math.max(-10, Math.min(car.forwardSpeed, MAX_SPEED));

			// 車輛旋轉 (Car Rotation)
			car.angle += steering * car.forwardSpeed / 10; 

			// 飄移物理 (Drift Physics)
			car.sideSpeed = car.sideSpeed || 0;
			const steerDeadzone = (car && car.isAI) ? 0 : 0.01;
			if (Math.abs(steering) > steerDeadzone) {
				// AI: 對照舊版，轉向時一定產生側滑，但乘數較小避免過度甩尾
				const slipMul = (car && car.isAI) ? 0.14 : 1.0;
				// 側滑方向反轉 (維持車尾向外甩的效果)
				car.sideSpeed -= car.forwardSpeed * steering * sideSpeedGeneration * slipMul;
			}
			
			car.sideSpeed *= sideFrictionFactor; 
			
			// 阻力
			car.forwardSpeed *= (car && car.isAI) ? 0.995 : 0.992; 
			
			// 轉換為實際的 X/Y 移動
			const totalSpeed = Math.hypot(car.forwardSpeed, car.sideSpeed);
			const driftAngle = Math.atan2(car.sideSpeed, car.forwardSpeed);
			const actualAngle = car.angle + driftAngle;

			car.x += Math.cos(actualAngle) * totalSpeed * MOVE_SCALE;
			car.y += Math.sin(actualAngle) * totalSpeed * MOVE_SCALE;
			
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
			const kmh = Math.round(Math.abs(speed) * 15);
			dashCtx.fillText(kmh, cx, cy - 50);
			
			dashCtx.font = '20px Rajdhani';
			dashCtx.fillStyle = '#aaa';
			dashCtx.shadowBlur = 0;
			dashCtx.fillText("KM/H", cx, cy - 25);
		}

		// 新增: 繪製 5 個紅燈倒數
		function drawStartLights(ctx, W, H, countdownStartTime) {
			if (gameState !== 'countdown' || !countdownStartTime) return;
			
			const timeElapsed = (Date.now() - countdownStartTime);
			// 根據經過時間計算當前點亮的燈數 (每 1000ms 點亮一個)
			// 0ms: 0 燈, 1000ms: 1 燈, 5000ms: 5 燈
			const lightNumber = Math.floor(timeElapsed / 1000); 
			
			ctx.save();
			
			const lights = 5;
			const lightRadius = 30;
			const lightGap = 20;
			// 計算 5 顆燈的總寬度 (5 * 60px 直徑 + 4 * 20px 間隔)
			const totalWidth = lights * 2 * lightRadius + (lights - 1) * lightGap; 
			let startX = (W / 2) - (totalWidth / 2) + lightRadius;
			let startY = 150; // 繪製在螢幕頂部下方
			
			// 1. 繪製燈號
			for (let i = 0; i < lights; i++) {
				ctx.beginPath();
				const x = startX + i * (2 * lightRadius + lightGap);
				ctx.arc(x, startY, lightRadius, 0, Math.PI * 2);
				
				// 判斷燈的狀態
				if (lightNumber > i && lightNumber <= lights) {
					// 燈已點亮 (紅燈)
					ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';
					ctx.shadowBlur = 15;
					ctx.shadowColor = '#f00';
				} else {
					// 燈未點亮 (暗色底座)
					ctx.fillStyle = 'rgba(30, 30, 30, 0.6)';
					ctx.shadowBlur = 0;
					ctx.shadowColor = 'transparent';
				}
				
				ctx.fill();
			}
			
			// 2. 繪製 "GO!" 文字 (在所有燈都熄滅後出現)
			if (lightNumber >= lights) { // timeElapsed >= 5000ms
				ctx.font = 'bold 150px Rajdhani, sans-serif';
				ctx.textAlign = 'center';
				ctx.fillStyle = '#0f0'; // 綠色
				ctx.shadowBlur = 20;
				ctx.shadowColor = '#0f0';
				// 放置在畫面中央
				ctx.fillText('GO!', W / 2, H / 2); 
			}
			
			ctx.restore();
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
			car.forwardSpeed *= 0.992;
			
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

		  // 正向 & 橫向
		  const nX = -dirY;
		  const nY = dirX;

		  const baseOffset = car.laneOffset || 0; // 例如 +60 / -60

		  // ---------------------------
		  // 1. 找最近「前面」那架車
		  // ---------------------------
		  let frontCar = null;
		  let minDist = Infinity;
		  const candidates = [...allCars, player].filter(c => c !== car);

		  candidates.forEach(other => {
			const dx = other.x - car.x;
			const dy = other.y - car.y;
			const dist = Math.hypot(dx, dy);
			const rel = dx * dirX + dy * dirY;   // 正向投影：>0 = 在前面

			if (rel > 0 && dist < 400 && dist < minDist) {
			  minDist = dist;
			  frontCar = other;
			}
		  });

		  // ---------------------------
		  // 2. 判斷是否進入「超車模式」
		  // ---------------------------
		  const wantOvertake =
			frontCar &&
			minDist < 300 &&                                // 幾近
			(car.forwardSpeed || 0) >
			  (frontCar.forwardSpeed || 0) + 1.0;          // 真係快過前車

		  if (car.overtakeTimer == null) car.overtakeTimer = 0;
		  if (car.overtakeSide == null) car.overtakeSide = 0;

		  if (car.overtakeTimer <= 0 && wantOvertake) {
			// 開始 1~2 秒的超車窗口
			car.overtakeTimer = 90 + Math.random() * 60;

			// 優先向「沒有車」那邊閃
			const lateral = (frontCar.x - car.x) * nX + (frontCar.y - car.y) * nY;
			const sideRaw = Math.sign(lateral);
			car.overtakeSide = sideRaw === 0 ? (Math.random() < 0.5 ? -1 : 1) : sideRaw;
		  }

		  if (car.overtakeTimer > 0) {
			car.overtakeTimer--;
		  } else {
			car.overtakeSide = 0;
		  }

		  // ---------------------------
		  // 3. 橫向目標 offset（明顯拉開）
		  // ---------------------------
		  const AVOID_OFFSET    = 180;  // 一般避撞
		  const OVERTAKE_OFFSET = 420;  // 超車時拉到外線

		  let targetOffset = baseOffset;

		  if (car.overtakeSide !== 0) {
			// 超車中：直接去內／外線（± OVERTAKE_OFFSET）
			targetOffset = baseOffset + car.overtakeSide * OVERTAKE_OFFSET;
		  } else if (frontCar && minDist < 260) {
			// 非超車，但距離好近 → 輕微避開
			const lateral = (frontCar.x - car.x) * nX + (frontCar.y - car.y) * nY;
			const side = Math.sign(lateral) || 1;
			targetOffset = baseOffset + side * AVOID_OFFSET;
		  }

		  // 額外：極近距離正中對著就強制閃一邊（防幾架車疊在一起）
		  if (frontCar && minDist < 180) {
			const lateral = (frontCar.x - car.x) * nX + (frontCar.y - car.y) * nY;
			if (Math.abs(lateral) < 40) {
			  const forceSide = lateral >= 0 ? -1 : 1;
			  targetOffset = baseOffset + forceSide * (OVERTAKE_OFFSET * 0.9);
			  car.overtakeSide = forceSide;
			  car.overtakeTimer = Math.max(car.overtakeTimer, 60);
			}
		  }

		  // 平滑 lerp 到目標 offset
		  if (car.currentOffset == null) car.currentOffset = baseOffset;
		  car.currentOffset += (targetOffset - car.currentOffset) * 0.08;

		  // 最終追蹤的目標點
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

		  const steeringAngle = angleDiff * 0.28; // 給物理函數用

			  // ---------------------------
			  // 4. 速度控制（超車時給 buff）
			  // ---------------------------
			  const speedFactor = (car && typeof car.speedFactor === 'number') ? car.speedFactor : 1.0;
			  const maxSpeedBase = 26.7 * speedFactor;
			  const AI_ACCEL_SCALE = 2.0;
			  let acceleration = 0;

		  const inOvertake = car.overtakeTimer > 0 && car.overtakeSide !== 0;

		  if (frontCar && minDist < 130 && !inOvertake) {
			// 跟車但未超車 → 不想撞上，偏向減速
			if (car.forwardSpeed > maxSpeedBase * 0.75) {
				acceleration = -3.0;
			} else {
				acceleration = car.spec.acceleration * 0.0055 * AI_ACCEL_SCALE * SPEED_UNIT_SCALE;
			}
		  } else {
			const turnAmt = Math.min(1, Math.abs(angleDiff) / 0.6);
			const straightBoost = 1.0 + (1.0 - turnAmt) * 0.25;
			acceleration = car.spec.acceleration * (inOvertake ? 0.0060 : 0.0052) * AI_ACCEL_SCALE * straightBoost * SPEED_UNIT_SCALE;

				const maxSpeed = inOvertake ? maxSpeedBase + 0.4 * speedFactor : maxSpeedBase;
				car.maxSpeedLimit = maxSpeed;

			if (car.forwardSpeed > maxSpeed) acceleration = 0;
		  }

		  if (car.maxSpeedLimit == null) car.maxSpeedLimit = maxSpeedBase;

			  // Reduce acceleration during turns for more realistic driving
	  const isTurning = Math.abs(steeringAngle) > 0.1;  // Check if the car is turning
	  if (isTurning) {
		  // Reduce acceleration during turns (to 20% of normal)
		  acceleration *= 0.2;
	  }

	  car.lastAIAcceleration = acceleration;
	  car.lastAISteering = steeringAngle;
	  updateCarPhysics(car, acceleration, steeringAngle);
		}

		function loadTrack(i) {
			currentTrack = i;
			trackImg = new Image();
			trackImg.onload = () => {
				document.getElementById('hud').textContent = `TRACK: ${TRACKS[i].name}`;
			};
			trackImg.src = TRACKS[i].bgImage;
			
			const t = TRACKS[i];
			const waypointsX = t.waypoints.map(w => w.x);
			const waypointsY = t.waypoints.map(w => w.y);
			
			const minX = Math.min(...waypointsX) * SCALE;
			const maxX = Math.max(...waypointsX) * SCALE;
			const minY = Math.min(...waypointsY) * SCALE;
			const maxY = Math.max(...waypointsY) * SCALE;
			
			const trackWidth = maxX - minX;
			const trackHeight = maxY - minY;
			
			mapScale = Math.min(
				(MW - 10) / trackWidth,
				(MH - 10) / trackHeight
			);
			
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
			// Clear any existing countdown interval
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}

			allCars = [];
			const t = TRACKS[currentTrack];
			const GRID_SPACING = 200;
			const ROW_SPACING = 120;

			// In the startRace function, after the GRID_SPACING and ROW_SPACING declarations
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
						isAI: true,
						x: (p.x * SCALE),
						y: (p.y * SCALE),
						angle: t.playerStart.angle,
						forwardSpeed: 0,
						sideSpeed: 0,
						speed: 0,
						spec: CARSPECS[idx],
						img: img,
						waypointIndex: 0,
						overtakeTimer: 0,
						overtakeSide: 0,
						laneOffset: (i % 2 === 0 ? -60 : 60),
						currentOffset: (i % 2 === 0 ? -60 : 60),
						speedFlameTimer: 0,
						speedFactor: 0.95 + Math.random() * 0.12
					});
				});
			}
			// ... keep all the existing car initialization code ...

			// Initialize player car
			// In startRace function, update the player initialization:
			const playerGridPos = (t.gridPositions && t.gridPositions.length)
				? t.gridPositions[t.gridPositions.length - 1]
				: t.playerStart;
			player = {
				x: playerGridPos.x * SCALE,
				y: playerGridPos.y * SCALE,
				angle: (t.playerStart && t.playerStart.angle != null) ? t.playerStart.angle : -Math.PI / 2,
				speed: 0,
				forwardSpeed: 0,
				sideSpeed: 0,
				driftAngle: 0,
				waypointIndex: 0,
				currentLap: 0,
				lastCheckpoint: -1,
				spec: CARSPECS[selectedCar],
				img: playerCarImg,
				raceTime: 0,
				prevY: playerGridPos.y * SCALE
			};

			// Reset countdown and game state
			// countdown = 3; // 移除: 不再使用此變數
			gameState = 'countdown';
			countdownStartTime = Date.now();
			lap = 0;
			totalLaps = 5;
			raceFinished = false;
			player.prevY = player.y;
			document.getElementById('lapHud').textContent = `LAP 0/${totalLaps}`;

			// [新增] 隱藏舊的 HTML 倒數文字元素
			const countdownElement = document.getElementById('countdown');
			if (countdownElement) {
				countdownElement.style.display = 'none'; 
			}
			
			// [新增] 設定總倒數時間 (5 燈 * 1 秒 + 1 秒 GO = 6 秒)
			const COUNTDOWN_DURATION_MS = 6000;
			
			// 清除舊的計時器
			if (countdownInterval) {
				clearTimeout(countdownInterval); // 使用 clearTimeout 來清除，因為下面改用 setTimeout
			}

			// 使用 setTimeout 僅用於在倒數結束時切換到 racing 狀態
			countdownInterval = setTimeout(() => {
				// 倒數結束
				gameState = 'racing';
				countdownInterval = null;
				// Force start the game loop if (typeof loop === 'function' && !raceFinished) { requestAnimationFrame(loop); }
			}, COUNTDOWN_DURATION_MS);

			// 確保 loop 正在運行以便繪製燈號
			if (typeof loop === 'function') {
				requestAnimationFrame(loop);
			}
		}

		function emitSpeedFlameForCar(car, isPlayer) {
			const jets = [-1, 1];
			for (let j = 0; j < jets.length; j++) {
				const side = jets[j];
				const baseAngle = car.angle + Math.PI;
				const angle = baseAngle + (Math.random() - 0.5) * 0.22;
				const speed = 3.2 + Math.random() * 2.2;
				const life = 7 + Math.random() * 8;
				const backOffset = 50 + Math.random() * 8;
				const sideOffset = side * (CARWIDTH * 0.3);
				const length = 2 + Math.random() * 3;
				const width = 8 + Math.random() * 3;
				boostParticles.push({
					type: 'flame',
					x: car.x - Math.cos(car.angle) * backOffset + Math.cos(car.angle + Math.PI / 2) * sideOffset,
					y: car.y - Math.sin(car.angle) * backOffset + Math.sin(car.angle + Math.PI / 2) * sideOffset,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed,
					angle: baseAngle,
					length,
					width,
					life,
					maxLife: life,
					gravity: 0,
					color: 'rgba(255, 140, 20, 0.75)'
				});
			}
		}

		function emitMoveDustForCar(car) {
			const REAR_OFFSET = CARHEIGHT / 2;
			const rearX = car.x + Math.cos(car.angle + Math.PI) * REAR_OFFSET;
			const rearY = car.y + Math.sin(car.angle + Math.PI) * REAR_OFFSET;
			for (let i = 0; i < 2; i++) {
				dustParticles.push({
					x: rearX + (Math.random() - 0.5) * 18,
					y: rearY + (Math.random() - 0.5) * 18,
					vx: -Math.cos(car.angle) * (0.6 + Math.random() * 0.8),
					vy: -Math.sin(car.angle) * (0.6 + Math.random() * 0.8),
					life: 22,
					maxLife: 22
				});
			}
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
			if (!grid || !grid.length) return;

			ctx.save();
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 3;
			ctx.setLineDash([10, 5]);

			grid.forEach((pos, i) => {
				const x = (pos.x * scale) - offsetX;
				const y = (pos.y * scale) - offsetY;

				ctx.beginPath();
				ctx.moveTo(x - 50, y);
				ctx.lineTo(x + 50, y);
				ctx.stroke();

				ctx.fillStyle = '#fff';
				ctx.font = '20px Arial';
				ctx.textAlign = 'center';
				ctx.fillText(i + 1, x, y - 10);
			});

			ctx.restore();
		}
		
		// 【修正點 2 & 3: 特效調整與火花修復】
		function emitBoostForCar(car, isPlayer) {
			// 在車尾產生藍色火焰效果
			const jets = [-1, 1];
			for (let j = 0; j < jets.length; j++) {
				const side = jets[j];
				const baseAngle = car.angle + Math.PI;
				const angle = baseAngle + (Math.random() - 0.5) * 0.18;
				const speed = 5.5 + Math.random() * 4.5;
				const life = 12 + Math.random() * 14;
				const backOffset = 58 + Math.random() * 10;
				const sideOffset = side * (CARWIDTH * 0.22);
				const length = 85 + Math.random() * 35;
				const width = 10 + Math.random() * 6;
				boostParticles.push({
					type: 'flame',
					x: car.x - Math.cos(car.angle) * backOffset + Math.cos(car.angle + Math.PI / 2) * sideOffset,
					y: car.y - Math.sin(car.angle) * backOffset + Math.sin(car.angle + Math.PI / 2) * sideOffset,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed,
					angle: baseAngle,
					length,
					width,
					life,
					maxLife: life,
					gravity: 0,
					color: 'rgba(0, 180, 255, 0.85)'
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
					x: rearX + (Math.random() - 0.5) * 20,
					y: rearY + (Math.random() - 0.5) * 20,
					vx: -Math.cos(car.angle) * 1 + Math.cos(car.angle + Math.PI / 2) * sideDirection * (1 + Math.random() * 2),
					vy: -Math.sin(car.angle) * 1 + Math.sin(car.angle + Math.PI / 2) * sideDirection * (1 + Math.random() * 2),
					life: 40, 
					maxLife: 60
				});
			}
		}
				
				
		// Initialize keyboard input handling
		const handleKeyDown = (e) => {
			if (e.code === 'Space') {
				e.preventDefault();
				if (boostMeter > 0 && boostCooldown <= 0) {
					isBoosting = true;
				}
			} else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
				e.preventDefault();
				keys[e.key] = true;
			}
		};

		const handleKeyUp = (e) => {
			if (e.code === 'Space') {
				isBoosting = false;
			} else if (e.key in keys) {
				keys[e.key] = false;
			}
		};

		// Add event listeners
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		
		// ----------------------------------------------------
		// 新增: 輪胎損耗計算函式
		// ----------------------------------------------------
		function updateTireWear(car, deltaTime) {
			// 只有在非 Pit 站狀態下才損耗
			if (!car.tireHealth || car.inPit) return;
			
			const TIRE_MARK_THRESHOLD = 0.18; 
			const MAX_SPEED = (car && typeof car.maxSpeedLimit === 'number') ? car.maxSpeedLimit : 26.0; 
			const DRIFT_SPEED_THRESHOLD = MAX_SPEED * 0.18; 
			
			// 1. 判斷是否漂移 (使用 AI/玩家共用邏輯)
			const forwardSpeed = Math.abs(car.forwardSpeed || 0);
			const driftAngle = Math.abs(car.driftAngle || 0);
			const turnRate = car.lastTurnRate;
			
			const isDrifting = (forwardSpeed > DRIFT_SPEED_THRESHOLD) && 
							   (Math.abs(turnRate) > 0.012 || Math.abs(car.sideSpeed) > TIRE_MARK_THRESHOLD || driftAngle > 0.12);

			// 2. 基礎損耗 (正常行駛)
			let totalWear = NORMAL_WEAR_RATE * deltaTime;

			// 3. 漂移額外損耗
			if (isDrifting) {
				totalWear += NORMAL_WEAR_RATE * DRIFT_WEAR_MULTIPLIER * deltaTime;
			}

			// 4. 套用於所有輪胎
			for (let i = 0; i < car.tireHealth.length; i++) {
				car.tireHealth[i] = Math.max(0, car.tireHealth[i] - totalWear);
			}
		}		
		
		// ----------------------------------------------------
		// 新增: 繪製輪胎監控器 (在 loop 函式之外)
		// ----------------------------------------------------
// game.js 中，替換 drawTireMonitor 函式定義

	function drawTireMonitor(car, ctx) {
		if (!ctx) return;
		
		// 確保 car.tireHealth 已經初始化 (防止錯誤)
		if (!car.tireHealth) {
			car.tireHealth = [100, 100, 100, 100];
		}
		
		// 【修正：移除 ctx.save() 和 ctx.restore()】
		
		ctx.clearRect(0, 0, 100, 100);
		
		// 繪製車身簡易圖形
		ctx.fillStyle = '#444444';
		ctx.fillRect(30, 10, 40, 80); // 車身 (佔用 40x80)
		
		// 繪製四個輪胎的健康度
		const health = car.tireHealth;
		
		const getColor = (h) => {
			if (h > 60) return '#00FF00'; // 綠色 (Green)
			if (h > 30) return '#FFFF00'; // 黃色 (Yellow)
			return '#FF0000'; // 紅色 (Red)
		};
		
		// 輪胎位置: [FL, FR, RL, RR] (前左, 前右, 後左, 後右)
		const positions = [
			{x: 10, y: 15, h: 20, w: 10}, // FL (前左)
			{x: 80, y: 15, h: 20, w: 10}, // FR (前右)
			{x: 10, y: 65, h: 20, w: 10}, // RL (後左)
			{x: 80, y: 65, h: 20, w: 10}  // RR (後右)
		];
		
		// 繪製輪胎狀態方塊
		positions.forEach((pos, index) => {
			ctx.fillStyle = getColor(health[index]);
			ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
			
			// 繪製磨損程度 (用黑色覆蓋)
			const wearHeight = pos.h * (100 - health[index]) / 100;
			ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
			ctx.fillRect(pos.x, pos.y, pos.w, wearHeight);
			
			// 繪製邊框
			ctx.strokeStyle = 'white';
			ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
		});

		// 繪製平均值文字
		const avg = health.reduce((a, b) => a + b, 0) / 4;
		ctx.font = '10px Arial';
		ctx.fillStyle = getColor(avg);
		ctx.textAlign = 'center';
		ctx.fillText(`AVG: ${Math.round(avg)}%`, 50, 98);
	}
		// ----------------------------------------------------
		// 在 loop 函式中呼叫 drawTireMonitor
		// ----------------------------------------------------
		// 在 loop 函式中的 HUD 繪圖區塊 (通常是最後面)

		if (gameState !== 'title') {
			drawMinimap(ctx, W, H);
			drawTireMonitor(ctx, W, H); // [新增] 呼叫輪胎監控器
			
		}

		function loop() {
			if (gameState === 'paused' || raceFinished) {
        		return;
			}
			// Clear the canvas with sand pattern or fallback color
			if (sandPattern) {
				ctx.fillStyle = sandPattern;
				ctx.fillRect(0, 0, W, H);
			} else {
				ctx.fillStyle = '#C2B280'; // Fallback color
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
					
					// --- Pit Lane 可視化 (放在繪製賽道後，繪製車輛前) ---
					const trackData = TRACKS[currentTrack];
					const PIT_LANE_WIDTH = 40 * SCALE;
					const PIT_WAYPOINTS_COUNT = trackData.pitWaypoints ? trackData.pitWaypoints.length : 0;
					const RENDER_PARKING_INDEX = PIT_WAYPOINTS_COUNT >= 3 ? PIT_WAYPOINTS_COUNT - 3 : -1;

					if (trackData && trackData.pitWaypoints && trackData.pitWaypoints.length > 1) {
						ctx.save();
						
						// 1. 繪製實體 Pit Lane 路面 (灰色)
						ctx.fillStyle = '#555555'; // 假設賽道/路面使用深灰色

						// 擴展路徑以繪製一個封閉的 Pit Lane 區域
						ctx.beginPath();
						
						// a. 沿著 Waypoints 繪製一側邊界
						trackData.pitWaypoints.forEach((wp, index) => {
							const x = wp.x * SCALE - player.x + W / 2;
							const y = wp.y * SCALE - player.y + H / 2;
							const dx = (index < trackData.pitWaypoints.length - 1) ? trackData.pitWaypoints[index + 1].x * SCALE - wp.x * SCALE : wp.x * SCALE - trackData.pitWaypoints[index - 1].x * SCALE;
							const dy = (index < trackData.pitWaypoints.length - 1) ? trackData.pitWaypoints[index + 1].y * SCALE - wp.y * SCALE : wp.y * SCALE - trackData.pitWaypoints[index - 1].y * SCALE;
							
							const angle = Math.atan2(dy, dx);
							const perpAngle = angle + Math.PI / 2;
							
							// 將路徑向外偏移 PIT_LANE_WIDTH/2
							const offsetX = Math.cos(perpAngle) * PIT_LANE_WIDTH / 2;
							const offsetY = Math.sin(perpAngle) * PIT_LANE_WIDTH / 2;
							
							if (index === 0) {
								ctx.moveTo(x + offsetX, y + offsetY);
							} else {
								ctx.lineTo(x + offsetX, y + offsetY);
							}
						});

						// b. 繪製另一側邊界 (反向繪製)
						for (let i = trackData.pitWaypoints.length - 1; i >= 0; i--) {
							const wp = trackData.pitWaypoints[i];
							const x = wp.x * SCALE - player.x + W / 2;
							const y = wp.y * SCALE - player.y + H / 2;
							const dx = (i < trackData.pitWaypoints.length - 1) ? trackData.pitWaypoints[i + 1].x * SCALE - wp.x * SCALE : wp.x * SCALE - trackData.pitWaypoints[i - 1].x * SCALE;
							const dy = (i < trackData.pitWaypoints.length - 1) ? trackData.pitWaypoints[i + 1].y * SCALE - wp.y * SCALE : wp.y * SCALE - trackData.pitWaypoints[i - 1].y * SCALE;
							
							const angle = Math.atan2(dy, dx);
							const perpAngle = angle + Math.PI / 2;
							
							// 將路徑向內偏移 -PIT_LANE_WIDTH/2
							const offsetX = Math.cos(perpAngle) * (-PIT_LANE_WIDTH / 2);
							const offsetY = Math.sin(perpAngle) * (-PIT_LANE_WIDTH / 2);
							
							ctx.lineTo(x + offsetX, y + offsetY);
						}

						ctx.closePath();
						ctx.fill(); // 填充 Pit Lane 路面
						
						// 2. 繪製白色實線邊界 (沿著 Pit Waypoints 繪製)
						ctx.strokeStyle = 'white'; 
						ctx.lineWidth = 2 * SCALE; // 實線寬度

						ctx.beginPath();
						trackData.pitWaypoints.forEach((wp, index) => {
							const x = wp.x * SCALE - player.x + W / 2;
							const y = wp.y * SCALE - player.y + H / 2;
							
							if (index === 0) {
								ctx.moveTo(x, y);
							} else {
								ctx.lineTo(x, y);
							}
						});
						// 使用 stroke() 繪製白色實線
						ctx.stroke();

						// 3. 繪製 Pit Stop 停車位標記 (橘色)
						// --- 3. 繪製維修區車隊格子 (專業版：6 個偏右長方形) ---
						if (typeof RENDER_PARKING_INDEX !== 'undefined' && RENDER_PARKING_INDEX >= 0) {
							const trackData = TRACKS[currentTrack];
							const wp = trackData.pitWaypoints[RENDER_PARKING_INDEX];
							
							// 轉換為螢幕座標
							const bx = wp.x * SCALE - player.x + W / 2;
							const by = wp.y * SCALE - player.y + H / 2;

							const boxWidth = CARWIDTH * SCALE * 1.6;  // 橫向加長
							const boxHeight = CARHEIGHT * SCALE * 0.8; 
							const xOffset = boxWidth / 2 + 40;        // 將格子向右推 40 像素，讓左邊留出維修通道 (Pit Road)
							const gap = boxHeight * 1.1;              // 格子之間的間距

							for (let i = 0; i < 6; i++) {
								const currentY = by + (i * gap);
								const currentX = bx + xOffset;

								// A. 地面底色 (#555555 深灰色)
								ctx.fillStyle = '#555555';
								ctx.fillRect(currentX - boxWidth / 2, currentY - boxHeight / 2, boxWidth, boxHeight);

								// B. 專業邊框
								if (i === 0) {
									ctx.strokeStyle = '#00ffff'; // 玩家格子用青色
									ctx.lineWidth = 4;
								} else {
									ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // 其他格子半透明白
									ctx.lineWidth = 2;
								}
								ctx.strokeRect(currentX - boxWidth / 2, currentY - boxHeight / 2, boxWidth, boxHeight);

								// C. 裝飾線：格子右側增加紅色警告線
								ctx.fillStyle = (i === 0) ? '#ff0000' : '#777';
								ctx.fillRect(currentX + boxWidth / 2 - 8, currentY - boxHeight / 2, 8, boxHeight);

								// D. 文字提示
								ctx.font = 'bold 16px Rajdhani';
								ctx.fillStyle = 'white';
								ctx.textAlign = 'center';
								if (i === 0) {
									ctx.fillText('PLAYER STOP', currentX - 10, currentY + 6);
								} else {
									ctx.font = '12px Rajdhani';
									ctx.fillText(`TEAM ${i + 1}`, currentX - 10, currentY + 5);
								}
							}
						}
						
						ctx.restore();
					}
					// -----------------------

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
						
						// AI 獨立摩擦力設定 (已調整)0.985
						const FORWARD_DAMPING_AI = 0.988; 
						const deltaTime = 1/60; // 假設 60 FPS 的 deltaTime
						const trackData = TRACKS[currentTrack]; // 確保 trackData 存在

						// 【重要安全檢查】：如果賽道資料不存在，直接跳過 AI 迴圈
						if (!trackData) {
							// 繼續執行 Player VFX 邏輯 (如果有的話)
							// ... (Player VFX logic)
							return; 
						}
						
						// 預先計算 Pit Waypoints 索引
						// 需確保 track.js 中的 pitWaypoints 至少有 3 個點 (進入點 -> 停車點 -> 出口點)
						const PIT_WAYPOINTS_COUNT = trackData.pitWaypoints ? trackData.pitWaypoints.length : 0;
						
						// 停車點為倒數第二點 (例如長度為 4, 索引為 2)
						const PIT_PARKING_INDEX = PIT_WAYPOINTS_COUNT > 2 ? PIT_WAYPOINTS_COUNT - 2 : -1; 
						// 出口點為最後一點 (例如長度為 4, 索引為 3)
						const PIT_EXIT_INDEX = PIT_WAYPOINTS_COUNT > 0 ? PIT_WAYPOINTS_COUNT - 1 : -1; 
						const PIT_LANE_DIST_SCALED = 50 * SCALE; // Waypoint 追蹤距離

						allCars.forEach(car => {
							if (car.isPlayer) return; // 跳過玩家車輛

							const prevAngle = car.angle;
							
							// *** [NEW] 輪胎健康度初始化 (每輛車) ***
							if (car.tireHealth == null) {
								car.tireHealth = [100, 100, 100, 100];
								car.inPit = false;
								car.pitTimer = 0;
								car.pitCondition = 'out'; // 'out', 'entering', 'pitting', 'exiting'
								car.lapsSincePit = 0;
								car.pitWaypointIndex = 0; // NEW: AI 追蹤 Pit Lane 路徑的索引
							}
							
							// --- 輪胎損耗計算 ---
							updateTireWear(car, deltaTime); 
							
							// ------------------------------------
							// --- Pit 站決策與執行 (AI) 重構 ---
							// ------------------------------------
							
							if (car.inPit) {
								// 狀態 3: Pitting (換胎中) - 停車不動
								if (car.pitTimer < PIT_STOP_DURATION) {
									car.pitTimer += deltaTime;
									car.speed = 0;
									car.forwardSpeed = 0;
									car.sideSpeed = 0;
								} else {
									// 換胎完成 -> 進入 Exiting 狀態
									car.tireHealth = [100, 100, 100, 100];
									car.inPit = false;
									car.pitCondition = 'exiting';
									car.pitTimer = 0;
									car.lapsSincePit = 0;
									// 從停車點的下一個 Waypoint 開始追蹤
									car.pitWaypointIndex = PIT_PARKING_INDEX + 1; 
								}
								
							} else if (car.pitCondition === 'entering' || car.pitCondition === 'exiting') {
								
								// 狀態 2 & 4: Entering / Exiting (Pit Lane 自動駕駛)
								const targetWaypoint_unscaled = trackData.pitWaypoints[car.pitWaypointIndex];
								
								if (targetWaypoint_unscaled) {
									// 自動駕駛邏輯
									const targetX_scaled = targetWaypoint_unscaled.x * SCALE;
									const targetY_scaled = targetWaypoint_unscaled.y * SCALE;
									const distToTarget_scaled = Math.hypot(targetX_scaled - car.x, targetY_scaled - car.y);

									const targetAngle = Math.atan2(targetY_scaled - car.y, targetX_scaled - car.x);
									let angleDiff = targetAngle - car.angle;
									angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
									car.angle += angleDiff * 0.1; 

									// Pit Lane 限速
									car.forwardSpeed = Math.min(car.forwardSpeed || 0, 7.0); 
									if (car.forwardSpeed < 4.0) car.forwardSpeed = 4.0;
									car.sideSpeed = 0; 
									
									// 移動更新
									car.x += Math.cos(car.angle) * car.forwardSpeed * MOVE_SCALE;
									car.y += Math.sin(car.angle) * car.forwardSpeed * MOVE_SCALE;
									car.speed = car.forwardSpeed;
									
									// 檢測是否到達目標 Waypoint / 停車
									if (car.pitWaypointIndex === PIT_PARKING_INDEX && distToTarget_scaled < 15 * SCALE) {
										// 到達 Pit Stop 停車點 -> 進入 Pitting 狀態
										car.pitCondition = 'pitting';
										car.inPit = true;
									} else if (distToTarget_scaled < PIT_LANE_DIST_SCALED) {
										// 正常移動到下一個 Waypoint
										car.pitWaypointIndex++;
									}

								} else {
									// 已完成所有 Pit Lane Waypoints (Pit Exit)
									car.pitCondition = 'out'; 
									car.forwardSpeed = 10.0; // 緩慢加速回到賽道速度
									car.pitWaypointIndex = 0; // 重設索引
								}
								
							} else {
								// 狀態 1: Out (賽道上)
								const avgHealth = car.tireHealth.reduce((a, b) => a + b, 0) / 4;
								
								// Pit 決策: 輪胎低於閾值且靠近 Pit 入口
								if (avgHealth < MUST_PIT_THRESHOLD && trackData.pitEntry) {
									const unscaledCarX = car.x / SCALE;
									const unscaledCarY = car.y / SCALE;

									const dx = unscaledCarX - trackData.pitEntry.x;
									const dy = unscaledCarY - trackData.pitEntry.y;
									const distToEntry = Math.hypot(dx, dy);

									const PIT_ENTRY_DIST = 150; 
									if (distToEntry < PIT_ENTRY_DIST) {
										car.pitCondition = 'entering';
										car.pitWaypointIndex = 0; // 從 Pit Lane 第一個 Waypoint 開始
									}
								}
								
								// 賽道上的 Waypoint 追蹤 (只有在賽道上時才呼叫)
								followWaypoints(car); 
							}

							// ---------------------
							// --- 摩擦力/速度/VFX 邏輯 (無論狀態為何都執行) ---
							// ---------------------
							car.forwardSpeed *= FORWARD_DAMPING_AI;
							car.speed = Math.hypot(car.forwardSpeed || 0, car.sideSpeed || 0);
							let turnRate = car.angle - prevAngle;
							turnRate = Math.atan2(Math.sin(turnRate), Math.cos(turnRate));
							car.lastTurnRate = turnRate;
							
							
							// ---------------------
							// --- 內聯 AI 胎痕/塵土生成 ---
							// ---------------------
							const TIRE_MARK_THRESHOLD = 0.18; 
							const AI_MAX_SPEED = (car && typeof car.maxSpeedLimit === 'number') ? car.maxSpeedLimit : 26.0; 
							const DRIFT_SPEED_THRESHOLD = AI_MAX_SPEED * 0.18; 
							
							const aiForward = Math.abs(car.forwardSpeed || 0);
							const aiDriftAmt = Math.abs(car.driftAngle || 0);
							const isDrifting = (aiForward > DRIFT_SPEED_THRESHOLD) && (Math.abs(turnRate) > 0.012 || Math.abs(car.sideSpeed) > TIRE_MARK_THRESHOLD || aiDriftAmt > 0.12);

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
							
							// AI moving dust (always when moving)
							if (car.speed > 0.6) emitMoveDustForCar(car);
							
							// AI VFX rules:
							// - Blue boost flame when boosting (long straight)
							// - Orange high-speed flame at high speed when not boosting
							const AI_SPEED_FLAME_FIXED = 18.0; // Lowered threshold for flame effect
							const AI_SPEED_FLAME_THRESHOLD = Math.min(AI_MAX_SPEED * 0.4, AI_SPEED_FLAME_FIXED);
							const aiTotalSpeed = Math.abs(car.speed || 0);
							
							// In the AI car update section, replace the flame effect logic with:
							if (car.isBoosting) {
								if (Math.random() < 0.7) emitBoostForCar(car, false);
							} else {
								// Calculate AI car's max speed based on its spec
								const carMaxSpeed = getCarMaxSpeed(car);
								const currentSpeed = Math.abs(car.forwardSpeed || car.speed || 0);
								const speedRatio = currentSpeed / carMaxSpeed;
								
								// Set the speed ratio threshold for flame effect (70% of max speed)
								const speedRatioForFlame = 0.18;

								// Only show flame when speed is at or above 70% of max speed
								if (speedRatio >= speedRatioForFlame) {
									// Always emit flame when above threshold
									emitSpeedFlameForCar(car, false);
								}


							}
						}); // 結束 allCars.forEach
						
						// Player speed flame effect (orange) when near max speed and not boosting
						const wantsForwardVfx = (keys.ArrowUp || touch.up);
						const playerBoostingActive = isBoosting && wantsForwardVfx && boostMeter > 0 && boostCooldown <= 0;
						const playerSteeringActive = (keys.ArrowLeft || touch.left || keys.ArrowRight || touch.right);
						
						if (!playerBoostingActive && !playerSteeringActive && wantsForwardVfx) {
						    // Calculate player's max speed based on spec
						    const playerMaxSpeed = getCarMaxSpeed(player);
						    const speedFlameThreshold = playerMaxSpeed - 6.9; // Flame starts at max speed - 2 km/h
						    
						    if (player.speed > speedFlameThreshold) {
						        // Calculate flame intensity based on how close to max speed
						        const speedRatio = (player.speed - speedFlameThreshold) / 2; // Normalize to 0-1 range for 2 km/h window
						        const flameIntensity = Math.min(1, Math.max(0, speedRatio));
						        
						        // Emit flame with probability based on intensity
						        if (Math.random() < flameIntensity * 0.8) {
						            emitSpeedFlameForCar(player, true);
						        }
						    }
						}
					}
							
					
					// 更新粒子和胎痕
					boostParticles = boostParticles.filter(p => {
						p.x += p.vx;
						p.y += p.vy;
						p.life--;
						p.vy += (p.gravity || 0.1);
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
						if (p.type === 'flame') {
							const length = (p.length || 40) * (0.35 + alpha);
							const width = (p.width || 8) * (0.6 + alpha * 0.6);
							const sx = p.x - offsetX;
							const sy = p.y - offsetY;
							const ex = sx + Math.cos(p.angle) * length;
							const ey = sy + Math.sin(p.angle) * length;
							ctx.globalAlpha = Math.min(1, alpha * 1.15);
							ctx.strokeStyle = p.color || `rgba(255, 120, 0, ${alpha})`;
							ctx.lineWidth = width;
							ctx.lineCap = 'round';
							ctx.shadowBlur = 20;
							ctx.shadowColor = p.color || 'rgba(255,120,0,0.9)';
							ctx.beginPath();
							ctx.moveTo(sx, sy);
							ctx.lineTo(ex, ey);
							ctx.stroke();
						} else {
							const size = (p.size || 12) * (0.4 + alpha);
							ctx.fillStyle = p.color || `rgba(0, 200, 255, ${alpha})`;
							ctx.globalAlpha = Math.min(1, alpha * 1.2);
							ctx.shadowBlur = 18;
							ctx.shadowColor = p.color || 'rgba(0,200,255,0.9)';
							ctx.beginPath();
							ctx.arc(p.x - offsetX, p.y - offsetY, size, 0, Math.PI * 2);
							ctx.fill();
						}
					});
					ctx.restore();
					
					
					// 玩家車輛
					// === 玩家車輛繪製區域 ===
					ctx.save();
					ctx.translate(W / 2, H / 2);
					// 配合你原本的旋轉邏輯
					ctx.rotate(player.angle + Math.PI / 2);

					// --- [新加入] Cyber Formula 推進器 (Boost Pods) 效果 ---
					if (typeof isBoosting !== 'undefined' && isBoosting) {
						const podW = 12;  // 推進器寬度
						const podH = 35;  // 推進器長度
						const carW = CARWIDTH;
						const carH = CARHEIGHT;

						// 1. 繪製兩側展開的推進器外殼
						ctx.fillStyle = '#333'; // 深灰色機械感
						// 左後方 Pod
						ctx.fillRect(-carW / 2 - podW + 5, carH / 2 - 40, podW, podH);
						// 右後方 Pod
						ctx.fillRect(carW / 2 - 5, carH / 2 - 40, podW, podH);

						// 2. 繪製噴射火光 (藍色離子流)
						const flameHeight = 40 + Math.random() * 20; // 火光閃爍感
						
						// 創建漸層色 (從亮藍到透明)
						const gradient = ctx.createLinearGradient(0, carH / 2, 0, carH / 2 + flameHeight);
						gradient.addColorStop(0, '#00ffff'); // 青藍色
						gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.8)');
						gradient.addColorStop(1, 'transparent');

						ctx.fillStyle = gradient;
						
						// 左噴火
						ctx.beginPath();
						ctx.moveTo(-carW / 2 - 2, carH / 2 - 5);
						ctx.lineTo(-carW / 2 - 8, carH / 2 + flameHeight);
						ctx.lineTo(-carW / 2 + 4, carH / 2 + flameHeight);
						ctx.fill();

						// 右噴火
						ctx.beginPath();
						ctx.moveTo(carW / 2 + 2, carH / 2 - 5);
						ctx.lineTo(carW / 2 + 8, carH / 2 + flameHeight);
						ctx.lineTo(carW / 2 - 4, carH / 2 + flameHeight);
						ctx.fill();

						// 3. 加入火光核心 (白光)
						ctx.fillStyle = 'white';
						ctx.fillRect(-carW / 2 - 3, carH / 2 - 5, 4, 10);
						ctx.fillRect(carW / 2 - 1, carH / 2 - 5, 4, 10);
					}

					// --- 原有的車像繪製 ---
					if (player.img && player.img.complete) {
						// 這裡可以加一點點 Boost 時的車身震動感
						let shakeX = isBoosting ? (Math.random() - 0.5) * 2 : 0;
						let shakeY = isBoosting ? (Math.random() - 0.5) * 2 : 0;
						
						ctx.drawImage(player.img, -CARWIDTH / 2 + shakeX, -CARHEIGHT / 2 + shakeY, CARWIDTH, CARHEIGHT);
					}

					ctx.restore();
				
					// 倒數計時
					// In the game loop, update the countdown logic
					// Countdown is now handled by the interval
					if (gameState === 'countdown') {
						// The countdown is now handled by the interval
						drawStartLights(ctx, W, H, countdownStartTime);
						requestAnimationFrame(loop);
						return; // Skip the rest of the loop while counting down
					}
						
					// 玩家控制邏輯
					if (gameState === 'racing' && !raceFinished) {
						player.raceTime++;
						const deltaTime = 1/60;
						//const trackData = TRACKS[currentTrack]; 
						
						// 【重要安全檢查】: 如果 trackData 不存在，應立即跳出，防止後續報錯。
						if (!trackData) return; 
						
						// --- 輪胎損耗計算 ---
						player.tireHealth = tireHealth;
						updateTireWear(player, deltaTime);
						tireHealth = player.tireHealth;
						const playerAvgHealth = tireHealth.reduce((a, b) => a + b, 0) / 4;
						
					// -------------------------------------------------------------------
					// 玩家 Pit 站狀態處理與自動駕駛
					// -------------------------------------------------------------------


					const PIT_LANE_DIST_SCALED = 50 * SCALE;
					const PIT_WAYPOINTS_COUNT = trackData.pitWaypoints ? trackData.pitWaypoints.length : 0;
					// 【關鍵修正】：使用動態索引，確保即使未來 Waypoint 數量變動，停車點仍是倒數第三點。
					// 停車點的索引 (長度 5 時為 Index 2)
					const PIT_PARKING_INDEX = PIT_WAYPOINTS_COUNT - 3; 
					// Pit Exit 的索引 (長度 5 時為 Index 4)
					const PIT_EXIT_INDEX = PIT_WAYPOINTS_COUNT - 1; 

					// 狀態 1: Pitting (換胎中)
					if (inPit) {
						// 確保 inPit 狀態下，車輛是自動駕駛，且速度為 0
						player.pitTimer = (player.pitTimer || 0) + deltaTime;
						playerAutoDriving = true; 
						player.speed = 0;
						player.forwardSpeed = 0;
						player.sideSpeed = 0;
						document.getElementById('lapHud').textContent = `PIT STOP: ${Math.ceil(PIT_STOP_DURATION - player.pitTimer)}s`;

						if (player.pitTimer >= PIT_STOP_DURATION) {
							// 換胎完成 -> 準備 Exiting
							tireHealth = [100, 100, 100, 100];
							inPit = false;
							player.pitTimer = 0;
							playerPitWaypointIndex = PIT_PARKING_INDEX + 1; // 從停車點的下一個 Waypoint (Index 3) 開始追蹤
							document.getElementById('lapHud').textContent = `PIT LANE - EXITING`;
						}
					} 
					// 狀態 2: Auto Drive (Entering 或 Exiting)
					else if (playerAutoDriving && trackData.pitWaypoints && trackData.pitWaypoints.length >= 3) {
						
						const targetWaypoint_unscaled = trackData.pitWaypoints[playerPitWaypointIndex];
						
						// 檢查目標 Waypoint 是否存在且尚未到達 Pit 出口
						if (targetWaypoint_unscaled && playerPitWaypointIndex <= PIT_EXIT_INDEX) {
							const targetX_scaled = targetWaypoint_unscaled.x * SCALE;
							const targetY_scaled = targetWaypoint_unscaled.y * SCALE;

							// --- Pit Lane Auto Drive 物理邏輯 ---
							const targetAngle = Math.atan2(targetY_scaled - player.y, targetX_scaled - player.x);
							
							let angleDiff = targetAngle - player.angle;
							angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
							player.angle += angleDiff * 0.1; // 平滑轉向

							// Pit Lane 限速 (【速度已提升】)
							player.forwardSpeed = Math.min(player.forwardSpeed + 0.5, PIT_LANE_SPEED_LIMIT); 
							player.sideSpeed = 0; 

							// 移動更新 (取代手動控制)
							player.x += Math.cos(player.angle) * player.forwardSpeed * MOVE_SCALE;
							player.y += Math.sin(player.angle) * player.forwardSpeed * MOVE_SCALE;
							player.speed = player.forwardSpeed;

							const distToTarget_scaled = Math.hypot(targetX_scaled - player.x, targetY_scaled - player.y);
							
							// 檢測是否到達 Waypoint / 停車
							if (playerPitWaypointIndex === PIT_PARKING_INDEX) {
								// 目標是 Pit Stop 停車點 (Index 2)
								if (distToTarget_scaled < PIT_PARKING_DIST_SCALED * SCALE) { // 使用已縮放的停車距離
									// 達成停車條件 -> 進入 Pitting 狀態
									playerAutoDriving = false; 
									inPit = true; 
									player.pitTimer = 0; 
								}
							} else if (distToTarget_scaled < PIT_LANE_DIST_SCALED) {
								// 目標不是停車點，正常移動到下一個 Waypoint
								playerPitWaypointIndex++;
							}
						} else {
							// 已經到達 Pit Exit Waypoint 之後 (Index > PIT_EXIT_INDEX)
							playerAutoDriving = false;
							inPit = false; 
							player.forwardSpeed = Math.min(player.forwardSpeed || 0, 10.0); // 緩慢加速回到賽道速度
							player.sideSpeed = 0;
							document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;
							playerPitWaypointIndex = 0; // 重設索引
						}
					}
					// 狀態 3: 賽道上 (檢查是否應啟動 Auto Drive)
					// --- 在 loop 函式內替換這部分 ---
					else if (trackData.pitEntry && !playerAutoDriving) {
						const unscaledPlayerX = player.x / SCALE;
						const unscaledPlayerY = player.y / SCALE;
						const pitHudPrompt = document.getElementById('pitHudPrompt'); 
						
						// 檢測距離
						const PIT_ENTRY_TRIGGER_DIST = 120; // 使用世界座標距離

						const dx = unscaledPlayerX - trackData.pitEntry.x;
						const dy = unscaledPlayerY - trackData.pitEntry.y;
						const distToEntry = Math.hypot(dx, dy);

						// 情況 A: 到達入口且有請求 -> 啟動自動駕駛
						if (distToEntry < PIT_ENTRY_TRIGGER_DIST && (wantsToPit || playerAvgHealth < 20)) { 
							playerAutoDriving = true; 
							playerPitWaypointIndex = 0; 
							inPit = false;
							keys = {}; 
							touch = {};
							wantsToPit = false; // 進入後清除請求
							if (pitHudPrompt) pitHudPrompt.style.display = 'none';
							document.getElementById('lapHud').textContent = `PIT LANE - ENTERING`;
						} 
						// 情況 B: 已經按下按鈕，但車子還沒開到入口 (顯示藍色預約字樣)
						else if (wantsToPit) {
							if (pitHudPrompt) {
								pitHudPrompt.style.display = 'block';
								pitHudPrompt.textContent = "PIT REQUESTED";
								pitHudPrompt.style.backgroundColor = "rgba(0, 120, 255, 0.8)"; // 藍色背景
								pitHudPrompt.style.borderColor = "#00ffff"; // 青色邊框
							}
						}
						// 情況 C: 靠近入口但還沒按按鈕 (顯示黃色提示字樣)
						else if (distToEntry < PIT_ENTRY_TRIGGER_DIST) {
							if (pitHudPrompt) {
								pitHudPrompt.style.display = 'block';
								pitHudPrompt.textContent = "READY TO PIT (P)";
								pitHudPrompt.style.backgroundColor = "rgba(255, 165, 0, 0.8)"; // 橘色背景
								pitHudPrompt.style.borderColor = "#ffffff";
							}
						}
						// 情況 D: 其他情況 (隱藏提示)
						else {
							if (pitHudPrompt) pitHudPrompt.style.display = 'none'; 
						}
					}


						// -------------------------------------------------------------------
						// 原來的玩家手動控制邏輯與物理模型 (只有在非 Pit Auto Drive 時才執行)
						// -------------------------------------------------------------------
						if (!playerAutoDriving) {
							
							// 獨立的摩擦力設定 (沿用舊版)0.999
							const FORWARD_DAMPING_PLAYER = 0.9965;
							
							// 1. 設置轉向率和加速度
							const STEERING_RATE = 0.038 * player.spec.handling * 0.38;
							const ACCEL_RATE = player.spec.acceleration * 0.00975 * SPEED_UNIT_SCALE;
							const MAX_SPEED = 32;
							
							let acceleration = 0;
							let steering = 0;
							
							const wantsForward = (keys.ArrowUp || touch.up);
							if (wantsForward) acceleration = ACCEL_RATE;
							// softer brake: damp speed toward 0; allow very gentle reverse
							if (keys.ArrowDown || touch.down) { 
								if ((player.forwardSpeed || 0) > 0.2) {
									player.forwardSpeed *= 0.92;
									acceleration = 0;
								} else {
									acceleration = -0.18;
								}
							}
							if (keys.ArrowLeft || touch.left) steering = -STEERING_RATE;
							if (keys.ArrowRight || touch.right) steering = STEERING_RATE;
							
							const boostingActive = isBoosting && wantsForward && boostMeter > 0 && boostCooldown <= 0;
							const maxSpeedNow = boostingActive ? (MAX_SPEED * BOOST_SPEED_MULTIPLIER) : MAX_SPEED;
							if (boostingActive) {
								acceleration *= 1.25;
								boostMeter = Math.max(0, boostMeter - BOOST_DRAIN_RATE);
								if (Math.random() < 0.7) emitBoostForCar(player, true);
								if (boostMeter <= 0) boostCooldown = 60;
							} else {
								if (boostCooldown <= 0 && boostMeter < 1.0) {
									boostMeter = Math.min(1.0, boostMeter + BOOST_RECHARGE_RATE);
								}
							}
							
							// --- 玩家【高級飄移物理模型】---
							steering = Math.max(-0.4, Math.min(steering, 0.4));
							
							player.forwardSpeed = (player.forwardSpeed || player.speed || 0) + acceleration;
							// prevent snapping into fast reverse
							const MAX_REVERSE_SPEED = 3.0;
							player.forwardSpeed = Math.max(-MAX_REVERSE_SPEED, Math.min(player.forwardSpeed, maxSpeedNow));
							
							// 高速時降低轉向靈敏度，避免「瞬間轉太多」
							const speedForSteer = Math.abs(player.forwardSpeed);
							const steerDamp = 1 / (1 + speedForSteer * 0.06);
							player.angle += steering * steerDamp * player.forwardSpeed / 8;
							
							// 飄移物理
							const sideFrictionFactor = 0.99;
							const sideSpeedGeneration = 1.2;
							
							player.sideSpeed = player.sideSpeed || 0;
							if (Math.abs(steering) > 0.01) {
								player.sideSpeed -= player.forwardSpeed * steering * sideSpeedGeneration;
							}
							// 限制側滑量，避免轉向時「甩得太誇張」
							const maxSideSlip = Math.abs(player.forwardSpeed) * 0.7;
							player.sideSpeed = Math.max(-maxSideSlip, Math.min(player.sideSpeed, maxSideSlip));
							
							player.sideSpeed *= sideFrictionFactor;
							player.forwardSpeed *= FORWARD_DAMPING_PLAYER;
							
							const totalSpeed = Math.hypot(player.forwardSpeed, player.sideSpeed);
							const driftAngle = Math.atan2(player.sideSpeed, player.forwardSpeed);
							const actualAngle = player.angle + driftAngle;
							
							player.x += Math.cos(actualAngle) * totalSpeed * MOVE_SCALE;
							player.y += Math.sin(actualAngle) * totalSpeed * MOVE_SCALE;
							
							player.speed = totalSpeed;
							player.driftAngle = driftAngle;
							
							// --- 胎痕/塵土生成 (保持不變) ---
							const TIRE_MARK_THRESHOLD = 8.0;
							const DRIFT_SPEED_THRESHOLD = MAX_SPEED * 0.55;
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
								const TIRE_MARK_LIFE = 60;
								tireMarks.push({ x1: lastX_L, y1: lastY_L, x2: currentX_L, y2: currentY_L, life: TIRE_MARK_LIFE });
								tireMarks.push({ x1: lastX_R, y1: lastY_R, x2: currentX_R, y2: currentY_R, life: TIRE_MARK_LIFE });
								emitDustForCar(player, true, maxSpeedNow);
							}
							
							player.lastTireMarkPosL = { x: currentX_L, y: currentY_L };
							player.lastTireMarkPosR = { x: currentX_R, y: currentY_R };
							
							if (player.speed > 0.6) {
								emitMoveDustForCar(player);
							}

							if (!isBoosting) {
								// keep current state
							}
							// Update boost bar
							const boostBar = document.getElementById('boostBar');
							if (boostBar) {
								boostBar.style.transform = `scaleX(${boostMeter})`;
								boostBar.style.background = 'linear-gradient(90deg, #ff3333, #ff6666)';
							}

							// Handle boost cooldown
							if (boostCooldown > 0) boostCooldown--;

							drawDashboard(player.speed);
							drawTireMonitor(player, tireMonitorCtx);
							
							// 完賽檢測 (保持不變)
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

							
							// 更新HUD (保持不變)
							const sorted = [player, ...allCars].sort((a, b) => a.y - b.y);
							const pos = sorted.findIndex(c => c === player) + 1;
							document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;
							document.getElementById('posHud').textContent = `POS #${pos}/${allCars.length + 1}`;
							document.getElementById('speedHud').textContent = `${Math.round(Math.abs(player.speed) * 15)} kmh`;

						} // 結束 if (!playerAutoDriving)
						
						// -------------------------------------------------------------------
						// 3. 玩家 Pit 站換胎計時與退出邏輯 
						// -------------------------------------------------------------------

						if (inPit) {
							// 玩家在 Pit 站 (此時 playerAutoDriving 應為 false)
							
							// 簡易換胎流程 (假設玩家已停下)
							if (player.speed < 0.1) { 
								player.speed = 0;
								player.forwardSpeed = 0;
								player.sideSpeed = 0;
								
								// 顯示 Pit 站狀態
								document.getElementById('lapHud').textContent = `PIT STOP: ${Math.ceil(PIT_STOP_DURATION - pitTimer)}s`;

								pitTimer += deltaTime;
								
								if (pitTimer >= PIT_STOP_DURATION) {
									// 換胎完成
									tireHealth = [100, 100, 100, 100];
									inPit = false;
									pitTimer = 0;
									
									// 【啟動 Pit 站出口自動駕駛】
									playerAutoDriving = true;
									// 設定目標為停車點的下一個 Waypoint (例如索引 3)
									// 需確保 trackData.pitWaypoints 存在
									if (trackData.pitWaypoints && trackData.pitWaypoints.length >= 3) {
										const PIT_PARKING_INDEX = trackData.pitWaypoints.length - 3; 
										playerPitWaypointIndex = PIT_PARKING_INDEX + 1; 
									} else {
										 // 安全回退：直接回到手動控制
										 playerAutoDriving = false;
										 document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;
									}
								}
							}
						}

						// -------------------------------------------------------------------
						// 4. 玩家輪胎損壞強制停止 (Game Over) (保持在最後)
						// -------------------------------------------------------------------
						if (playerAvgHealth <= CRITICAL_HEALTH && gameState === 'racing') {
							// 輪胎已損壞，強制停止
							player.speed = 0;
							player.forwardSpeed = 0;
							player.sideSpeed = 0;
							
							if (!raceFinished) {
								// 顯示 Game Over 訊息
								document.getElementById('gameOverText').textContent = '輪胎嚴重損壞！比賽中止。請下次及時進 Pit 站更換輪胎。';
								document.getElementById('gameOverScreen').style.display = 'flex';
								gameState = 'finished'; // 結束遊戲
							}
						}
						
						// 在 loop 函式最下方，繪製 HUD 的地方
						// === Cyber Formula AI 對話框系統 ===
						if (gameState === 'racing') {
							const currentCarSpec = CARSPECS[selectedCar];
							const rawName = currentCarSpec.image.split('/').pop().replace('.png', '').replace(/_/g, ' ');
							const carNameLower = rawName.toLowerCase();
							
							let aiPrefix = "▶ AI: ";
							if (carNameLower.includes("asurada")) aiPrefix = "▶ ASURADA: ";
							else if (carNameLower.includes("ogre")) aiPrefix = "▶ OGRE: ";
							else if (carNameLower.includes("al-zard")) aiPrefix = "▶ AL-ZARD: ";
							else if (carNameLower.includes("ex-zard")) aiPrefix = "▶ EX-ZARD: ";
							
							let aiMsg = "";
							if (inPit) aiMsg = "SYSTEM CHECK... ALL UNITS GO.";
							else if (isBoosting) aiMsg = "BOOST ON! PRESSURE CRITICAL!";
							else if (tireHealth.some(h => h < 30)) aiMsg = "CAUTION: TIRE GRIP IS DOWN.";
							else if (wantsToPit) aiMsg = "PIT-IN STRATEGY CONFIRMED.";

							if (aiMsg !== "") {
								ctx.save();
								
								// ---------------------------------------------------------
								// 【位置調整區】 請修改以下數字來移動到你的紅圈位置
								// ---------------------------------------------------------
								const boxW = 520;           // 對話框寬度
								const boxH = 80;            // 對話框高度

								// 選項 A: 左上角 (避開 Lap 顯示) -> boxX = 30, boxY = 120
								// 選項 B: 正左方中間 -> boxX = 30, boxY = H/2 - 40
								// 選項 C: 左下方 (儀表板上方) -> boxX = 30, boxY = H - 280
								
								const boxX = 475;            // 修改這裡：越大越往右，越小越往左
								const boxY = H-270;           // 修改這裡：越大越往下，越小越往上
								// ---------------------------------------------------------

								// 1. 繪製 Cyber 風格底盒
								ctx.fillStyle = "rgba(0, 15, 30, 0.85)"; // 加深背景色更清晰
								ctx.strokeStyle = "#00ffff";
								ctx.lineWidth = 3;
								
								ctx.beginPath();
								ctx.moveTo(boxX, boxY);
								ctx.lineTo(boxX + boxW - 40, boxY);
								ctx.lineTo(boxX + boxW, boxY + 40);
								ctx.lineTo(boxX + boxW, boxY + boxH);
								ctx.lineTo(boxX + 40, boxY + boxH);
								ctx.lineTo(boxX, boxY + boxH - 40);
								ctx.closePath();
								ctx.fill();
								ctx.stroke();

								// 2. 裝飾性左邊條
								ctx.fillStyle = "#00ffff";
								ctx.fillRect(boxX + 15, boxY + 15, 8, boxH - 30);

								// 3. 文字繪製
								ctx.shadowBlur = 12;
								ctx.shadowColor = "#00ffff";
								
								// AI 名字 (黃色)
								ctx.font = "bold 28px 'Rajdhani'"; 
								ctx.fillStyle = "#fbff00"; 
								ctx.textAlign = "left";
								ctx.fillText(aiPrefix, boxX + 40, boxY + 50);
								
								// 訊息內容 (白色)
								ctx.font = "26px 'Rajdhani'";
								ctx.fillStyle = "#ffffff";
								const prefixWidth = ctx.measureText(aiPrefix).width;
								ctx.fillText(aiMsg, boxX + 45 + prefixWidth, boxY + 50);

								ctx.restore();
							}
						}					}

			if (gameState !== 'title') {
				drawMinimap(); 
				requestAnimationFrame(loop);
			}
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
					
					// Add boost button touch controls
					const boostBtn = document.getElementById('boostBtn');
					if (boostBtn) {
						boostBtn.addEventListener('touchstart', e => {
							e.preventDefault();
							if (boostMeter > 0 && boostCooldown <= 0) {
								isBoosting = true;
							}
						});
						
						boostBtn.addEventListener('touchend', e => {
							e.preventDefault();
							isBoosting = false;
						});
					}
					//

					
				}
				
				const pitBtn = document.getElementById('pitBtn');
				if (pitBtn) {
					// 定義一個統一的處理函式
					const handlePitPress = (e) => {
						e.preventDefault(); // 防止滾動或點擊穿透
						if (gameState === 'racing' && !playerAutoDriving) {
							wantsToPit = true;
							
						}
					};

					// 同時綁定觸控和點擊，確保在任何裝置都有效
					pitBtn.addEventListener('touchstart', handlePitPress, { passive: false });
					pitBtn.addEventListener('mousedown', handlePitPress); // 支援電腦滑鼠點擊測試
				}
				
				window.addEventListener('keydown', e => {
					if (e.code === 'Space') {
						e.preventDefault();
						if (boostMeter > 0 && boostCooldown <= 0) {
							isBoosting = true;
						}
					} else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
						e.preventDefault();
						keys[e.key] = true;
					} else if (e.key === 'p' || e.key === 'P') {
						// 玩家按下 P 鍵請求進入 Pit 站
						if (gameState === 'racing' && !playerAutoDriving && !inPit) {
							wantsToPit = true;
						}
					}
				});
				window.addEventListener('keyup', e => {
					if (e.code === 'Space') {
						isBoosting = false;
					} else {
						keys[e.key] = false;
					}
				});

				loadTrack(0);
				if (!raceFinished) {
					requestAnimationFrame(loop);
				}
			});

});
