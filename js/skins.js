/* ===========================================================
   skins.js — 우리가 그린 그림으로 바꾸기 🎨
   -----------------------------------------------------------
   images 폴더에 '정해진 이름'으로 그림(PNG)을 넣으면
   게임이 손그림 대신 그 그림을 써!
   그림이 없으면? 원래 손그림 그대로 나와. 그래서 하나씩 바꿔도 돼.

   어떤 이름으로 넣어야 하는지는 아래 SKIN_LIST 에 다 적혀 있어.
   (images.html — '그림 바꾸기 확인판'을 열면 지금 무엇이 바뀌었는지 한눈에 볼 수 있어!)
   =========================================================== */


/* -----------------------------------------------------------
   바꿀 수 있는 그림 목록
     file  = images 폴더에 넣을 파일 이름 (영어 소문자! 띄어쓰기 없이!)
     label = 무엇인지
     size  = 이 크기(가로×세로)로 그리면 딱 맞아
   ----------------------------------------------------------- */
const SKIN_LIST = [
  // 🍪 친구들 — 오른쪽을 보고 서 있는 모습으로 그려줘 (왼쪽은 게임이 뒤집어 줘)
  { group: '친구', file: 'hero-seeun.png',   label: '🟢 세은', size: '200×300' },
  { group: '친구', file: 'hero-dayoung.png', label: '🟡 다영', size: '200×300' },
  { group: '친구', file: 'hero-taejun.png',  label: '🔴 태준', size: '200×300' },

  // 🏠 배경
  { group: '배경', file: 'start-bg.png',     label: '시작 화면 배경', size: '1920×1080' },
  { group: '배경', file: 'floor-plane.png',  label: '✈️ 비행기 바닥',  size: '960×540' },
  { group: '배경', file: 'floor-school.png', label: '🏫 폐교 바닥',    size: '960×540' },
  // 방마다 바닥을 다르게 하고 싶으면 (있으면 위의 스테이지 바닥보다 먼저 써)
  { group: '방마다 바닥', file: 'floor-plane-1.png',  label: '✈️ 1번 방 · 기내 통로',   size: '960×540' },
  { group: '방마다 바닥', file: 'floor-plane-2.png',  label: '✈️ 2번 방 · 흔들리는 객실', size: '960×540' },
  { group: '방마다 바닥', file: 'floor-plane-3.png',  label: '✈️ 3번 방 · 조종실',     size: '960×540' },
  { group: '방마다 바닥', file: 'floor-school-1.png', label: '🏫 1번 방 · 1학년 교실',  size: '960×540' },
  { group: '방마다 바닥', file: 'floor-school-2.png', label: '🏫 2번 방 · 어두운 복도',  size: '960×540' },
  { group: '방마다 바닥', file: 'floor-school-3.png', label: '🏫 3번 방 · 교무실',     size: '960×540' },

  // 🚪 방 물건
  { group: '물건', file: 'door-exit.png',    label: '🚪 출구 문',      size: '120×180' },
  { group: '물건', file: 'lock.png',         label: '🔒 금고 자물쇠',  size: '180×200' },
  { group: '물건', file: 'passenger.png',    label: '🧑 좌석에 앉은 승객 (위에서 본 모습)', size: '120×120' },

  // 🪑 가구 — 위에서 내려다본 모습
  { group: '가구', file: 'furniture-seat.png',    label: '💺 비행기 좌석' },
  { group: '가구', file: 'furniture-desk.png',    label: '책상' },
  { group: '가구', file: 'furniture-chair.png',   label: '의자' },
  { group: '가구', file: 'furniture-locker.png',  label: '사물함' },
  { group: '가구', file: 'furniture-cabinet.png', label: '서류함' },
  { group: '가구', file: 'furniture-board.png',   label: '칠판' },
  { group: '가구', file: 'furniture-books.png',   label: '책 더미' },
  { group: '가구', file: 'furniture-plant.png',   label: '화분' },
  { group: '가구', file: 'furniture-trash.png',   label: '쓰레기통' },
  { group: '가구', file: 'furniture-box.png',     label: '상자' },
  { group: '가구', file: 'furniture-bag.png',     label: '가방' },
  { group: '가구', file: 'furniture-cup.png',     label: '컵' },
  { group: '가구', file: 'furniture-cart.png',    label: '서비스 카트' },
  { group: '가구', file: 'furniture-panel.png',   label: '계기판' },
  { group: '가구', file: 'furniture-clock.png',   label: '시계' }
];

// 불러오기에 성공한 그림만 여기에 들어가 (파일 이름 → 그림)
const SKINS = {};

// 그림이 하나 도착할 때마다 알려줄 곳 (확인판이 다시 그릴 때 써)
const skinListeners = [];
function onSkinLoad(fn) { skinListeners.push(fn); }

/* 그림 불러오기
   새로 올린 그림이 바로 보이도록 주소 뒤에 '지금 시각'을 붙여 (오래된 그림 기억 안 쓰기) */
function loadSkins() {
  const stamp = Date.now();
  for (const s of SKIN_LIST) {
    const img = new Image();
    img.onload = () => {
      SKINS[s.file] = img;
      if (s.file === 'start-bg.png') useStartBackground(img);
      for (const fn of skinListeners) fn(s.file);
    };
    img.onerror = () => { /* 그림이 없으면 원래 손그림을 써 — 괜찮아! */ };
    img.src = 'images/' + s.file + '?t=' + stamp;
  }
}

/* 시작 화면 배경 그림이 있으면 하늘·구름·언덕·잔디 대신 그 그림을 깔아 */
function useStartBackground(img) {
  const start = document.getElementById('screen-start');
  if (!start) return;
  start.style.backgroundImage = 'url("' + img.src + '")';
  start.classList.add('custom-bg');
}

/* 이 이름의 그림이 있으면 돌려주고, 없으면 null */
function skin(file) {
  return SKINS[file] || null;
}

/* -----------------------------------------------------------
   그림을 네모 칸 안에 '찌그러지지 않게' 쏙 넣어 그리기
   칸보다 작게 맞추고, 가로는 가운데 · 세로는 바닥에 붙여
   ----------------------------------------------------------- */
function drawSkinFit(ctx, img, x, y, w, h) {
  const k = Math.min(w / img.width, h / img.height);
  const dw = img.width * k, dh = img.height * k;
  ctx.drawImage(img, x + (w - dw) / 2, y + h - dh, dw, dh);
}

/* -----------------------------------------------------------
   친구 그림 그리기 (진저맨 대신!)
   x, y = 발 가운데 / size = 키
   걸을 땐 통통 튀고, 왼쪽을 보면 뒤집고, 웅크리면 납작해져
   ----------------------------------------------------------- */
function drawHeroSkin(ctx, img, x, y, size, opt = {}) {
  const facing = opt.facing ?? 1;
  const z      = opt.z ?? 0;
  const h  = size * (opt.crouch ? 0.75 : 1);
  const w  = h * img.width / img.height;
  const bob = opt.moving ? Math.abs(Math.sin((opt.walk || 0) * 0.25)) * size * 0.05 : 0;

  // 바닥 그림자 (공중에 뜨면 작아져)
  ctx.save();
  ctx.globalAlpha *= 0.18;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.35 * (1 - Math.min(z, 40) / 100), size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y - z - bob);
  if (facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

loadSkins();
