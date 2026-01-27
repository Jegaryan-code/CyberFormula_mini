document.addEventListener('DOMContentLoaded', () =>  {

  const SCALE = 5.0;
  
  const CAMERA_ZOOM = 0.6;   // ★ 鏡頭縮放 (1 = 原來大小, 0.8 = 拉遠少少)

  const WORLD_SPEED_SCALE = 0.8;

  const SPEED_UNIT_SCALE = 36 / 17;

  const MOVE_SCALE = WORLD_SPEED_SCALE / SPEED_UNIT_SCALE;

  const CARWIDTH = 120;

  const CARHEIGHT = 150;
  
const grandstandImg = new Image();
grandstandImg.src = 'track/grandstand.png'; // Make sure the path is correct 
  
// Pre-load Team Banners/Logos
const teamLogos = {
    "SUGO": new Image(),
    "AOI": new Image(),
    "UNION": new Image(),
    "STORMZENDER": new Image(),
    "MISSING": new Image(),
    "OTHERS": new Image()
};
teamLogos["SUGO"].src = "team/sugo.webp";
teamLogos["AOI"].src = "team/aoi.webp";
teamLogos["UNION"].src = "team/union_savior.webp";
teamLogos["STORMZENDER"].src = "team/stormzender.webp";
teamLogos["MISSING"].src = "team/missing_link.webp";
teamLogos["OTHERS"].src = "team/single/Phoenix.webp";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let cyberSystemActive = false;
let cyberSystemTimer = 0;
const CYBER_DURATION = 300; // 5 seconds at 60fps
let offTrackFactor = 1.0;

// 讓 W / H 隨瀏覽器變
let W = canvas.width;
let H = canvas.height;



  const AI_AVATAR_MAP = [
  {key: "asurada", img: "ai/AI_ASURADA.png", name: "ASURADA"},
  {key: "garland", img: "ai/AI_Garland.png", name: "GARLAND"},
  {key: "ogre", img: "ai/AI_OGRE.png", name: "OGRE" },
  {key: "al-zard", img: "ai/AI_ZARD.png", name: "AL-ZARD"},
  {key: "ex-zard", img: "ai/AI_ZARD.png", name: "EX-ZARD"}];

let currentAIAvatarImg = new Image();

let currentAIName = "";

const dashCanvas = document.getElementById('dashboardCanvas');

const dashCtx = dashCanvas.getContext('2d');

let player = null, allCars = [], gameState = 'title', mode = '', countdown = 0;

let selectedCar = 0, playerCarImg = new Image(), trackImg = null;

let keys =  {

}
, touch =  {

}
, lap = 0, totalLaps = 5, raceFinished = false, currentTrack = 0;

let boostParticles = [];

let tireMarks = [];

let dustParticles = [];

let wantsToPit = false;

let playerAutoDriving = false;

let playerPitWaypointIndex = 0;

const BASE_MAX_SPEED = 30;

const MAX_SPEED_BONUS = 4;

// 在檔案頂部，變數宣告區
let lastTapTime = { ArrowLeft: 0, ArrowRight: 0 };
let isDriftMode = false;
const DOUBLE_TAP_DELAY = 350; // 稍微放寬判定時間，增加成功率

// Lifting Turn 狀態
let liftingTurnActive = false;
let liftingTurnTimer = 0;
let liftingTurnDirection = 0;   // -1 = 左轉, +1 = 右轉
let liftingTurnBaseSpeed = 0;   // 觸發當刻的基準速度
const LIFTING_TURN_DURATION = 0.85;
const LIFTING_TURN_SPEED_MULT = 1.02;
const LIFTING_TURN_MIN_SPEED_RATIO = 0.40; // 和上面保持一致

let mirageTurnMode = "mirage"; // "mirage" | "special"
let mirageTurnActive = false;
let mirageTurnTimer = 0;
let mirageBoostPower = 0;

const MIRAGE_TURN_DURATION = 1.5; // 持續約 0.5 秒
let mirageBurstDone = false;   // 是否已經做過「一次性爆衝」
let mirageBoostLock = 0;       // 防止立刻變回普通 Boost 的鎖（frame 計）
let mirageAfterimageAccum = 0;

let cometTurnActive = false;
let cometTurnTimer  = 0;
let cometTurnPower  = 0;
let cometTurnBurstDone = false;
const COMET_TURN_DURATION = 1.2;

let cometEvolutionActive = false;   // 大甩尾 Comet Evolution
let cometEvolutionTimer = 0;
const COMET_EVOLUTION_DURATION = 1.0;   // 甩尾火花持續時間 (秒)

let isBoosting = false;

let modeNotifyTimer = 0;

let modeNotifyText = "";

let liftingTurnBannerTimer = 0;           // 以 frame 計數
const LIFTING_TURN_BANNER_DURATION = 90;  // 大約 1.5 秒 (若 60fps)
let mirageTurnBannerTimer = 0;
const MIRAGE_TURN_BANNER_DURATION = 90;
let cometTurnBannerTimer = 0;
let cometEvoBannerTimer = 0;
const COMET_TURN_BANNER_DURATION = 90;
const COMET_EVO_BANNER_DURATION  = 90;

let boostMeter = 1.0;

const BOOST_DRAIN_RATE = 0.0015;

const BOOST_RECHARGE_RATE = 0.0015;

const BOOST_SPEED_MULTIPLIER = 1.4;

let boostCooldown = 0;

let tireHealth = [100, 100, 100, 100];

let inPit = false;

let pitTimer = 0;

const PIT_STOP_DURATION = 5.0;

const MUST_PIT_THRESHOLD = 30;

const PIT_LANE_SPEED_LIMIT = 20.0;

const PIT_PARKING_DIST_SCALED = 15;

const CRITICAL_HEALTH = 5;

const NORMAL_WEAR_RATE = 0.05;

const DRIFT_WEAR_MULTIPLIER = 1.0;

const PIT_ENTRY_WAYPOINT_INDEX = -2;

const PIT_STOP_WAYPOINT_INDEX = -1;

let sandPattern = null;

const miniCanvas = document.getElementById('minimapCanvas');

const miniCtx = miniCanvas.getContext('2d');

const MW = miniCanvas.width, MH = miniCanvas.height;

let mapScale = 0.5;

let mapOffsetX = 0, mapOffsetY = 0;

let lastCountdownTime = 0;

let countdownInterval = null;

let countdownStartTime = 0;

const tireMonitorCanvas = document.getElementById('tireMonitorCanvas');

const tireMonitorCtx = tireMonitorCanvas ? tireMonitorCanvas.getContext('2d') : null;

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    
    // Scale for high resolution screens
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    W = cssW;
    H = cssH;
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Hide mobile controls on PC
    const isMobile = window.matchMedia("(pointer: coarse)").matches;
    document.getElementById('mobileControls').style.display = isMobile ? 'flex' : 'none';
	
    // Resize Tire Monitor internal resolution
    const tireContainer = document.getElementById('tireMonitorContainer');
    if (tireMonitorCanvas && tireContainer) {
        const rect = tireContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        tireMonitorCanvas.width = rect.width * dpr;
        tireMonitorCanvas.height = rect.height * dpr;
    }	
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
resizeCanvas();  // 一入頁就 fit browser


// 全域狀態
let aeroModeActive = false;
let circuitModeActive = false;
let currentMode = 'Circuit'; // 初始為 Circuit Mode

function getCarMaxSpeed(car)  {

  if (!car.spec) return BASE_MAX_SPEED;

  const minAccel = 4.5;

  const maxAccel = 5.3;

  const normalizedAccel = (car.spec.acceleration - minAccel) / (maxAccel - minAccel);

  const speedBonus = normalizedAccel * MAX_SPEED_BONUS;

  return BASE_MAX_SPEED + speedBonus;

}

// 2. Off-Track Detection Logic
function checkOffTrack(car) {
    const t = TRACKS[currentTrack];
    let minSquareDist = Infinity;

    // 1. Check Main Race Track
    for (let i = 0; i < t.waypoints.length; i++) {
        const p1 = t.waypoints[i];
        const p2 = t.waypoints[(i + 1) % t.waypoints.length];
        const dist = distToSegment(
            car.x, car.y, 
            p1.x * SCALE, p1.y * SCALE, 
            p2.x * SCALE, p2.y * SCALE
        );
        if (dist < minSquareDist) minSquareDist = dist;
    }

    // 2. Check Pit Road (Exclude from penalty)
    if (t.pitWaypoints) {
        for (let i = 0; i < t.pitWaypoints.length - 1; i++) {
            const p1 = t.pitWaypoints[i];
            const p2 = t.pitWaypoints[i + 1];
            const dist = distToSegment(
                car.x, car.y, 
                p1.x * SCALE, p1.y * SCALE, 
                p2.x * SCALE, p2.y * SCALE
            );
            if (dist < minSquareDist) minSquareDist = dist;
        }
    }

    const roadWidthThreshold = (95 * SCALE);
    const isOff = Math.sqrt(minSquareDist) > roadWidthThreshold;
    
    if (isOff) {
        // Subtle penalty so car can still move back to track
        offTrackFactor = 0.98; 
        
        // Triple Dust effect when off-track
        if (Math.abs(car.speed) > 2) {
            for(let i=0; i<3; i++) {
                dustParticles.push({
                    x: car.x + (Math.random()-0.5)*30,
                    y: car.y + (Math.random()-0.5)*30,
                    vx: -Math.cos(car.angle) * 1.5,
                    vy: -Math.sin(car.angle) * 1.5,
                    life: 30,
                    maxLife: 30
                });
            }
        }
    } else {
        offTrackFactor = 1.0;
    }
}

function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
    if (l2 === 0) return Math.pow(px - x1, 2) + Math.pow(py - y1, 2);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.pow(px - (x1 + t * (x2 - x1)), 2) + Math.pow(py - (y1 + t * (y2 - y1)), 2);
}

function emitOffTrackDust(car) {
    for (let i = 0; i < 50; i++) { // Triple dust
        dustParticles.push({
            x: car.x + (Math.random() - 0.5) * 140,
            y: car.y + (Math.random() - 0.5) * 140,
            vx: -Math.cos(car.angle) * 2,
            vy: -Math.sin(car.angle) * 2,
            life: 400,
            maxLife: 600,
            color: '#D2B48C' // Sandy color
        });
    }
}

function emitCyberParticle(car, color) {
    boostParticles.push({
        x: car.x + (Math.random() - 0.5) * 40,
        y: car.y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 20,
        maxLife: 20,
        color: color,
        width: 2,
        length: 2,
        angle: Math.random() * Math.PI * 2
    });
}

function activateCyberSystem() {
    if (!player) return;
    const spec = player.spec;
    const carName = spec.image.toLowerCase();
    
    cyberSystemActive = !cyberSystemActive;

    // --- NEW: WAYPOINT SYNCHRONIZATION ---
    if (cyberSystemActive) {
        const wp = TRACKS[currentTrack].waypoints;
        let minDist = Infinity;
        let closestIdx = 0;

        // Scan all waypoints to find the one closest to our current location
        for (let i = 0; i < wp.length; i++) {
            const dx = wp[i].x * SCALE - player.x;
            const dy = wp[i].y * SCALE - player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < minDist) {
                minDist = dist;
                closestIdx = i;
            }
        }
        // Target the NEXT waypoint after the closest one to ensure we move forward
        player.waypointIndex = (closestIdx + 1) % wp.length;
    }
    // -------------------------------------

    modeNotifyTimer = 180; 

    if (cyberSystemActive) {
        if (carName.includes("asurada")) modeNotifyText = "ASURADA: ALL SYSTEMS LINKED. I WILL ASSIST YOUR NAVIGATION.";
        else if (carName.includes("ogre")) modeNotifyText = "OGRE: ...LIMITER REMOVED. DON'T LET GO OF THE WHEEL.";
        else if (carName.includes("al-zard")) modeNotifyText = "AL-ZARD: AUTO-BIO LINK STABILIZED. CALCULATING OPTIMAL PATH.";
        else if (carName.includes("garland")) modeNotifyText = "GARLAND: DEFENSIVE PROGRAM ACTIVE. CHASSIS STABILIZED.";
        else modeNotifyText = "SYSTEM: CYBER LINK ESTABLISHED.";
    } else {
        modeNotifyText = "SYSTEM: DISCONNECTED. RETURNING TO MANUAL CONTROL.";
    }
}

function updateCyberSystemLogic() {
    if (!cyberSystemActive || !player) return;

    const carName = player.spec.image.toLowerCase();
    const wp = TRACKS[currentTrack].waypoints;
    if (!wp || !wp.length) return;

    // 1. Get current target based on synced index
    const baseTarget = wp[player.waypointIndex];
    const tx = baseTarget.x * SCALE;
    const ty = baseTarget.y * SCALE;
    const finalDX = tx - player.x;
    const finalDY = ty - player.y;

    // 2. Progression logic (So Al-Zard keeps moving through points)
    const distToWp = Math.hypot(finalDX, finalDY);
    if (distToWp < 600) { // 600 is a good "capture" distance
        player.waypointIndex = (player.waypointIndex + 1) % wp.length;
    }

    // 3. AL-ZARD (Auto Bio-Link)
    if (carName.includes("al-zard") || carName.includes("zard")) {
        const targetAngle = Math.atan2(finalDY, finalDX);
        const steeringAngle = Math.atan2(Math.sin(targetAngle - player.angle), Math.cos(targetAngle - player.angle)) * 0.38;

        player.angle += steeringAngle * 0.08; 

        const baseMaxS = 26.7;
        const targetSpeed = isBoosting ? (baseMaxS * 2.5) : (baseMaxS * 0.75);

        if (player.forwardSpeed < targetSpeed) {
            player.forwardSpeed += 0.25; 
        }

        if (Math.abs(steeringAngle) > 0.05 && !isBoosting) {
            player.forwardSpeed *= 0.985; 
        }

        if (Math.random() < 0.3) emitCyberParticle(player, '#ff0000');
    }

    // --- 3. ASURADA (Navigation Support - NOT Auto-Drive) ---
    else if (carName.includes("asurada")) {
        // Ported logic: Asurada helps you stay on track during drifts
        if (isDriftMode || Math.abs(player.sideSpeed) > 3) {
            // "Aero-Grip" momentum preservation
            player.forwardSpeed *= 1.012; 

            const targetAngle = Math.atan2(finalDY, finalDX);
            const diff = Math.atan2(Math.sin(targetAngle - player.angle), Math.cos(targetAngle - player.angle));
            // Very small authority so player stays in control
            player.angle += diff * 0.006; 
        }
        if (Math.random() < 0.2) emitCyberParticle(player, '#00ffff');
    }

    // --- 4. OGRE (Berserk Mode) ---
    else if (carName.includes("ogre")) {
        // High speed, low stability
        if (player.forwardSpeed > 5) player.forwardSpeed += 0.07;
        player.angle += (Math.random() - 0.5) * 0.03;
        if (Math.random() < 0.3) emitCyberParticle(player, '#ff00ff');
    }

    // --- 5. GARLAND (Stability) ---
    else if (carName.includes("garland")) {
        tireHealth = [100, 100, 100, 100];
        player.sideSpeed *= 0.85; 
        if (Math.random() < 0.2) emitCyberParticle(player, '#ffffff');
    }
}

// 4. Update the Draw Avatar function to be clickable
function drawSingleAIAvatar(ctx) {
    if (!currentAIAvatarImg || !currentAIAvatarImg.complete) return;

    const size = Math.min(W * 0.08, 140);
    const x = 4 * W / 100;
    const y = 9 * H / 100;

    ctx.save();
    
    // Add glowing background if Cyber System is active
    if (cyberSystemActive) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#00ffff";
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 4;
        ctx.strokeRect(x - 5, y - 5, size + 10, size + 10);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 10, y - 10, size + 20, size + 50);

    ctx.drawImage(currentAIAvatarImg, x, y, size, size);

    ctx.font = `bold ${Math.max(14, size * 0.25)}px Rajdhani`;
    ctx.fillStyle = cyberSystemActive ? '#00ffff' : '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(currentAIName, x + size / 2, y + size + 28);
    
    // Status Text
    ctx.font = `bold 10px Rajdhani`;
    ctx.fillText(cyberSystemActive ? "SYSTEM ACTIVE" : "STANDBY", x + size / 2, y + size + 42);

    ctx.restore();
}

// Add event listener for AI Head Click
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Check if clicked in AI Avatar area
    if (clickX > 20 && clickX < 140 && clickY > 80 && clickY < 200) {
        activateCyberSystem();
    }
});

function createSandPattern()  {

  const pCanvas = document.createElement('canvas');

  pCanvas.width = 64;

  pCanvas.height = 64;

  const pCtx = pCanvas.getContext('2d');

  pCtx.fillStyle = '#C2B280';

  pCtx.fillRect(0, 0, 64, 64);

  pCtx.fillStyle = '#B0A070';

  for(let i=0;
  i<40;
  i++)  {

    pCtx.fillRect(Math.random()*64, Math.random()*64, 2, 2);

  }

pCtx.fillStyle = '#D6C690';

for(let i=0;
i<40;
i++)  {

  pCtx.fillRect(Math.random()*64, Math.random()*64, 2, 2);

}

return ctx.createPattern(pCanvas, 'repeat');

}

function drawSandBackground(ctx)  {

  const patternSize = 100;

  ctx.save();

  ctx.fillStyle = '#C2B280';

  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(160, 140, 80, 0.3)';

  for (let i=0;
  i<W;
  i+=50)  {

    for (let j=0;
    j<H;
    j+=50)  {

      if ((i+j)%100 === 0) ctx.fillRect(i, j, 50, 50);

    }

}

ctx.restore();

}

function drawCurrentTrackRoad(ctx) {
    const t = TRACKS[currentTrack];
    const wps = t.waypoints;
    if (!wps || !wps.length) return;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";

    ctx.beginPath();
    ctx.moveTo(wps[0].x * SCALE, wps[0].y * SCALE);
    for (let i = 1; i < wps.length; i++) {
        ctx.lineTo(wps[i].x * SCALE, wps[i].y * SCALE);
    }

ctx.closePath();

ctx.lineWidth = 720;

ctx.strokeStyle = '#000000';

ctx.stroke();

ctx.lineWidth = 700;

ctx.strokeStyle = '#d32f2f';

ctx.stroke();

ctx.lineWidth = 700;

ctx.strokeStyle = '#ffffff';

ctx.setLineDash([50, 50]);

ctx.lineDashOffset = -Date.now() / 20;

ctx.stroke();

ctx.setLineDash([]);

ctx.lineWidth = 550;

ctx.strokeStyle = '#555555';

ctx.stroke();

ctx.lineWidth = 6;

ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';

ctx.setLineDash([80, 100]);

ctx.stroke();

ctx.restore();

}

function drawModeHUD(ctx) {
    if (gameState !== 'racing') return;

    const x = W - 180;
    const y = H - 280; // Above the dashboard
    
    ctx.save();
    // Background plate
    ctx.fillStyle = "rgba(0, 20, 40, 0.7)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 150, y);
    ctx.lineTo(x + 130, y + 30);
    ctx.lineTo(x - 20, y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = currentMode === 'AERO' ? "#00ffff" : "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.font = "bold 18px Rajdhani";
    ctx.textAlign = "center";
    ctx.fillStyle = currentMode === 'AERO' ? "#00ffff" : "#ffffff";
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.fillStyle;
    
    // Add a little icon or bracket
    const label = currentMode === 'AERO' ? "« AERO MODE »" : "[ CIRCUIT ]";
    ctx.fillText(label, x + 65, y + 22);
    ctx.restore();
}

function drawCyberOverlay(ctx) {
    if (!cyberSystemActive || gameState !== 'racing') return;

    const carName = player.spec.image.toLowerCase();
    ctx.save();

    if (carName.includes("asurada")) {
        // ASURADA: Blue Digital Scanlines at edges
        ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        for (let i = 0; i < H; i += 10) {
            ctx.beginPath();
            ctx.moveTo(0, i); ctx.lineTo(W, i);
            ctx.stroke();
        }
    } else if (carName.includes("ogre")) {
        // OGRE: Purple "Glitch" / Vibration effect
        ctx.fillStyle = "rgba(255, 0, 255, 0.05)";
        ctx.fillRect(0, 0, W, H);
        // Slight random screen offset handled in loop camera if desired
    } else if (carName.includes("al-zard")) {
        // AL-ZARD: Red "Targeting" Vignette
        let grd = ctx.createRadialGradient(W/2, H/2, W/3, W/2, H/2, W);
        grd.addColorStop(0, "transparent");
        grd.addColorStop(1, "rgba(255, 0, 0, 0.2)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
}

function drawAIMessageBox(ctx, msg, prefix, boosting) {
    ctx.save();
    const boxW = W * 0.6;
    const boxH = H * 0.08;
    const boxX = (W - boxW) / 2;
    const boxY = H * 0.08;

    ctx.fillStyle = "rgba(0, 15, 30, 0.85)";
    ctx.strokeStyle = boosting ? "#ff00ff" : "#00ffff";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(boxX, boxY);
    ctx.lineTo(boxX + boxW - 40, boxY);
    ctx.lineTo(boxX + boxW, 40 + boxY);
    ctx.lineTo(boxX + boxW, boxH + boxY);
    ctx.lineTo(boxX + 40, boxH + boxY);
    ctx.lineTo(boxX, boxH - 40 + boxY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const titleFont = Math.max(14, H * 0.020);
    const msgFont   = Math.max(12, H * 0.018);
    const textY = boxY + boxH * 0.6;

    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00ffff";
    ctx.textAlign = "left";
    ctx.font = `bold ${titleFont}px 'Rajdhani'`;
    ctx.fillStyle = "#fbff00";
    ctx.fillText(prefix, boxX + 36, textY);

    ctx.font = `${msgFont}px 'Rajdhani'`;
    ctx.fillStyle = "#ffffff";
    const prefixWidth = ctx.measureText(prefix).width;
    ctx.fillText(msg, boxX + 40 + prefixWidth, textY);
    ctx.restore();
}

function updateCarPhysics(car, acceleration, steering) {
  if (car.isAI) {
    car.forwardSpeed = (car.forwardSpeed || 0) + acceleration;
    car.forwardSpeed *= 0.995;
    car.sideSpeed = 0; car.driftAngle = 0;
    car.angle += steering * 0.1;
    car.speed = car.forwardSpeed;
  } else {
    // --- 玩家物理修正 ---
    const baseMaxS = 26.7;
    // Boost 時提高極速上限
    const maxS = isBoosting ? baseMaxS * 2.5 : baseMaxS;
    const sRatio = Math.min(1.0, (car.forwardSpeed || 0) / maxS);
    
    let processedAccel = 0;

    if (isBoosting) {
      // 【關鍵修正】Boost 模式：無視科學衰減，強制給予高爆發力
      // 即使在 MAX 邊緣，也要能繼續推上去
      processedAccel = 0.5 * (1.1 - sRatio); 
    } else if (keys['ArrowUp']) {
      // 正常加速：起步快，後段慢的衰減曲線
      let playerPowerCurve = Math.pow(1.0 - sRatio, 0.15);
      processedAccel = acceleration * 0.6 * playerPowerCurve;
      
      // 保底推力，確保能慢速磨上 baseMaxS
      if (sRatio < 0.98) processedAccel += 0.012;
    } else if (keys['ArrowDown']) {
      processedAccel = -0.8;
    }

    car.forwardSpeed = (car.forwardSpeed || 0) + processedAccel;

    // 引擎阻力：Boost 時阻力更小，讓它能突破極限
    const damping = isBoosting ? 0.996 : (keys['ArrowUp'] ? (0.993 + (sRatio * 0.002)) : 0.99);
    car.forwardSpeed *= damping;

    if (car.forwardSpeed < 0) car.forwardSpeed = 0;

    // 轉向與甩尾處理
    if (!isDriftMode) {
      const turnLoss = Math.abs(steering) * 0.1; 
      car.forwardSpeed *= (1.0 - turnLoss);
      car.sideSpeed = (car.sideSpeed || 0) * 0.8; 
      car.driftAngle = 0;
      car.angle += steering * 0.08;
      car.speed = car.forwardSpeed;
    } else {
      car.sideSpeed = (car.sideSpeed || 0) - (car.forwardSpeed * steering * 4.5);
      car.sideSpeed *= 0.94;
      car.forwardSpeed *= 0.985; 
      car.driftAngle = Math.atan2(car.sideSpeed, car.forwardSpeed);
      car.speed = Math.hypot(car.forwardSpeed, car.sideSpeed);
      car.angle += steering * 0.04;
    }

    car.maxSpeedLimit = maxS;
  }

  const actualAngle = car.angle + (car.driftAngle || 0);
  car.x += Math.cos(actualAngle) * car.speed * MOVE_SCALE;
  car.y += Math.sin(actualAngle) * car.speed * MOVE_SCALE;
}

function getCarTurnType(spec) {
  if (!spec) return "none";
  return spec.turn || "none";
}

function getTurnDisplayName(turnType) {
  switch (turnType) {
    case "lift":    return "Lifting Turn";
    case "mirage":  return "Mirage Turn";
    case 'comet':      return 'Comet Turn';
    case 'comet_evo':  return 'Comet Evolution';
    case "special": return "Special Turn";
    default:        return "None";
  }
}

function calcSpeedScore(spec) {
  // 用加速由 4.5–5.3 map 去 1–10 分
  const minAccel = 4.5;
  const maxAccel = 5.3;
  const a = Math.max(minAccel, Math.min(maxAccel, spec.acceleration || minAccel));
  const ratio = (a - minAccel) / (maxAccel - minAccel);
  return Math.max(1, Math.min(10, Math.round(ratio * 10)));
}

function calcControlScore(spec) {
  // handling 0.7–0.95 左右，直接 *10 變成 7–10 分
  const h = spec.handling || 0.7;
  return Math.max(1, Math.min(10, Math.round(h * 10)));
}

function isLiftingTurnCar() {
    const spec = CARSPECS[selectedCar];
    if (!spec || !spec.image) return false;
    const rawName = spec.image.split('/').pop().toLowerCase();
    return rawName.includes("n-asurada") || rawName.includes("vision-asurada");
}

function tryActivateLiftingTurn(player, steer, maxSpeedNow) {
  if (liftingTurnActive) return;
  if (!player) return;
  if (gameState !== 'racing') return;

  // 只支援 Asurada 系列
  const spec = CARSPECS[selectedCar];
  const rawName = spec && spec.image
    ? spec.image.split('/').pop().toLowerCase()
    : "";
  if (!rawName.includes("n-asurada") &&
      !rawName.includes("vision-asurada")) {
    return;
  }

  const speedNow = Math.abs(player.forwardSpeed || player.speed || 0);
  const needSpeed = maxSpeedNow * LIFTING_TURN_MIN_SPEED_RATIO;
  if (speedNow < needSpeed) return;

  const side = player.sideSpeed || 0;
  let dir;

  // 1) 以側滑方向決定彎向（正 = 左彎, 負 = 右彎）
  if (Math.abs(side) > 0.5) {
    dir = side > 0 ? -1 : 1;   // 左彎 -> dir=-1, 右彎 -> dir=1
  }
  // 2) 次選用即時 steering
  else if (Math.abs(steer) > 0.001) {
    dir = steer < 0 ? -1 : 1;
  }
  // 3) 再退一步用鍵盤
  else if (keys['ArrowLeft']) {
    dir = -1;
  } else if (keys['ArrowRight']) {
    dir = 1;
  } else {
    dir = 1;  // fallback
  }

  liftingTurnDirection = dir;
  liftingTurnActive = true;
  liftingTurnTimer = 0;
  liftingTurnBaseSpeed = speedNow;

  const outwardSign = (dir === 1 ? 1 : -1);
  const outwardKick = maxSpeedNow * 0.35;   // 可以之後再 tune
  player.sideSpeed += outwardSign * outwardKick;

  // ★ 觸發時開啟大字 Banner 計時
  liftingTurnBannerTimer = LIFTING_TURN_BANNER_DURATION;

}

function isMirageTurnCar() {
    const spec = CARSPECS[selectedCar];
    if (!spec || !spec.image) return false;
    const name = spec.image.split('/').pop().toLowerCase();
    // 視乎你 ogre 素材檔名，通常會包含 "ogre" 或 "an-21"
    return name.includes("ogre") || name.includes("an-21");
}

function tryActivateMirageTurn(player, maxSpeedNow, mode = "mirage") {
  const speed = Math.abs(player.forwardSpeed || player.speed || 0);
  const side  = Math.abs(player.sideSpeed || 0);
  const driftFactor = Math.min(1, side / (maxSpeedNow * 0.6));
  const speedFactor = Math.min(1, speed / maxSpeedNow);
  let power = 5.0 * (0.3 + 0.7 * driftFactor * speedFactor);
  if (mode === "special") power *= 0.6;

  mirageTurnMode   = mode;
  mirageBoostPower = power;
  mirageTurnActive = true;
  mirageTurnTimer  = 0;
  mirageBurstDone  = false;
  mirageBoostLock  = 60;
  if (mode === "mirage") {
    mirageTurnBannerTimer = MIRAGE_TURN_BANNER_DURATION;
  }
}

function tryActivateCometTurn(player, maxSpeedNow) {
    const speed = Math.abs(player.forwardSpeed || player.speed || 0);
    const side  = Math.abs(player.sideSpeed  || 0);

    const driftFactor = Math.min(1, side / (maxSpeedNow * 0.6));
    const speedFactor = Math.min(1, speed / maxSpeedNow);

    // 類 Mirage，但少少弱
    let power = 4.0 * (0.3 + 0.7 * driftFactor * speedFactor);

    cometTurnPower     = power;
    cometTurnActive    = true;
    cometTurnTimer     = 0;
    cometTurnBurstDone = false;
	cometTurnBannerTimer = COMET_TURN_BANNER_DURATION;

}

function tryActivateCometEvolution(player, steer, maxSpeedNow) {
    if (cometEvolutionActive) return;
    if (!player) return;
    if (gameState !== 'racing') return;

    const speedNow = Math.abs(player.forwardSpeed || player.speed || 0);
    const needSpeed = maxSpeedNow * LIFTING_TURN_MIN_SPEED_RATIO; // 同 lifting

    const side = player.sideSpeed || 0;

    // 判定左右（同 lifting）
    let dir;
    if (Math.abs(side) > 0.5) {
        dir = side > 0 ? -1 : 1;
    } else if (Math.abs(steer) > 0.001) {
        dir = steer < 0 ? -1 : 1;
    } else if (keys['ArrowLeft']) {
        dir = -1;
    } else if (keys['ArrowRight']) {
        dir = 1;
    } else {
        dir = 1;
    }

    cometEvolutionActive = true;
    cometEvolutionTimer  = 0;

    // 偏側甩出去＋保持速度
    const outwardSign = (dir === 1 ? 1 : -1);
    const outwardKick = maxSpeedNow * 0.35;
    player.sideSpeed  += outwardSign * outwardKick;
	cometEvoBannerTimer = COMET_EVO_BANNER_DURATION;

}

function drawDashboard(speed)  {

  const w = dashCanvas.width;

  const h = dashCanvas.height;

  const cx = w / 2;

  const cy = h - 20;

  const radius = 160;

  dashCtx.clearRect(0, 0, w, h);

  const startAngle = Math.PI;

  const endAngle = Math.PI * 2;

  const maxSpeed = 30;

  const speedPct = Math.min(Math.abs(speed), maxSpeed) / maxSpeed;

  const currentAngle = startAngle + (endAngle - startAngle) * speedPct;

  dashCtx.beginPath();

  dashCtx.arc(cx, cy, radius, startAngle, endAngle);

  dashCtx.lineWidth = 40;

  dashCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';

  dashCtx.stroke();

  const grad = dashCtx.createLinearGradient(0, 0, w, 0);

  grad.addColorStop(0.2, '#00ff00');

  grad.addColorStop(0.6, '#ffff00');

  grad.addColorStop(1.0, '#ff0000');

  dashCtx.beginPath();

  dashCtx.arc(cx, cy, radius, startAngle, endAngle);

  dashCtx.lineWidth = 20;

  dashCtx.lineCap = 'butt';

  dashCtx.strokeStyle = 'rgba(255,255,255,0.1)';

  dashCtx.stroke();

  dashCtx.beginPath();

  dashCtx.arc(cx, cy, radius, startAngle, currentAngle);

  dashCtx.lineWidth = 20;

  dashCtx.strokeStyle = grad;

  dashCtx.stroke();

  dashCtx.save();

  dashCtx.translate(cx, cy);

  dashCtx.rotate(currentAngle);

  dashCtx.beginPath();

  dashCtx.moveTo(0, 0);

  dashCtx.lineTo(radius + 10, 0);

  dashCtx.lineWidth = 4;

  dashCtx.strokeStyle = '#fff';

  dashCtx.shadowBlur = 10;

  dashCtx.shadowColor = '#fff';

  dashCtx.stroke();

  dashCtx.restore();

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

function drawStartLights(ctx, W, H, countdownStartTime)  {

  if (gameState !== 'countdown' || !countdownStartTime) return;

  const timeElapsed = (Date.now() - countdownStartTime);

  const lightNumber = Math.floor(timeElapsed / 1000);

  ctx.save();

  const lights = 5;

  const lightRadius = 30;

  const lightGap = 20;

  const totalWidth = lights * 2 * lightRadius + (lights - 1) * lightGap;

  let startX = (W / 2) - (totalWidth / 2) + lightRadius;

  let startY = 150;

  for (let i = 0;
  i < lights;
  i++)  {

    ctx.beginPath();

    const x = startX + i * (2 * lightRadius + lightGap);

    ctx.arc(x, startY, lightRadius, 0, Math.PI * 2);

    if (lightNumber > i && lightNumber <= lights)  {

      ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';

      ctx.shadowBlur = 15;

      ctx.shadowColor = '#f00';

    }
  else  {

    ctx.fillStyle = 'rgba(30, 30, 30, 0.6)';

    ctx.shadowBlur = 0;

    ctx.shadowColor = 'transparent';

  }

ctx.fill();

}

if (lightNumber >= lights)  {

  ctx.font = 'bold 150px Rajdhani, sans-serif';

  ctx.textAlign = 'center';

  ctx.fillStyle = '#0f0';

  ctx.shadowBlur = 20;

  ctx.shadowColor = '#0f0';

  ctx.fillText('GO!', W / 2, H / 2);

}

ctx.restore();

}

function updateAIAvatarByCarName(carName)  {

  if (!carName) return;

  const nameLower = carName.toLowerCase();

  for (const ai of AI_AVATAR_MAP)  {

    if (nameLower.includes(ai.key))  {

      if (currentAIAvatarImg.src !== ai.img)  {

        currentAIAvatarImg = new Image();

        currentAIAvatarImg.src = ai.img;

        currentAIName = ai.name;

      }

    return;

  }

}

currentAIName = "AI";

}

function drawMinimap()  {

  miniCtx.clearRect(0, 0, MW, MH);

  const t = TRACKS[currentTrack];

  miniCtx.save();

  miniCtx.lineWidth = 4;

  miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';

  miniCtx.lineJoin = 'round';

  miniCtx.lineCap = 'round';

  const wps = t.waypoints;

  if (wps.length > 0)  {

    miniCtx.beginPath();

    miniCtx.moveTo(
    wps[0].x * SCALE * mapScale + mapOffsetX,
    wps[0].y * SCALE * mapScale + mapOffsetY
    );

    for (let i = 1;
    i < wps.length;
    i++)  {

      miniCtx.lineTo(
      wps[i].x * SCALE * mapScale + mapOffsetX,
      wps[i].y * SCALE * mapScale + mapOffsetY
      );

    }

  miniCtx.closePath();

  miniCtx.stroke();

}

miniCtx.restore();

const carsToDraw = [...allCars, player];

const pointSize = 5;

carsToDraw.forEach(car =>  {

  const miniX = car.x * mapScale + mapOffsetX;

  const miniY = car.y * mapScale + mapOffsetY;

  miniCtx.fillStyle = (car === player) ? 'red' : 'yellow';

  miniCtx.beginPath();

  miniCtx.arc(miniX, miniY, pointSize, 0, Math.PI * 2);

  miniCtx.fill();

  if (car === player)  {

    miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';

    miniCtx.lineWidth = 1.5;

    miniCtx.stroke();

  }

});

}
 
function checkCollisions(car1, car2)  {

  const dx = car2.x - car1.x;

  const dy = car2.y - car1.y;

  const dist = Math.hypot(dx, dy);

  const minDist = (CARWIDTH + CARHEIGHT) / 3;

  if (dist < minDist)  {

    const push = (minDist - dist) * 0.4;

    const nx = dx / (dist || 1);

    const ny = dy / (dist || 1);

    car1.x -= nx * push;

    car1.y -= ny * push;

    car2.x += nx * push;

    car2.y += ny * push;

    car1.forwardSpeed *= 0.9;

    car2.forwardSpeed *= 0.9;

  }

}

function followWaypoints(car) {
  if (!car.isAI) return;
  if (car.waypointIndex == null) car.waypointIndex = 0;
  const wp = TRACKS[currentTrack].waypoints;
  if (!wp || !wp.length) return;

  // --- 1. 目標導航計算 ---
  const baseTarget = wp[car.waypointIndex];
  let tx = baseTarget.x * SCALE, ty = baseTarget.y * SCALE;
  const nextIndex = (car.waypointIndex + 1) % wp.length;
  const nx = wp[nextIndex].x * SCALE, ny = wp[nextIndex].y * SCALE;
  const segDX = nx - tx, segDY = ny - ty;
  const segLen = Math.hypot(segDX, segDY) || 1;
  const dirX = segDX / segLen, dirY = segDY / segLen;
  const nX = -dirY, nY = dirX;

  // --- 2. 強化防疊車與避讓 ---
  let sideRepulsion = 0;
  let frontCar = null;
  let minDist = Infinity;
  const candidates = [...allCars, player].filter(c => c !== car);
  
  candidates.forEach(other => {
    const dx = other.x - car.x, dy = other.y - car.y;
    const dist = Math.hypot(dx, dy);
    const relForward = dx * dirX + dy * dirY;
    const relLateral = dx * nX + dy * nY;

    if (relForward > 0 && relForward < 600 && Math.abs(relLateral) < 140) {
      if (dist < minDist) { minDist = dist; frontCar = other; }
    }
    // 側向強力相斥：解決疊車
    if (dist < 180) {
      const force = (1000 / (dist + 20)); // 增強排斥力
      sideRepulsion -= Math.sign(relLateral || (Math.random()-0.5)) * force;
    }
  });

  if (car.overtakeTimer > 0) car.overtakeTimer--;
  const inOvertake = car.overtakeTimer > 0 && car.overtakeSide !== 0;
  if (!inOvertake && frontCar && minDist < 400) {
    car.overtakeTimer = 100;
    car.overtakeSide = ((frontCar.x - car.x) * nX + (frontCar.y - car.y) * nY) > 0 ? -1 : 1;
  }

  let targetOffset = (car.laneOffset || 0) + sideRepulsion;
  if (inOvertake) targetOffset += car.overtakeSide * 500;
  targetOffset = Math.max(-1200, Math.min(1200, targetOffset));

  if (car.currentOffset == null) car.currentOffset = targetOffset;
  car.currentOffset += (targetOffset - car.currentOffset) * 0.15;

  const targetX = tx + nX * car.currentOffset, targetY = ty + nY * car.currentOffset;
  const finalDX = targetX - car.x, finalDY = targetY - car.y;
  if (Math.hypot(finalDX, finalDY) < 500) car.waypointIndex = (car.waypointIndex + 1) % wp.length;

  // --- 3. 核心：極致科學加速模型 (起步猛、後段極慢) ---
  const targetAngle = Math.atan2(finalDY, finalDX);
  const steeringAngle = Math.atan2(Math.sin(targetAngle - car.angle), Math.cos(targetAngle - car.angle)) * 0.35;

  const speedFactor = car.speedFactor || 1.0;
  let maxSpeed = inOvertake ? (26.7 * speedFactor + 1.2) : (26.7 * speedFactor);
  
  // ★ 新增：AI Boost 時稍為提高最高速
  if (car.isBoosting) {
    maxSpeed *= 1.25;  // 例如 +25%，可以自己再 tune
  }
  
  car.maxSpeedLimit = maxSpeed;

  const currentSpeed = Math.abs(car.forwardSpeed || 0);
  const sRatio = Math.min(1.0, currentSpeed / maxSpeed);

  /**
   * 雙段式動力：
   * 1. 基礎倍率 baseAccel 設低 (0.4)，防止瞬間噴射。
   * 2. 使用反向 S 曲線：1.0 - Math.pow(sRatio, 0.4)。
   * 次方數越小（如 0.4），動力衰減就越早、越快發生。
   */
  const baseAccel = 0.29; 
  const powerCurve = Math.pow(1.0 - sRatio, 0.8); // 這會讓動力在 10km/h 後就開始大幅感應到阻力
  
  let acceleration = car.spec.acceleration * baseAccel * SPEED_UNIT_SCALE * powerCurve;

  // 彎道掉速補償
  if (Math.abs(steeringAngle) > 0.01) acceleration *= 0.25;
  if (currentSpeed >= maxSpeed) acceleration = 0;

  car.lastAISteering = steeringAngle;
  updateCarPhysics(car, acceleration, steeringAngle);

  // Aero 判定
  car.isAeroMode = (currentSpeed > maxSpeed * 0.9) && (Math.abs(steeringAngle) < 0.05);
  switchCarImage(car, false);
  if (car.isAeroMode) emitAeroAirflow(car);
}

function loadTrack(i)  {

  currentTrack = i;

  trackImg = new Image();

  trackImg.onload = () =>  {

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

function openTrackSelect(m)  {

  mode = m;

  document.getElementById('mainMenu').classList.remove('active');

  document.getElementById('trackSelect').classList.add('active');

  const grid = document.getElementById('trackGrid');

  grid.innerHTML = '';

  TRACKS.forEach((t, i) =>  {

    const d = document.createElement('div');

    d.className = `track-card ${i === currentTrack ? 'selected' : ''}`;

    d.innerHTML = `<img src="${t.bgImage}"><br>${t.name}`;

    d.onclick = () =>  {

      currentTrack = i;

      grid.querySelectorAll('.track-card').forEach(c => c.classList.remove('selected'));

      d.classList.add('selected');

      loadTrack(i);

    };

  grid.appendChild(d);

});

}

function toPrettyDriverName(key) {
  if (!key) return "-";
  // "kazami" -> "KAZAMI", "kaga" -> "KAGA"
  // 如果你之後想要 "Hayato Kazami" 呢啲，可以喺呢度改 mapping。
  return key.replace(/_/g, " ").toUpperCase();
}

function getTeamKeyFromImage(spec) {
  if (!spec || !spec.image) return null;
  const folder = spec.image.split("/")[0] || "";   // 例如 "1. SUGO"
  const clean  = folder.replace(/^\d+\.\s*/, "").trim(); // "SUGO"
  // 轉做 key：sugo / aoi / union_savior / stormzender / missing_link
  return clean.toLowerCase().replace(/\s+/g, "_");
}

function updateCarSpecPanel(spec) {
  const nameElem      = document.getElementById("specCarName");
  const speedBar      = document.getElementById("specSpeedBar");
  const speedText     = document.getElementById("specSpeedText");
  const controlBar    = document.getElementById("specControlBar");
  const controlText   = document.getElementById("specControlText");
  const aeroText      = document.getElementById("specAeroText");
  const turnText      = document.getElementById("specTurnText");

  const driverAvatar  = document.getElementById("specDriverAvatar");
  const driverNameEl  = document.getElementById("specDriverName");
  
  const teamBadge     = document.getElementById("specTeamBadge");
  const aeroBadge     = document.getElementById("specAeroBadge");
  const boostBadge    = document.getElementById("specBoostBadge");
  const turnBadge     = document.getElementById("specTurnBadge");
  
  const teamLogo = document.getElementById("specTeamLogo");
  const tipsEl = document.getElementById("specTurnTips");

  if (!spec || !nameElem) return;
  const turnType = getCarTurnType(spec);  // "lift" / "mirage" / "special" / "comet" / "none"

  // 車名
  const baseName = (spec.image || "")
    .split("/")
    .pop()
    .replace(".png", "")
    .replace(/_/g, " ");
  nameElem.textContent = baseName;
  
  // ★ TEAM 名：由 folder 名拆
  let teamName = "-";
  if (spec.image) {
    const folder = spec.image.split("/")[0] || "";
    // e.g. "1. SUGO" -> 去數字同點
    teamName = folder.replace(/^\d+\.\s*/, "").trim(); 
  }  

  // Speed
  const speedScore = calcSpeedScore(spec);
  if (speedBar)  speedBar.style.width = (speedScore * 10) + "%";
  if (speedText) speedText.textContent = `${speedScore}/10`;

  // Control
  const controlScore = calcControlScore(spec);
  if (controlBar)  controlBar.style.width = (controlScore * 10) + "%";
  if (controlText) controlText.textContent = `${controlScore}/10`;

  // Aero
  if (aeroText) {
    aeroText.textContent = spec.hasAero ? "Yes" : "No";
  }

  // Turn
  if (turnText) {
    turnText.textContent = getTurnDisplayName(turnType);
  }

  // ----- Badges -----//
  if (teamBadge) {
    teamBadge.textContent = teamName || "-";
    teamBadge.className = "spec-badge team";  // 重設 class
  }

  if (aeroBadge) {
    aeroBadge.className = "spec-badge"; // reset base
    if (spec.hasAero) {
      aeroBadge.textContent = "AERO MACHINE";
      aeroBadge.classList.add("aero-on");
    } else {
      aeroBadge.textContent = "NON-AERO";
      aeroBadge.classList.add("aero-off");
    }
  }

  if (boostBadge) {
    boostBadge.className = "spec-badge"; // reset base
    if (spec.hasBoost) {
      boostBadge.textContent = "BOOST SYSTEM";
    } else {
      boostBadge.textContent = "NO AERO BOOST";
      boostBadge.classList.add("boost-off");
    }
  }

  if (turnBadge) {
    const turnName = getTurnDisplayName(turnType); // 全名 "Lifting Turn" 等

    turnBadge.className = "spec-badge"; // reset base
    turnBadge.textContent = turnName;

  if (turnType === "special" || turnType === "mirage" || turnType === "comet") {
    turnBadge.classList.add("turn-special");
    }
  }

  // ★ Driver：名 + 頭像
  const driverKey = spec.driver || null;
  if (driverNameEl) {
    driverNameEl.textContent = toPrettyDriverName(driverKey);
  }

  if (driverAvatar) {
    if (driverKey) {
      const url = `driver/${driverKey}.webp`;
      driverAvatar.src = url;

      // 可選：fallback，避免檔案 miss 時出現破圖 icon
      driverAvatar.onerror = () => {
        // 只 reset 一次，避免 onerror 迴圈
        if (!driverAvatar.dataset.fallback) {
          driverAvatar.dataset.fallback = "1";
          driverAvatar.src = "driver/default.webp"; // 你可以放一個通用 silhouette
        }
      };
    } else {
      driverAvatar.src = "driver/default.webp"; // 冇指定 driver 時用預設
    }
  }
  
  // ----- Team Logo (只顯示 1–5 隊) ----- //
  if (teamLogo) {
	if (spec.teamLogo) {
		teamLogo.style.display = "block";
		teamLogo.src = spec.teamLogo;
		teamLogo.onerror = () => {
		  teamLogo.style.display = "none";
		};
	} else {	  
    const teamKey = getTeamKeyFromImage(spec);  // sugo / aoi / union_savior / ...

    // 只對指定幾隊顯示 logo
    const supportedTeams = ["sugo", "aoi", "union_savior", "stormzender", "missing_link"];

    if (teamKey && supportedTeams.includes(teamKey)) {
      const logoPath = `team/${teamKey}.webp`;   // 你如用 .png 就改做 .png
      teamLogo.style.display = "block";
      teamLogo.src = logoPath;

    // 簡單 fallback：冇圖就隱藏
      teamLogo.onerror = () => {
        teamLogo.style.display = "none";
      };
    } else {
      teamLogo.style.display = "none";
      }
    }
  }

  // ----- Special Turn Tips ----- //
  if (tipsEl) {
    let tips = "";

    switch (turnType) {
      case "lift":
        tips = "If you want to use <b>Lifting Turn</b>, try high speed then hold <b>DRIFT(DOUBLE TAP ← →)</b> + <b>BOOST(KEY: X)</b> while turning.";
        break;
      case "mirage":
        tips = "For <b>Mirage Turn</b>, <b>DRIFT(DOUBLE TAP ← →)</b> at high speed and press <b>BOOST(KEY: X)</b> in the corner to burst out with afterimages.";
        break;
      case "special":
        tips = "This machine has a <b>Special Turn</b>. Combine <b>DRIFT(DOUBLE TAP ← →)</b> + <b>BOOST(KEY: X)</b> in mid‑corner to trigger it.";
        break;
      case "comet":
        tips = "To use <b>Comet Turn</b>, activate <b>BOOST(KEY: X)</b> while drifting through the corner.";
        break;
      case 'comet_evo':
        tips = 'To use <b>Comet Evolution</b>, drift hard through the corner and press <b>BOOST (KEY X)</b> to unleash a powerful sliding boost with sparks.';
        break;		
      default:
        tips = "";
    }

    if (tips) {
      tipsEl.innerHTML = `<span class="tips-title">TIPS:</span>${tips}`;
      tipsEl.style.display = "block";
    } else {
      tipsEl.style.display = "none";
    }
  }
}

function buildCarList()  {
  const container = document.getElementById('carList');
  container.innerHTML = '';

  const teams = {};

  CARSPECS.forEach((spec, index) =>  {
    const teamNameMatch = spec.image.match(/^([^/]+)\//);
    let teamName = teamNameMatch ? teamNameMatch[1] : 'ERROR_NO_FOLDER';

    teamName = teamName.replace(/[-_]/g, ' ');
    teamName = teamName.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    if (!teams[teamName]) {
      teams[teamName] = [];
    }
    teams[teamName].push({ ...spec, index });
  });

  Object.keys(teams).sort().forEach(teamName =>  {
    if (teamName === 'Error No Folder') return;

    const carsInTeam = teams[teamName];

    const header = document.createElement('div');
    header.className = 'team-header';
    header.textContent = teamName + ' Team';
    container.appendChild(header);

    const ul = document.createElement('ul');
    ul.className = 'car-list-container';

    carsInTeam.forEach(car =>  {
      const li = document.createElement('li');
      li.className = `card ${car.index === selectedCar ? 'selected' : ''}`;
      li.setAttribute('data-index', car.index);

      const img = document.createElement('img');
      img.src = car.image;
      img.alt = car.image;

      const baseName = car.image
        .split('/').pop()
        .replace('.png', '')
        .replace(/_/g, ' ');

      const carName = document.createElement('p');
      carName.textContent = baseName;

      // ★ 用 class，唔再用 inline style
      carName.className = 'car-name';

      li.appendChild(img);
      li.appendChild(carName);

      li.onclick = () =>  {
        const selectedIndex = parseInt(li.getAttribute('data-index'), 10);
        selectedCar = selectedIndex;

        document.querySelectorAll('#carMenu .card').forEach(item => {
          item.classList.remove('selected');
        });
        li.classList.add('selected');
		
		const spec = CARSPECS[selectedCar];
		updateCarSpecPanel(spec);
      };

      ul.appendChild(li);
    });

    container.appendChild(ul);
  });

  if (typeof selectedCar === 'number' && CARSPECS[selectedCar]) {
    updateCarSpecPanel(CARSPECS[selectedCar]);
  }
}

function startRace()  {
	
  playerCarImg.onload = null;	

  if (countdownInterval)  {

    clearInterval(countdownInterval);

    countdownInterval = null;

  }

allCars = [];

const t = TRACKS[currentTrack];

const GRID_SPACING = 200;

const ROW_SPACING = 120;

if (mode === 'championship')  {

  const a = CARSPECS.map((_, i) => i).filter(i => i !== selectedCar);

  const chosen = [];

  while (chosen.length < 10 && a.length > 0)  {

    chosen.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);

  }

chosen.forEach((idx, i) =>  {

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
    speedFactor: 0.95 + Math.random() * 0.12,

    // 新增：AI Boost 狀態
    isBoosting: false,
    aiBoostTimer: 0,                 // 還有幾 frame 結束 boost
    aiBoostCooldown: Math.floor(60 + Math.random() * 240) // 開局先等一陣，唔會一開始就亂放
  });

});

}

const playerGridPos = (t.gridPositions && t.gridPositions.length)
? t.gridPositions[t.gridPositions.length - 1]
: t.playerStart;

player =  {

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

gameState = 'countdown';

countdownStartTime = Date.now();

lap = 0;

totalLaps = 5;

raceFinished = false;

player.prevY = player.y;

if (!playerAutoDriving && !inPit) {
document.getElementById('lapHud').textContent = `LAP 0/${totalLaps}`;
}
const countdownElement = document.getElementById('countdown');

if (countdownElement)  {

  countdownElement.style.display = 'none';

}

const COUNTDOWN_DURATION_MS = 6000;

if (countdownInterval) {
	
	clearTimeout(countdownInterval);

}

countdownInterval = setTimeout(() =>  {

  gameState = 'racing';

  countdownInterval = null;

}
, COUNTDOWN_DURATION_MS);

if (typeof loop === 'function')  {

  requestAnimationFrame(loop);

}

}

function logAICarSpecs() {
  console.group('AI Car Speed Specs');
  allCars.forEach((car, i) => {
    const spec = car.spec;
    console.log(`${i}: ${spec.image.split('/').pop()}`, {
      acceleration: spec.acceleration,
      maxSpeedBase: getCarMaxSpeed(car),
      speedFactor: car.speedFactor,
      laneOffset: car.laneOffset
    });
  });
  console.groupEnd();
}

function emitAeroAirflow(car) {
  if (!car.isAeroMode) return;  // 每個車獨立判斷
  
  const jets = [-1, 1];
  for (let j = 0; j < jets.length; j++) {
    const side = jets[j];
    const rearOffset = CARHEIGHT * 0.45;
    const sideOffset = side * (CARWIDTH * 0.3);
    
    const baseX = car.x + Math.cos(car.angle + Math.PI) * rearOffset +
                  Math.cos(car.angle + Math.PI / 2) * sideOffset;
    const baseY = car.y + Math.sin(car.angle + Math.PI) * rearOffset +
                  Math.sin(car.angle + Math.PI / 2) * sideOffset;

    const speed = 0.3 + Math.random() * 0.4;
    const dirAngle = car.angle + (Math.random() - 0.5) * 0.15;
    
    boostParticles.push({
      type: 'airflow',
      x: baseX, y: baseY,
      vx: Math.cos(dirAngle) * speed,
      vy: Math.sin(dirAngle) * speed,
      angle: dirAngle,
      length: 8 + Math.random() * 5,
      width: 1 + Math.random() * 0.5,
      life: 10 + Math.random() * 12,
      maxLife: 22,
      gravity: 0,
      color: 'rgba(180, 240, 255, 0.8)'
    });
  }
}

const carBaseImageCache = {};

function getBaseCarImage(spec) {
    if (!spec || !spec.image) return null;
    if (!carBaseImageCache[spec.image]) {
        const img = new Image();
        img.src = spec.image;   // 例如 "2. AOI/Ogre.png"
        carBaseImageCache[spec.image] = img;
    }
    return carBaseImageCache[spec.image];
}

// 在主要 loop 或 update 邏輯中，每幀檢查並切換圖片
function updateCarImages() {
  if (!aeroModeActive) return;
  
  // Player 車
  if (player && player.img && player.spec && player.spec.image) {
    const boostPath = getBoostImagePath(player.spec.image);
    if (boostPath !== player.img.src) {
      player.img = new Image();
      player.img.src = boostPath;
    }
  }
  
  // 所有 AI 車
  allCars.forEach(car => {
    if (car.img && car.spec && car.spec.image) {
      const boostPath = getBoostImagePath(car.spec.image);
      if (boostPath !== car.img.src) {
        car.img = new Image();
        car.img.src = boostPath;
      }
    }
  });
}

function emitMoveDustForCar(car)  {

  const REAR_OFFSET = CARHEIGHT / 2;

  const rearX = car.x + Math.cos(car.angle + Math.PI) * REAR_OFFSET;

  const rearY = car.y + Math.sin(car.angle + Math.PI) * REAR_OFFSET;

  for (let i = 0;
  i < 2;
  i++)  {

    dustParticles.push( {

      x: rearX + (Math.random() - 0.5) * 18,
      y: rearY + (Math.random() - 0.5) * 18,
      vx: -Math.cos(car.angle) * (0.6 + Math.random() * 0.8),
      vy: -Math.sin(car.angle) * (0.6 + Math.random() * 0.8),
      life: 22,
      maxLife: 22
    }
  );

}

}

function drawTrackFromWaypoints(ctx, track, scale = 1, offsetX = 0, offsetY = 0)  {

  const wps = track.waypoints;

  if (!wps || !wps.length) return;

  ctx.save();

  ctx.beginPath();

  ctx.moveTo(wps[0].x * scale + offsetX, wps[0].y * scale + offsetY);

  for (let i = 1;
  i < wps.length;
  i++)  {

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

function drawStartGrid(ctx, track, scale)  {

  const grid = track.gridPositions;

  if (!grid || !grid.length) return;

  ctx.save();

  ctx.strokeStyle = '#fff';

  ctx.lineWidth = 3;

  ctx.setLineDash([10, 5]);

  grid.forEach((pos, i) =>  {

    const x = (pos.x * scale);

    const y = (pos.y * scale);

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

// 只檢查 _ABoost.png（Aero Mode）
function getAeroImagePath(originalPath) {
  if (!originalPath || originalPath === 'null') return null;
  const basePath = originalPath.replace(/\.png$/i, '');
  const aeroPath = basePath + '_ABoost.png';
  
  const testImg = new Image();
  testImg.src = aeroPath;
  return (testImg.complete && testImg.naturalWidth > 0) ? aeroPath : null;
}

// 只檢查 _Boost.png（純 Boost）
function getBoostImagePath(originalPath) {
  if (!originalPath || originalPath === 'null') return null;
  const basePath = originalPath.replace(/\.png$/i, '');
  const boostPath = basePath + '_Boost.png';
  
  const testImg = new Image();
  testImg.src = boostPath;
  return (testImg.complete && testImg.naturalWidth > 0) ? boostPath : null;
}

// 3. Aero/Circuit Mode 判斷
// Mode 切換通知函數
function showModeChange(newMode) {
  if (currentMode !== newMode) {
    currentMode = newMode;
    modeNotifyText = `Mode change: ${newMode} Mode`;
    modeNotifyTimer = 120; // 顯示 2 秒 (120 幀)
  }
}

// 完善版 Aero/Circuit 判斷
// 移除全域 aeroModeActive，改用每個車的屬性
function updateAeroMode(car, isPlayer) {
  if (!car) return;
  const currentSpeed = car.forwardSpeed || 0;
  const maxS = car.maxSpeedLimit || 26.7;
  
  // 嚴格門檻：玩家 80%, AI 90%
  const ratio = isPlayer ? 0.90 : 0.90;
  const speedThreshold = maxS * ratio;

  // 判定是否正在大力轉彎
  let isTurning = isPlayer ? (keys['ArrowLeft'] || keys['ArrowRight']) : (Math.abs(car.lastAISteering) > 0.15);

  const prevAero = car.isAeroMode;
  // 修正條件：速度夠快 且 沒在大幅轉彎 且 不是正在甩尾
  car.isAeroMode = (currentSpeed > speedThreshold) && !isTurning && (!isPlayer || !isDriftMode);

  if (isPlayer && car.isAeroMode !== prevAero) {
    currentMode = car.isAeroMode ? 'AERO' : 'CIRCUIT';
    modeNotifyTimer = 90;
  }
}

// 4. 動態切換車輛圖片
function switchCarImage(car, isPlayerBoosting = false) {
    if (!car.spec || !car.spec.image || car.spec.image === 'null') return;

    const spec = car.spec;
    const originalPath = spec.image;
    const basePath = originalPath.replace(/\.png$/i, '');
    
    // 檢查這是否為 Ogre 或其他同時擁有兩種變形圖的特殊車輛
    // 判斷條件：路徑包含 "OGRE"
    const isSpecialCar = originalPath.toUpperCase().includes("OGRE");

    let targetSuffix = ".png";

    // --- 核心邏輯切換 ---

    if (isPlayerBoosting && spec.hasBoost) {
        // 如果是 Ogre 或是沒有 Aero 的車，Boost 時使用 _Boost.png
        // 如果是普通有 Aero 的車，Boost 時使用 _ABoost.png
        if (isSpecialCar || !spec.hasAero) {
            targetSuffix = "_Boost.png";
        } else {
            targetSuffix = "_ABoost.png";
        }
    } 
    else if (car.isAeroMode && spec.hasAero) {
        // 單純 Aero 變形（沒開 Boost）時，使用 _ABoost.png
        targetSuffix = "_ABoost.png";
    }

    const targetSrc = basePath + targetSuffix;

    // --- 執行更換圖片 ---
    if (!car.img) {
        car.img = new Image();
        car.img.src = targetSrc;
    } else {
        const currentSrcDecoded = decodeURIComponent(car.img.src);
        if (!currentSrcDecoded.endsWith(targetSrc)) {
            
            // 為了防止 404，我們做一個簡單的載入測試
            let tempImg = new Image();
            tempImg.src = targetSrc;
            
            tempImg.onload = () => {
                car.img.src = targetSrc;
            };
            
            tempImg.onerror = () => {
                // 如果 _Boost 或 _ABoost 載入失敗，退回原圖，避免黑畫面
                if (targetSuffix !== ".png") {
                    console.warn("Image not found, fallback to original:", targetSrc);
                    car.img.src = originalPath;
                }
            };
        }
    }
}

function emitBoostForCar(car, isPlayer)  {

  if (isPlayer) {
    // Boost 時也用 switchCarImage 邏輯，保持一致
    switchCarImage(car, true);
  } 
  
  const jets = [-1, 1];

  for (let j = 0;
  j < jets.length;
  j++)  {

    const side = jets[j];

    const baseAngle = car.angle + Math.PI;

    const angle = baseAngle + (Math.random() - 0.5) * 0.18;

    const speed = 5.5 + Math.random() * 4.5;

    const life = 4 + Math.random() * 6;

    const backOffset = 58 + Math.random() * 10;

    const sideOffset = side * (CARWIDTH * 0.22);

    const length = 2 + Math.random() * 9;

    const width = 8 + Math.random() * 3;

    boostParticles.push( {

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

function emitDustForCar(car, isPlayer, carMaxSpeed)  {

  const TIRE_MARK_THRESHOLD = 1.0;

  let DRIFT_SPEED_THRESHOLD;

  if (isPlayer)  {

    DRIFT_SPEED_THRESHOLD = carMaxSpeed * 0.6;

  }
else  {

  DRIFT_SPEED_THRESHOLD = carMaxSpeed * 0.4;

}

const isDrifting = car.speed > DRIFT_SPEED_THRESHOLD && Math.abs(car.sideSpeed) > TIRE_MARK_THRESHOLD;

if (!isDrifting) return;

const REAR_OFFSET = CARHEIGHT / 2;

const rearX = car.x + Math.cos(car.angle + Math.PI) * REAR_OFFSET;

const rearY = car.y + Math.sin(car.angle + Math.PI) * REAR_OFFSET;

const sideDirection = car.sideSpeed > 0 ? 1 : -1;

for (let i = 0;
i < 4;
i++)  {

  dustParticles.push( {

    x: rearX + (Math.random() - 0.5) * 20,
    y: rearY + (Math.random() - 0.5) * 20,
    vx: -Math.cos(car.angle) * 1 + Math.cos(car.angle + Math.PI / 2) * sideDirection * (1 + Math.random() * 2),
    vy: -Math.sin(car.angle) * 1 + Math.sin(car.angle + Math.PI / 2) * sideDirection * (1 + Math.random() * 2),
    life: 40, 
    maxLife: 60
  });

}

}

function emitMirageAfterimage(car) {
    const life = 28; // 比原本長少少
    const baseImg = getBaseCarImage(car.spec); // 用「原本」車圖

    boostParticles.push({
        type: 'mirage',
        x: car.x,
        y: car.y,
        // 注意：車實際畫圖時用 angle + Math.PI/2
        angle:  car.angle,
        length: CARHEIGHT * 1.8,
        width:  CARWIDTH  * 0.8,
        life: life,
        maxLife: life,
        vx: 0,
        vy: 0,
        gravity: 0,
        img: baseImg
    });
}

// 直線 Comet Turn
function emitCometSparksStraight(car) {
    const REAR_OFFSET = CARHEIGHT * 0.4;
    const baseX = car.x - Math.cos(car.angle) * REAR_OFFSET;
    const baseY = car.y - Math.sin(car.angle) * REAR_OFFSET;

    for (let i = 0; i < 6; i++) {
        const angle = car.angle + Math.PI + (Math.random() - 0.5) * 0.8;
        const speed = 6 + Math.random() * 4;

        boostParticles.push({
            type: 'spark',
            x: baseX,
            y: baseY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle,
            length: 6 + Math.random() * 6,
            width: 2 + Math.random() * 1,
            life: 10 + Math.random() * 10,
            maxLife: 20,
            gravity: 0.2,
            color: 'rgba(255, 220, 120, 0.9)'
        });
    }
}

function emitCometSparksDrift(car) {
    const REAR_OFFSET = CARHEIGHT * 0.4;
    const sideSign = car.sideSpeed >= 0 ? 1 : -1;
    const sideOffset = sideSign * CARWIDTH * 0.4;

    const baseX = car.x - Math.cos(car.angle) * REAR_OFFSET
                    + Math.cos(car.angle + Math.PI / 2) * sideOffset;
    const baseY = car.y - Math.sin(car.angle) * REAR_OFFSET
                    + Math.sin(car.angle + Math.PI / 2) * sideOffset;

    for (let i = 0; i < 8; i++) {
        const angle = car.angle + Math.PI + (Math.random() - 0.5) * 1.0;
        const speed = 5 + Math.random() * 3;

        boostParticles.push({
            type: 'spark',
            x: baseX,
            y: baseY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle,
            length: 5 + Math.random() * 5,
            width: 6,
            life: 12 + Math.random() * 8,
            maxLife: 22,
            gravity: 0.25,
            color: 'rgba(255, 200, 80, 0.95)'
        });
    }
}

// === Lifting Turn：車尾風效（代替沙塵）===
function emitLiftingTurnWind(car) {
    const REAR_OFFSET = CARHEIGHT * 0.5;
    const rearX = car.x + Math.cos(car.angle + Math.PI) * REAR_OFFSET;
    const rearY = car.y + Math.sin(car.angle + Math.PI) * REAR_OFFSET;

    const sideSign = (car.sideSpeed || 0) >= 0 ? 1 : -1;
    const baseAngle = car.angle + Math.PI + sideSign * 0.4;

    for (let i = 0; i < 6; i++) {
        const dirAngle = baseAngle + (Math.random() - 0.5) * 0.3;
        const speed = 3 + Math.random() * 2;
        const life = 14 + Math.random() * 8;

        boostParticles.push({
            type: 'wind',   // 當成另一種 line 粒子
            x: rearX + (Math.random() - 0.5) * 14,
            y: rearY + (Math.random() - 0.5) * 14,
            vx: Math.cos(dirAngle) * speed,
            vy: Math.sin(dirAngle) * speed,
            angle: dirAngle,
            length: 30 + Math.random() * 10,
            width: 6.2,
            life,
            maxLife: life,
            gravity: 0,
            color: 'rgba(210, 240, 255, 0.9)'   // 淺藍白「風」線
        });
    }
}

function updateTireWear(car, deltaTime)  {

  if (!car.tireHealth || car.inPit) return;

  const TIRE_MARK_THRESHOLD = 0.18;
 
  const MAX_SPEED = (car && typeof car.maxSpeedLimit === 'number') ? car.maxSpeedLimit : 26.0;
 
  const DRIFT_SPEED_THRESHOLD = MAX_SPEED * 0.18;
 

  const forwardSpeed = Math.abs(car.forwardSpeed || 0);

  const driftAngle = Math.abs(car.driftAngle || 0);

  const turnRate = car.lastTurnRate;

  const isDrifting = (forwardSpeed > DRIFT_SPEED_THRESHOLD) && 
  (Math.abs(turnRate) > 0.012 || Math.abs(car.sideSpeed) > TIRE_MARK_THRESHOLD || driftAngle > 0.12);

  let totalWear = NORMAL_WEAR_RATE * deltaTime;

  if (isDrifting)  {

    totalWear += NORMAL_WEAR_RATE * DRIFT_WEAR_MULTIPLIER * deltaTime;

  }

for (let i = 0;
i < car.tireHealth.length;
i++)  {

  car.tireHealth[i] = Math.max(0, car.tireHealth[i] - totalWear);

}

}
 
function drawTireMonitor(car, ctx) {
    if (!ctx) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const dpr = window.devicePixelRatio || 1;

    if (!car.tireHealth) {
        car.tireHealth = [100, 100, 100, 100];
    }

    ctx.clearRect(0, 0, w, h);

    // Proportional dimensions
    const carBodyW = w * 0.4;
    const carBodyH = h * 0.7;
    const tireW = w * 0.15;
    const tireH = h * 0.22;

    // 1. Draw "Car Chassis" Placeholder
    ctx.fillStyle = '#444444';
    ctx.fillRect((w - carBodyW) / 2, h * 0.1, carBodyW, carBodyH);

    const health = car.tireHealth;
    const getColor = (h) => {
        if (h > 60) return '#00FF00';
        if (h > 30) return '#FFFF00';
        return '#FF0000';
    };

    // 2. Responsive Tire Positions
    // [FL, FR, RL, RR]
    const positions = [
        { x: w * 0.1, y: h * 0.12 }, // Front Left
        { x: w * 0.75, y: h * 0.12 }, // Front Right
        { x: w * 0.1, y: h * 0.58 }, // Rear Left
        { x: w * 0.75, y: h * 0.58 }  // Rear Right
    ];

    positions.forEach((pos, index) => {
        const tireHealthVal = health[index];
        
        // Draw Tire Background (Green/Yellow/Red)
        ctx.fillStyle = getColor(tireHealthVal);
        ctx.fillRect(pos.x, pos.y, tireW, tireH);

        // Draw Wear Overlay (Black bar growing from top)
        const wearHeight = tireH * (100 - tireHealthVal) / 100;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(pos.x, pos.y, tireW, wearHeight);

        // Tire Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1 * dpr;
        ctx.strokeRect(pos.x, pos.y, tireW, tireH);
    });

    // 3. Dynamic Text Size
    const avg = health.reduce((a, b) => a + b, 0) / 4;
    const fontSize = Math.max(10, Math.floor(h * 0.12));
    ctx.font = `bold ${fontSize}px Rajdhani, Arial`;
    ctx.fillStyle = getColor(avg);
    ctx.textAlign = 'center';
    ctx.fillText(`TIRE: ${Math.round(avg)}%`, w / 2, h * 0.95);
}

function drawSingleAIAvatar(ctx) {
  if (!currentAIAvatarImg || !currentAIAvatarImg.complete) return;

  const size = Math.min(W * 0.08, 140);     // 畫面闊度 12%，上限 140
  const x = 4 * W / 100;                    // 左邊留 3% 空位
  const y = 9 * H / 100;                   // 貼近上方（大約 11% 高度）

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 10, y - 10, size + 20, size + 50);

  ctx.drawImage(currentAIAvatarImg, x, y, size, size);

  ctx.font = `bold ${Math.max(14, size * 0.25)}px Rajdhani`;
  ctx.fillStyle = '#00ffff';
  ctx.textAlign = 'center';
  ctx.fillText(currentAIName, x + size / 2, y + size + 28);

  ctx.restore();
}

function loop()  {

  if (gameState === 'paused' || raceFinished)  {
    return;
  }

  // 背景
  if (sandPattern)  {
    ctx.fillStyle = sandPattern;
    ctx.fillRect(0, 0, W, H);
  } else  {
    ctx.fillStyle = '#C2B280';
    ctx.fillRect(0, 0, W, H);
  }

if (!player) {
    requestAnimationFrame(loop);
    return;
}

// === Camera transform 開始 ===
ctx.save();

// 將畫面中心移去 (W/2, H/2)
ctx.translate(W / 2, H / 2);

// 縮放世界（假設你上面已經有 const CAMERA_ZOOM = 0.6 之類）
ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);

// 將玩家車拉到畫面中心
ctx.translate(-player.x, -player.y);

// 之後全部用「世界座標」直畫
ctx.drawImage(
    trackImg,
    0,
    0,
    TRACKS[currentTrack].originalWidth * SCALE,
    TRACKS[currentTrack].originalHeight * SCALE
);

// 這兩個 helper 要改簽名，只用世界座標（下面第 4 點有解）
drawCurrentTrackRoad(ctx);
drawStartGrid(ctx, TRACKS[currentTrack], SCALE);

const trackData = TRACKS[currentTrack];


// 1. Draw the Full Screen Overlays first
drawCyberOverlay(ctx);

// 2. Draw Mode HUD (Aero/Circuit)
drawModeHUD(ctx);

// ==========================================
// NEW PIT & GRANDSTAND DRAWING (Inside Camera)
// ==========================================
const PIT_WAYPOINTS_COUNT = trackData.pitWaypoints ? trackData.pitWaypoints.length : 0;
const RENDER_PARKING_INDEX = PIT_WAYPOINTS_COUNT >= 3 ? PIT_WAYPOINTS_COUNT - 3 : -1;

if (trackData.pitWaypoints && trackData.pitWaypoints.length > 1) {
    ctx.save();
    
    // 1. Draw Pit Road (Simple Gray)
    ctx.beginPath();
    ctx.lineWidth = 40 * SCALE;
    ctx.strokeStyle = "#555555"; // Dark asphalt
    ctx.lineJoin = "round";
    ctx.moveTo(trackData.pitWaypoints[0].x * SCALE, trackData.pitWaypoints[0].y * SCALE);
    for(let i=1; i<trackData.pitWaypoints.length; i++) {
        ctx.lineTo(trackData.pitWaypoints[i].x * SCALE, trackData.pitWaypoints[i].y * SCALE);
    }
    ctx.stroke();

    // 2. Draw Team Garages (The Paddock)
    if (RENDER_PARKING_INDEX >= 0) {
        const wp = trackData.pitWaypoints[RENDER_PARKING_INDEX];
        const bx = wp.x * SCALE;
        const by = wp.y * SCALE;
        
        const boxW = CARWIDTH * 1.5; 
        const boxH = CARHEIGHT * 1.2;
        const gap = boxH * 1.1;

        // Logic to find Player's team
        const playerTeam = player.spec.image.toUpperCase();
        let currentTeamKey = "OTHERS";
        if (playerTeam.includes("SUGO")) currentTeamKey = "SUGO";
        else if (playerTeam.includes("AOI")) currentTeamKey = "AOI";
        else if (playerTeam.includes("UNION")) currentTeamKey = "UNION";
        else if (playerTeam.includes("STORMZENDER")) currentTeamKey = "STORMZENDER";
        else if (playerTeam.includes("MISSING")) currentTeamKey = "MISSING";

        for (let i = 0; i < 6; i++) {
            const currentY = by + (i * gap);
            const currentX = bx + 150; // Garage offset from road

            // Garage floor
            ctx.fillStyle = (i === 0) ? "rgba(0, 255, 255, 0.1)" : "#222";
            ctx.fillRect(currentX, currentY - boxH/2, boxW, boxH);
            
            // Neon Border for Player box
            ctx.strokeStyle = (i === 0) ? "#00ffff" : "#555";
            ctx.lineWidth = 4;
            ctx.strokeRect(currentX, currentY - boxH/2, boxW, boxH);

            // Draw Team Logo / Banner
            const logo = (i === 0) ? teamLogos[currentTeamKey] : null; 
            if (logo && logo.complete) {
                ctx.drawImage(logo, currentX + (boxW/2 - 40), currentY - 40, 80, 80);
            }

            // Box Label
            ctx.fillStyle = (i === 0) ? "#00ffff" : "#aaa";
            ctx.font = "bold 20px Rajdhani";
            ctx.fillText(i === 0 ? "PIT BOX" : "TEAM " + i, currentX + 10, currentY - boxH/2 + 25);
        }
    }
    ctx.restore();
}

// 3. Draw Grandstands (Crowd)
if (grandstandImg.complete) {
    const startY = trackData.start.y * SCALE - 1000;
    const startX = trackData.start.x * SCALE - 600;
    for(let i = 0; i < 15; i++) {
        ctx.drawImage(grandstandImg, startX, startY + (i * grandstandImg.height * 0.45));
    }
}

// ★ boostParticles（世界層）
ctx.save();
boostParticles.forEach(p => {
    const alpha = p.life / p.maxLife;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    if (p.type === 'mirage') {
        const a2 = p.life / p.maxLife;
        ctx.globalAlpha = a2 * 0.5;

        if (p.img && p.img.complete) {
            ctx.rotate(Math.PI / 2);
            const scale = 0.95;
            const drawW = CARWIDTH * scale;
            const drawH = CARHEIGHT * scale;
            ctx.drawImage(p.img, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            ctx.fillStyle = 'rgba(200, 255, 255, 0.8)';
            ctx.fillRect(-p.length, -p.width / 2, p.length, p.width);
        }
    } else {
        const len = p.length;
        const w = p.width;

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-len, 0);
        ctx.stroke();
    }

    ctx.restore();
});
ctx.restore();




ctx.save();

tireMarks.forEach(mark => {
    const alpha = Math.min(1, mark.life / 60);
    const size = 10;
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mark.x1, mark.y1);   // 世界座標
    ctx.lineTo(mark.x2, mark.y2);   // 世界座標
    ctx.stroke();
});
ctx.restore();

ctx.save();

dustParticles.forEach(p => {
    const alpha = p.life / p.maxLife;
    const size = alpha * 10;
    const color = `rgba(180, 180, 180, ${alpha * 0.6})`;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 0.2, 0, Math.PI * 2);  // 世界座標
    ctx.fill();
});

ctx.restore();

allCars.forEach(car => {
    ctx.save();
    ctx.translate(car.x, car.y);              // 世界座標
    ctx.rotate(car.angle + Math.PI / 2);
    if (car.img && car.img.complete) {
        ctx.drawImage(car.img, -CARWIDTH / 2, -CARHEIGHT / 2, CARWIDTH, CARHEIGHT);
    }
    ctx.restore();
});

// 這裡加 player（如果 player 唔喺 allCars 入面）
ctx.save();
ctx.translate(player.x, player.y);
ctx.rotate(player.angle + Math.PI / 2);
if (player.img && player.img.complete) {
    ctx.drawImage(player.img, -CARWIDTH / 2, -CARHEIGHT / 2, CARWIDTH, CARHEIGHT);
}
ctx.restore();

ctx.restore();
// === Camera transform 結束 ===

 // --- Lifting Turn 中央大字 ---
  if (liftingTurnBannerTimer > 0) {
    liftingTurnBannerTimer--;

    const t = liftingTurnBannerTimer / LIFTING_TURN_BANNER_DURATION;
    const alpha = Math.min(1, t * 1.5);
    const text = "LIFTING TURN!";

    ctx.save();
    ctx.globalAlpha = alpha;

	const fontSize = Math.max(80, Math.min(W, H) * 0.15);  // ✅ 動態大小
	ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(text, W / 2, H / 2);

    ctx.fillStyle = 'rgba(0, 255, 255, 0.95)';
    ctx.fillText(text, W / 2, H / 2);

    ctx.restore();
  }

  // --- Mirage Turn 中央大字 ---
  else if (mirageTurnBannerTimer > 0) {
    mirageTurnBannerTimer--;

    const t = mirageTurnBannerTimer / MIRAGE_TURN_BANNER_DURATION;
    const alpha = Math.min(1, t * 1.5);
    const text = "MIRAGE TURN!!";

    ctx.save();
    ctx.globalAlpha = alpha;

	const fontSize = Math.max(80, Math.min(W, H) * 0.15);  // ✅ 動態大小
	ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeText(text, W / 2, H / 2);

    ctx.fillStyle = 'rgba(150, 120, 255, 0.98)';
    ctx.fillText(text, W / 2, H / 2);

    ctx.restore();
  }

  // --- Comet Turn 中央大字 ---
  else if (cometTurnBannerTimer > 0) {
    cometTurnBannerTimer--;

    const t = cometTurnBannerTimer / COMET_TURN_BANNER_DURATION;
    const alpha = Math.min(1, t * 1.5);
    const text = "COMET TURN!!";

    ctx.save();
    ctx.globalAlpha = alpha;

	const fontSize = Math.max(80, Math.min(W, H) * 0.15);  // ✅ 動態大小
	ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(120, 0, 0, 0.9)';
    ctx.strokeText(text, W / 2, H / 2);

    ctx.fillStyle = 'rgba(255, 60, 60, 0.98)';
    ctx.fillText(text, W / 2, H / 2);

    ctx.restore();
  }

  // --- Comet Evo 中央大字 ---
  else if (cometEvoBannerTimer > 0) {
    cometEvoBannerTimer--;

    const t = cometEvoBannerTimer / COMET_EVO_BANNER_DURATION;
    const alpha = Math.min(1, t * 1.5);
    const text = "COMET EVOLUTION!!";

    ctx.save();
    ctx.globalAlpha = alpha;

	const fontSize = Math.max(80, Math.min(W, H) * 0.15);  // ✅ 動態大小
	ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(text, W / 2, H / 2);

    ctx.fillStyle = 'rgba(255, 60, 60, 0.98)';
    ctx.fillText(text, W / 2, H / 2);

    ctx.restore();
  }

  // --- Boost 藍色光暈（螢幕層） ---
  if (isBoosting) {
    let grd = ctx.createRadialGradient(W/2, H/2, W/4, W/2, H/2, W/1.2);
    grd.addColorStop(0, 'transparent');
    grd.addColorStop(1, 'rgba(0, 255, 255, 0.15)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }


if (gameState === 'racing' && !raceFinished)  {

  const FORWARD_DAMPING_AI = 0.988;
 
  const deltaTime = 1/60;

  const trackData = TRACKS[currentTrack];

  if (!trackData)  {

    return;

  }

const PIT_WAYPOINTS_COUNT = trackData.pitWaypoints ? trackData.pitWaypoints.length : 0;

const PIT_PARKING_INDEX = PIT_WAYPOINTS_COUNT > 2 ? PIT_WAYPOINTS_COUNT - 2 : -1;

const PIT_EXIT_INDEX = PIT_WAYPOINTS_COUNT > 0 ? PIT_WAYPOINTS_COUNT - 1 : -1;

const PIT_LANE_DIST_SCALED = 50 * SCALE;

allCars.forEach(car =>  {

  if (car.isPlayer) return;

  const prevAngle = car.angle;

  if (car.tireHealth == null)  {

    car.tireHealth = [100, 100, 100, 100];

    car.inPit = false;

    car.pitTimer = 0;

    car.pitCondition = 'out';

    car.lapsSincePit = 0;

    car.pitWaypointIndex = 0;

  }

updateTireWear(car, deltaTime);
 

if (car.inPit)  {

  if (car.pitTimer < PIT_STOP_DURATION)  {

    car.pitTimer += deltaTime;

    car.speed = 0;

    car.forwardSpeed = 0;

    car.sideSpeed = 0;

  }
else  {

  car.tireHealth = [100, 100, 100, 100];

  car.inPit = false;

  car.pitCondition = 'exiting';

  car.pitTimer = 0;

  car.lapsSincePit = 0;

  car.pitWaypointIndex = PIT_PARKING_INDEX + 1;

}

}
else if (car.pitCondition === 'entering' || car.pitCondition === 'exiting')  {

  const targetWaypoint_unscaled = trackData.pitWaypoints[car.pitWaypointIndex];

  if (targetWaypoint_unscaled)  {

    const targetX_scaled = targetWaypoint_unscaled.x * SCALE;

    const targetY_scaled = targetWaypoint_unscaled.y * SCALE;

    const distToTarget_scaled = Math.hypot(targetX_scaled - car.x, targetY_scaled - car.y);

    const targetAngle = Math.atan2(targetY_scaled - car.y, targetX_scaled - car.x);

    let angleDiff = targetAngle - car.angle;

    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    car.angle += angleDiff * 0.1;

    car.forwardSpeed = Math.min(car.forwardSpeed || 0, 7.0);

    if (car.forwardSpeed < 4.0) car.forwardSpeed = 4.0;

    car.sideSpeed = 0;

    car.x += Math.cos(car.angle) * car.forwardSpeed * MOVE_SCALE;

    car.y += Math.sin(car.angle) * car.forwardSpeed * MOVE_SCALE;

    car.speed = car.forwardSpeed;

    if (car.pitWaypointIndex === PIT_PARKING_INDEX && distToTarget_scaled < 15 * SCALE)  {

      car.pitCondition = 'pitting';

      car.inPit = true;

    }
  else if (distToTarget_scaled < PIT_LANE_DIST_SCALED)  {

    car.pitWaypointIndex++;

  }

}
else  {

  car.pitCondition = 'out';

  car.forwardSpeed = 10.0;

  car.pitWaypointIndex = 0;

}

}
else  {

  const avgHealth = car.tireHealth.reduce((a, b) => a + b, 0) / 4;

  if (avgHealth < MUST_PIT_THRESHOLD && trackData.pitEntry)  {

    const unscaledCarX = car.x / SCALE;

    const unscaledCarY = car.y / SCALE;

    const dx = unscaledCarX - trackData.pitEntry.x;

    const dy = unscaledCarY - trackData.pitEntry.y;

    const distToEntry = Math.hypot(dx, dy);

    const PIT_ENTRY_DIST = 150;

    if (distToEntry < PIT_ENTRY_DIST)  {

      car.pitCondition = 'entering';

      car.pitWaypointIndex = 0;

    }

}

followWaypoints(car);

}

car.forwardSpeed *= FORWARD_DAMPING_AI;

car.speed = Math.hypot(car.forwardSpeed || 0, car.sideSpeed || 0);

let turnRate = car.angle - prevAngle;

turnRate = Math.atan2(Math.sin(turnRate), Math.cos(turnRate));

car.lastTurnRate = turnRate;

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

if (isDrifting)  {

  const TIRE_MARK_LIFE = 60;
 
  tireMarks.push( {

    x1: lastX_L, y1: lastY_L, x2: currentX_L, y2: currentY_L,
    life: TIRE_MARK_LIFE 
  }
);

tireMarks.push( {

  x1: lastX_R, y1: lastY_R, x2: currentX_R, y2: currentY_R,
  life: TIRE_MARK_LIFE 
});

emitDustForCar(car, false, AI_MAX_SPEED);

}

car.lastTireMarkPosL =  {
  x: currentX_L, y: currentY_L
};

car.lastTireMarkPosR =  {
  x: currentX_R, y: currentY_R
};

// 冷卻時間
if (car.aiBoostCooldown > 0) car.aiBoostCooldown--;

// 正在 Boost
if (car.isBoosting) {
    car.aiBoostTimer--;
    if (car.aiBoostTimer <= 0) {
        car.isBoosting = false;
        car.aiBoostCooldown = 240;      // 冷卻 4 秒
        switchCarImage(car, false);     // ★ 收 Boost 圖（還原／保持 Aero）
    }
} else {
    // 準備判斷直路先開 Boost
    if (car.aiBoostCooldown <= 0) {
        const carMaxSpeed   = getCarMaxSpeed(car);
        const currentSpeed  = Math.abs(car.forwardSpeed || car.speed || 0);
        const speedRatio    = currentSpeed / carMaxSpeed;
        const turningAmount = Math.abs(car.lastAISteering || 0); // 愈細愈直

        if (speedRatio > 0.7 && turningAmount < 0.06) {
            let triggerChance = 0.01;
            let boostDuration = 150; // ★ 調長啲（見下一節）

            if (speedRatio > 0.85 && turningAmount < 0.02) {
                triggerChance = 0.3;
                boostDuration = 420; // 大直路用更長
            }

            if (Math.random() < triggerChance) {
                car.isBoosting   = true;
                car.aiBoostTimer = boostDuration;
                switchCarImage(car, true);  // ★ AI 開 Boost 時只喺呢刻切一次圖
            }
        }
    }
}



const AI_SPEED_FLAME_FIXED = 27.5;

const AI_SPEED_FLAME_THRESHOLD = Math.min(AI_MAX_SPEED * 0.2, AI_SPEED_FLAME_FIXED);

const aiTotalSpeed = Math.abs(car.speed || 0);

if (car.isBoosting)  {

  if (Math.random() < 0.9) emitBoostForCar(car, false);

}
else  {

  const carMaxSpeed = getCarMaxSpeed(car);

  const currentSpeed = Math.abs(car.forwardSpeed || car.speed || 0);

  const speedRatio = currentSpeed / carMaxSpeed;

  const speedRatioForFlame = 0.18;

  if (speedRatio >= speedRatioForFlame)  {

    emitAeroAirflow(car, false);

  }
}
});

// ★★★ 新增：AI 互相碰撞檢查（放喺 allCars.forEach 之後） ★★★
for (let i = 0; i < allCars.length; i++) {
    for (let j = i + 1; j < allCars.length; j++) {
        checkCollisions(allCars[i], allCars[j]);
    }
}


const wantsForwardVfx = (keys.ArrowUp || touch.up);

const playerBoostingActive = isBoosting && wantsForwardVfx && boostMeter > 0 && boostCooldown <= 0;

const playerSteeringActive = (keys.ArrowLeft || touch.left || keys.ArrowRight || touch.right);

if (!playerBoostingActive && !playerSteeringActive && wantsForwardVfx)  {

    
  const playerMaxSpeed = getCarMaxSpeed(player);

  const speedFlameThreshold = playerMaxSpeed - 6.9;

    
  if (player.speed > speedFlameThreshold)  {

        
    const speedRatio = (player.speed - speedFlameThreshold) / 2;

    const flameIntensity = Math.min(1, Math.max(0, speedRatio));

        
        
    if (Math.random() < flameIntensity * 0.8)  {

      emitAeroAirflow(player, true);
        
    }   
}}}

boostParticles = boostParticles.filter(p =>  {

  p.x += p.vx;

  p.y += p.vy;

  p.life--;

  p.vy += (p.gravity || 0.1);

  return p.life > 0;

});

tireMarks = tireMarks.filter(mark =>  {

  mark.life--;

  return mark.life > 0;

});

dustParticles = dustParticles.filter(p =>  {

  p.x += p.vx;

  p.y += p.vy;

  p.life--;

  p.vx *= 0.9;

  p.vy *= 0.9;

  return p.life > 0;

});


ctx.save();

ctx.translate(W / 2, H / 2);

ctx.rotate(player.angle + Math.PI / 2);


ctx.restore();

if (gameState === 'countdown')  {

  drawStartLights(ctx, W, H, countdownStartTime);

  requestAnimationFrame(loop);

  return;

}

if (gameState === 'racing' && !raceFinished)  {

  player.raceTime++;

  const deltaTime = 1/60;

  if (!trackData) return;

  player.tireHealth = tireHealth;

  updateTireWear(player, deltaTime);

  tireHealth = player.tireHealth;

  const playerAvgHealth = tireHealth.reduce((a, b) => a + b, 0) / 4;

  const PIT_LANE_DIST_SCALED = 50 * SCALE;

  const PIT_WAYPOINTS_COUNT = trackData.pitWaypoints ? trackData.pitWaypoints.length : 0;

  const PIT_PARKING_INDEX = PIT_WAYPOINTS_COUNT - 3;

  const PIT_EXIT_INDEX = PIT_WAYPOINTS_COUNT - 1;

  if (inPit)  {

    player.pitTimer = (player.pitTimer || 0) + deltaTime;

    playerAutoDriving = true;

    player.speed = 0;

    player.forwardSpeed = 0;

    player.sideSpeed = 0;

    document.getElementById('lapHud').textContent = `PIT STOP: ${Math.ceil(PIT_STOP_DURATION - player.pitTimer)}s`;

    if (player.pitTimer >= PIT_STOP_DURATION)  {

      tireHealth = [100, 100, 100, 100];

      inPit = false;

      player.pitTimer = 0;

      playerPitWaypointIndex = PIT_PARKING_INDEX + 1;

      document.getElementById('lapHud').textContent = `PIT LANE - EXITING`;

    }

}
 

else if (playerAutoDriving && trackData.pitWaypoints && trackData.pitWaypoints.length >= 3)  {

  const targetWaypoint_unscaled = trackData.pitWaypoints[playerPitWaypointIndex];

  if (targetWaypoint_unscaled && playerPitWaypointIndex <= PIT_EXIT_INDEX)  {

    const targetX_scaled = targetWaypoint_unscaled.x * SCALE;

    const targetY_scaled = targetWaypoint_unscaled.y * SCALE;

    const targetAngle = Math.atan2(targetY_scaled - player.y, targetX_scaled - player.x);

    let angleDiff = targetAngle - player.angle;

    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    player.angle += angleDiff * 0.1;

    player.forwardSpeed = Math.min(player.forwardSpeed + 0.5, PIT_LANE_SPEED_LIMIT);

    player.sideSpeed = 0;

    player.x += Math.cos(player.angle) * player.forwardSpeed * MOVE_SCALE;

    player.y += Math.sin(player.angle) * player.forwardSpeed * MOVE_SCALE;

    player.speed = player.forwardSpeed;

    const distToTarget_scaled = Math.hypot(targetX_scaled - player.x, targetY_scaled - player.y);

    if (playerPitWaypointIndex === PIT_PARKING_INDEX)  {

      if (distToTarget_scaled < PIT_PARKING_DIST_SCALED * SCALE)  {

        playerAutoDriving = false;

        inPit = true;

        player.pitTimer = 0;

      }

  }
else if (distToTarget_scaled < PIT_LANE_DIST_SCALED)  {

  playerPitWaypointIndex++;

}

}
else  {

  playerAutoDriving = false;

  inPit = false;

  player.forwardSpeed = Math.min(player.forwardSpeed || 0, 10.0);

  player.sideSpeed = 0;

  if (!playerAutoDriving && !inPit) {
  document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;
  }
  playerPitWaypointIndex = 0;

}

}

else if (trackData.pitEntry && !playerAutoDriving)  {

const playerX = player.x;
const playerY = player.y;
const entryX = trackData.pitEntry.x * SCALE; // Scale the entry point to match player.x
const entryY = trackData.pitEntry.y * SCALE;

const dx = playerX - entryX;
const dy = playerY - entryY;
const distToEntry = Math.hypot(dx, dy);

const PIT_ENTRY_TRIGGER_DIST = 150 * SCALE;

const pitHudPrompt = document.getElementById('pitHudPrompt');

   if (distToEntry < PIT_ENTRY_TRIGGER_DIST && (wantsToPit || playerAvgHealth < 20))  {

    playerAutoDriving = true;

    playerPitWaypointIndex = 0;

    inPit = false;

    keys =  { };

    touch =  { };

	wantsToPit = false;

	if (pitHudPrompt) pitHudPrompt.style.display = 'none';

	document.getElementById('lapHud').textContent = `PIT LANE - ENTERING`;

	}
 

if (wantsToPit)  {

  if (pitHudPrompt)  {

    pitHudPrompt.style.display = 'block';

    pitHudPrompt.textContent = "PIT REQUESTED";

    pitHudPrompt.style.backgroundColor = "rgba(0, 120, 255, 0.8)";

    pitHudPrompt.style.borderColor = "#00ffff";

  }

}

else if (distToEntry < PIT_ENTRY_TRIGGER_DIST)  {

  if (pitHudPrompt)  {

    pitHudPrompt.style.display = 'block';

    pitHudPrompt.textContent = "READY TO PIT (P)";

    pitHudPrompt.style.backgroundColor = "rgba(255, 165, 0, 0.8)";

    pitHudPrompt.style.borderColor = "#ffffff";

  }
}

else  {
  if (pitHudPrompt) pitHudPrompt.style.display = 'none';
}
}

if (!playerAutoDriving)  {

  const FORWARD_DAMPING_PLAYER = 0.9965;

  const STEERING_RATE = 0.038 * player.spec.handling * 0.38;

  const ACCEL_RATE = player.spec.acceleration * 0.00975 * SPEED_UNIT_SCALE;

  const MAX_SPEED = 32;

  let acceleration = 0;

  let steering = 0;

  const wantsForward = (keys.ArrowUp || touch.up);

  if (wantsForward) acceleration = ACCEL_RATE;

  if (keys.ArrowDown || touch.down)  {

    if ((player.forwardSpeed || 0) > 0.2)  {

      player.forwardSpeed *= 0.92;

      acceleration = 0;

    }
  else  {

    acceleration = -0.18;

  }

}

if (keys.ArrowLeft || touch.left) steering = -STEERING_RATE;

if (keys.ArrowRight || touch.right) steering = STEERING_RATE;

const boostingActive = isBoosting && wantsForward && boostMeter > 0 && boostCooldown <= 0;

const maxSpeedNow = boostingActive ? (MAX_SPEED * BOOST_SPEED_MULTIPLIER) : MAX_SPEED;

if (boostingActive)  {

  acceleration *= 1.25;

  boostMeter = Math.max(0, boostMeter - BOOST_DRAIN_RATE);

  if (Math.random() < 0.7) emitBoostForCar(player, true);

  if (boostMeter <= 0) boostCooldown = 60;

}
else  {

  if (boostCooldown <= 0 && boostMeter < 1.0)  {

    boostMeter = Math.min(1.0, boostMeter + BOOST_RECHARGE_RATE);

  }

}

steering = Math.max(-0.4, Math.min(steering, 0.4));

player.forwardSpeed = (player.forwardSpeed || player.speed || 0) + acceleration;

const MAX_REVERSE_SPEED = 3.0;

player.forwardSpeed = Math.max(-MAX_REVERSE_SPEED, Math.min(player.forwardSpeed, maxSpeedNow));

// 一般轉向
const speedForSteer = Math.abs(player.forwardSpeed);
const steerDamp = 1 / (1 + speedForSteer * 0.06);

// 原本：player.angle += steering * steerDamp * player.forwardSpeed / 8;
// 改成：先做普通 steering，再疊加 Lifting Turn 額外旋轉
player.angle += steering * steerDamp * player.forwardSpeed / 8;

// --- Lifting Turn 額外效果 ---
if (liftingTurnActive) {
  liftingTurnTimer += deltaTime;
  const t = Math.min(1, liftingTurnTimer / LIFTING_TURN_DURATION);
  const ease = Math.sin(Math.PI * t);

  const speedNow = Math.abs(player.forwardSpeed || player.speed || 0);
  const maxSpeedNow = getCarMaxSpeed(player);
  const speedRatio = Math.min(1, speedNow / maxSpeedNow);

  const baseTurnRate = 1.4; // 高峰期大約每秒 80 度左右
  const extraTurn =
    liftingTurnDirection *
    baseTurnRate *
    ease *
    (0.7 + 0.3 * speedRatio) *
    deltaTime;   // ⚠️ 只乘一次 dt

  player.angle += extraTurn;

  // 原本 keepRatio / maxAllowSpeed 部分可以照跟用：
  const keepRatio = 0.97;
  const minKeepSpeed = liftingTurnBaseSpeed * keepRatio;
  const maxAllowSpeed = liftingTurnBaseSpeed * LIFTING_TURN_SPEED_MULT;
  const sign = Math.sign(player.forwardSpeed || 1);

  if (speedNow < minKeepSpeed) {
    const diff = minKeepSpeed - speedNow;
    player.forwardSpeed += sign * diff * 0.25;
  }
  if (Math.abs(player.forwardSpeed) > maxAllowSpeed) {
    player.forwardSpeed = sign * maxAllowSpeed;
  }

  if (liftingTurnTimer >= LIFTING_TURN_DURATION) {
    liftingTurnActive = false;
    liftingTurnTimer = 0;
    liftingTurnDirection = 0;
    liftingTurnBaseSpeed = 0;
  }
}

// 根據是否 Lifting Turn 決定摩擦
let sideFrictionFactor = liftingTurnActive ? 0.992 : 0.99;
// Lifting Turn 中反而加大側向速度生成
const sideSpeedGeneration = liftingTurnActive ? 2.0 : 1.2;

player.sideSpeed = player.sideSpeed || 0;
if (Math.abs(steering) > 0.01) {
    player.sideSpeed -= player.forwardSpeed * steering * sideSpeedGeneration;
}

// 允許更大 side slip，路線拋出多啲
const sideSlipRatio = liftingTurnActive ? 1.7 : 0.7;
const maxSideSlip = Math.abs(player.forwardSpeed) * sideSlipRatio;

player.sideSpeed = Math.max(-maxSideSlip, Math.min(player.sideSpeed, maxSideSlip));
player.sideSpeed *= sideFrictionFactor;
player.forwardSpeed *= FORWARD_DAMPING_PLAYER;

const totalSpeed = Math.hypot(player.forwardSpeed, player.sideSpeed);
const driftAngle = Math.atan2(player.sideSpeed, player.forwardSpeed);
const actualAngle = player.angle + driftAngle;

// 在玩家 update 之後（updateCarPhysics 之後）
if (mirageTurnActive && player) {
    mirageTurnTimer += deltaTime;
    const maxSpeedNow = getCarMaxSpeed(player);

    // 判定「仲喺 drift」：側滑大或者 driftMode 開住
    const stillDrifting =
        isDriftMode || Math.abs(player.sideSpeed || 0) > 3.0;

    // 1) 正在 drift 期間：慢慢收斂側滑，唔做大爆衝
    if (stillDrifting) {
        player.sideSpeed *= 0.90;   // 比平時收得快啲少少
    }

    // 2) 一旦由「drift 中」變成「唔 drift」而且未爆衝過 → one shot 向前 boost
    if (!stillDrifting && !mirageBurstDone) {
        const baseSpeed = Math.hypot(
            player.forwardSpeed || 0,
            player.sideSpeed   || 0
        );

        const sign = Math.sign(player.forwardSpeed || 1);

        // 根據之前算嘅 mirageBoostPower + 目前總速度打一個脈衝
        const burst = mirageBoostPower + baseSpeed * 0.6;

        player.sideSpeed = 0;                    // 重置橫向
        player.forwardSpeed += sign * burst;     // 一次過向前抽上去

        // 上限，防止變火箭
        const maxMirageSpeed = maxSpeedNow * 1.5;
        if (Math.abs(player.forwardSpeed) > maxMirageSpeed) {
            player.forwardSpeed = sign * maxMirageSpeed;
        }

        mirageBurstDone = true;
    }

    // 3) 殘影（只喺真正 Mirage 模式先畫）
    const SPAWN_INTERVAL = 0.05; // 約 0.05 秒一粒 ≈ 3 frame 一粒
    mirageAfterimageAccum += deltaTime;

    if (mirageTurnMode === "mirage") {
        if (mirageAfterimageAccum >= SPAWN_INTERVAL) {
            mirageAfterimageAccum -= SPAWN_INTERVAL;
            emitMirageAfterimage(player);
        }
    }

    // 4) 整個 Mirage / Special 時窗完結就收工
    if (mirageTurnTimer >= MIRAGE_TURN_DURATION) {
        mirageTurnActive      = false;
        mirageTurnTimer       = 0;
        mirageBoostPower      = 0;
        mirageBurstDone       = false;
        mirageAfterimageAccum = 0;
        mirageTurnMode        = "mirage"; // reset default
    }
}

// ---- Comet Turn：類 Mirage 出彎爆衝 ----
if (cometTurnActive) {
    cometTurnTimer += deltaTime;

    const maxSpeedNow = getCarMaxSpeed(player);
    const speedNow    = Math.hypot(player.forwardSpeed, player.sideSpeed);
    const sideAbs     = Math.abs(player.sideSpeed || 0);
    const stillDrift  = sideAbs > maxSpeedNow * 0.08; // 幾多算仲 drifting

    if (!stillDrift && !cometTurnBurstDone) {
        // === 出彎 burst ===
        const signF = Math.sign(player.forwardSpeed || player.speed || 1);

        // 拉直車身
        player.sideSpeed *= 2;

        // 用 cometTurnPower 做一次性 boost
        const extra = cometTurnPower * 5.5;   // 可調強度
        player.forwardSpeed = signF * (speedNow + extra);

        // 限上限（同 mirage 類似）
        const maxCometSpeed = maxSpeedNow * 3.5;
        if (Math.abs(player.forwardSpeed) > maxCometSpeed) {
            player.forwardSpeed = signF * maxCometSpeed;
        }

        // 只係 burst 嗰下噴多啲 sparks
        for (let i = 0; i < 3; i++) {
            emitCometSparksStraight(player);
        }

        cometTurnBurstDone = true;

    } else if (stillDrift && !cometTurnBurstDone) {
        // 仲 drifting 階段：少量 sparks 提示
        emitCometSparksStraight(player);
    }

    if (cometTurnTimer > COMET_TURN_DURATION || cometTurnBurstDone) {
        cometTurnActive = false;
        cometTurnTimer  = 0;
    }
}

// ---- Comet Evolution：類 Lifting 大甩 + 加速 ----
if (cometEvolutionActive) {
    cometEvolutionTimer += deltaTime;

    // 類 lifting：保持總速度，側向較多
    const maxSpeedNow = getCarMaxSpeed(player);
    const totalSpeed  = Math.hypot(player.forwardSpeed, player.sideSpeed) || 0.01;

    // 輕微補速，唔好輸畀普通 boost 太多
    const targetSpeed = Math.min(totalSpeed * 1.3, maxSpeedNow * 1.5);
    const nowSpeed    = Math.hypot(player.forwardSpeed, player.sideSpeed) || 0.01;
    const signF       = Math.sign(player.forwardSpeed || player.speed || 1);

    if (nowSpeed < targetSpeed) {
        const diff = targetSpeed - nowSpeed;
        player.forwardSpeed += diff * 0.7 * signF;
    }

    // 讓側滑維持：減少 forward damping，side 保留
    player.forwardSpeed *= 0.995;
    player.sideSpeed    *= 0.99;

    // 外側 sparks（你可以自已實作）
    emitCometSparksDrift(player);

    if (cometEvolutionTimer > COMET_EVOLUTION_DURATION) {
        cometEvolutionActive = false;
        cometEvolutionTimer  = 0;
    }
}

if (player && gameState === 'racing') {
	// --- 入油 / 煞車 ---
	let acc = 0;
	if (keys['ArrowUp'])   acc =  0.4;
	if (keys['ArrowDown']) acc = -0.1;

    // --- 轉向輸入 ---
	let steer = 0;
	if (keys['ArrowLeft'])  steer = -0.1;
	if (keys['ArrowRight']) steer =  0.1;

	// --- 基本狀態 ---
	const maxSpeedNow  = getCarMaxSpeed(player);
	const speed        = Math.abs(player.forwardSpeed || player.speed || 0);
	// 新 drift 判斷（專俾 Special 用）
	const sideAbs = Math.abs(player.sideSpeed || 0);
	const isDriftingNow = sideAbs > 2.0 && speed > maxSpeedNow * 0.2;
	  
	const turnType = getCarTurnType(player.spec);

	if (mirageBoostLock > 0) mirageBoostLock--;  // 每 frame 減一


	// ---- Special Turn Boost ----
	let nextIsBoosting = false;
	const spaceDown = !!keys.Space;

	if (spaceDown && !liftingTurnActive && !mirageTurnActive) {
		const turnType = getCarTurnType(player.spec);
		const speed = Math.abs(player.forwardSpeed || player.speed || 0);
		const isDriftingNow = Math.abs(player.sideSpeed || 0) > 2.0 && speed > maxSpeedNow * 0.2;

		let usedSpecial = false;

		// Lifting Turn
		if (turnType === 'lift' &&
			speed > maxSpeedNow * LIFTING_TURN_MIN_SPEED_RATIO &&
			isDriftingNow) {
			tryActivateLiftingTurn(player, steer, maxSpeedNow);
			usedSpecial = true;
		}
		// Mirage Turn
		else if (turnType === 'mirage' &&
				 speed > maxSpeedNow * 0.50 &&
				 isDriftingNow) {
			tryActivateMirageTurn(player, maxSpeedNow, "mirage");
			usedSpecial = true;
		}
		// Special (Mirage)
		else if (turnType === 'special' &&
				 speed > maxSpeedNow * 0.50 &&
				 isDriftingNow) {
			tryActivateMirageTurn(player, maxSpeedNow, "special");
			usedSpecial = true;
		}
		// Comet Turn
		else if (turnType === 'comet' &&
				 speed > maxSpeedNow * 0.45 &&
				 isDriftingNow) {
			tryActivateCometTurn(player, maxSpeedNow);
			usedSpecial = true;    // 你而家設定 Comet 都係「取代普通 boost」
		}
		// Comet Evolution
		else if (turnType === 'comet_evo' &&
				 speed > maxSpeedNow * LIFTING_TURN_MIN_SPEED_RATIO &&
				 isDriftingNow) {
			tryActivateCometEvolution(player, steer, maxSpeedNow);
			usedSpecial = true;
		}

		// 普通直線 boost，只喺冇用到任何 special turn 情況下生效
		const wantsForward = keys.ArrowUp || touch.up;
		const canBoostNow  = wantsForward && boostMeter > 0 && boostCooldown === 0;

		if (!usedSpecial && canBoostNow && !mirageTurnActive) {
			nextIsBoosting = true;
		}

		// Lifting / Mirage Active 期間一律關普通 boost
		if (liftingTurnActive || mirageTurnActive) {
			nextIsBoosting = false;
		}

		// 再將「不能物理上 boost」情況全部清掉
		if (!canBoostNow) {
			nextIsBoosting = false;
		}
	} else {
		// 冇撳住 X / Space 嘅 frame，直接唔 boost
		nextIsBoosting = false;
	}

	// ★ 用 nextIsBoosting 覆蓋，而唔係永遠黐住 true
	isBoosting = nextIsBoosting;

	// 之後先行物理
	updateCarPhysics(player, acc, steer, deltaTime);
}

player.speed = totalSpeed;

player.driftAngle = driftAngle;

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
    const TIREMARKLIFE = 60;

    // 胎印照畫（無論係普通甩尾定 Lifting Turn）
    tireMarks.push({
        x1: lastX_L, y1: lastY_L,
        x2: currentX_L, y2: currentY_L,
        life: TIREMARKLIFE
    });
    tireMarks.push({
        x1: lastX_R, y1: lastY_R,
        x2: currentX_R, y2: currentY_R,
        life: TIREMARKLIFE
    });

    if (!liftingTurnActive) {
        // 普通甩尾：用沙塵
        emitDustForCar(player, true, maxSpeedNow);
    } else {
        // Lifting Turn 期間：用風效代替
        emitLiftingTurnWind(player);
    }
}


player.lastTireMarkPosL =  {
  x: currentX_L, y: currentY_L 
};

player.lastTireMarkPosR =  {
  x: currentX_R, y: currentY_R 
};

if (player.speed > 0.6)  {

  emitMoveDustForCar(player);

}

// ★★★ 新增：player 與 AI 的碰撞檢查（放喺 player 位置更新後） ★★★
allCars.forEach(car => {
    checkCollisions(player, car);
});


if (!isBoosting)  {

}

const boostBar = document.getElementById('boostBar');

if (boostBar)  {

  boostBar.style.transform = `scaleX(${boostMeter})`;

  boostBar.style.background = 'linear-gradient(90deg, #ff3333, #ff6666)';

}

if (boostCooldown > 0) boostCooldown--;

drawDashboard(player.speed);

drawTireMonitor(player, tireMonitorCtx);

const startLineY = TRACKS[currentTrack].start.y * SCALE;

if (player.prevY >= startLineY && player.y < startLineY && player.speed > 1)  {

  lap++;

  if (lap > totalLaps)  {

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

const sorted = [player, ...allCars].sort((a, b) => a.y - b.y);

const pos = sorted.findIndex(c => c === player) + 1;

if (!playerAutoDriving && !inPit) {
    document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;
}

document.getElementById('posHud').textContent = `POS #${pos}/${allCars.length + 1}`;

// ===== 世界層結束 =====

}
 

if (inPit)  {

  if (player.speed < 0.1)  {
 
    player.speed = 0;

    player.forwardSpeed = 0;

    player.sideSpeed = 0;

    document.getElementById('lapHud').textContent = `PIT STOP: ${Math.ceil(PIT_STOP_DURATION - pitTimer)}s`;

    pitTimer += deltaTime;

    if (pitTimer >= PIT_STOP_DURATION)  {

      tireHealth = [100, 100, 100, 100];

      inPit = false;

      pitTimer = 0;

      playerAutoDriving = true;

      if (trackData.pitWaypoints && trackData.pitWaypoints.length >= 3)  {

        const PIT_PARKING_INDEX = trackData.pitWaypoints.length - 3;

        playerPitWaypointIndex = PIT_PARKING_INDEX + 1;

      }
    else  {

      playerAutoDriving = false;

	  if (!playerAutoDriving && !inPit) {
      document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;
	  }
    }

}

}

}

if (playerAvgHealth <= CRITICAL_HEALTH && gameState === 'racing')  {

  player.speed = 0;

  player.forwardSpeed = 0;

  player.sideSpeed = 0;

  if (!raceFinished)  {

    document.getElementById('gameOverText').textContent = '輪胎嚴重損壞！比賽中止。請下次及時進 Pit 站更換輪胎。';

    document.getElementById('gameOverScreen').style.display = 'flex';

    gameState = 'finished';

  }

}



if (gameState !== "title")  {

  drawSingleAIAvatar(ctx);

}

if (gameState === 'racing') {
  const currentCarSpec = CARSPECS[selectedCar];
  const rawName = currentCarSpec.image.split('/').pop().replace('.png', '').replace(/_/g, ' ');
  const carNameLower = rawName.toLowerCase();

  updateAIAvatarByCarName(carNameLower);

        // 1. Define the Prefix first so it is never "undefined"
        let aiPrefix = `▶ ${currentAIName || "SYSTEM"}: `; 
        let aiMsg = "";

 
// 原有的繪圖邏輯完全不變
// AI message + BOOST banner（會跟 W/H 縮放）
if (aiMsg !== "" || isBoosting) {
  ctx.save();

  const boxW = W * 0.6;             // 佔畫面闊度 60%
  const boxH = H * 0.08;            // 佔畫面高度 10%
  const boxX = (W - boxW) / 2;      // 水平置中
  const boxY = H * 0.08;            // 頂部 HUD 下少少

  ctx.fillStyle = "rgba(0, 15, 30, 0.85)";
  ctx.strokeStyle = isBoosting ? "#ff00ff" : "#00ffff";
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(boxX, boxY);
  ctx.lineTo(boxX + boxW - 40, boxY);
  ctx.lineTo(boxX + boxW,     boxY + 40);
  ctx.lineTo(boxX + boxW,     boxY + boxH);
  ctx.lineTo(boxX + 40,       boxY + boxH);
  ctx.lineTo(boxX,            boxY + boxH - 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 左側燈條
  ctx.fillStyle = (Date.now() % 500 < 250) ? "#00ffff" : "rgba(0, 255, 255, 0.5)";
  ctx.fillRect(boxX + 12, boxY + 12, 6, boxH - 24);

  // 右上亂碼 debug
  ctx.save();
  const debugFont = Math.max(10, H * 0.012);
  ctx.font = `bold ${debugFont}px monospace`;
  ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
  ctx.textAlign = "right";
  for (let j = 0; j < 4; j++) {
    const hex = "0x" + Math.random().toString(16).toUpperCase().substring(2, 6);
    ctx.fillText(hex, boxX + boxW - 12, boxY + 20 + j * (debugFont + 2));
  }
  ctx.restore();
}
       // 2. Logic to determine what the AI says
        if (modeNotifyTimer > 0) {
            aiMsg = modeNotifyText;
            // The timer is handled at the end of the loop or here
            modeNotifyTimer--; 
        } 
        else if (cyberSystemActive) {
            // Context-sensitive chatter when System Link is ON
            if (Math.abs(player.sideSpeed) > 6) aiMsg = "COMPENSATING FOR DRIFT ANGLE...";
            else if (isBoosting) aiMsg = "ALL VENTS OPEN. MAXIMUM THRUST.";
            else if (offTrackFactor < 1.0) aiMsg = "WARNING. TRACTION LOSS DETECTED.";
            else aiMsg = "MONITORING CHASSIS STABILITY...";
        } 
        else if (inPit) {
            aiMsg = "SYSTEM CHECK... ALL UNITS GO.";
        } 
        else if (isBoosting) {
            aiMsg = "BOOST ON! PRESSURE CRITICAL!";
        } 
        else if (tireHealth.some(h => h < 30)) {
            aiMsg = "CAUTION: TIRE GRIP IS DIMINISHING.";
        }

        // 3. Draw the box ONLY if there is a message to show
        if (aiMsg !== "") {
            drawAIMessageBox(ctx, aiMsg, aiPrefix, isBoosting);
        }

// ==========================================
        // DEBUG: AI PIT STATUS (Top Left corner)
        // ==========================================
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw on screen
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Dark background for readability
        ctx.fillRect(10, 200, 250, allCars.length * 18 + 10);
        
        ctx.font = "bold 12px Rajdhani";
        ctx.textAlign = "left";

        allCars.forEach((car, i) => {
            const avgH = Math.round(car.tireHealth.reduce((a, b) => a + b, 0) / 4);
            const state = car.pitCondition.toUpperCase();
            
            // Color logic: Red if tire is low, Cyan if pitting
            ctx.fillStyle = (avgH < 30) ? "#ff4444" : "#ffffff";
            if (state !== 'OUT') ctx.fillStyle = "#00ffff";

            const name = car.spec.image.split('/').pop().replace('.png', '').slice(0, 10);
            ctx.fillText(`${i+1}. ${name}: ${avgH}% HP | STATE: ${state}`, 20, 220 + (i * 18));
        });
        ctx.restore();

}
}

if (player.speed > 25 || isBoosting)  {

  ctx.save();

  ctx.strokeStyle = isBoosting ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';

  ctx.lineWidth = 1.5;

  const lineCount = isBoosting ? 25 : 15;

  for (let i = 0;
  i < lineCount;
  i++)  {

    let angle = Math.random() * Math.PI * 2;

    let dist = 300 + Math.random() * 200;

    let len = 100 + Math.random() * 200;

    ctx.beginPath();

    ctx.moveTo(W/2 + Math.cos(angle) * dist, H/2 + Math.sin(angle) * dist);

    ctx.lineTo(W/2 + Math.cos(angle) * (dist + len), H/2 + Math.sin(angle) * (dist + len));

    ctx.stroke();

  }

ctx.restore();

}

if (gameState !== 'title')  {

    // Apply Off-track check
    checkOffTrack(player);
    
    // Apply Cyber System Logic
    updateCyberSystemLogic();

    // Modify player speed based on off-track factor
    player.forwardSpeed *= offTrackFactor; 

    // Performance: Only draw minimap every 2 frames
    if (Math.floor(Date.now() / 16) % 2 === 0) {
        drawMinimap();
    }

 // Aero 系統更新
  if (player) {
    updateAeroMode(player, true);
    if (isBoosting) {
      switchCarImage(player, true);
      emitBoostForCar(player, true);
    } else {
      switchCarImage(player, false);
      if (player.isAeroMode) emitAeroAirflow(player);
    }
  }
  
  allCars.forEach(car => {
    updateAeroMode(car, false);
    switchCarImage(car, false);
    if (car.isAeroMode) emitAeroAirflow(car);  // AI 獨立觸發！
  });
  
  requestAnimationFrame(loop);

}

}

window.addEventListener('load', () =>  {

  sandPattern = createSandPattern();

  const checkered = document.getElementById('checkered');

  for (let i = 0;
  i < 60;
  i++)  {

    const div = document.createElement('div');

    checkered.appendChild(div);

  }

document.getElementById('startTitleBtn').onclick = () =>  {

  document.getElementById('titleScreen').style.display = 'none';

  document.getElementById('mainMenu').classList.add('active');

};

document.getElementById('champBtn').onclick = () => openTrackSelect('championship');

document.getElementById('timeBtn').onclick = () => openTrackSelect('timeattack');

document.getElementById('confirmTrackBtn').onclick = () =>  {

  document.getElementById('trackSelect').classList.remove('active');

  document.getElementById('carMenu').classList.add('active');

  buildCarList();

};

document.getElementById('confirmBtn').onclick = () =>  {

  document.getElementById('carMenu').classList.remove('active');

  playerCarImg.src = CARSPECS[selectedCar].image;

  playerCarImg.onload = startRace;

};

document.getElementById('backToMenuBtn').onclick = () =>  {

  document.getElementById('finishScreen').style.display = 'none';

  document.getElementById('mainMenu').classList.add('active');

  raceFinished = false;

};

const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

if (isTouch) {
  // 只負責顯示 control panel
  const mc = document.getElementById('mobileControls');
  if (mc) mc.style.display = 'flex';
}

const pitBtn = document.getElementById('pitBtn');

if (pitBtn)  {

  const handlePitPress = (e) =>  {

    e.preventDefault();

    if (gameState === 'racing' && !playerAutoDriving)  {

      wantsToPit = true;

    }

};

pitBtn.addEventListener('touchstart', handlePitPress,  {
  passive: false 
});

pitBtn.addEventListener('mousedown', handlePitPress);

}

window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        // 鍵盤甩尾判定
        if (!keys[e.key] && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            const now = Date.now();
            if (now - lastTapTime[e.key] < 300 && now - lastTapTime[e.key] > 30) {
                isDriftMode = true;
            }
            lastTapTime[e.key] = now;
        }
        keys[e.key] = true;
    }
    if (e.code === 'Space' || e.code === 'KeyX') {
        e.preventDefault();
        keys['Space'] = true;
    }
	
    if (e.key.toLowerCase() === 'p') {
        if (gameState === 'racing' && !playerAutoDriving) {
            wantsToPit = true;
        }
    }
});

window.addEventListener('keyup', e => {
	
    if (e.code === 'Space' || e.code === 'KeyX') {
        keys['Space'] = false;
    }
	
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keys[e.key] = false;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') isDriftMode = false;
    }
});


const upBtn = document.getElementById('btnUp');
const downBtn = document.getElementById('btnDown');
const leftBtn = document.getElementById('btnLeft');
const rightBtn = document.getElementById('btnRight');
const boostBtn = document.getElementById('boostBtn');

if (upBtn) {
    upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowUp'] = true; }, {passive: false});
    upBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowUp'] = false; });
}
if (downBtn) {
    downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowDown'] = true; }, {passive: false});
    downBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowDown'] = false; });
}
if (leftBtn) {
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - lastTapTime['ArrowLeft'] < 300) isDriftMode = true;
        lastTapTime['ArrowLeft'] = now;
        keys['ArrowLeft'] = true;
    }, {passive: false});
    leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; isDriftMode = false; });
}
if (rightBtn) {
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - lastTapTime['ArrowRight'] < 300) isDriftMode = true;
        lastTapTime['ArrowRight'] = now;
        keys['ArrowRight'] = true;
    }, {passive: false});
    rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowRight'] = false; isDriftMode = false; });
}
if (boostBtn) {
    boostBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Space'] = true;   // 當作按下 Space
    }, {passive: false});

    boostBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Space'] = false;  // 放開 Space
    }, {passive: false});
}

loadTrack(0);

if (!raceFinished)  {

  requestAnimationFrame(loop);

}

});

});
