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
  time: 0,              // 애니메이션용 시계

  clues: [],            // 📓 지금까지 모은 단서
  toast: '',            // 화면에 잠깐 뜨는 알림 글씨
  toastTime: 0,
  lockOpen: false,      // 🔒 비밀번호 창이 열려 있나?
  typed: '',            // 누른 숫자
  cursor: 0             // 키패드에서 고른 칸
};

// 조작 대장을 만들어 (세은, 다영, 태준 3명)
const input = new InputManager(3);

// 도화지와 붓 준비
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ✨ 반짝이·먼지·물방울을 담는 상자
const fx = new Particles();


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

// 🕳️ 방(위에서 보기)에서 구덩이를 뛰어넘을 때 쓰는 숫자
const JUMP_Z    = 9.6;     // 뛰어오르는 힘
const GRAVITY_Z = 0.52;    // 다시 내려오게 하는 힘


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

  // 단서 수첩을 비우고, 조사했던 표시도 모두 지워
  game.clues = [];
  updateClueBook();
  closeLock();
  for (const stage of STAGES) {
    for (const sec of stage.sections) {
      (sec.objects || []).forEach(o => o.taken = false);
    }
  }

  loadSection();
  showScreen('game');
}

/* 지금 구역의 설계도를 가져오는 도우미 */
function currentStage()   { return STAGES[game.stageIndex]; }
function currentSection() { return currentStage().sections[game.sectionIndex]; }

/* 구역을 불러와서 캐릭터를 시작 위치에 놓아줘 */
function loadSection() {
  const sec = currentSection();

  // 문과 버튼을 모두 '꺼짐' 상태로 되돌려 놔
  // (다시 하기를 눌렀을 때 문이 열린 채로 남아 있으면 안 되니까!)
  (sec.doors   || []).forEach(d => { d.open = false; d.anim = 0; });
  (sec.buttons || []).forEach(b => b.on   = false);
  fx.clear();

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
      atExit: false,        // 출구에 도착했나?
      hurt: 0,              // 방금 다쳤으면 잠깐 깜빡여
      z: 0, vz: 0           // 🕳️ 바닥에서 떠 있는 높이 (구덩이 뛰어넘기용)
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

/* -----------------------------------------------------------
   부딪히는 것들 모으기

   발판·벽 + '아직 닫혀 있는 문'을 합쳐서 돌려줘.
   문이 열리면 목록에서 빠지니까 그냥 지나갈 수 있어!
   ----------------------------------------------------------- */
function getSolids(sec) {
  const base = sec.type === 'platform' ? sec.platforms : sec.walls;
  const closedDoors = (sec.doors || []).filter(d => !d.open);
  return base.concat(closedDoors);
}

/* --- 옆에서 보는 점프맵에서 움직이기 --- */
function movePlatform(p, pad, sec, solids) {
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
  for (const plat of solids) {
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
  for (const plat of solids) {
    if (hitBox(p, height, plat)) {
      if (p.vy > 0) {                 // 떨어지는 중이었다면 → 바닥에 착지!
        p.y = plat.y;
        p.vy = 0;
        p.onGround = true;
        if (wasInAir) { sound.land(); fx.dust(p.x, p.y, 7); }
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
  if (p.y > CANVAS_H + 100) respawn(p, sec);
}

/* 시작 자리로 되돌려 보내는 함수 */
function respawn(p, sec) {
  const i = game.players.indexOf(p);
  const sp = sec.spawns[i] || sec.spawns[0];
  p.x = sp.x; p.y = sp.y; p.vx = 0; p.vy = 0;
  p.z = 0; p.vz = 0;
  p.hurt = 30;              // 잠깐 깜빡이게 표시
  sound.wrong();
}

/* -----------------------------------------------------------
   💧 물웅덩이를 밟았나 확인하기
   공중에 떠 있으면(z > 0) 안 빠져! 뛰어넘는 중이니까 😄
   ----------------------------------------------------------- */
function checkPuddles(sec) {
  if (!sec.puddles) return;
  for (const p of game.players) {
    if (p.z > 0) continue;                 // 공중에 떠 있으면 통과
    if (p.hurt > 0) { p.hurt--; continue; }
    for (const w of sec.puddles) {
      // 발밑(가운데)이 웅덩이 안에 들어갔으면 밟은 거야
      if (p.x > w.x && p.x < w.x + w.w &&
          p.y > w.y && p.y < w.y + w.h) {
        fx.splash(p.x, p.y);            // 촥! 하고 물이 튀어
        respawn(p, sec);
        break;
      }
    }
  }
}

/* --- 위에서 내려다보는 방에서 움직이기 --- */
function moveRoom(p, pad, sec, solids) {
  const speed = pad.isHeld('run') ? RUN_SPEED * 0.8 : WALK_SPEED * 0.9;

  /* 🕳️ 구덩이 뛰어넘기!
     위에서 내려다보는 방에서는 '위아래'가 없으니까
     대신 z 라는 '바닥에서 떠 있는 높이'를 따로 계산해.
     z 가 0보다 크면 공중에 떠 있는 거야 → 구덩이 위를 지나갈 수 있어! */
  if (pad.isPressed('jump') && p.z === 0) {
    p.vz = JUMP_Z;
    sound.jump();
  }
  if (p.z > 0 || p.vz > 0) {
    p.z += p.vz;
    p.vz -= GRAVITY_Z;
    if (p.z <= 0) { p.z = 0; p.vz = 0; sound.land(); fx.dust(p.x, p.y, 6); }
  }

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
  for (const w of solids) {
    if (hitBox(p, P_H, w)) {
      if (p.vx > 0) p.x = w.x - P_W / 2;
      if (p.vx < 0) p.x = w.x + w.w + P_W / 2;
    }
  }

  // 위아래 이동 + 벽 부딪힘
  p.y += p.vy;
  for (const w of solids) {
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
   ⑥ 게임 규칙 확인하기
   ----------------------------------------------------------- */

/* --- 색깔 버튼: 같은 색 친구가 밟고 있나? --- */
function updateButtons(sec) {
  if (!sec.buttons) return;
  for (const b of sec.buttons) {
    // b.color 번 친구(0=세은, 1=다영, 2=태준)만 이 버튼을 누를 수 있어!
    const owner = game.players[b.color];
    const was = b.on;
    b.on = owner ? hitBox(owner, P_H, b) : false;
    // 방금 밟았으면 발밑에서 먼지가 폴폴
    if (b.on && !was) fx.dust(b.x + b.w / 2, b.y + b.h, 8, HEROES[b.color].color);
  }
}

/* --- 색깔 문: 같은 색 버튼이 눌려 있으면 열려 --- */
function updateDoors(sec) {
  if (!sec.doors) return;
  for (const d of sec.doors) {
    let open = false;
    for (const b of (sec.buttons || [])) {
      if (b.color === d.color && b.on) { open = true; break; }
    }

    // 방금 열렸거나 방금 닫혔으면 소리를 내고 반짝여줘
    if (open !== d.open) {
      d.open = open;
      if (open) {
        sound.door();
        fx.sparkle(d.x + d.w / 2, d.y + d.h / 2,
                   HEROES[d.color].color, 16, Math.max(d.w, d.h) * 0.8);
      } else {
        sound.shut();
        fx.dust(d.x + d.w / 2, d.y + d.h, 8, HEROES[d.color].color);
      }
    }

    // 문이 스르륵 열리고 닫히게 하는 숫자 (0=닫힘, 1=열림)
    // 목표 값으로 조금씩 다가가게 만들면 부드러워져!
    const target = open ? 1 : 0;
    if (d.anim === undefined) d.anim = target;
    d.anim += (target - d.anim) * 0.28;
  }
}

/* --- 🪤 장애물(가시)에 닿으면 시작 자리로 --- */
function checkSpikes(sec) {
  if (!sec.spikes) return;
  for (const p of game.players) {
    if (p.hurt > 0) { p.hurt--; continue; }   // 방금 다쳤으면 잠깐 봐줘
    for (const s of sec.spikes) {
      if (hitBox(p, p.crouch ? P_H_CROUCH : P_H, s)) { respawn(p, sec); break; }
    }
  }
}

/* -----------------------------------------------------------
   🔍 사물 조사하기 (기획서 규칙 2번)

   Y버튼(상호작용)을 누르면 가까이 있는 사물을 조사해.
   ⚠️ 사물과 색이 같은 친구만 조사할 수 있어!
      (🟢초록 책장은 세은이만, 🟡노랑 그림은 다영이만…)
   ----------------------------------------------------------- */
function checkInteract(sec) {
  if (!sec.objects && !sec.lock) return;

  for (let i = 0; i < game.players.length; i++) {
    const p   = game.players[i];
    const pad = input.players[i];

    // Y버튼을 '방금 눌렀을' 때만 반응해 (꾹 누르고 있으면 한 번만)
    if (!pad.isPressed('interact')) continue;

    // --- 사물 조사 ---
    let found = false;
    for (const obj of (sec.objects || [])) {
      if (!hitBox(p, P_H, obj)) continue;          // 가까이 있지 않으면 건너뛰어
      found = true;

      // obj.color 가 null 이면 누구나 조사할 수 있어.
      // 숫자(0·1·2)가 적혀 있으면 그 색 친구만 조사할 수 있어.
      if (obj.color !== null && obj.color !== undefined && obj.color !== i) {
        // 색이 다른 친구가 만지면 안 돼!
        showToast(HEROES[obj.color].emoji + ' ' + HEROES[obj.color].name +
                  '이만 조사할 수 있어요!');
        sound.wrong();
        break;
      }

      if (obj.taken) { showToast('이미 조사했어요!'); break; }

      // 단서 획득! 📓
      obj.taken = true;
      game.clues.push({
        icon: obj.icon,
        name: obj.name,
        kind: obj.kind,
        value: obj.value,
        text: obj.text,
        color: obj.color
      });
      sound.clue();
      fx.sparkle(obj.x + obj.w / 2, obj.y + obj.h / 2, '#ffd94a', 18, 40);
      updateClueBook();
      break;
    }

    // --- 🔒 자물쇠 조사 (누구나 열 수 있어) ---
    if (!found && sec.lock && hitBox(p, P_H, sec.lock)) {
      openLock();
    }
  }
}

/* --- 출구: 세 친구가 모두 모이면 다음 구역으로! --- */
function checkExit(sec) {
  let allAtExit = true;
  for (const p of game.players) {
    p.atExit = hitBox(p, P_H, sec.exit);
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
  const stage = currentStage();

  // 별 계산 (기획서 6번)
  //   스테이지를 깨면 ⭐1개, 시간 안에 깨면 ⭐2개
  const limit  = stage.timeLimit || 60;
  const earned = game.elapsed <= limit ? 2 : 1;
  game.stars += earned;

  sound.clear();

  // 다음 스테이지가 남아 있나?
  const hasNext = game.stageIndex + 1 < STAGES.length;

  // 끝 화면 꾸미기
  document.getElementById('clearTitle').textContent =
    hasNext ? stage.name + ' 클리어!' : '탈출 성공!';
  document.getElementById('clearStars').textContent = '⭐'.repeat(earned);
  document.getElementById('clearTime').textContent =
    '걸린 시간 ' + game.elapsed.toFixed(1) + '초  ·  모은 별 ' + game.stars + '개';
  document.getElementById('clearSub').textContent =
    earned === 2 ? '시간 안에 해냈어요! 최고예요! 🏆' : '함께 힘을 모아 해냈어요!';

  // 다음 스테이지가 있으면 '다음' 버튼을 보여줘
  document.getElementById('nextBtn').style.display = hasNext ? '' : 'none';

  showScreen('clear');
  startFireworks();
}

/* 다음 스테이지로 넘어가기 */
function nextStage() {
  game.stageIndex++;
  game.sectionIndex = 0;
  game.startTime = performance.now();
  game.elapsed = 0;

  // 단서 수첩은 스테이지마다 새로 시작해
  game.clues = [];
  updateClueBook();

  loadSection();
  showScreen('game');
  sound.select();
}


/* -----------------------------------------------------------
   ⑦ 그림 그리기 🎨
   ----------------------------------------------------------- */
function draw() {
  const sec = currentSection();
  const stage = currentStage();

  // 이 스테이지의 색깔 꾸미기 정보
  const theme = stage.theme;

  // --- 배경 ---
  // 방(위에서 보기)이면 바닥을, 점프맵(옆에서 보기)이면 하늘을 그려!
  if (sec.type === 'room') {
    ctx.fillStyle = theme.floor || '#f3ece1';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawFloorTiles(theme);          // 바닥에 무늬 깔기
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawDeco(theme);                // 하늘에 구름 등 둥둥 띄우기
  }

  // --- 출구 문 그리기 (다음 구역으로 가는 곳) ---
  if (sec.exit) drawDoor(sec.exit);
  if (sec.exit) drawExitCount(sec.exit);

  // --- 발판 / 벽 그리기 (삐뚤빼뚤 손그림!) ---
  const blocks = sec.type === 'platform' ? sec.platforms : sec.walls;
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = theme.edge;
  ctx.lineJoin = 'round';
  blocks.forEach((b, i) => {
    sloppyFill(ctx,
      () => wobbleRect(ctx, b.x, b.y, b.w, b.h, i * 13 + 7, 3.5),
      theme.block, i * 17 + 3, 2.5);
  });

  // --- 🪟 벽에 뚫린 창문 그리기 (비행기 창문 같은 것!) ---
  if (sec.type === 'room' && theme.windows) drawWindows(theme, sec);

  // --- 💧 물웅덩이 그리기 (바닥이니까 먼저 그려야 아래에 깔려) ---
  (sec.puddles || []).forEach((w, i) => drawPuddle(w, i));

  // --- 🪤 가시 그리기 ---
  (sec.spikes || []).forEach((s, i) => drawSpikes(s, i));

  // --- 🔗 버튼과 문을 잇는 점선 (어떤 버튼이 어떤 문을 여는지!) ---
  drawLinks(sec);

  // --- 색깔 버튼 그리기 ---
  (sec.buttons || []).forEach((b, i) => drawColorButton(b, i));

  // --- 색깔 문 그리기 ---
  (sec.doors || []).forEach((d, i) => drawColorDoor(d, i));

  // --- 🔍 조사할 사물 그리기 ---
  (sec.objects || []).forEach((o, i) => drawObject(o, i));

  // --- 🔒 자물쇠 그리기 ---
  if (sec.lock) drawLock(sec.lock);

  // --- 세 친구 그리기 ---
  for (const p of game.players) {
    const isMoving = Math.abs(p.vx) > 0.4 || (sec.type === 'room' && Math.abs(p.vy) > 0.4);
    if (isMoving) p.walk += 1;      // 움직일 때만 걷는 동작이 넘어가

    // 가시에 닿은 직후엔 깜빡깜빡 (다쳤다는 표시)
    ctx.globalAlpha = (p.hurt > 0 && Math.floor(p.hurt / 4) % 2 === 0) ? 0.35 : 1;

    drawGingerbread(ctx, p.x, p.y, P_H, p.hero, {
      facing: p.facing,
      walk: p.walk,
      moving: isMoving,
      jumping: (sec.type === 'platform' && !p.onGround) || p.z > 0,
      crouch: p.crouch,
      z: p.z                       // 🕳️ 공중에 떠 있으면 몸이 위로 올라가
    });

    // 머리 위에 이름표 — 누가 누군지 항상 알 수 있게!
    drawNameTag(p);

    // 출구에 도착한 친구 머리 위엔 반짝 표시!
    if (p.atExit) drawActiveMark(ctx, p.x, p.y - p.z, P_H, p.hero, game.time);
  }
  ctx.globalAlpha = 1;

  // --- ✨ 반짝이·먼지·물방울 그리기 (캐릭터 위에 겹쳐서) ---
  fx.draw(ctx);

  // --- 안내 글씨 ---
  ctx.fillStyle = 'rgba(90,80,110,.6)';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  if (sec.lock) {
    ctx.fillText('사물을 조사해 단서를 모으고, 🔒자물쇠에 비밀번호를 넣으세요!', CANVAS_W / 2, 30);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('사물 가까이에서 Y버튼(상호작용)을 누르세요', CANVAS_W / 2, 50);
  } else {
    ctx.fillText('같은 색 친구가 같은 색 버튼을 밟고 있어야 문이 열려요!', CANVAS_W / 2, 30);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('셋이 모두 🚪출구에 모이면 다음 구역으로!', CANVAS_W / 2, 50);
  }

  // --- 💬 잠깐 뜨는 알림 글씨 ---
  if (game.toastTime > 0) {
    game.toastTime--;
    ctx.globalAlpha = Math.min(1, game.toastTime / 20);   // 사라질 때 스르륵
    ctx.fillStyle = 'rgba(60,50,80,.88)';
    const w = ctx.measureText(game.toast).width + 44;
    roundRect(ctx, CANVAS_W / 2 - w / 2, CANVAS_H / 2 - 26, w, 46, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(game.toast, CANVAS_W / 2, CANVAS_H / 2 + 3);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'left';
}

/* -----------------------------------------------------------
   방 바닥에 무늬 깔기 (위에서 내려다볼 때)
   반듯한 타일이 아니라 삐뚤빼뚤한 손그림 격자야!
   ----------------------------------------------------------- */
function drawFloorTiles(theme) {
  ctx.save();
  ctx.strokeStyle = theme.tile || 'rgba(160,140,115,.22)';
  ctx.lineWidth = 2;

  const SIZE = 60;                        // 타일 한 칸 크기
  for (let x = 0; x <= CANVAS_W; x += SIZE) {
    wobbleLine(ctx, x, 0, x, CANVAS_H, x, 4);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += SIZE) {
    wobbleLine(ctx, 0, y, CANVAS_W, y, y + 500, 4);
    ctx.stroke();
  }
  ctx.restore();
}


/* -----------------------------------------------------------
   배경 꾸미기 그림 그리기
   스테이지마다 다른 그림이 둥둥 떠다녀!
     들판이면 ☁️구름, 바닷속이면 🐠물고기, 우주선이면 ⭐별…
   ----------------------------------------------------------- */
function drawDeco(theme) {
  const deco = theme.deco || ['☁️'];
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 6; i++) {
    const icon = deco[i % deco.length];
    // 천천히 오른쪽으로 흘러가게 (스테이지마다 속도가 조금씩 달라)
    const speed = 0.010 + (i % 3) * 0.004;
    const x = ((game.time * speed) + i * 190) % (CANVAS_W + 160) - 80;
    const y = 70 + (i % 4) * 62 + Math.sin(game.time * 0.001 + i) * 10;

    ctx.font = (26 + (i % 3) * 10) + 'px sans-serif';
    ctx.fillText(icon, x, y);
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/* -----------------------------------------------------------
   🪟 창문 그리기 — 비행기 창문처럼 동그란 창문!
   창밖으로 하늘과 구름이 천천히 흘러가는 게 보여 ✈️
   ----------------------------------------------------------- */
function drawWindows(theme, sec) {
  const w = theme.windows;
  const R = 17;                                   // 창문 크기

  // 창문은 '위쪽 벽' 위에만 그려야 해.
  // roomWalls 가 만든 벽 중 첫 번째가 위쪽 벽이야!
  const top = sec.walls[0];
  if (!top) return;

  // 벽 길이를 창문 개수만큼 똑같이 나눠
  const gap = top.w / (w.count + 1);
  const cy  = top.y + top.h / 2;                  // 벽 한가운데 높이

  for (let i = 1; i <= w.count; i++) {
    const cx = top.x + gap * i;

    ctx.save();

    // ① 창문 모양으로 오려내기
    //    clip 은 '이 모양 안에만 그려라' 하고 정해주는 거야.
    //    그래야 하늘이 창문 밖으로 삐져나가지 않아!
    wobbleCircle(ctx, cx, cy, R, i * 17 + 601, 0.10);
    ctx.clip();

    // ② 창밖 하늘
    const sky = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    // ③ 창밖으로 흘러가는 구름 (창문마다 속도가 조금씩 달라)
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    const speed = 0.020 + (i % 3) * 0.007;
    const cloudX = cx - R + ((game.time * speed + i * 40) % (R * 2 + 26));
    wobbleCircle(ctx, cloudX,     cy + 3, 8, i * 5 + 611, 0.25); ctx.fill();
    wobbleCircle(ctx, cloudX + 9, cy - 2, 10, i * 5 + 613, 0.25); ctx.fill();

    ctx.restore();

    // ④ 창틀 (동그란 테두리)
    ctx.save();
    ctx.lineWidth   = 5;
    ctx.strokeStyle = theme.edge;
    wobbleCircle(ctx, cx, cy, R, i * 17 + 601, 0.10);
    ctx.stroke();
    ctx.restore();
  }
}


/* -----------------------------------------------------------
   💧 물웅덩이 그리기 — 바닥에 고인 찰랑찰랑한 물
   ----------------------------------------------------------- */
function drawPuddle(w, seed) {
  const cx = w.x + w.w / 2;
  const cy = w.y + w.h / 2;

  ctx.save();
  ctx.lineWidth   = 3.5;
  ctx.strokeStyle = '#4a9fc4';
  ctx.lineJoin    = 'round';

  // 웅덩이는 동그란 모양이라 wobbleCircle 을 눌러서 타원처럼 만들어
  // scale 로 가로세로를 다르게 늘리면 납작한 동그라미가 돼!
  ctx.translate(cx, cy);
  ctx.scale(1, w.h / w.w);

  // 물 (파란 얼룩)
  sloppyFill(ctx,
    () => wobbleCircle(ctx, 0, 0, w.w / 2, seed * 71 + 3, 0.18),
    '#8fd4ee', seed * 73 + 5, 3);

  // 물 위에 반짝이는 하얀 무늬
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  wobbleCircle(ctx, -w.w * 0.14, -w.w * 0.10, w.w * 0.13, seed * 77 + 2, 0.35);
  ctx.fill();
  wobbleCircle(ctx,  w.w * 0.16,  w.w * 0.08, w.w * 0.08, seed * 83 + 4, 0.35);
  ctx.fill();

  ctx.restore();
}


/* -----------------------------------------------------------
   🪤 가시 그리기 — 삐뚤빼뚤한 삼각형을 줄줄이
   ----------------------------------------------------------- */
function drawSpikes(s, seed) {
  ctx.save();
  ctx.fillStyle   = '#b0b6c2';
  ctx.strokeStyle = '#5c6472';
  ctx.lineWidth   = 3;
  ctx.lineJoin    = 'round';

  const count = Math.max(2, Math.round(s.w / 22));   // 가시 개수
  const step  = s.w / count;

  for (let i = 0; i < count; i++) {
    const x = s.x + step * i;
    ctx.beginPath();
    ctx.moveTo(x + wob(seed + i) * 2,             s.y + s.h);
    ctx.lineTo(x + step / 2 + wob(seed + i + 3) * 3, s.y + wob(seed + i + 5) * 4);
    ctx.lineTo(x + step + wob(seed + i + 7) * 2,  s.y + s.h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}


/* 색을 연하게 만들어주는 도우미.
   흰색을 섞은 것처럼 보이게 해서 '아직 안 눌림'을 표시해. */
function lighten(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // 흰색(255)에 65% 가까이 섞어
  const mix = (c) => Math.round(c + (255 - c) * 0.65);
  return 'rgb(' + mix(r) + ',' + mix(g) + ',' + mix(b) + ')';
}


/* -----------------------------------------------------------
   색깔 버튼 그리기 🔘
   같은 색 친구가 밟으면 쑥 들어가면서 반짝여!
   ----------------------------------------------------------- */
function drawColorButton(b, seed) {
  const hero = HEROES[b.color];
  ctx.save();
  ctx.lineWidth   = 3.5;
  ctx.strokeStyle = hero.dark;
  ctx.lineJoin    = 'round';

  // 눌리면 살짝 아래로 내려가고 납작해져
  const press = b.on ? 4 : 0;

  sloppyFill(ctx,
    () => wobbleRect(ctx, b.x, b.y + press, b.w, b.h - press * 0.5, seed * 31 + 1, 3),
    b.on ? hero.color : lighten(hero.color), seed * 37 + 2, 2);

  // 눌려 있으면 위로 반짝반짝 올라가는 표시
  if (b.on) {
    ctx.globalAlpha = 0.55 + Math.sin(game.time * 0.012) * 0.35;
    ctx.fillStyle = hero.color;
    for (let i = 0; i < 3; i++) {
      wobbleCircle(ctx, b.x + b.w * (0.25 + i * 0.25), b.y - 14 - i * 3, 4,
                   seed + i * 9, 0.4);
      ctx.fill();
    }
  }
  ctx.restore();
}


/* -----------------------------------------------------------
   색깔 문 그리기 🚪
   닫혀 있으면 꽉 막힌 색 문, 열리면 문틀만 남아
   ----------------------------------------------------------- */
function drawColorDoor(d, seed) {
  const hero = HEROES[d.color];
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.lineJoin  = 'round';

  // anim: 0이면 완전히 닫힘, 1이면 완전히 열림.
  // 그 사이 값이면 '열리는 중'이라 문이 스르륵 움직여!
  const anim = d.anim === undefined ? (d.open ? 1 : 0) : d.anim;

  // ① 문틀 — 항상 점선으로 남아 있어서 여기가 문이라는 걸 알려줘
  ctx.globalAlpha = 0.4;
  ctx.setLineDash([8, 7]);
  ctx.strokeStyle = hero.dark;
  wobbleRect(ctx, d.x, d.y, d.w, d.h, seed * 41 + 5, 3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // ② 문짝 — 셔터처럼 위로 쏙 올라가면서 열려
  const open = 1 - anim;                 // 남아 있는 문짝의 길이 비율
  if (open > 0.02) {
    ctx.save();

    // 문틀 안에서만 그리게 오려내기 (문짝이 밖으로 삐져나가지 않게!)
    ctx.beginPath();
    ctx.rect(d.x - 3, d.y - 3, d.w + 6, d.h + 6);
    ctx.clip();

    // 세로로 긴 문은 위로, 가로로 긴 문은 옆으로 밀려나
    const vertical = d.h >= d.w;
    const shift = vertical ? -d.h * anim : -d.w * anim;
    ctx.translate(vertical ? 0 : shift, vertical ? shift : 0);

    ctx.strokeStyle = hero.dark;
    ctx.lineWidth = 3.5;
    sloppyFill(ctx,
      () => wobbleRect(ctx, d.x, d.y, d.w, d.h, seed * 41 + 5, 3),
      hero.color, seed * 43 + 6, 2);

    // 문에 빗금 무늬를 그어서 '막혔다'는 느낌을 줘
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.45;
    const lines = vertical ? 4 : 3;
    for (let i = 1; i < lines; i++) {
      if (vertical) {
        const yy = d.y + (d.h / lines) * i;
        wobbleLine(ctx, d.x + 4, yy, d.x + d.w - 4, yy, seed * 7 + i, 3);
      } else {
        const xx = d.x + (d.w / lines) * i;
        wobbleLine(ctx, xx, d.y + 4, xx, d.y + d.h - 4, seed * 7 + i, 3);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}


/* -----------------------------------------------------------
   🔗 버튼과 문을 잇는 반짝이는 점선

   "이 버튼이 저 문을 여는구나!" 를 한눈에 알 수 있게 해줘.
   퍼즐을 이해하는 데 가장 큰 도움이 되는 부분이야 😊
   ----------------------------------------------------------- */
function drawLinks(sec) {
  if (!sec.buttons || !sec.doors) return;

  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (const b of sec.buttons) {
    for (const d of sec.doors) {
      if (d.color !== b.color) continue;

      const hero = HEROES[b.color];
      // 밟고 있으면 진하고 또렷하게, 아니면 아주 흐릿하게
      ctx.globalAlpha = b.on ? 0.75 : 0.18;
      ctx.strokeStyle = hero.dark;

      // 점선이 문 쪽으로 또르르 흘러가는 효과
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = b.on ? -(game.time * 0.06) % 20 : 0;

      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y + b.h / 2);
      ctx.lineTo(d.x + d.w / 2, d.y + d.h / 2);
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);
  ctx.restore();
}


/* -----------------------------------------------------------
   🔍 조사할 사물 그리기
   색 테두리 = 그 색 친구만 조사할 수 있다는 뜻!
   ----------------------------------------------------------- */
function drawObject(o, seed) {
  const hero = (o.color === null || o.color === undefined) ? null : HEROES[o.color];
  ctx.save();
  ctx.lineWidth   = 4;
  ctx.strokeStyle = hero ? hero.dark : '#8a7f6a';
  ctx.lineJoin    = 'round';

  // 이미 조사한 사물은 흐릿해져
  ctx.globalAlpha = o.taken ? 0.4 : 1;

  sloppyFill(ctx,
    () => wobbleRect(ctx, o.x, o.y, o.w, o.h, seed * 61 + 9, 3.5),
    hero ? hero.color : '#efe7dc', seed * 67 + 4, 2.5);

  // 사물 그림(이모지)
  ctx.font = '34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.icon, o.x + o.w / 2, o.y + o.h / 2 + 2);

  // 아직 안 조사했으면 머리 위에 '!' 가 통통 떠 있어
  if (!o.taken) {
    const bob = Math.sin(game.time * 0.006 + seed) * 4;
    ctx.font = 'bold 26px sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fff';
    ctx.strokeText('!', o.x + o.w / 2, o.y - 16 + bob);
    ctx.fillStyle = hero ? hero.dark : '#8a7f6a';
    ctx.fillText('!', o.x + o.w / 2, o.y - 16 + bob);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}


/* -----------------------------------------------------------
   🔒 비밀번호 자물쇠 그리기
   ----------------------------------------------------------- */
function drawLock(L) {
  ctx.save();
  ctx.lineWidth   = 4;
  ctx.strokeStyle = '#5a5266';
  ctx.lineJoin    = 'round';

  sloppyFill(ctx,
    () => wobbleRect(ctx, L.x, L.y, L.w, L.h, 501, 3.5),
    '#cfc6dd', 505, 2.5);

  ctx.font = '38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔒', L.x + L.w / 2, L.y + L.h / 2);

  // 반짝반짝 안내
  const bob = Math.sin(game.time * 0.006) * 4;
  ctx.font = 'bold 13px sans-serif';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fff';
  ctx.strokeText('Y버튼', L.x + L.w / 2, L.y - 14 + bob);
  ctx.fillStyle = '#5a5266';
  ctx.fillText('Y버튼', L.x + L.w / 2, L.y - 14 + bob);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}


/* 대충 그린 문 🚪 */
function drawDoor(d) {
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineJoin = 'round';

  // 문짝
  sloppyFill(ctx,
    () => wobbleRect(ctx, d.x, d.y, d.w, d.h, 301, 3),
    '#e8c9a0', 305, 2.5);

  // 손잡이 (삐뚤빼뚤 동그라미)
  ctx.fillStyle = '#7a5a3a';
  wobbleCircle(ctx, d.x + d.w - 12, d.y + d.h / 2, 4.5, 311, 0.4);
  ctx.fill();
  ctx.restore();
}


/* -----------------------------------------------------------
   ⑧ 게임 루프 — 1초에 60번 반복되는 심장 💓
   ----------------------------------------------------------- */
function loop(now) {
  game.time = now;
  updateDoodleSeed(now);        // 손그림이 보글보글 꿈틀거리게

  // 🔒 비밀번호 창이 열려 있으면, 캐릭터는 멈추고 키패드만 움직여
  if (game.screen === 'game' && game.lockOpen) {
    input.update();
    updateLockInput();
    input.endFrame();
  }

  if (game.screen === 'game' && !game.paused) {
    input.update();              // ① 조종기 신호 받기

    const sec = currentSection();

    // ② 버튼과 문 상태를 먼저 확인해
    //    (움직이기 전에 해야 열린 문을 제대로 통과할 수 있어!)
    updateButtons(sec);
    updateDoors(sec);
    const solids = getSolids(sec);

    // ③ 캐릭터 움직이기 (구역 종류에 맞는 방법으로)
    for (let i = 0; i < game.players.length; i++) {
      const p = game.players[i];
      const pad = input.players[i];
      if (sec.type === 'platform') movePlatform(p, pad, sec, solids);
      else                         moveRoom(p, pad, sec, solids);
    }

    fx.update();                 // ✨ 반짝이 조각들 움직이기
    checkSpikes(sec);            // 가시에 닿았나?
    checkPuddles(sec);           // 💧 물웅덩이를 밟았나?
    checkInteract(sec);          // Y버튼으로 사물을 조사했나?
    if (sec.exit) checkExit(sec);// 셋이 출구에 모였나?
    draw();                      // ④ 그림 그리기

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
   📓 단서 수첩 — 모은 단서를 화면 아래에 보여줘
   ----------------------------------------------------------- */
function updateClueBook() {
  const box = document.getElementById('clueBook');
  box.innerHTML = game.clues.map(c => {
    if (c.kind === 'number') {
      return '<div class="clue">' + c.icon + ' ' + c.name +
             ' <span class="num">' + c.value + '</span></div>';
    }
    return '<div class="clue hint">' + c.icon + ' ' + c.text + '</div>';
  }).join('');
}

/* -----------------------------------------------------------
   💬 화면 가운데에 잠깐 떴다 사라지는 알림 글씨
   ----------------------------------------------------------- */
function showToast(text) {
  game.toast = text;
  game.toastTime = 90;      // 약 1.5초 동안 보여줘
}


/* -----------------------------------------------------------
   🔒 비밀번호 자물쇠 (기획서 규칙 4번)
   ----------------------------------------------------------- */
const lockOverlay = document.getElementById('lockOverlay');

// 키패드에 들어갈 것들 (3칸씩 4줄)
const KEYPAD = ['1','2','3', '4','5','6', '7','8','9', '←','0','✓'];

function openLock() {
  if (game.lockOpen) return;
  game.lockOpen = true;
  game.typed = '';           // 지금까지 누른 숫자
  game.cursor = 0;           // 스틱으로 고른 칸 번호
  game.paused = true;
  lockOverlay.classList.add('active');
  buildKeypad();
  drawPassword();
  sound.select();
}

function closeLock() {
  game.lockOpen = false;
  game.paused = false;
  lockOverlay.classList.remove('active');
}

/* 키패드 버튼 12개를 만들어 넣어줘 */
function buildKeypad() {
  const pad = document.getElementById('keypad');
  pad.innerHTML = KEYPAD.map((k, i) =>
    '<button class="key' + (k.length > 1 || k === '←' || k === '✓' ? ' wide' : '') +
    '" data-i="' + i + '">' + k + '</button>'
  ).join('');

  // 마우스로 눌러도 되게 해줘
  pad.querySelectorAll('.key').forEach(btn => {
    btn.addEventListener('click', () => pressKey(Number(btn.dataset.i)));
  });
  drawCursor();
}

/* 스틱으로 고른 칸에 노란 테두리 표시 */
function drawCursor() {
  document.querySelectorAll('#keypad .key').forEach((b, i) => {
    b.classList.toggle('cursor', i === game.cursor);
  });
}

/* 누른 숫자를 네모 칸에 보여줘 */
function drawPassword() {
  const d = document.getElementById('pwDisplay');
  let html = '';
  for (let i = 0; i < 4; i++) {
    const ch = game.typed[i];
    html += '<div class="pw-slot' + (ch ? ' filled' : '') + '">' + (ch || '') + '</div>';
  }
  d.innerHTML = html;
}

/* 키패드 칸 하나를 눌렀을 때 */
function pressKey(i) {
  const k = KEYPAD[i];

  if (k === '←') {                       // 지우기
    game.typed = game.typed.slice(0, -1);
    sound.select();
  } else if (k === '✓') {                // 확인!
    submitPassword();
    return;
  } else if (game.typed.length < 4) {    // 숫자 넣기
    game.typed += k;
    sound.beep(500 + Number(k) * 40, 0.07, 'square', 0.12);
  }
  drawPassword();
}

/* 비밀번호가 맞는지 확인 */
function submitPassword() {
  const sec = currentSection();

  if (game.typed === sec.password) {
    closeLock();
    clearStage();                        // 탈출 성공! 🎉
  } else {
    // 틀리면 창이 부르르 떨려
    const box = document.querySelector('.lock-box');
    box.classList.add('shake');
    setTimeout(() => box.classList.remove('shake'), 420);
    game.typed = '';
    drawPassword();
    sound.wrong();
  }
}

/* 자물쇠 창에서 조종기·키보드로 움직이기 */
function updateLockInput() {
  for (const pad of input.players) {
    // 세 명 중 누가 움직여도 커서가 움직여 (같이 의논하며 누르라고!)
    if (pad.isPressed('left'))  { game.cursor = (game.cursor + 11) % 12; drawCursor(); sound.select(); }
    if (pad.isPressed('right')) { game.cursor = (game.cursor + 1)  % 12; drawCursor(); sound.select(); }
    if (pad.isPressed('up'))    { game.cursor = (game.cursor + 9)  % 12; drawCursor(); sound.select(); }
    if (pad.isPressed('down'))  { game.cursor = (game.cursor + 3)  % 12; drawCursor(); sound.select(); }
    if (pad.isPressed('interact') || pad.isPressed('jump')) pressKey(game.cursor);
    if (pad.isPressed('pause')) closeLock();
  }
}

document.getElementById('lockClose').addEventListener('click', closeLock);


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
  updateDoodleSeed(now);
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
document.getElementById('nextBtn').addEventListener('click', nextStage);
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


/* -----------------------------------------------------------
   🏷️ 캐릭터 머리 위 이름표
   셋이 같이 노는 게임이라 누가 누군지 바로 보여야 해!
   ----------------------------------------------------------- */
function drawNameTag(p) {
  const y = p.y - p.z - P_H - 14;      // 머리 위쪽 (공중에 떠 있으면 같이 올라가)

  ctx.save();
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';

  // 흰 테두리를 먼저 굵게 그리면 어떤 배경에서도 또렷하게 보여
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.strokeText(p.hero.name, p.x, y);

  ctx.fillStyle = p.hero.dark;
  ctx.fillText(p.hero.name, p.x, y);

  ctx.textAlign = 'left';
  ctx.restore();
}


/* -----------------------------------------------------------
   🚪 출구에 몇 명이 모였는지 보여주기 (예: 2/3)
   ----------------------------------------------------------- */
function drawExitCount(exit) {
  const here = game.players.filter(p => p.atExit).length;
  const all  = game.players.length;
  const done = here === all;

  const cx = exit.x + exit.w / 2;
  const cy = exit.y - 22;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 다 모이면 통통 튀어올라
  const bounce = done ? Math.abs(Math.sin(game.time * 0.008)) * 5 : 0;

  // 동그란 알약 배경
  ctx.fillStyle = done ? '#7fd67f' : 'rgba(255,255,255,.92)';
  ctx.strokeStyle = done ? '#4d7a2a' : '#8a7f6a';
  ctx.lineWidth = 3;
  wobbleRect(ctx, cx - 24, cy - 13 - bounce, 48, 26, 701, 2.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = done ? '#fff' : '#6b6178';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(here + ' / ' + all, cx, cy - bounce + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
