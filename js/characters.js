/* ===========================================================
   characters.js — 진저맨 그리기 담당 부품 🍪
   -----------------------------------------------------------
   세은(빨강), 다영(연두), 태준(노랑) 진저맨을
   도형으로 직접 그려주는 파일이야.

   그림은 '캔버스'라는 도화지 위에 그려.
   ctx 는 '붓'이라고 생각하면 돼!
   =========================================================== */


/* 세 친구의 이름과 색깔 정보 */
const HEROES = [
  {
    name: '세은',
    color: '#ff7a85',      // 빨간 진저맨
    dark:  '#d94f5e',      // 테두리용 진한 색
    emoji: '🔴'
  },
  {
    name: '다영',
    color: '#8fd67f',      // 연두 진저맨
    dark:  '#5aa84c',
    emoji: '🟢'
  },
  {
    name: '태준',
    color: '#ffd45e',      // 노란 진저맨
    dark:  '#d9a71f',
    emoji: '🟡'
  }
];


/* -----------------------------------------------------------
   둥근 모서리 네모를 그리는 도우미 함수
   (귀여운 느낌을 내려면 모서리가 둥글어야 해!)
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
   진저맨 한 명을 그리는 함수 🍪

   ctx    = 붓
   x, y   = 발이 닿는 바닥의 가운데 위치
   size   = 키 (픽셀)
   hero   = HEROES 중 한 명
   opt    = 어떤 모습으로 그릴지
            facing : 1이면 오른쪽 보기, -1이면 왼쪽 보기
            walk   : 걷는 동작 숫자 (계속 커짐)
            moving : 지금 걷고 있나?
            jumping: 지금 공중에 떠 있나?
            crouch : 지금 웅크리고 있나?
            active : 지금 이 친구를 조종하고 있나? (반짝이 표시)
   ----------------------------------------------------------- */
function drawGingerbread(ctx, x, y, size, hero, opt = {}) {
  const facing  = opt.facing  ?? 1;
  const walk    = opt.walk    ?? 0;
  const moving  = opt.moving  ?? false;
  const jumping = opt.jumping ?? false;
  const crouch  = opt.crouch  ?? false;

  // 몸 각 부분의 크기를 키(size)에 맞춰 계산해
  const headR  = size * 0.26;              // 머리 반지름
  const bodyW  = size * 0.42;              // 몸통 너비
  const bodyH  = size * (crouch ? 0.24 : 0.36);  // 웅크리면 몸통이 납작해져
  const legH   = size * (crouch ? 0.14 : 0.26);  // 웅크리면 다리도 짧아져

  ctx.save();                 // 붓의 상태를 저장해 둬 (나중에 되돌리려고)
  ctx.translate(x, y);        // 그림의 기준점을 캐릭터 발밑으로 옮겨
  ctx.scale(facing, 1);       // facing이 -1이면 좌우로 뒤집혀!

  // 걸을 때 팔다리가 흔들리는 정도.
  // Math.sin 은 '올라갔다 내려갔다'를 반복하는 물결 계산이야.
  const swing = moving ? Math.sin(walk * 0.25) : 0;

  // 점프할 때 몸이 살짝 길쭉해지는 느낌 (스쿼시 & 스트레치)
  const stretch = jumping ? 1.06 : 1;

  // ---------- 그림자 ----------
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 2, bodyW * 0.6, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 위치 기준을 잡아둬 (몸통 아래쪽 = 다리 위)
  const bodyBottom = -legH;
  const bodyTop    = bodyBottom - bodyH * stretch;
  const headY      = bodyTop - headR * 0.75;

  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.strokeStyle = hero.dark;
  ctx.lineCap = 'round';

  // ---------- 다리 2개 ----------
  const legW = size * 0.13;
  for (const side of [-1, 1]) {
    // 걸을 때 다리가 앞뒤로 왔다갔다 해
    const off = swing * size * 0.10 * side;
    ctx.fillStyle = hero.color;
    roundRect(ctx, side * bodyW * 0.28 - legW / 2 + off, bodyBottom,
              legW, legH, legW * 0.5);
    ctx.fill();
    ctx.stroke();
  }

  // ---------- 팔 2개 ----------
  const armW = size * 0.12;
  const armL = size * 0.22;
  for (const side of [-1, 1]) {
    ctx.save();
    // 팔이 붙어 있는 어깨 위치로 이동
    ctx.translate(side * bodyW * 0.45, bodyTop + bodyH * 0.30);
    // 점프하면 팔을 위로 번쩍! 걸으면 앞뒤로 흔들흔들
    const angle = jumping ? side * -0.9 : swing * 0.5 * -side;
    ctx.rotate(angle);
    ctx.fillStyle = hero.color;
    roundRect(ctx, -armW / 2, -armW / 2, armW, armL, armW * 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 몸통 ----------
  ctx.fillStyle = hero.color;
  roundRect(ctx, -bodyW / 2, bodyTop, bodyW, bodyH * stretch, bodyW * 0.32);
  ctx.fill();
  ctx.stroke();

  // 몸통에 단추 2개 (진저맨 쿠키 느낌!)
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(0, bodyTop + bodyH * (0.32 + i * 0.36), size * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- 머리 ----------
  ctx.fillStyle = hero.color;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 눈 2개 (까만 점)
  ctx.fillStyle = '#3a3040';
  const eyeY = headY - headR * 0.12;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * headR * 0.34, eyeY, headR * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }

  // 볼터치 (분홍 동그라미) — 귀여움 담당! 💕
  ctx.fillStyle = 'rgba(255,140,160,.55)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * headR * 0.58, headY + headR * 0.24, headR * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  // 웃는 입 (반원 모양 선)
  ctx.strokeStyle = '#3a3040';
  ctx.lineWidth = Math.max(1.5, size * 0.028);
  ctx.beginPath();
  ctx.arc(0, headY + headR * 0.18, headR * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();   // 붓 상태를 원래대로 되돌려
}


/* -----------------------------------------------------------
   지금 조종 중인 친구 머리 위에 뜨는 반짝이 화살표 ✨
   누구를 움직이고 있는지 한눈에 보이게 해줘.
   ----------------------------------------------------------- */
function drawActiveMark(ctx, x, y, size, hero, time) {
  // 위아래로 둥실둥실 떠다니게
  const bob = Math.sin(time * 0.005) * size * 0.06;
  const top = y - size * 1.12 + bob;

  ctx.save();
  ctx.fillStyle = hero.dark;
  ctx.beginPath();
  ctx.moveTo(x, top + size * 0.16);          // 화살표 뾰족한 끝(아래)
  ctx.lineTo(x - size * 0.11, top);          // 왼쪽 위
  ctx.lineTo(x + size * 0.11, top);          // 오른쪽 위
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
