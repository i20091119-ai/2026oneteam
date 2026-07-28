/* ===========================================================
   furniture.js — 방 안 가구 그리기 🪑
   -----------------------------------------------------------
   방에 놓인 물건들을 '네모 칸 + 이모지'가 아니라
   진짜 가구처럼 하나하나 그려주는 파일이야.

   방을 위에서 내려다본 모습이라서
   책상은 넓적한 네모, 화분은 동그라미로 보여!

   모든 가구는 Y버튼으로 뒤져볼 수 있어.
   대부분은 꽝이지만, 몇 개엔 문제 쪽지가 숨어 있어 🧠
   =========================================================== */


/* -----------------------------------------------------------
   가구 하나를 그리는 대장 함수
   o.shape 에 적힌 이름을 보고 알맞은 그림을 골라 그려줘
   ----------------------------------------------------------- */
function drawFurniture(ctx, o, seed) {
  const f = FURNITURE[o.shape] || FURNITURE.box;
  f(ctx, o, seed);
}


/* 가구마다 어울리는 색을 미리 정해뒀어 */
const WOOD      = { fill: '#c99a63', line: '#7a5427' };  // 나무
const WOOD_DARK = { fill: '#a97844', line: '#5f3f1c' };  // 진한 나무
const METAL     = { fill: '#c3ccd6', line: '#6d7a88' };  // 철제
const CLOTH     = { fill: '#8fb8dc', line: '#4a6a8a' };  // 천 (좌석)
const GREEN     = { fill: '#7cbf5a', line: '#3f6b2a' };  // 식물
const DARKBOARD = { fill: '#3e5c46', line: '#22331f' };  // 칠판


/* 색칠 + 테두리를 한 번에 해주는 짧은 도우미 */
function paint(ctx, drawShape, c, seed) {
  ctx.strokeStyle = c.line;
  sloppyFill(ctx, drawShape, c.fill, seed, 2);
}


const FURNITURE = {

  /* ---------- 💺 비행기 좌석 (위에서 본 모습) ---------- */
  seat(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    // 등받이 (위쪽)
    paint(ctx, () => wobbleRect(ctx, x + 4, y, w - 8, h * 0.34, s + 1, 3),
          { fill: '#6f9bc4', line: CLOTH.line }, s + 2);
    // 방석
    paint(ctx, () => wobbleRect(ctx, x + 2, y + h * 0.30, w - 4, h * 0.70, s + 3, 3),
          CLOTH, s + 4);
    // 팔걸이 두 개
    ctx.fillStyle = CLOTH.line;
    for (const side of [0, 1]) {
      const ax = side === 0 ? x - 2 : x + w - 6;
      wobbleRect(ctx, ax, y + h * 0.36, 8, h * 0.58, s + side, 2);
      ctx.fill();
    }
  },

  /* ---------- 🪑 책상 (넓적한 나무판 + 의자) ---------- */
  desk(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    // 의자 (책상 뒤에 살짝 보이게)
    paint(ctx, () => wobbleRect(ctx, x + w * 0.28, y - h * 0.22, w * 0.44, h * 0.34, s + 9, 2.5),
          WOOD_DARK, s + 10);
    // 책상 상판
    paint(ctx, () => wobbleRect(ctx, x, y, w, h * 0.78, s + 1, 3), WOOD, s + 2);
    // 상판에 나뭇결 두 줄
    ctx.strokeStyle = WOOD.line;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35;
    for (let i = 1; i <= 2; i++) {
      wobbleLine(ctx, x + 6, y + (h * 0.78 / 3) * i, x + w - 6, y + (h * 0.78 / 3) * i, s + i * 5, 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  /* ---------- 🗄️ 사물함 (길쭉한 철제 함) ---------- */
  locker(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    paint(ctx, () => wobbleRect(ctx, x, y, w, h, s + 1, 3), METAL, s + 2);
    // 가운데 세로 문틈
    ctx.strokeStyle = METAL.line;
    ctx.lineWidth = 2.5;
    wobbleLine(ctx, x + w / 2, y + 5, x + w / 2, y + h - 5, s + 7, 3);
    ctx.stroke();
    // 손잡이 두 개
    ctx.fillStyle = METAL.line;
    for (const side of [-1, 1]) {
      wobbleCircle(ctx, x + w / 2 + side * w * 0.18, y + h * 0.5, 3.5, s + side * 3, 0.4);
      ctx.fill();
    }
  },

  /* ---------- 🪴 화분 (동그란 화분 + 잎사귀) ---------- */
  plant(ctx, o, s) {
    const { x, y, w, h } = o;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.lineWidth = 3.5;
    // 화분
    paint(ctx, () => wobbleCircle(ctx, cx, cy, w * 0.42, s + 1, 0.14), WOOD_DARK, s + 2);
    // 잎사귀 다섯 장
    ctx.strokeStyle = GREEN.line;
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 / 5) * i + wob(s + i) * 0.5;
      const lx = cx + Math.cos(a) * w * 0.22;
      const ly = cy + Math.sin(a) * h * 0.22;
      ctx.fillStyle = GREEN.fill;
      wobbleCircle(ctx, lx, ly, w * 0.18, s + i * 11, 0.3);
      ctx.fill();
      ctx.stroke();
    }
  },

  /* ---------- 🗑️ 쓰레기통 (동그란 통) ---------- */
  trash(ctx, o, s) {
    const { x, y, w, h } = o;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.lineWidth = 3.5;
    paint(ctx, () => wobbleCircle(ctx, cx, cy, w * 0.44, s + 1, 0.12), METAL, s + 2);
    // 뚜껑 안쪽 동그라미
    ctx.strokeStyle = METAL.line;
    ctx.lineWidth = 2.5;
    wobbleCircle(ctx, cx, cy, w * 0.28, s + 5, 0.16);
    ctx.stroke();
  },

  /* ---------- 📦 상자 (테이프 십자 무늬) ---------- */
  box(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    paint(ctx, () => wobbleRect(ctx, x, y, w, h, s + 1, 3), WOOD, s + 2);
    // 테이프 십자
    ctx.strokeStyle = '#e8ddc4';
    ctx.lineWidth = 6;
    wobbleLine(ctx, x + w / 2, y + 3, x + w / 2, y + h - 3, s + 7, 3); ctx.stroke();
    wobbleLine(ctx, x + 3, y + h / 2, x + w - 3, y + h / 2, s + 9, 3); ctx.stroke();
  },

  /* ---------- 📋 칠판·게시판 (넓적한 판) ---------- */
  board(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 4;
    paint(ctx, () => wobbleRect(ctx, x, y, w, h, s + 1, 3), DARKBOARD, s + 2);
    // 분필로 쓴 것 같은 흰 선 세 줄
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2.5;
    for (let i = 1; i <= 3; i++) {
      const yy = y + (h / 4) * i;
      wobbleLine(ctx, x + 8, yy, x + w - 8 - (i % 2) * w * 0.25, yy, s + i * 13, 3);
      ctx.stroke();
    }
  },

  /* ---------- 🗃️ 서류함 (서랍 세 칸) ---------- */
  cabinet(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    paint(ctx, () => wobbleRect(ctx, x, y, w, h, s + 1, 3), METAL, s + 2);
    ctx.strokeStyle = METAL.line;
    ctx.lineWidth = 2.5;
    for (let i = 1; i <= 2; i++) {
      const yy = y + (h / 3) * i;
      wobbleLine(ctx, x + 3, yy, x + w - 3, yy, s + i * 7, 3);
      ctx.stroke();
    }
    // 서랍 손잡이 세 개
    ctx.fillStyle = METAL.line;
    for (let i = 0; i < 3; i++) {
      wobbleRect(ctx, x + w * 0.34, y + (h / 3) * i + h * 0.12, w * 0.32, 5, s + i * 3, 1.5);
      ctx.fill();
    }
  },

  /* ---------- ☕ 컵 (작은 동그라미 + 손잡이) ---------- */
  cup(ctx, o, s) {
    const { x, y, w, h } = o;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.lineWidth = 3;
    // 손잡이
    ctx.strokeStyle = '#d9d2c4';
    ctx.beginPath();
    ctx.arc(cx + w * 0.30, cy, w * 0.16, -1.2, 1.2);
    ctx.stroke();
    // 컵
    paint(ctx, () => wobbleCircle(ctx, cx, cy, w * 0.30, s + 1, 0.12),
          { fill: '#f4efe4', line: '#a89b84' }, s + 2);
    // 안에 든 커피
    ctx.fillStyle = '#6b4a2a';
    wobbleCircle(ctx, cx, cy, w * 0.19, s + 5, 0.15);
    ctx.fill();
  },

  /* ---------- 🧳 가방 (손잡이 달린 네모) ---------- */
  bag(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    // 손잡이
    ctx.strokeStyle = '#5f4a3a';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.12, w * 0.22, Math.PI, 0);
    ctx.stroke();
    paint(ctx, () => wobbleRect(ctx, x, y + h * 0.12, w, h * 0.88, s + 1, 3),
          { fill: '#a86f5a', line: '#5f3a2a' }, s + 2);
    // 가로 띠
    ctx.strokeStyle = '#5f3a2a';
    ctx.lineWidth = 5;
    wobbleLine(ctx, x + 3, y + h * 0.55, x + w - 3, y + h * 0.55, s + 9, 3);
    ctx.stroke();
  },

  /* ---------- 🛒 서비스 카트 (바퀴 달린 수레) ---------- */
  cart(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    paint(ctx, () => wobbleRect(ctx, x, y, w, h, s + 1, 3), METAL, s + 2);
    // 위쪽에 놓인 컵 두 개
    ctx.strokeStyle = '#a89b84';
    ctx.lineWidth = 2.5;
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#f4efe4';
      wobbleCircle(ctx, x + w / 2 + side * w * 0.22, y + h * 0.3, w * 0.12, s + side * 5, 0.2);
      ctx.fill(); ctx.stroke();
    }
    // 바퀴 네 개
    ctx.fillStyle = '#4a5560';
    for (const sx of [0.16, 0.84]) for (const sy of [0.08, 0.92]) {
      wobbleCircle(ctx, x + w * sx, y + h * sy, 4, s + sx * 10 + sy, 0.3);
      ctx.fill();
    }
  },

  /* ---------- 🎛️ 계기판 (동그란 눈금 여러 개) ---------- */
  panel(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    paint(ctx, () => wobbleRect(ctx, x, y, w, h, s + 1, 3),
          { fill: '#4a5560', line: '#2b333c' }, s + 2);
    // 눈금 네 개
    for (let i = 0; i < 4; i++) {
      const cx = x + w * (i % 2 === 0 ? 0.3 : 0.7);
      const cy = y + h * (i < 2 ? 0.3 : 0.7);
      ctx.fillStyle = '#9fe6c0';
      ctx.strokeStyle = '#2b333c';
      ctx.lineWidth = 2;
      wobbleCircle(ctx, cx, cy, w * 0.13, s + i * 9, 0.2);
      ctx.fill(); ctx.stroke();
      // 바늘
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(i * 1.4) * w * 0.10, cy + Math.sin(i * 1.4) * w * 0.10);
      ctx.stroke();
    }
  },

  /* ---------- 🕰️ 시계 (동그라미 + 바늘) ---------- */
  clock(ctx, o, s) {
    const { x, y, w, h } = o;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.lineWidth = 3.5;
    paint(ctx, () => wobbleCircle(ctx, cx, cy, w * 0.44, s + 1, 0.10),
          { fill: '#f6f1e4', line: '#7a6a52' }, s + 2);
    ctx.strokeStyle = '#3a3040';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - w * 0.26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + w * 0.20, cy + w * 0.10); ctx.stroke();
  },

  /* ---------- 🪑 의자 (작은 좌석) ---------- */
  chair(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3.5;
    paint(ctx, () => wobbleRect(ctx, x + 3, y, w - 6, h * 0.28, s + 1, 2.5), WOOD_DARK, s + 2);
    paint(ctx, () => wobbleRect(ctx, x, y + h * 0.24, w, h * 0.76, s + 3, 3), WOOD, s + 4);
  },

  /* ---------- 📚 책 더미 ---------- */
  books(ctx, o, s) {
    const { x, y, w, h } = o;
    ctx.lineWidth = 3;
    const colors = ['#d9615e', '#5b8fd9', '#e0b23c'];
    for (let i = 0; i < 3; i++) {
      const off = wob(s + i * 4) * 5;
      paint(ctx,
        () => wobbleRect(ctx, x + off, y + h * (0.12 + i * 0.26), w - 8, h * 0.24, s + i * 6, 2.5),
        { fill: colors[i], line: '#4a3a2a' }, s + i * 8);
    }
  }
};
