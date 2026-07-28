/* ===========================================================
   characters.js — 하찮은 진저맨 그리기 🍪✏️
   -----------------------------------------------------------
   세은(연두), 다영(노랑), 태준(빨강) 진저맨을
   일부러 삐뚤빼뚤하게, 대충 그린 것처럼 그리는 파일이야.

   눈 크기도 다르고, 팔다리 길이도 다르고, 입도 삐뚤어졌어.
   그게 매력이야 😂
   =========================================================== */


/* 세 친구의 이름과 색깔 정보
   seed 는 '이 친구만의 삐뚤빼뚤 번호'야.
   번호가 다르면 삐뚤어진 모양도 서로 달라져! */
const HEROES = [
  { name: '세은', color: '#9fdc6b', dark: '#4d7a2a', emoji: '🟢', seed: 11 },
  { name: '다영', color: '#ffd94a', dark: '#a8791a', emoji: '🟡', seed: 27 },
  { name: '태준', color: '#ff7f7f', dark: '#a83a3a', emoji: '🔴', seed: 43 }
];


/* -----------------------------------------------------------
   둥근 모서리 네모 (반듯한 버전 — 화면 꾸미기에 씀)
   ----------------------------------------------------------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}


/* -----------------------------------------------------------
   하찮은 진저맨 한 명 그리기 🍪

   ctx    = 붓
   x, y   = 발이 닿는 바닥의 가운데 위치
   size   = 키 (픽셀)
   hero   = HEROES 중 한 명
   opt    = 어떤 모습으로 그릴지
   ----------------------------------------------------------- */
function drawGingerbread(ctx, x, y, size, hero, opt = {}) {
  const facing  = opt.facing  ?? 1;
  const walk    = opt.walk    ?? 0;
  const moving  = opt.moving  ?? false;
  const jumping = opt.jumping ?? false;
  const crouch  = opt.crouch  ?? false;
  const z       = opt.z       ?? 0;    // 바닥에서 얼마나 떠 있나 (구덩이 뛰어넘기용)

  const S = hero.seed;                 // 이 친구만의 삐뚤빼뚤 번호

  // 몸 각 부분 크기
  // 머리는 몸통보다 좁게, 몸통은 넓게 해야 팔이 안 가려져!
  const headR = size * 0.225;
  const bodyW = size * 0.44;
  const bodyH = size * (crouch ? 0.20 : 0.32);
  const legH  = size * (crouch ? 0.13 : 0.26);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  // 걸을 때 팔다리가 흔들리는 정도
  const swing = moving ? Math.sin(walk * 0.25) : 0;

  // ---------- 그림자 (대충 그린 얼룩) ----------
  // 그림자는 '바닥'에 그려야 해!
  // 공중에 높이 떠 있을수록 그림자는 작아지고 흐려져.
  ctx.save();
  const high = Math.min(1, z / 60);
  ctx.globalAlpha = 0.16 * (1 - high * 0.6);
  ctx.fillStyle = '#000';
  wobbleCircle(ctx, 0, 1, bodyW * 0.55 * (1 - high * 0.35), S + 90, 0.30);
  ctx.fill();
  ctx.restore();

  // 이제 몸을 공중으로 띄워 (구덩이를 뛰어넘는 중이면 위로 올라가!)
  ctx.translate(0, -z);

  // 몸 전체가 살짝 기울어져 있어 (하찮음의 핵심! 😂)
  ctx.rotate(wob(S) * 0.10);

  const bodyBottom = -legH;
  const bodyTop    = bodyBottom - bodyH;
  const headY      = bodyTop - headR * 0.86;   // 머리를 몸통 위로 충분히 올려줘

  // 손그림 느낌을 위해 선을 두껍고 둥글게
  ctx.lineWidth   = Math.max(2.4, size * 0.062);
  ctx.strokeStyle = hero.dark;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // ---------- 다리 2개 (길이가 서로 달라!) ----------
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    // 걸을 때 앞뒤로 흔들리는 정도.
    // 너무 크게 하면 두 다리가 가운데서 X자로 꼬여버려!
    const off  = swing * size * 0.05 * side;
    // 한쪽 다리를 일부러 조금 더 길게
    const len = legH * (1 + wob(S + i * 3) * 0.3);
    const legX = side * bodyW * 0.30;

    ctx.beginPath();
    wobbleLine(ctx,
      legX, bodyBottom,
      legX + off, bodyBottom + len,
      S + i * 17, size * 0.05);
    ctx.stroke();

    // 발 (작은 얼룩)
    ctx.fillStyle = hero.dark;
    wobbleCircle(ctx, legX + off, bodyBottom + len,
                 size * 0.045, S + i * 23, 0.35);
    ctx.fill();
  }

  // ---------- 팔 2개 (각도가 서로 달라!) ----------
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    ctx.save();
    ctx.translate(side * bodyW * 0.48, bodyTop + bodyH * 0.30);

    // 팔이 바깥쪽으로 벌어지게 기본 각도를 줘 (안 그러면 몸에 가려져)
    // 점프하면 위로 번쩍! 걸으면 앞뒤로 흔들흔들
    // 거기에 삐뚤빼뚤 각도를 더해서 짝짝이로 만들어
    let angle = side * (jumping ? -2.3 : -1.15);
    angle += swing * 0.5 * -side;
    angle += wob(S + i * 5) * 0.45;
    ctx.rotate(angle);

    const armL = size * 0.26 * (1 + wob(S + i * 7) * 0.3);
    ctx.beginPath();
    wobbleLine(ctx, 0, 0, 0, armL, S + i * 31, size * 0.05);
    ctx.stroke();

    // 손 (작은 얼룩)
    ctx.fillStyle = hero.dark;
    wobbleCircle(ctx, 0, armL, size * 0.04, S + i * 37, 0.35);
    ctx.fill();

    ctx.restore();
  }

  // ---------- 몸통 ----------
  sloppyFill(ctx,
    () => wobbleRect(ctx, -bodyW/2, bodyTop, bodyW, bodyH, S + 50, size * 0.07),
    hero.color, S + 55, size * 0.05);

  // 단추 2개 (크기가 다르고 삐뚤게 붙어 있어)
  ctx.fillStyle = hero.dark;
  for (let i = 0; i < 2; i++) {
    wobbleCircle(ctx,
      wob(S + i * 9) * size * 0.05,
      bodyTop + bodyH * (0.30 + i * 0.38),
      size * (0.028 + rnd(S + i) * 0.016),
      S + i * 61, 0.4);
    ctx.fill();
  }

  // ---------- 머리 ----------
  sloppyFill(ctx,
    () => wobbleCircle(ctx, 0, headY, headR, S + 70, 0.16),
    hero.color, S + 75, size * 0.05);

  // ---------- 눈 2개 (크기도 높이도 짝짝이! 😂) ----------
  ctx.fillStyle = '#2b2530';
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    const eyeX = side * headR * (0.32 + rnd(S + i * 13) * 0.14);
    const eyeY = headY - headR * 0.10 + wob(S + i * 19) * headR * 0.22;
    const eyeR = headR * (0.11 + rnd(S + i * 29) * 0.09);   // 한쪽 눈이 더 커!
    wobbleCircle(ctx, eyeX, eyeY, eyeR, S + i * 83, 0.4);
    ctx.fill();
  }

  // ---------- 입 (삐뚤어진 선 하나) ----------
  ctx.strokeStyle = '#2b2530';
  ctx.lineWidth = Math.max(1.6, size * 0.035);
  const mouthW = headR * (0.4 + rnd(S) * 0.3);
  const mouthY = headY + headR * (0.30 + wob(S + 3) * 0.14);
  ctx.beginPath();
  wobbleLine(ctx,
    -mouthW + wob(S + 41) * headR * 0.2, mouthY,
     mouthW, mouthY + wob(S + 47) * headR * 0.25,   // 한쪽이 올라가 있어
    S + 95, headR * 0.32);
  ctx.stroke();

  // ---------- 머리 위 삐죽 머리카락 한 가닥 ----------
  ctx.lineWidth = Math.max(1.6, size * 0.032);
  ctx.strokeStyle = hero.dark;
  ctx.beginPath();
  wobbleLine(ctx,
    wob(S + 51) * headR * 0.4, headY - headR * 0.95,
    wob(S + 53) * headR * 0.8, headY - headR * 1.45,
    S + 99, headR * 0.3);
  ctx.stroke();

  ctx.restore();
}


/* -----------------------------------------------------------
   지금 중요한 캐릭터 머리 위에 뜨는 삐뚤빼뚤 화살표 ⬇️
   ----------------------------------------------------------- */
function drawActiveMark(ctx, x, y, size, hero, time) {
  const bob = Math.sin(time * 0.005) * size * 0.07;
  const top = y - size * 1.30 + bob;

  ctx.save();
  ctx.strokeStyle = hero.dark;
  ctx.fillStyle   = hero.color;
  ctx.lineWidth   = Math.max(2, size * 0.05);
  ctx.lineJoin    = 'round';

  ctx.beginPath();
  ctx.moveTo(x + wob(hero.seed) * 2,      top + size * 0.20);
  ctx.lineTo(x - size * 0.12,             top);
  ctx.lineTo(x + size * 0.12,             top + wob(hero.seed + 1) * 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
