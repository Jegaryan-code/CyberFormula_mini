

document.addEventListener('DOMContentLoaded', () =>  {

  const SCALE = 5.0;

  const WORLD_SPEED_SCALE = 0.5;

  const SPEED_UNIT_SCALE = 34 / 18;

  const MOVE_SCALE = WORLD_SPEED_SCALE / SPEED_UNIT_SCALE;

  const CARWIDTH = 90;

  const CARHEIGHT = 150;

  const canvas = document.getElementById('game');

  const ctx = canvas.getContext('2d');

  const W = canvas.width, H = canvas.height;

  const AI_AVATAR_MAP = [
  {
    key: "asurada", img: "ai/AI_ASURADA.png", name: "ASURADA" 
  }
,
{
  key: "garland", img: "ai/AI_Garland.png", name: "GARLAND" 
}
,
{
  key: "orge", img: "ai/AI_ORGE.png", name: "ORGE" 
}
,
{
  key: "al-zard", img: "ai/AI_ZARD.png", name: "AL-ZARD" 
}
,
{
  key: "ex-zard", img: "ai/AI_ZARD.png", name: "EX-ZARD" 
}

];

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

function getCarMaxSpeed(car)  {

  if (!car.spec) return BASE_MAX_SPEED;

  const minAccel = 4.5;

  const maxAccel = 5.3;

  const normalizedAccel = (car.spec.acceleration - minAccel) / (maxAccel - minAccel);

  const speedBonus = normalizedAccel * MAX_SPEED_BONUS;

  return BASE_MAX_SPEED + speedBonus;

}

let isBoosting = false;

let modeNotifyTimer = 0;

let modeNotifyText = "";

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

function drawSandBackground(ctx, offsetX, offsetY)  {

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

function drawCurrentTrackRoad(ctx, offsetX, offsetY)  {

  const t = TRACKS[currentTrack];

  const wps = t.waypoints;

  if (!wps || !wps.length) return;

  ctx.save();

  ctx.lineJoin = 'round';

  ctx.lineCap = 'butt';

  ctx.beginPath();

  ctx.moveTo(wps[0].x * SCALE - offsetX, wps[0].y * SCALE - offsetY);

  for (let i = 1;
  i < wps.length;
  i++)  {

    ctx.lineTo(wps[i].x * SCALE - offsetX, wps[i].y * SCALE - offsetY);

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

function updateCarPhysics(car, acceleration, steering)  {

  const MAX_SPEED = (car && typeof car.maxSpeedLimit === 'number') ? car.maxSpeedLimit : 34;

  const sideFrictionFactor = (car && car.isAI) ? 0.94 : 0.95;

  const sideSpeedGeneration = (car && car.isAI) ? 3.8 : 3.0;

  const track = TRACKS[currentTrack];

  const trackX = track.playerStart.x * SCALE;

  const trackY = track.playerStart.y * SCALE;

  const distanceToStart = Math.hypot(player.x - trackX, player.y - trackY);

  if (distanceToStart > 100)  {

    player.x = trackX;

    player.y = trackY;

    player.angle = track.playerStart.angle;

    player.speed = 0;

  }

const steeringClamp = (car && car.isAI) ? 0.6 : 0.4;

steering = Math.max(-steeringClamp, Math.min(steering, steeringClamp));

car.forwardSpeed = (car.forwardSpeed || car.speed || 0) + acceleration;

car.forwardSpeed = Math.max(-10, Math.min(car.forwardSpeed, MAX_SPEED));

car.angle += steering * car.forwardSpeed / 10;

car.sideSpeed = car.sideSpeed || 0;

const steerDeadzone = (car && car.isAI) ? 0 : 0.01;

if (Math.abs(steering) > steerDeadzone)  {

  const slipMul = (car && car.isAI) ? 0.14 : 1.0;

  car.sideSpeed -= car.forwardSpeed * steering * sideSpeedGeneration * slipMul;

}

car.sideSpeed *= sideFrictionFactor;

car.forwardSpeed *= (car && car.isAI) ? 0.995 : 0.992;

const totalSpeed = Math.hypot(car.forwardSpeed, car.sideSpeed);

const driftAngle = Math.atan2(car.sideSpeed, car.forwardSpeed);

const actualAngle = car.angle + driftAngle;

car.x += Math.cos(actualAngle) * totalSpeed * MOVE_SCALE;

car.y += Math.sin(actualAngle) * totalSpeed * MOVE_SCALE;

car.speed = totalSpeed;

car.driftAngle = driftAngle;

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

function updateCarPhysics(car, acceleration, steeringAngle)  {

  steeringAngle = Math.max(-0.4, Math.min(steeringAngle, 0.4));

  car.forwardSpeed = (car.forwardSpeed || car.speed) + acceleration;

  const maxSpeed = 26;

  car.forwardSpeed = Math.max(-10, Math.min(car.forwardSpeed, maxSpeed));

  car.angle += steeringAngle * car.forwardSpeed / 15;

  const frictionFactor = 0.05 - (car.spec.handling || 1) * 0.02;

  car.sideSpeed = car.sideSpeed || 0;

  if(Math.abs(steeringAngle) > 0.01)  {

    car.sideSpeed += car.forwardSpeed * steeringAngle * 0.2;

  }

car.sideSpeed *= frictionFactor;

car.forwardSpeed *= 0.992;

const totalSpeed = Math.hypot(car.forwardSpeed, car.sideSpeed);

const driftAngle = Math.atan2(car.sideSpeed, car.forwardSpeed);

const actualAngle = car.angle + driftAngle;

car.x += Math.cos(actualAngle) * totalSpeed;

car.y += Math.sin(actualAngle) * totalSpeed;

car.speed = totalSpeed;

car.driftAngle = driftAngle;

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

}
);

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

function followWaypoints(car)  {

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

  dirX /= len;
  dirY /= len;

  const nX = -dirY;

  const nY = dirX;

  const baseOffset = car.laneOffset || 0;

  let frontCar = null;

  let minDist = Infinity;

  const candidates = [...allCars, player].filter(c => c !== car);

  candidates.forEach(other =>  {

    const dx = other.x - car.x;

    const dy = other.y - car.y;

    const dist = Math.hypot(dx, dy);

    const rel = dx * dirX + dy * dirY;

    if (rel > 0 && dist < 400 && dist < minDist)  {

      minDist = dist;

      frontCar = other;

    }

}
);

const wantOvertake =
frontCar &&
minDist < 300 && 
(car.forwardSpeed || 0) >
(frontCar.forwardSpeed || 0) + 1.0;

if (car.overtakeTimer == null) car.overtakeTimer = 0;

if (car.overtakeSide == null) car.overtakeSide = 0;

if (car.overtakeTimer <= 0 && wantOvertake)  {

  car.overtakeTimer = 90 + Math.random() * 60;

  const lateral = (frontCar.x - car.x) * nX + (frontCar.y - car.y) * nY;

  const sideRaw = Math.sign(lateral);

  car.overtakeSide = sideRaw === 0 ? (Math.random() < 0.5 ? -1 : 1) : sideRaw;

}

if (car.overtakeTimer > 0)  {

  car.overtakeTimer--;

}
else  {

  car.overtakeSide = 0;

}

const AVOID_OFFSET = 180;

const OVERTAKE_OFFSET = 420;

let targetOffset = baseOffset;

if (car.overtakeSide !== 0)  {

  targetOffset = baseOffset + car.overtakeSide * OVERTAKE_OFFSET;

}
else if (frontCar && minDist < 260)  {

  const lateral = (frontCar.x - car.x) * nX + (frontCar.y - car.y) * nY;

  const side = Math.sign(lateral) || 1;

  targetOffset = baseOffset + side * AVOID_OFFSET;

}

if (frontCar && minDist < 180)  {

  const lateral = (frontCar.x - car.x) * nX + (frontCar.y - car.y) * nY;

  if (Math.abs(lateral) < 40)  {

    const forceSide = lateral >= 0 ? -1 : 1;

    targetOffset = baseOffset + forceSide * (OVERTAKE_OFFSET * 0.9);

    car.overtakeSide = forceSide;

    car.overtakeTimer = Math.max(car.overtakeTimer, 60);

  }

}

if (car.currentOffset == null) car.currentOffset = baseOffset;

car.currentOffset += (targetOffset - car.currentOffset) * 0.08;

const targetX = tx + nX * car.currentOffset;

const targetY = ty + nY * car.currentOffset;

const dx = targetX - car.x;

const dy = targetY - car.y;

const distToWp = Math.hypot(dx, dy);

if (distToWp < 500)  {

  car.waypointIndex = (car.waypointIndex + 1) % wp.length;

}

const targetAngle = Math.atan2(dy, dx);

let angleDiff = targetAngle - car.angle;

angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

const steeringAngle = angleDiff * 0.28;

const speedFactor = (car && typeof car.speedFactor === 'number') ? car.speedFactor : 1.0;

const maxSpeedBase = 26.7 * speedFactor;

const AI_ACCEL_SCALE = 2.0;

let acceleration = 0;

const inOvertake = car.overtakeTimer > 0 && car.overtakeSide !== 0;

if (frontCar && minDist < 130 && !inOvertake)  {

  if (car.forwardSpeed > maxSpeedBase * 0.75)  {

    acceleration = -3.0;

  }
else  {

  acceleration = car.spec.acceleration * 0.0055 * AI_ACCEL_SCALE * SPEED_UNIT_SCALE;

}

}
else  {

  const turnAmt = Math.min(1, Math.abs(angleDiff) / 0.6);

  const straightBoost = 1.0 + (1.0 - turnAmt) * 0.25;

  acceleration = car.spec.acceleration * (inOvertake ? 0.0060 : 0.0052) * AI_ACCEL_SCALE * straightBoost * SPEED_UNIT_SCALE;

  const maxSpeed = inOvertake ? maxSpeedBase + 0.4 * speedFactor : maxSpeedBase;

  car.maxSpeedLimit = maxSpeed;

  if (car.forwardSpeed > maxSpeed) acceleration = 0;

}

if (car.maxSpeedLimit == null) car.maxSpeedLimit = maxSpeedBase;

const isTurning = Math.abs(steeringAngle) > 0.1;

if (isTurning)  {

  acceleration *= 0.2;

}

car.lastAIAcceleration = acceleration;

car.lastAISteering = steeringAngle;

updateCarPhysics(car, acceleration, steeringAngle);

}

function loadTrack(i)  {

  currentTrack = i;

  trackImg = new Image();

  trackImg.onload = () =>  {

    document.getElementById('hud').textContent = `TRACK: ${TRACKS[i].name}`;

  }
;

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

    }
  ;

  grid.appendChild(d);

}
);

}

function buildCarList()  {

  const container = document.getElementById('carList');

  container.innerHTML = '';

  const teams =  {

  }
;

CARSPECS.forEach((spec, index) =>  {

  const teamNameMatch = spec.image.match(/^([^/]+)\//);

  let teamName = teamNameMatch ? teamNameMatch[1] : 'ERROR_NO_FOLDER';

  teamName = teamName.replace(/[-_]/g, ' ');

  teamName = teamName.split(' ').map(word => 
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  if (!teams[teamName])  {

    teams[teamName] = [];

  }

teams[teamName].push( {
  ...spec, index: index 
}
);

}
);

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

    const baseName = car.image.split('/').pop().replace('.png', '').replace(/_/g, ' ');

    const carName = document.createElement('p');

    carName.textContent = baseName;

    carName.style.fontSize = '12px';

    carName.style.margin = '5px 0 0';

    carName.style.color = '#ccc';

    carName.style.fontFamily = 'Rajdhani, sans-serif';

    li.appendChild(img);

    li.appendChild(carName);

    li.onclick = () =>  {

      const selectedIndex = parseInt(li.getAttribute('data-index'));

      selectedCar = selectedIndex;

      document.querySelectorAll('#carMenu .card').forEach(item =>  {

        item.classList.remove('selected');

      }
    );

    li.classList.add('selected');

  }
;

ul.appendChild(li);

}
);

container.appendChild(ul);

}
);

}

function startRace()  {

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

  allCars.push( {

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
  }
);

}
);

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
}
;

gameState = 'countdown';

countdownStartTime = Date.now();

lap = 0;

totalLaps = 5;

raceFinished = false;

player.prevY = player.y;

document.getElementById('lapHud').textContent = `LAP 0/${totalLaps}`;

const countdownElement = document.getElementById('countdown');

if (countdownElement)  {

  countdownElement.style.display = 'none';

}

const COUNTDOWN_DURATION_MS = 6000;

if (countdownInterval)  {

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

function emitSpeedFlameForCar(car, isPlayer)  {

  const jets = [-1, 1];

  for (let j = 0;
  j < jets.length;
  j++)  {

    const side = jets[j];

    const baseAngle = car.angle + Math.PI;

    const angle = baseAngle + (Math.random() - 0.5) * 0.22;

    const speed = 3.2 + Math.random() * 2.2;

    const life = 7 + Math.random() * 8;

    const backOffset = 50 + Math.random() * 8;

    const sideOffset = side * (CARWIDTH * 0.3);

    const length = 2 + Math.random() * 3;

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
      color: 'rgba(255, 140, 20, 0.75)'
    }
  );

}

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

function drawStartGrid(ctx, track, scale, offsetX, offsetY)  {

  const grid = track.gridPositions;

  if (!grid || !grid.length) return;

  ctx.save();

  ctx.strokeStyle = '#fff';

  ctx.lineWidth = 3;

  ctx.setLineDash([10, 5]);

  grid.forEach((pos, i) =>  {

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

  }
);

ctx.restore();

}

function emitBoostForCar(car, isPlayer)  {

  const jets = [-1, 1];

  for (let j = 0;
  j < jets.length;
  j++)  {

    const side = jets[j];

    const baseAngle = car.angle + Math.PI;

    const angle = baseAngle + (Math.random() - 0.5) * 0.18;

    const speed = 5.5 + Math.random() * 4.5;

    const life = 12 + Math.random() * 14;

    const backOffset = 58 + Math.random() * 10;

    const sideOffset = side * (CARWIDTH * 0.22);

    const length = 85 + Math.random() * 35;

    const width = 10 + Math.random() * 6;

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
    }
  );

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
  }
);

}

}

const handleKeyDown = (e) =>  {

  if (e.code === 'Space')  {

    e.preventDefault();

    if (boostMeter > 0 && boostCooldown <= 0)  {

      isBoosting = true;

    }

}
else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))  {

  e.preventDefault();

  keys[e.key] = true;

}

}
;

const handleKeyUp = (e) =>  {

  if (e.code === 'Space')  {

    isBoosting = false;

  }
else if (e.key in keys)  {

  keys[e.key] = false;

}

}
;

window.addEventListener('keydown', handleKeyDown);

window.addEventListener('keyup', handleKeyUp);

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
 

function drawTireMonitor(car, ctx)  {

  if (!ctx) return;

  if (!car.tireHealth)  {

    car.tireHealth = [100, 100, 100, 100];

  }

ctx.clearRect(0, 0, 100, 100);

ctx.fillStyle = '#444444';

ctx.fillRect(30, 10, 40, 80);

const health = car.tireHealth;

const getColor = (h) =>  {

  if (h > 60) return '#00FF00';

  if (h > 30) return '#FFFF00';

  return '#FF0000';

}
;

const positions = [
{
  x: 10, y: 15, h: 20, w: 10
}
, 
{
  x: 80, y: 15, h: 20, w: 10
}
, 
{
  x: 10, y: 65, h: 20, w: 10
}
, 
{
  x: 80, y: 65, h: 20, w: 10
}
 
];

positions.forEach((pos, index) =>  {

  ctx.fillStyle = getColor(health[index]);

  ctx.fillRect(pos.x, pos.y, pos.w, pos.h);

  const wearHeight = pos.h * (100 - health[index]) / 100;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';

  ctx.fillRect(pos.x, pos.y, pos.w, wearHeight);

  ctx.strokeStyle = 'white';

  ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);

}
);

const avg = health.reduce((a, b) => a + b, 0) / 4;

ctx.font = '10px Arial';

ctx.fillStyle = getColor(avg);

ctx.textAlign = 'center';

ctx.fillText(`AVG: ${Math.round(avg)}%`, 50, 98);

}

if (gameState !== 'title')  {

  drawMinimap(ctx, W, H);

  drawTireMonitor(ctx, W, H);

}

function drawSingleAIAvatar(ctx)  {

  if (!currentAIAvatarImg || !currentAIAvatarImg.complete) return;

  const size = 100;

  const x = W / 2 - size / 2;

  const y = H - 140;

  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.6)";

  ctx.fillRect(x - 12, y - 12, size + 24, size + 48);

  ctx.strokeStyle = "rgba(0,255,255,0.5)";

  ctx.lineWidth = 2;

  ctx.strokeRect(x - 12, y - 12, size + 24, size + 48);

  ctx.drawImage(currentAIAvatarImg, x, y, size, size);

  ctx.font = "bold 14px Rajdhani";

  ctx.fillStyle = "#00ffff";

  ctx.textAlign = "center";

  ctx.fillText(currentAIName, x + size / 2, y + size + 20);

  ctx.restore();

}

function loop()  {

  if (gameState === 'paused' || raceFinished)  {

    return;

  }

if (sandPattern)  {

  ctx.fillStyle = sandPattern;

  ctx.fillRect(0, 0, W, H);

}
else  {

  ctx.fillStyle = '#C2B280';

  ctx.fillRect(0, 0, W, H);

}

if (!player)  {

  requestAnimationFrame(loop);

  return;

}

const offsetX = player.x - W / 2;

const offsetY = player.y - H / 2;

ctx.drawImage(trackImg, -offsetX, -offsetY, TRACKS[currentTrack].originalWidth * SCALE, TRACKS[currentTrack].originalHeight * SCALE);

drawCurrentTrackRoad(ctx, offsetX, offsetY);

drawStartGrid(ctx, TRACKS[currentTrack], SCALE, offsetX, offsetY);

const trackData = TRACKS[currentTrack];

const PIT_LANE_WIDTH = 40 * SCALE;

const PIT_WAYPOINTS_COUNT = trackData.pitWaypoints ? trackData.pitWaypoints.length : 0;

const RENDER_PARKING_INDEX = PIT_WAYPOINTS_COUNT >= 3 ? PIT_WAYPOINTS_COUNT - 3 : -1;

if (trackData && trackData.pitWaypoints && trackData.pitWaypoints.length > 1)  {

  ctx.save();

  ctx.fillStyle = '#555555';

  ctx.beginPath();

  trackData.pitWaypoints.forEach((wp, index) =>  {

    const x = wp.x * SCALE - player.x + W / 2;

    const y = wp.y * SCALE - player.y + H / 2;

    const dx = (index < trackData.pitWaypoints.length - 1) ? trackData.pitWaypoints[index + 1].x * SCALE - wp.x * SCALE : wp.x * SCALE - trackData.pitWaypoints[index - 1].x * SCALE;

    const dy = (index < trackData.pitWaypoints.length - 1) ? trackData.pitWaypoints[index + 1].y * SCALE - wp.y * SCALE : wp.y * SCALE - trackData.pitWaypoints[index - 1].y * SCALE;

    const angle = Math.atan2(dy, dx);

    const perpAngle = angle + Math.PI / 2;

    const offsetX = Math.cos(perpAngle) * PIT_LANE_WIDTH / 2;

    const offsetY = Math.sin(perpAngle) * PIT_LANE_WIDTH / 2;

    if (index === 0)  {

      ctx.moveTo(x + offsetX, y + offsetY);

    }
  else  {

    ctx.lineTo(x + offsetX, y + offsetY);

  }

}
);

for (let i = trackData.pitWaypoints.length - 1;
i >= 0;
i--)  {

  const wp = trackData.pitWaypoints[i];

  const x = wp.x * SCALE - player.x + W / 2;

  const y = wp.y * SCALE - player.y + H / 2;

  const dx = (i < trackData.pitWaypoints.length - 1) ? trackData.pitWaypoints[i + 1].x * SCALE - wp.x * SCALE : wp.x * SCALE - trackData.pitWaypoints[i - 1].x * SCALE;

  const dy = (i < trackData.pitWaypoints.length - 1) ? trackData.pitWaypoints[i + 1].y * SCALE - wp.y * SCALE : wp.y * SCALE - trackData.pitWaypoints[i - 1].y * SCALE;

  const angle = Math.atan2(dy, dx);

  const perpAngle = angle + Math.PI / 2;

  const offsetX = Math.cos(perpAngle) * (-PIT_LANE_WIDTH / 2);

  const offsetY = Math.sin(perpAngle) * (-PIT_LANE_WIDTH / 2);

  ctx.lineTo(x + offsetX, y + offsetY);

}

ctx.closePath();

ctx.fill();

ctx.strokeStyle = 'white';

ctx.lineWidth = 2 * SCALE;

ctx.beginPath();

trackData.pitWaypoints.forEach((wp, index) =>  {

  const x = wp.x * SCALE - player.x + W / 2;

  const y = wp.y * SCALE - player.y + H / 2;

  if (index === 0)  {

    ctx.moveTo(x, y);

  }
else  {

  ctx.lineTo(x, y);

}

}
);

ctx.stroke();

if (typeof RENDER_PARKING_INDEX !== 'undefined' && RENDER_PARKING_INDEX >= 0)  {

  const trackData = TRACKS[currentTrack];

  const wp = trackData.pitWaypoints[RENDER_PARKING_INDEX];

  const bx = wp.x * SCALE - player.x + W / 2;

  const by = wp.y * SCALE - player.y + H / 2;

  const boxWidth = CARWIDTH * SCALE * 1.6;

  const boxHeight = CARHEIGHT * SCALE * 0.8;

  const xOffset = boxWidth / 2 + 40;

  const gap = boxHeight * 1.1;

  for (let i = 0;
  i < 6;
  i++)  {

    const currentY = by + (i * gap);

    const currentX = bx + xOffset;

    ctx.fillStyle = '#555555';

    ctx.fillRect(currentX - boxWidth / 2, currentY - boxHeight / 2, boxWidth, boxHeight);

    if (i === 0)  {

      ctx.strokeStyle = '#00ffff';

      ctx.lineWidth = 4;

    }
  else  {

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';

    ctx.lineWidth = 2;

  }

ctx.strokeRect(currentX - boxWidth / 2, currentY - boxHeight / 2, boxWidth, boxHeight);

ctx.fillStyle = (i === 0) ? '#ff0000' : '#777';

ctx.fillRect(currentX + boxWidth / 2 - 8, currentY - boxHeight / 2, 8, boxHeight);

ctx.font = 'bold 16px Rajdhani';

ctx.fillStyle = 'white';

ctx.textAlign = 'center';

if (i === 0)  {

  ctx.fillText('PLAYER STOP', currentX - 10, currentY + 6);

}
else  {

  ctx.font = '12px Rajdhani';

  ctx.fillText(`TEAM ${i + 1}`, currentX - 10, currentY + 5);

}

}

}

ctx.restore();

}

if (isBoosting)  {

  let grd = ctx.createRadialGradient(W/2, H/2, W/4, W/2, H/2, W/1.2);

  grd.addColorStop(0, 'transparent');

  grd.addColorStop(1, 'rgba(0, 255, 255, 0.15)');

  ctx.fillStyle = grd;

  ctx.fillRect(0, 0, W, H);

}

if (isBoosting && !lastIsBoosting)  {

  modeNotifyText = "AERO MODE";

  modeNotifyTimer = 60;

}

lastIsBoosting = isBoosting;

if (modeNotifyTimer > 0)  {

  ctx.save();

  ctx.font = "italic bold 80px 'Rajdhani'";

  ctx.textAlign = "center";

  let alpha = modeNotifyTimer / 60;

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

  ctx.shadowBlur = 20;

  ctx.shadowColor = "#00ffff";

  ctx.fillText(modeNotifyText, W/2, H/2 - 100);

  ctx.restore();

  modeNotifyTimer--;

}

ctx.save();

tireMarks.forEach(mark =>  {

  const alpha = Math.min(1, mark.life / 60);

  const size = 10;

  ctx.strokeStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;

  ctx.lineWidth = size;

  ctx.lineCap = 'round';

  ctx.beginPath();

  ctx.moveTo(mark.x1 - offsetX, mark.y1 - offsetY);

  ctx.lineTo(mark.x2 - offsetX, mark.y2 - offsetY);

  ctx.stroke();

}
);

ctx.restore();

ctx.save();

dustParticles.forEach(p =>  {

  const alpha = p.life / p.maxLife;

  const size = alpha * 10;

  const color = `rgba(180, 180, 180, ${alpha * 0.6})`;

  ctx.fillStyle = color;

  ctx.beginPath();

  ctx.arc(p.x - offsetX, p.y - offsetY, size / 2, 0, Math.PI * 2);

  ctx.fill();

}
);

ctx.restore();

allCars.forEach(car =>  {

  ctx.save();

  ctx.translate(car.x - offsetX, car.y - offsetY);

  ctx.rotate(car.angle + Math.PI / 2);

  if (car.img && car.img.complete)  {

    ctx.drawImage(car.img, -CARWIDTH / 2, -CARHEIGHT / 2, CARWIDTH, CARHEIGHT);

  }

ctx.restore();

}
);

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
}
);

emitDustForCar(car, false, AI_MAX_SPEED);

}

car.lastTireMarkPosL =  {
  x: currentX_L, y: currentY_L
}
;

car.lastTireMarkPosR =  {
  x: currentX_R, y: currentY_R
}
;

if (car.speed > 0.6) emitMoveDustForCar(car);

const AI_SPEED_FLAME_FIXED = 18.0;

const AI_SPEED_FLAME_THRESHOLD = Math.min(AI_MAX_SPEED * 0.4, AI_SPEED_FLAME_FIXED);

const aiTotalSpeed = Math.abs(car.speed || 0);

if (car.isBoosting)  {

  if (Math.random() < 0.7) emitBoostForCar(car, false);

}
else  {

  const carMaxSpeed = getCarMaxSpeed(car);

  const currentSpeed = Math.abs(car.forwardSpeed || car.speed || 0);

  const speedRatio = currentSpeed / carMaxSpeed;

  const speedRatioForFlame = 0.18;

  if (speedRatio >= speedRatioForFlame)  {

    emitSpeedFlameForCar(car, false);

  }

}

}
);

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

      emitSpeedFlameForCar(player, true);

        
    }

    
}

}

}

boostParticles = boostParticles.filter(p =>  {

  p.x += p.vx;

  p.y += p.vy;

  p.life--;

  p.vy += (p.gravity || 0.1);

  return p.life > 0;

}
);

tireMarks = tireMarks.filter(mark =>  {

  mark.life--;

  return mark.life > 0;

}
);

dustParticles = dustParticles.filter(p =>  {

  p.x += p.vx;

  p.y += p.vy;

  p.life--;

  p.vx *= 0.9;

  p.vy *= 0.9;

  return p.life > 0;

}
);

ctx.save();

boostParticles.forEach(p =>  {

  const alpha = p.life / p.maxLife;

  if (p.type === 'flame')  {

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

  }
else  {

  const size = (p.size || 12) * (0.4 + alpha);

  ctx.fillStyle = p.color || `rgba(0, 200, 255, ${alpha})`;

  ctx.globalAlpha = Math.min(1, alpha * 1.2);

  ctx.shadowBlur = 18;

  ctx.shadowColor = p.color || 'rgba(0,200,255,0.9)';

  ctx.beginPath();

  ctx.arc(p.x - offsetX, p.y - offsetY, size, 0, Math.PI * 2);

  ctx.fill();

}

}
);

ctx.restore();

ctx.save();

ctx.translate(W / 2, H / 2);

ctx.rotate(player.angle + Math.PI / 2);

if (typeof isBoosting !== 'undefined' && isBoosting)  {

  const podW = 12;

  const podH = 35;

  const carW = CARWIDTH;

  const carH = CARHEIGHT;

  ctx.fillStyle = '#333';

  ctx.fillRect(-carW / 2 - podW + 5, carH / 2 - 40, podW, podH);

  ctx.fillRect(carW / 2 - 5, carH / 2 - 40, podW, podH);

  const flameHeight = 40 + Math.random() * 20;

  const gradient = ctx.createLinearGradient(0, carH / 2, 0, carH / 2 + flameHeight);

  gradient.addColorStop(0, '#00ffff');

  gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.8)');

  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;

  ctx.beginPath();

  ctx.moveTo(-carW / 2 - 2, carH / 2 - 5);

  ctx.lineTo(-carW / 2 - 8, carH / 2 + flameHeight);

  ctx.lineTo(-carW / 2 + 4, carH / 2 + flameHeight);

  ctx.fill();

  ctx.beginPath();

  ctx.moveTo(carW / 2 + 2, carH / 2 - 5);

  ctx.lineTo(carW / 2 + 8, carH / 2 + flameHeight);

  ctx.lineTo(carW / 2 - 4, carH / 2 + flameHeight);

  ctx.fill();

  ctx.fillStyle = 'white';

  ctx.fillRect(-carW / 2 - 3, carH / 2 - 5, 4, 10);

  ctx.fillRect(carW / 2 - 1, carH / 2 - 5, 4, 10);

}

if (player.img && player.img.complete)  {

  let shakeX = isBoosting ? (Math.random() - 0.5) * 2 : 0;

  let shakeY = isBoosting ? (Math.random() - 0.5) * 2 : 0;

  ctx.drawImage(player.img, -CARWIDTH / 2 + shakeX, -CARHEIGHT / 2 + shakeY, CARWIDTH, CARHEIGHT);

}

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

  document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;

  playerPitWaypointIndex = 0;

}

}

else if (trackData.pitEntry && !playerAutoDriving)  {

  const unscaledPlayerX = player.x / SCALE;

  const unscaledPlayerY = player.y / SCALE;

  const pitHudPrompt = document.getElementById('pitHudPrompt');

  const PIT_ENTRY_TRIGGER_DIST = 120;

  const dx = unscaledPlayerX - trackData.pitEntry.x;

  const dy = unscaledPlayerY - trackData.pitEntry.y;

  const distToEntry = Math.hypot(dx, dy);

  if (distToEntry < PIT_ENTRY_TRIGGER_DIST && (wantsToPit || playerAvgHealth < 20))  {

    playerAutoDriving = true;

    playerPitWaypointIndex = 0;

    inPit = false;

    keys =  {

    }
  ;

  touch =  {

  }
;

wantsToPit = false;

if (pitHudPrompt) pitHudPrompt.style.display = 'none';

document.getElementById('lapHud').textContent = `PIT LANE - ENTERING`;

}
 

else if (wantsToPit)  {

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

const speedForSteer = Math.abs(player.forwardSpeed);

const steerDamp = 1 / (1 + speedForSteer * 0.06);

player.angle += steering * steerDamp * player.forwardSpeed / 8;

const sideFrictionFactor = 0.99;

const sideSpeedGeneration = 1.2;

player.sideSpeed = player.sideSpeed || 0;

if (Math.abs(steering) > 0.01)  {

  player.sideSpeed -= player.forwardSpeed * steering * sideSpeedGeneration;

}

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

if (isDrifting)  {

  const TIRE_MARK_LIFE = 60;

  tireMarks.push( {
    x1: lastX_L, y1: lastY_L, x2: currentX_L, y2: currentY_L, life: TIRE_MARK_LIFE 
  }
);

tireMarks.push( {
  x1: lastX_R, y1: lastY_R, x2: currentX_R, y2: currentY_R, life: TIRE_MARK_LIFE 
}
);

emitDustForCar(player, true, maxSpeedNow);

}

player.lastTireMarkPosL =  {
  x: currentX_L, y: currentY_L 
}
;

player.lastTireMarkPosR =  {
  x: currentX_R, y: currentY_R 
}
;

if (player.speed > 0.6)  {

  emitMoveDustForCar(player);

}

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

document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;

document.getElementById('posHud').textContent = `POS #${pos}/${allCars.length + 1}`;

document.getElementById('speedHud').textContent = `${Math.round(Math.abs(player.speed) * 15)} kmh`;

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

      document.getElementById('lapHud').textContent = `LAP ${lap}/${totalLaps}`;

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

if (gameState === 'racing')  {

  const currentCarSpec = CARSPECS[selectedCar];

  const rawName = currentCarSpec.image.split('/').pop().replace('.png', '').replace(/_/g, ' ');

  const carNameLower = rawName.toLowerCase();

  updateAIAvatarByCarName(carNameLower);

  let aiPrefix = "▶ AI: ";

  if (carNameLower.includes("asurada")) aiPrefix = "▶ ASURADA: ";

  else if (carNameLower.includes("garland")) aiPrefix = "▶ GARLAND: ";

  else if (carNameLower.includes("ogre")) aiPrefix = "▶ OGRE: ";

  else if (carNameLower.includes("al-zard")) aiPrefix = "▶ AL-ZARD: ";

  else if (carNameLower.includes("ex-zard")) aiPrefix = "▶ EX-ZARD: ";

  let aiMsg = "";

  if (inPit) aiMsg = "SYSTEM CHECK... ALL UNITS GO.";

  else if (isBoosting) aiMsg = "BOOST ON! PRESSURE CRITICAL!";

  else if (tireHealth.some(h => h < 30)) aiMsg = "CAUTION: TIRE GRIP IS DOWN.";

  else if (wantsToPit) aiMsg = "PIT-IN STRATEGY CONFIRMED.";

  if (aiMsg !== "" || isBoosting)  {

    ctx.save();

    const boxW = 520;

    const boxH = 80;

    const boxX = 475;

    const boxY = H - 270;

    ctx.fillStyle = "rgba(0, 15, 30, 0.85)";

    ctx.strokeStyle = isBoosting ? "#ff00ff" : "#00ffff";

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

    ctx.fillStyle = (Date.now() % 500 < 250) ? "#00ffff" : "rgba(0, 255, 255, 0.5)";

    ctx.fillRect(boxX + 15, boxY + 15, 8, boxH - 30);

    ctx.save();

    ctx.font = "bold 10px monospace";

    ctx.fillStyle = "rgba(0, 255, 255, 0.6)";

    ctx.textAlign = "right";

    for (let j = 0;
    j < 5;
    j++)  {

      const hex = "0x" + Math.random().toString(16).toUpperCase().substring(2, 6);

      ctx.fillText(hex, boxX + boxW - 15, boxY + 25 + (j * 10));

    }

  ctx.globalAlpha = Math.random();

  ctx.fillStyle = "#00ffff";

  ctx.fillRect(boxX + boxW - 5, boxY + 10, 2, boxH - 20);

  ctx.restore();

  ctx.shadowBlur = 12;

  ctx.shadowColor = "#00ffff";

  ctx.font = "bold 28px 'Rajdhani'";

  ctx.fillStyle = "#fbff00";

  ctx.textAlign = "left";

  ctx.fillText(aiPrefix, boxX + 40, boxY + 50);

  ctx.font = "26px 'Rajdhani'";

  ctx.fillStyle = "#ffffff";

  const prefixWidth = ctx.measureText(aiPrefix).width;

  let displayMsg = aiMsg;

  if (isBoosting && aiMsg === "BOOST ON! PRESSURE CRITICAL!")  {

    displayMsg = "AERO MODE / BOOST ON";

  }

ctx.fillText(displayMsg, boxX + 45 + prefixWidth, boxY + 50);

ctx.restore();

}

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

  drawMinimap();

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

}
;

document.getElementById('champBtn').onclick = () => openTrackSelect('championship');

document.getElementById('timeBtn').onclick = () => openTrackSelect('timeattack');

document.getElementById('confirmTrackBtn').onclick = () =>  {

  document.getElementById('trackSelect').classList.remove('active');

  document.getElementById('carMenu').classList.add('active');

  buildCarList();

}
;

document.getElementById('confirmBtn').onclick = () =>  {

  document.getElementById('carMenu').classList.remove('active');

  playerCarImg.src = CARSPECS[selectedCar].image;

  playerCarImg.onload = startRace;

}
;

document.getElementById('backToMenuBtn').onclick = () =>  {

  document.getElementById('finishScreen').style.display = 'none';

  document.getElementById('mainMenu').classList.add('active');

  raceFinished = false;

}
;

if ('ontouchstart' in window && navigator.maxTouchPoints > 0 && screen.width <= 1024)  {

  document.getElementById('mobileControls').style.display = 'flex';

  ['Up', 'Down', 'Left', 'Right'].forEach(d =>  {

    const b = document.getElementById(`btn${d}`);

    b.addEventListener('touchstart', e =>  {

      e.preventDefault();

      touch[d.toLowerCase()] = true;

    }
  );

  b.addEventListener('touchend', () =>  {

    touch[d.toLowerCase()] = false;

  }
);

}
);

const boostBtn = document.getElementById('boostBtn');

if (boostBtn)  {

  boostBtn.addEventListener('touchstart', e =>  {

    e.preventDefault();

    if (boostMeter > 0 && boostCooldown <= 0)  {

      isBoosting = true;

    }

}
);

boostBtn.addEventListener('touchend', e =>  {

  e.preventDefault();

  isBoosting = false;

}
);

}

}

const pitBtn = document.getElementById('pitBtn');

if (pitBtn)  {

  const handlePitPress = (e) =>  {

    e.preventDefault();

    if (gameState === 'racing' && !playerAutoDriving)  {

      wantsToPit = true;

    }

}
;

pitBtn.addEventListener('touchstart', handlePitPress,  {
  passive: false 
}
);

pitBtn.addEventListener('mousedown', handlePitPress);

}

window.addEventListener('keydown', e =>  {

  if (e.code === 'Space')  {

    e.preventDefault();

    if (boostMeter > 0 && boostCooldown <= 0)  {

      isBoosting = true;

    }

}
else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))  {

  e.preventDefault();

  keys[e.key] = true;

}
else if (e.key === 'p' || e.key === 'P')  {

  if (gameState === 'racing' && !playerAutoDriving && !inPit)  {

    wantsToPit = true;

  }

}

}
);

window.addEventListener('keyup', e =>  {

  if (e.code === 'Space')  {

    isBoosting = false;

  }
else  {

  keys[e.key] = false;

}

}
);

loadTrack(0);

if (!raceFinished)  {

  requestAnimationFrame(loop);

}

}
);

}
);

