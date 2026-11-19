/* ===========================================================
   ending.js — 🎬 엔딩 이야기
   -----------------------------------------------------------
   학생들 요청: "엔딩 이야기 넣어!"
   기획서 스토리: "싸우기만 하고 협력이 안 되는 친구들에게
                   마법사는 협력게임 세상에 세 친구를 가두어 버렸다…"
   → 마지막 스테이지를 탈출하면, 마법사가 나타나서 세 친구를 풀어줘!

   ✏️ 이야기를 바꾸고 싶으면 아래 ENDING 의 글자만 고치면 돼.
      who: 'wizard' = 마법사가 말해요
           0 / 1 / 2 = 세은 / 다영 / 태준이 말해요
           'all'    = 셋이 다 같이
           null     = 해설 (이야기 들려주는 사람)
   =========================================================== */
const ENDING = [
  { who: null,     text: '마지막 비밀번호가 풀리자,\n우주선 가득 눈부신 빛이 쏟아졌어요…', glow: true },
  { who: 'wizard', text: '허허, 드디어 왔구나.\n싸우기만 하던 녀석들이 여기까지 오다니!' },
  { who: 'wizard', text: '비행기에서도, 폐교에서도, 우주선에서도\n너희는 서로 버튼을 밟아 주고, 문제를 함께 풀었지.' },
  { who: 0,        text: '혼자였으면 문 하나도 못 열었을 거야!' },
  { who: 1,        text: '내가 버튼을 밟고 있을 때 너희가 지나갔잖아!' },
  { who: 2,        text: '셋이 같이 숫자 칸을 밟아야 발판이 생겼지!' },
  { who: 'wizard', text: '그래, 그게 바로 협력이란다.\n이제 너희는 진짜 한 팀이야. 원래 세상으로 돌려보내 주마!' },
  { who: 'all',    text: '✨ 펑! ✨\n세 친구는 무사히 집으로 돌아왔어요.', jump: true },
  { who: 'all',    text: '함께하면 무엇이든 할 수 있어!\n— 우리 함께 GO! —', jump: true, end: true }
];

const endCanvas = document.getElementById('endingCanvas');
const endCtx = endCanvas.getContext('2d');
let endScene = 0;          // 지금 몇 번째 장면인지
let endStart = 0;          // 이 장면이 시작된 시각 (글자가 한 글자씩 나오게)
const endSparks = [];      // 반짝이 조각들

/* 엔딩 시작! */
function startEnding() {
  endScene = 0;
  endStart = performance.now();
  showScreen('ending');
  sound.music('ending');
  showEndScene();
  requestAnimationFrame(drawEnding);
}

/* 장면 글자와 버튼 바꾸기 */
function showEndScene() {
  const sc = ENDING[endScene];
  const who = sc.who === 'wizard' ? '🧙 마법사'
            : sc.who === 'all'    ? '🟢🟡🔴 다 같이'
            : sc.who === null     ? ''
            : HEROES[sc.who].emoji + ' ' + HEROES[sc.who].name;
  document.getElementById('endWho').textContent = who;
  document.getElementById('endText').innerHTML = sc.text.replace(/\n/g, '<br>');

  // 마지막 장면이면 점수와 '처음부터 / 시작 화면' 버튼을 보여줘
  const last = !!sc.end;
  document.getElementById('endNext').style.display  = last ? 'none' : '';
  document.getElementById('endAgain').style.display = last ? '' : 'none';
  document.getElementById('endHome').style.display  = last ? '' : 'none';
  document.getElementById('endStats').style.display = last ? '' : 'none';
  if (last) {
    document.getElementById('endStats').innerHTML =
      '⭐ 모은 별 <b>' + game.stars + '개</b> (최고 ' + STAGES.length * 2 + '개)' +
      '  ·  ⏱ 모두 합친 시간 <b>' + formatTime(game.totalTime || 0) + '</b>' +
      '<br><small>만든 사람: 원팀 김세은 · 강다영 · 황태준</small>';
  }
  menuIndex = 0;
  setTimeout(paintMenuCursor, 0);
  if (sc.jump) sound.clear(); else sound.select();
}

function nextEndScene() {
  if (endScene < ENDING.length - 1) {
    endScene++;
    endStart = performance.now();
    showEndScene();
  }
}

document.getElementById('endNext').addEventListener('click', nextEndScene);
document.getElementById('endAgain').addEventListener('click', startGame);
document.getElementById('endHome').addEventListener('click', () => showScreen('start'));
document.getElementById('endingBtn').addEventListener('click', startEnding);


/* ===========================================================
   🎨 엔딩 그림 그리기 (1초에 60번)
   =========================================================== */
function drawEnding(now) {
  if (game.screen !== 'ending') return;
  requestAnimationFrame(drawEnding);
  updateDoodleSeed(now);

  const c = endCtx, W = 960, H = 540;
  const sc = ENDING[endScene];
  const t = (now - endStart) / 1000;

  // --- 밤하늘 배경 + 반짝이는 별 ---
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2a1d5c');
  sky.addColorStop(1, '#5b3f8f');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(now * 0.001 + i));
    c.fillStyle = i % 7 === 0 ? '#ffe27a' : '#ffffff';
    c.fillRect((i * 151) % W, (i * 89) % 330, 3, 3);
  }
  c.globalAlpha = 1;

  // --- 마법 구름 바닥 ---
  c.fillStyle = '#8a6fc4';
  c.beginPath();
  c.ellipse(W / 2, H + 60, W * 0.75, 170, 0, 0, Math.PI * 2);
  c.fill();

  // --- 🧙 마법사 (왼쪽, 둥실둥실) ---
  const wizSpeak = sc.who === 'wizard';
  const wy = 360 + Math.sin(now * 0.002) * 10 - (wizSpeak ? Math.abs(Math.sin(now * 0.008)) * 8 : 0);
  drawWizard(c, 230, wy, 230, now);

  // --- 🍪 세 친구 (오른쪽) ---
  HEROES.forEach((hero, i) => {
    const x = 560 + i * 130;
    const speaking = sc.who === i || sc.who === 'all';
    const jump = sc.jump ? Math.abs(Math.sin(now * 0.006 + i * 0.9)) * 50
               : speaking ? Math.abs(Math.sin(now * 0.008)) * 12 : 0;
    drawGingerbread(c, x, 430 - jump, 150, hero, { facing: -1, moving: speaking, walk: now * 0.1, jumping: jump > 20 });
    c.font = 'bold 22px sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 6; c.strokeStyle = '#2a1d5c'; c.strokeText(hero.name, x, 470);
    c.fillStyle = hero.color; c.fillText(hero.name, x, 470);
  });

  // --- ✨ 반짝이 (펑! 장면에서는 잔뜩) ---
  const rate = sc.jump ? 6 : 1;
  for (let k = 0; k < rate; k++) {
    endSparks.push({ x: Math.random() * W, y: H * 0.2 + Math.random() * 200, vx: (Math.random() - 0.5) * 3,
                     vy: -1 - Math.random() * 2, life: 60, color: ['#ffe27a', '#9fdc6b', '#ffd94a', '#ff7f7f', '#bfe6ff'][k % 5] });
  }
  for (let i = endSparks.length - 1; i >= 0; i--) {
    const s = endSparks[i];
    s.x += s.vx; s.y += s.vy; s.vy += 0.03; s.life--;
    if (s.life <= 0) { endSparks.splice(i, 1); continue; }
    c.globalAlpha = s.life / 60;
    c.fillStyle = s.color;
    c.fillRect(s.x, s.y, 4, 4);
  }
  c.globalAlpha = 1;

  // --- 첫 장면: 눈부신 빛이 쏟아져 (하얗게 번쩍 → 스르륵) ---
  if (sc.glow) {
    c.globalAlpha = Math.max(0, 1 - t * 0.7);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
  }

  // --- 마지막 장면: 큰 글씨 THE END ---
  if (sc.end) {
    c.font = 'bold 64px sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 10; c.strokeStyle = '#2a1d5c';
    c.strokeText('THE END', W / 2, 110);
    c.fillStyle = '#ffe27a';
    c.fillText('THE END', W / 2, 110);
  }
}

/* -----------------------------------------------------------
   🧙 하찮은 마법사 그리기
   images/wizard.png 를 넣으면 우리가 그린 마법사로 바뀌어!
   x, y = 발 가운데 / size = 키
   ----------------------------------------------------------- */
function drawWizard(c, x, y, size, now) {
  const art = skin('wizard.png');
  if (art) {
    const h = size, w = h * art.width / art.height;
    c.drawImage(art, x - w / 2, y - h, w, h);
    return;
  }
  const s = size / 230;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.lineWidth = 4;
  c.strokeStyle = '#2a1d5c';
  c.lineJoin = 'round';

  // 망토 (보라색 세모)
  sloppyFill(c, () => { c.beginPath(); c.moveTo(-70, 0); c.lineTo(70, 0); c.lineTo(20, -130); c.lineTo(-20, -130); c.closePath(); },
             '#7a4fc4', 901, 3);
  // 망토의 별 무늬
  c.fillStyle = '#ffe27a';
  [[-30, -40], [25, -70], [-5, -95]].forEach(([sx, sy], i) => { c.beginPath(); c.arc(sx, sy, 5 + i, 0, Math.PI * 2); c.fill(); });

  // 얼굴
  sloppyFill(c, () => wobbleCircle(c, 0, -150, 30, 911, 0.1), '#f6d2b0', 913, 2);
  // 눈 (짝짝이!)
  c.fillStyle = '#2a1d5c';
  c.beginPath(); c.arc(-10, -155, 4, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(11, -154, 3, 0, Math.PI * 2); c.fill();
  // 하얀 수염
  sloppyFill(c, () => { c.beginPath(); c.moveTo(-26, -140); c.quadraticCurveTo(0, -60, 26, -140); c.quadraticCurveTo(0, -128, -26, -140); c.closePath(); },
             '#ffffff', 921, 2);
  // 뾰족 모자
  sloppyFill(c, () => { c.beginPath(); c.moveTo(-42, -170); c.lineTo(42, -170); c.lineTo(10, -245); c.closePath(); },
             '#5b3f8f', 931, 3);
  c.fillStyle = '#ffe27a';
  c.beginPath(); c.arc(10, -245, 7, 0, Math.PI * 2); c.fill();

  // 마법 지팡이 + 반짝이는 별
  c.beginPath(); c.moveTo(60, -10); c.lineTo(85, -120); c.stroke();
  const tw = 8 + Math.sin(now * 0.01) * 3;
  c.fillStyle = '#ffe27a';
  c.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? tw * 0.45 : tw * 1.4;
    c.lineTo(85 + Math.cos(a) * r, -126 + Math.sin(a) * r);
  }
  c.closePath(); c.fill();
  c.restore();
}
