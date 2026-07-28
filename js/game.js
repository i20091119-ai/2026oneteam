/* ===========================================================
   game.js — 게임 대장 🎩
   -----------------------------------------------------------
   화면을 바꾸고, 캐릭터를 움직이고, 그림을 그리는
   가장 중요한 파일이야.

   게임은 이렇게 계속 반복돼:
     ① 조종기·키보드에서 신호 받기
     ② 캐릭터 움직이기
     ③ 그림 그리기
     → 다시 ①로! (1초에 60번 반복)
   이걸 '게임 루프'라고 불러.
   =========================================================== */


/* -----------------------------------------------------------
   ① 게임이 기억해야 할 것들
   ----------------------------------------------------------- */
const game = {
  screen: 'start',      // 지금 보이는 화면 (start / game / clear)
  stageIndex: 0,        // 몇 번째 스테이지인지
  sectionIndex: 0,      // 그 스테이지의 몇 번째 구역인지
  players: [],          // 세 친구
  stars: 0,             // 얻은 별 개수 ⭐
  startTime: 0,         // 시작한 순간
  elapsed: 0,           // 흘러간 시간 (초)
  paused: false,
  time: 0               // 애니메이션용 시계
};

// 조작 대장을 만들어 (세은, 다영, 태준 3명)
const input = new InputManager(3);

// 도화지와 붓 준비
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


/* -----------------------------------------------------------
   ② 움직임에 쓰는 숫자들
   이 숫자를 바꾸면 캐릭터 느낌이 확 달라져!
   ----------------------------------------------------------- */
const GRAVITY    = 0.72;   // 아래로 당기는 힘 (중력)
const WALK_SPEED = 3.0;    // 걷는 빠르기
const RUN_SPEED  = 5.2;    // 달리는 빠르기 (A버튼 꾹!)
const JUMP_POWER = 13.2;   // 점프하는 힘
const MAX_FALL   = 17;     // 너무 빨리 떨어지지 않게 막는 한계
const FRICTION   = 0.78;   // 미끄러짐 (1에 가까울수록 얼음처럼 미끄러워)

const P_W = 30;            // 캐릭터 너비
const P_H = 48;            // 캐릭터 키
const P_H_CROUCH = 32;     // 웅크렸을 때 키


/* -----------------------------------------------------------
   ③ 화면 바꾸기
   ----------------------------------------------------------- */
function showScreen(name) {
  game.screen = name;
  // 모든 화면에서 active 를 떼고
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // 보여줄 화면에만 active 를 붙여
  document.getElementById('screen-' + name).classList.add('active');
}


/* -----------------------------------------------------------
   ④ 게임 시작하기
   ----------------------------------------------------------- */
function startGame() {
  sound.wake();              // 소리 공장 켜기
  sound.select();

  game.stageIndex = 0;
  game.sectionIndex = 0;
  game.stars = 0;
  game.paused = false;
  game.startTime = performance.now();
  game.elapsed = 0;

  loadSection();
  showScreen('game');
}

/* 지금 구역의 설계도를 가져오는 도우미 */
function currentStage()   { return STAGES[game.stageIndex]; }
function currentSection() { return currentStage().sections[game.sectionIndex]; }

/* 구역을 불러와서 캐릭터를 시작 위치에 놓아줘 */
function loadSection() {
  const sec = currentSection();

  game.players = HEROES.map((hero, i) => {
    const sp = sec.spawns[i] || sec.spawns[0];
    return {
      hero: hero,
      x: sp.x, y: sp.y,     // 지금 위치 (발밑 기준)
      vx: 0, vy: 0,         // 지금 속도
      onGround: false,      // 땅을 밟고 있나?
      facing: 1,            // 1=오른쪽, -1=왼쪽
      walk: 0,              // 걷는 동작 숫자
      crouch: false,
      atExit: false         // 문 앞에 도착했나?
    };
  });

  // 화면 위 글자 바꾸기
  document.getElementById('stageName').textContent = currentStage().name;
  document.getElementById('sectionName').textContent =
    sec.name + '  (' + (game.sectionIndex + 1) + '/' + currentStage().sections.length + ')';

  updatePlayerBar();
}


/* -----------------------------------------------------------
   ⑤ 캐릭터 움직이기
   ----------------------------------------------------------- */

/* --- 옆에서 보는 점프맵에서 움직이기 --- */
function movePlatform(p, pad, sec) {
  // 웅크리기 (RB 버튼)
  p.crouch = pad.isHeld('crouch') && p.onGround;

  // 달리기 (A 버튼을 꾹 누르고 있으면 빨라져!)
  const speed = pad.isHeld('run') ? RUN_SPEED : WALK_SPEED;

  // 좌우로 움직이기
  if (pad.isHeld('left'))  { p.vx = -speed; p.facing = -1; }
  else if (pad.isHeld('right')) { p.vx =  speed; p.facing =  1; }
  else { p.vx *= FRICTION; }     // 아무것도 안 누르면 스르륵 멈춰

  // 웅크리면 느려져
  if (p.crouch) p.vx *= 0.4;

  // 점프! (X 버튼) — 땅을 밟고 있을 때만 뛸 수 있어
  if (pad.isPressed('jump') && p.onGround) {
    p.vy = -JUMP_POWER;
    p.onGround = false;
    sound.jump();
  }

  // 중력으로 아래로 끌어당기기
  p.vy += GRAVITY;
  if (p.vy > MAX_FALL) p.vy = MAX_FALL;

  const height = p.crouch ? P_H_CROUCH : P_H;

  // --- 좌우로 움직이고 벽에 부딪히는지 확인 ---
  p.x += p.vx;
  for (const plat of sec.platforms) {
    if (hitBox(p, height, plat)) {
      // 오른쪽으로 가다 부딪혔으면 벽 왼쪽에 딱 붙여줘
      if (p.vx > 0) p.x = plat.x - P_W / 2;
      if (p.vx < 0) p.x = plat.x + plat.w + P_W / 2;
      p.vx = 0;
    }
  }

  // --- 위아래로 움직이고 바닥에 부딪히는지 확인 ---
  const wasInAir = !p.onGround;
  p.onGround = false;
  p.y += p.vy;
  for (const plat of sec.platforms) {
    if (hitBox(p, height, plat)) {
      if (p.vy > 0) {                 // 떨어지는 중이었다면 → 바닥에 착지!
        p.y = plat.y;
        p.vy = 0;
        p.onGround = true;
        if (wasInAir) sound.land();
      } else if (p.vy < 0) {          // 올라가는 중이었다면 → 머리를 쿵!
        p.y = plat.y + plat.h + height;
        p.vy = 0;
      }
    }
  }

  // 화면 밖으로 나가지 않게 막기
  if (p.x < P_W / 2) p.x = P_W / 2;
  if (p.x > CANVAS_W - P_W / 2) p.x = CANVAS_W - P_W / 2;

  // 아래로 떨어지면 시작 자리로 되돌려줘 (지는 건 없으니까 다시 하면 돼!)
  if (p.y > CANVAS_H + 100) {
    const i = game.players.indexOf(p);
    const sp = sec.spawns[i] || sec.spawns[0];
    p.x = sp.x; p.y = sp.y; p.vx = 0; p.vy = 0;
    sound.wrong();
  }
}

/* --- 위에서 내려다보는 방에서 움직이기 (중력 없음!) --- */
function moveRoom(p, pad, sec) {
  const speed = pad.isHeld('run') ? RUN_SPEED * 0.8 : WALK_SPEED * 0.9;

  // 네 방향 모두 자유롭게 움직여
  p.vx = 0; p.vy = 0;
  if (pad.isHeld('left'))  { p.vx = -speed; p.facing = -1; }
  if (pad.isHeld('right')) { p.vx =  speed; p.facing =  1; }
  if (pad.isHeld('up'))    { p.vy = -speed; }
  if (pad.isHeld('down'))  { p.vy =  speed; }

  // 대각선으로 갈 때 더 빨라지지 않게 살짝 줄여줘
  if (p.vx !== 0 && p.vy !== 0) { p.vx *= 0.71; p.vy *= 0.71; }

  // 좌우 이동 + 벽 부딪힘
  p.x += p.vx;
  for (const w of sec.walls) {
    if (hitBox(p, P_H, w)) {
      if (p.vx > 0) p.x = w.x - P_W / 2;
      if (p.vx < 0) p.x = w.x + w.w + P_W / 2;
    }
  }

  // 위아래 이동 + 벽 부딪힘
  p.y += p.vy;
  for (const w of sec.walls) {
    if (hitBox(p, P_H, w)) {
      if (p.vy > 0) p.y = w.y;
      if (p.vy < 0) p.y = w.y + w.h + P_H;
    }
  }

  p.onGround = true;    // 방에서는 항상 땅을 밟고 있는 걸로 쳐
}

/* -----------------------------------------------------------
   두 네모가 겹치는지 확인하는 함수 (충돌 검사)

   캐릭터는 '발밑'이 기준이라서
   왼쪽 = x - 너비/2, 위쪽 = y - 키  로 계산해.
   ----------------------------------------------------------- */
function hitBox(p, height, box) {
  const left   = p.x - P_W / 2;
  const right  = p.x + P_W / 2;
  const top    = p.y - height;
  const bottom = p.y;

  return left < box.x + box.w &&
         right > box.x &&
         top < box.y + box.h &&
         bottom > box.y;
}


/* -----------------------------------------------------------
   ⑥ 규칙 확인하기
   ⚠️ 지금은 '연습용 임시 규칙'이야.
      세 친구가 모두 문 앞에 모이면 다음 구역으로 넘어가.
      진짜 규칙(색깔 문, 단서, 비밀번호)은 다음에 만들 거야!
   ----------------------------------------------------------- */
function checkRules() {
  const sec = currentSection();
  const exit = sec.exit;

  // 세 친구가 모두 문에 닿았는지 확인
  let allAtExit = true;
  for (const p of game.players) {
    p.atExit = hitBox(p, P_H, exit);
    if (!p.atExit) allAtExit = false;
  }

  if (allAtExit) nextSection();
}

/* 다음 구역으로 넘어가기 */
function nextSection() {
  sound.door();
  game.sectionIndex++;

  // 이 스테이지의 구역을 다 지났으면 → 클리어!
  if (game.sectionIndex >= currentStage().sections.length) {
    clearStage();
  } else {
    loadSection();
  }
}

/* 스테이지를 다 깼을 때 */
function clearStage() {
  // 별 계산 — 스테이지를 깨면 ⭐1개, 시간 안에 깨면 ⭐2개
  // (⚠️ '시간 안에'가 몇 초인지는 아직 안 정했어. 지금은 임시로 60초!)
  const TIME_LIMIT = 60;
  const earned = game.elapsed <= TIME_LIMIT ? 2 : 1;
  game.stars += earned;

  sound.clear();

  // 끝 화면 꾸미기
  document.getElementById('clearStars').textContent = '⭐'.repeat(earned);
  document.getElementById('clearTime').textContent =
    '걸린 시간 ' + game.elapsed.toFixed(1) + '초';
  document.getElementById('clearSub').textContent =
    earned === 2 ? '시간 안에 해냈어요! 최고예요! 🏆' : '함께 힘을 모아 해냈어요!';

  showScreen('clear');
  startFireworks();
}


/* -----------------------------------------------------------
   ⑦ 그림 그리기 🎨
   ----------------------------------------------------------- */
function draw() {
  const sec = currentSection();
  const stage = currentStage();

  // --- 배경 하늘 ---
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  sky.addColorStop(0, stage.sky[0]);
  sky.addColorStop(1, stage.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // --- 배경에 떠다니는 몽글몽글 구름 ---
  drawClouds();

  // --- 문 그리기 (다음 구역으로 가는 곳) ---
  drawDoor(sec.exit);

  // --- 발판 / 벽 그리기 ---
  const blocks = sec.type === 'platform' ? sec.platforms : sec.walls;
  for (const b of blocks) {
    // 몸통
    ctx.fillStyle = '#d9c6b0';
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    // 윗면에 살짝 밝은 줄 (입체감!)
    ctx.fillStyle = '#efe0cf';
    roundRect(ctx, b.x, b.y, b.w, Math.min(8, b.h), 8);
    ctx.fill();
  }

  // --- 세 친구 그리기 ---
  for (const p of game.players) {
    const isMoving = Math.abs(p.vx) > 0.4 || (sec.type === 'room' && Math.abs(p.vy) > 0.4);
    if (isMoving) p.walk += 1;      // 움직일 때만 걷는 동작이 넘어가

    drawGingerbread(ctx, p.x, p.y, P_H, p.hero, {
      facing: p.facing,
      walk: p.walk,
      moving: isMoving,
      jumping: sec.type === 'platform' && !p.onGround,
      crouch: p.crouch
    });

    // 문 앞에 도착한 친구 머리 위엔 반짝 표시!
    if (p.atExit) drawActiveMark(ctx, p.x, p.y, P_H, p.hero, game.time);
  }

  // --- 안내 글씨 ---
  ctx.fillStyle = 'rgba(90,80,110,.55)';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('세 친구가 모두 문 앞에 모이면 열려요!', CANVAS_W / 2, 34);
  ctx.textAlign = 'left';
}

/* 몽글몽글 구름 그리기 */
function drawClouds() {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 4; i++) {
    // 구름이 천천히 오른쪽으로 흘러가게
    const x = ((game.time * 0.012) + i * 260) % (CANVAS_W + 200) - 100;
    const y = 70 + i * 34;
    ctx.beginPath();
    ctx.arc(x,      y,      26, 0, Math.PI * 2);
    ctx.arc(x + 28, y - 8,  32, 0, Math.PI * 2);
    ctx.arc(x + 60, y,      24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* 문 그리기 🚪 */
function drawDoor(d) {
  // 문틀
  ctx.fillStyle = '#b89a7a';
  roundRect(ctx, d.x - 5, d.y - 5, d.w + 10, d.h + 5, 10);
  ctx.fill();
  // 문짝
  ctx.fillStyle = '#e8c9a0';
  roundRect(ctx, d.x, d.y, d.w, d.h, 8);
  ctx.fill();
  // 손잡이
  ctx.fillStyle = '#8a6f52';
  ctx.beginPath();
  ctx.arc(d.x + d.w - 12, d.y + d.h / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}


/* -----------------------------------------------------------
   ⑧ 게임 루프 — 1초에 60번 반복되는 심장 💓
   ----------------------------------------------------------- */
function loop(now) {
  game.time = now;

  if (game.screen === 'game' && !game.paused) {
    input.update();              // ① 조종기 신호 받기

    const sec = currentSection();
    for (let i = 0; i < game.players.length; i++) {
      const p = game.players[i];
      const pad = input.players[i];
      // ② 캐릭터 움직이기 (구역 종류에 맞는 방법으로)
      if (sec.type === 'platform') movePlatform(p, pad, sec);
      else                         moveRoom(p, pad, sec);
    }

    checkRules();                // 규칙 확인
    draw();                      // ③ 그림 그리기

    // 시간 재기
    game.elapsed = (now - game.startTime) / 1000;
    document.getElementById('timeCount').textContent = game.elapsed.toFixed(1);
    document.getElementById('starCount').textContent = game.stars;

    // 정지·다시하기 버튼 확인
    if (input.players[0].isPressed('pause'))    togglePause();
    if (input.players[0].isPressed('restart'))  startGame();
    if (input.players[0].isPressed('settings')) openOverlay();

    input.endFrame();            // '막 눌림' 표시 지우기
  }

  if (game.screen === 'clear') drawFireworks();

  requestAnimationFrame(loop);   // 다음 장면에도 나를 또 불러줘!
}


/* -----------------------------------------------------------
   ⑨ 화면 아래 '누가 무엇으로 조종하나' 막대
   ----------------------------------------------------------- */
function updatePlayerBar() {
  const bar = document.getElementById('playerBar');
  bar.innerHTML = '';

  HEROES.forEach((hero, i) => {
    const pi = input.players[i];
    const hasPad = pi && pi.padIndex !== null;

    const card = document.createElement('div');
    card.className = 'pcard' + (hasPad ? ' pad' : '');
    card.innerHTML =
      '<span class="dot" style="background:' + hero.color + '"></span>' +
      '<span>' + hero.name + '</span>' +
      '<span class="src">' + (hasPad ? '🕹️ 조종기 ' + (i + 1) + '번' : '⌨️ 키보드') + '</span>';
    bar.appendChild(card);
  });
}
// 조종기를 꽂거나 뺄 때마다 막대를 새로 그려줘
window.addEventListener('gamepadconnected', updatePlayerBar);
window.addEventListener('gamepaddisconnected', updatePlayerBar);
setInterval(() => { if (game.screen === 'game') updatePlayerBar(); }, 1000);


/* -----------------------------------------------------------
   ⑩ 정지 / 설정 창
   ----------------------------------------------------------- */
function togglePause() {
  game.paused = !game.paused;
  document.getElementById('pauseBtn').textContent = game.paused ? '▶️' : '⏸️';
  sound.select();
}

const overlay = document.getElementById('overlay');

function openOverlay() {
  overlay.classList.add('active');
  game.paused = true;
  sound.select();
}
function closeOverlay() {
  overlay.classList.remove('active');
  game.paused = false;
  // 정지 버튼 모양도 되돌려줘
  document.getElementById('pauseBtn').textContent = '⏸️';
}

/* 버튼 안내표를 만들어서 설정 창에 넣어줘 */
function buildGuides() {
  // --- 조종기 버튼 안내 ---
  const padRows = [
    ['방향 스틱', '네 방향으로 움직이기'],
    ['X / ☐',    '점프'],
    ['Y / ▵',    '상호작용 (사물 조사)'],
    ['RB / R1',  '웅크리기'],
    ['LB / L1',  '아이템 사용'],
    ['A / ✕ (꾹)', '달리기'],
    ['B / ○',    '설정'],
    ['RT / R2',  '정지'],
    ['LT / L2',  '다시하기']
  ];
  document.getElementById('padGuide').innerHTML = padRows.map(
    r => '<div class="key-item"><span class="keycap">' + r[0] + '</span>' + r[1] + '</div>'
  ).join('');

  // --- 키보드 안내 ---
  const keyRows = [
    ['W A S D',      '🟢 세은 움직이기'],
    ['Space / E',    '🟢 세은 점프 / 상호작용'],
    ['↑ ↓ ← →',      '🟡 다영 움직이기'],
    ['Enter / /',    '🟡 다영 점프 / 상호작용'],
    ['I J K L',      '🔴 태준 움직이기'],
    ['H / U',        '🔴 태준 점프 / 상호작용'],
    ['Shift (꾹)',   '달리기'],
    ['P / Esc',      '정지'],
    ['R',            '다시하기']
  ];
  document.getElementById('keyGuide').innerHTML = keyRows.map(
    r => '<div class="key-item"><span class="keycap">' + r[0] + '</span>' + r[1] + '</div>'
  ).join('');
}


/* -----------------------------------------------------------
   ⑪ 소리 켜기/끄기
   ----------------------------------------------------------- */
function toggleSound() {
  const on = sound.toggle();
  document.getElementById('soundBtn').textContent = on ? '🔊' : '🔇';
  document.getElementById('soundToggle').textContent = on ? '소리 켜짐 🔊' : '소리 꺼짐 🔇';
  if (on) sound.select();
}


/* -----------------------------------------------------------
   ⑫ 축하 폭죽 🎆
   ----------------------------------------------------------- */
const fwCanvas = document.getElementById('fireworkCanvas');
const fwCtx = fwCanvas.getContext('2d');
let sparks = [];       // 불꽃 조각들이 담기는 곳

function startFireworks() {
  // 화면 크기에 도화지를 맞춰줘
  fwCanvas.width  = window.innerWidth;
  fwCanvas.height = window.innerHeight;
  sparks = [];
  // 폭죽을 여러 번 터뜨려
  for (let i = 0; i < 5; i++) {
    setTimeout(boom, i * 400);
  }
}

/* 폭죽 하나가 펑! 하고 터지는 함수 */
function boom() {
  const cx = Math.random() * fwCanvas.width;
  const cy = Math.random() * fwCanvas.height * 0.55 + 40;
  const colors = ['#ff7a85', '#8fd67f', '#ffd45e', '#cdb4f6', '#7fd8f7'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // 불꽃 조각 40개를 사방으로 뿌려
  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 / 40) * i;
    const speed = 2 + Math.random() * 3.5;
    sparks.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,               // 1에서 0으로 줄어들며 사라져
      color: color
    });
  }
  sound.beep(880 + Math.random() * 300, 0.14, 'triangle', 0.10);
}

function drawFireworks() {
  fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);

  for (const s of sparks) {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.06;          // 불꽃도 중력을 받아 아래로 떨어져
    s.vx *= 0.985;         // 공기 때문에 점점 느려져
    s.life -= 0.012;       // 점점 사라져

    if (s.life <= 0) continue;

    fwCtx.globalAlpha = s.life;
    fwCtx.fillStyle = s.color;
    fwCtx.beginPath();
    fwCtx.arc(s.x, s.y, 3.2, 0, Math.PI * 2);
    fwCtx.fill();
  }
  fwCtx.globalAlpha = 1;

  // 다 사라진 불꽃은 목록에서 지워줘 (안 그러면 점점 느려져!)
  sparks = sparks.filter(s => s.life > 0);
}


/* -----------------------------------------------------------
   ⑬ 시작 화면에 세 친구 그려 넣기
   ----------------------------------------------------------- */
const heroCanvas = document.getElementById('heroCanvas');
const heroCtx = heroCanvas.getContext('2d');

function drawHeroes(now) {
  heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);

  HEROES.forEach((hero, i) => {
    // 세 친구가 번갈아가며 폴짝폴짝 뛰게 만들어
    const bounce = Math.abs(Math.sin(now * 0.003 + i * 0.8)) * 16;
    drawGingerbread(heroCtx, 80 + i * 140, 138 - bounce, 76, hero, {
      facing: 1,
      walk: now * 0.15,
      moving: true,
      jumping: bounce > 10
    });

    // 이름표 달아주기 (그림에 있던 것처럼!)
    heroCtx.save();
    heroCtx.font = 'bold 15px sans-serif';
    heroCtx.textAlign = 'center';
    heroCtx.lineWidth = 4;
    heroCtx.strokeStyle = '#fff';                 // 흰 테두리를 먼저 그리면
    heroCtx.strokeText(hero.name, 80 + i * 140, 20);
    heroCtx.fillStyle = hero.dark;                // 글자가 또렷하게 보여
    heroCtx.fillText(hero.name, 80 + i * 140, 20);
    heroCtx.restore();
  });

  requestAnimationFrame(drawHeroes);
}


/* -----------------------------------------------------------
   ⑭ 버튼들에 '누르면 이렇게 해!' 하고 알려주기
   ----------------------------------------------------------- */
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('settingsBtn').addEventListener('click', () => { sound.wake(); openOverlay(); });
document.getElementById('helpBtn').addEventListener('click', openOverlay);
document.getElementById('closeOverlay').addEventListener('click', closeOverlay);
document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('soundBtn').addEventListener('click', toggleSound);
document.getElementById('soundToggle').addEventListener('click', toggleSound);
document.getElementById('againBtn').addEventListener('click', startGame);
document.getElementById('homeBtn').addEventListener('click', () => {
  sound.select();
  showScreen('start');
});

// 창 크기가 바뀌면 폭죽 도화지도 같이 바꿔줘
window.addEventListener('resize', () => {
  fwCanvas.width  = window.innerWidth;
  fwCanvas.height = window.innerHeight;
});


/* -----------------------------------------------------------
   ⑮ 게임 켜기! 🚀
   ----------------------------------------------------------- */
buildGuides();
requestAnimationFrame(drawHeroes);
requestAnimationFrame(loop);
