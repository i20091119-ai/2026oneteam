/* ===========================================================
   input.js — 조작 담당 부품 🎮
   -----------------------------------------------------------
   이 파일이 하는 일은 딱 하나야.
   "키보드, 마우스, 아케이드 조종기"에서 들어온 신호를
   전부 똑같은 모양으로 바꿔서 게임에 전달해 주는 거야.

   그래서 게임 코드는 "누가 눌렀는지"만 알면 되고,
   "키보드로 눌렀는지 조종기로 눌렀는지"는 신경 안 써도 돼!
   =========================================================== */


/* -----------------------------------------------------------
   ① 우리 게임에서 쓰는 '동작' 이름표
   기획서에 적힌 버튼 역할 그대로야.
   ----------------------------------------------------------- */
const ACTIONS = [
  'up', 'down', 'left', 'right',  // 방향 스틱 / 방향키
  'jump',       // X / ☐  — 점프
  'interact',   // Y / ▵  — 상호작용 (사물 조사, 단서 얻기)
  'crouch',     // RB / R1 — 웅크리기
  'item',       // LB / L1 — 아이템 사용
  'run',        // A / ✕  — 꾹 누르면 달리기
  'settings',   // B / ○  — 설정
  'pause',      // RT / R2 — 정지
  'restart'     // LT / L2 — 다시하기
];


/* -----------------------------------------------------------
   ② 게임패드 버튼 번호 ↔ 동작 이름표

   게임패드는 세계 공통 약속이 있어서 버튼마다 번호가 정해져 있어.
   기획서에 적힌 버튼이 이 번호랑 딱 맞아떨어져!
   ----------------------------------------------------------- */
const PAD_BUTTONS = {
  0: 'run',       // A / ✕   꾹 누르면 달리기
  1: 'settings',  // B / ○   설정
  2: 'jump',      // X / ☐   점프
  3: 'interact',  // Y / ▵   상호작용
  4: 'item',      // LB / L1 아이템 사용
  5: 'crouch',    // RB / R1 웅크리기
  6: 'restart',   // LT / L2 다시하기
  7: 'pause'      // RT / R2 정지
  // 십자패드(D-pad) 12~15번은 아래 '방향' 부분에서 스틱이랑 함께 읽어
  // (따로 읽었더니, 하나를 떼면 다른 하나를 누르고 있어도 멈춰버렸어!)
};


/* -----------------------------------------------------------
   ②-2 조이스틱 스위치가 DINPUT/PS3 쪽일 때의 버튼 번호

   XINPUT 모드면 브라우저가 '표준 배치'로 알려줘서 위 표를 쓰면 돼.
   그런데 맥(Mac)이나 리눅스(우노Q)에서는 XINPUT 조이스틱을
   못 알아보는 경우가 있어! 그럴 땐 스위치를 DINPUT/PS3 로 바꾸면
   알아보는데, 버튼 번호가 이렇게 달라져.
   ----------------------------------------------------------- */
const PAD_BUTTONS_DINPUT = {
  0: 'jump',      // ☐ (X/☐ 자리)  점프
  1: 'run',       // ✕ (A/X 자리)  달리기
  2: 'settings',  // ○ (B/○ 자리)  설정
  3: 'interact',  // △ (Y/△ 자리)  상호작용
  4: 'item',      // L1            아이템
  5: 'crouch',    // R1            웅크리기
  6: 'restart',   // L2            다시하기
  7: 'pause'      // R2            정지
};


/* -----------------------------------------------------------
   ③ 키보드 이름표 — 세 친구가 각자 다른 키를 써!

   조종기가 모자라거나, 컴퓨터에서 테스트할 때 쓰는 키야.
   ----------------------------------------------------------- */
const KEY_MAPS = [
  { // 🔴 1번 세은 — 왼손 쪽 키
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    Space: 'jump', KeyE: 'interact', KeyC: 'crouch', KeyQ: 'item',
    ShiftLeft: 'run'
  },
  { // 🟢 2번 다영 — 방향키 쪽
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    Enter: 'jump', Slash: 'interact', Period: 'crouch', Comma: 'item',
    ShiftRight: 'run'
  },
  { // 🟡 3번 태준 — 오른손 쪽 키
    KeyI: 'up', KeyK: 'down', KeyJ: 'left', KeyL: 'right',
    KeyH: 'jump', KeyU: 'interact', KeyN: 'crouch', KeyY: 'item',
    KeyM: 'run'
  }
];

/* 누가 눌러도 되는 '모두의 키' — 설정, 정지, 다시하기 */
const GLOBAL_KEYS = {
  Escape: 'pause', KeyP: 'pause',
  KeyR: 'restart',
  KeyO: 'settings'
};


/* -----------------------------------------------------------
   ④ 플레이어 한 명의 '조작 상태'를 담는 상자

   지금 어떤 버튼이 눌려 있는지 계속 기억해 두는 곳이야.
   ----------------------------------------------------------- */
class PlayerInput {
  constructor(index) {
    this.index = index;      // 0=세은, 1=다영, 2=태준
    this.held = {};          // 지금 '누르고 있는' 동작들
    this.pressed = {};       // 이번 순간에 '막 눌린' 동작들 (한 번만 반응)
    this.padIndex = null;    // 이 사람이 쓰는 조종기 번호 (없으면 null)

    // 모든 동작을 '안 눌림' 상태로 시작해
    for (const a of ACTIONS) {
      this.held[a] = false;
      this.pressed[a] = false;
    }
  }

  /* 버튼을 누르기 시작했을 때 */
  setDown(action) {
    if (!action) return;
    // 이미 누르고 있던 게 아니라면, '막 눌림'으로 표시해
    if (!this.held[action]) this.pressed[action] = true;
    this.held[action] = true;
  }

  /* 버튼에서 손을 뗐을 때 */
  setUp(action) {
    if (!action) return;
    this.held[action] = false;
  }

  /* 지금 누르고 있니? (달리기처럼 꾹 누르는 동작에 씀) */
  isHeld(action) { return !!this.held[action]; }

  /* 방금 막 눌렀니? (점프처럼 한 번만 반응해야 하는 동작에 씀) */
  isPressed(action) { return !!this.pressed[action]; }

  /* 한 장면이 끝나면 '막 눌림' 표시를 지워줘야
     다음 순간에 또 점프하지 않아 */
  clearPressed() {
    for (const a of ACTIONS) this.pressed[a] = false;
  }
}


/* -----------------------------------------------------------
   ⑤ 조작 전체를 관리하는 대장 🎩
   ----------------------------------------------------------- */
class InputManager {
  constructor(playerCount = 3) {
    // 플레이어 3명(세은, 다영, 태준)의 조작 상자를 만들어
    this.players = [];
    for (let i = 0; i < playerCount; i++) {
      this.players.push(new PlayerInput(i));
    }

    this.padIds = [];      // 연결된 조종기 이름들 (화면에 보여주려고)

    // 🕹️ 조이스틱 몇 번이 어떤 친구를 조종하나
    //    padOwner[조이스틱 번호] = 친구 번호 (0=세은, 1=다영, 2=태준)
    //    학생들 요청: 조이스틱을 하나 꽂으면 '다영'이가 움직이게!
    //    → 조이스틱 1번 = 다영, 2번 = 세은, 3번 = 태준
    this.padOwner = loadPadOwner() || [1, 0, 2];
    this.onOwnerChange = null;   // 배정이 바뀌면 게임에 알려줄 약속
    this.lastPadState = {}; // 조종기 버튼이 '방금 눌렸는지' 알아내려고 이전 상태를 기억

    this._listenKeyboard();
    this._listenGamepad();
  }

  /* --- 키보드 듣기 --- */
  _listenKeyboard() {
    window.addEventListener('keydown', (e) => {
      // 브라우저가 방향키로 화면을 스크롤하는 걸 막아줘
      if (this._isGameKey(e.code)) e.preventDefault();

      // 키를 꾹 누르고 있으면 keydown 이 계속 반복돼서 오는데,
      // 그건 무시해야 점프가 여러 번 되지 않아
      if (e.repeat) return;

      this._dispatch(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this._dispatch(e.code, false);
    });
  }

  /* 눌린 키가 세 친구 중 누구의 키인지 찾아서 전달해 주는 함수 */
  _dispatch(code, isDown) {
    // 먼저 '모두의 키'인지 확인 — 이건 1번 세은이 대표로 받아
    const globalAction = GLOBAL_KEYS[code];
    if (globalAction) {
      const p = this.players[0];
      isDown ? p.setDown(globalAction) : p.setUp(globalAction);
      return;
    }

    // 세 친구의 키 이름표를 하나씩 뒤져봐
    for (let i = 0; i < this.players.length; i++) {
      const map = KEY_MAPS[i];
      if (!map) continue;
      const action = map[code];
      if (action) {
        const p = this.players[i];
        isDown ? p.setDown(action) : p.setUp(action);
        return;   // 찾았으면 더 안 뒤져도 돼
      }
    }
  }

  /* 게임에서 쓰는 키인지 확인 (스크롤 막기용) */
  _isGameKey(code) {
    if (GLOBAL_KEYS[code]) return true;
    for (const map of KEY_MAPS) {
      if (map[code]) return true;
    }
    return false;
  }

  /* --- 조종기(게임패드) 듣기 --- */
  _listenGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 조종기 연결됨:', e.gamepad.index, e.gamepad.id);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('🎮 조종기 빠짐:', e.gamepad.index);
    });
  }

  /* -----------------------------------------------------------
     조종기는 "눌렀어요!" 하고 알려주지 않아.
     그래서 우리가 매 순간 "지금 눌렸니?" 하고 물어봐야 해.
     이 함수를 게임이 1초에 60번 불러줄 거야.
     ----------------------------------------------------------- */
  update() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.padIds = [];

    // 연결된 조종기만 골라내기 (빈 자리는 건너뛰어)
    const livePads = [];
    for (const pad of pads) {
      if (pad) livePads.push(pad);
    }

    // 🔌 조이스틱이 빠지거나 새로 꽂혔나?
    //    빠진 순간 누르고 있던 버튼이 '눌린 채로' 남으면
    //    캐릭터가 혼자 계속 미끄러져! → 모두 손 뗀 걸로 해줘
    const sig = livePads.map(p => p.index + ':' + p.id).join('|');
    if (sig !== this.padSig) {
      const before = this.padSig === undefined ? null : (this.padSig ? this.padSig.split('|').length : 0);
      this.padSig = sig;
      this.releaseAll();
      if (before !== null && this.onPadChange) this.onPadChange(before, livePads.length);
    }

    // 배정표(padOwner)대로 조이스틱을 친구들에게 나눠줘
    // 조이스틱이 없는 친구는 키보드를 쓰면 돼!
    for (const pl of this.players) { pl.padIndex = null; pl.padSlot = null; }

    livePads.forEach((pad, slot) => {
      if (slot >= this.players.length) return;   // 조종기가 사람보다 많으면 남는 건 무시
      const player = this.players[this.padOwner[slot]];
      player.padIndex = pad.index;
      player.padSlot = slot;                      // 몇 번째 조이스틱인지 (0부터)
      this.padIds[slot] = pad.id;

      // --- SELECT 버튼(8번) → 이 조이스틱으로 조종할 친구 바꾸기 ---
      const sel = !!(pad.buttons[8] && pad.buttons[8].pressed);
      const selKey = slot + '-select';
      if (sel && !this.lastPadState[selKey]) {
        this.lastPadState[selKey] = true;
        this.cyclePad(slot);
        return;                                   // 이번 장면은 여기까지!
      }
      this.lastPadState[selKey] = sel;

      // --- 버튼 확인 ---
      // XINPUT 이면 표준 배치, DINPUT 이면 PS3 배치 표를 써
      const table = pad.mapping === 'standard' ? PAD_BUTTONS : PAD_BUTTONS_DINPUT;
      pad.buttons.forEach((btn, num) => {
        const action = table[num];
        if (!action) return;

        const key = slot + '-' + num;             // 예: "0-2" = 1번 조종기의 2번 버튼
        const wasDown = this.lastPadState[key];   // 아까는 눌려 있었나?
        const isDown = btn.pressed;               // 지금은 눌려 있나?

        // 방금 막 눌렸다면 → setDown
        if (isDown && !wasDown) player.setDown(action);
        // 방금 손을 뗐다면 → setUp
        if (!isDown && wasDown) player.setUp(action);

        this.lastPadState[key] = isDown;          // 지금 상태를 기억해 둬
      });

      // --- 방향 스틱 확인 ---
      // axes[0] 은 좌우, axes[1] 은 위아래 기울기야.
      // -1은 왼쪽/위, +1은 오른쪽/아래, 0은 가운데.
      // DEAD 는 '이만큼은 기울어야 진짜 움직인 걸로 쳐줄게' 하는 기준선이야.
      // 스틱이 살짝 삐뚤어져 있어도 저절로 움직이지 않게 해주는 거지!
      const DEAD = 0.5;
      const x = pad.axes[0] || 0;
      const y = pad.axes[1] || 0;

      // DINPUT 모드 + 스틱 스위치 DP 이면, 방향이 '햇 스위치'라는
      // 특별한 숫자 하나로 와. 그것도 읽어줘!
      const hat = readHat(pad);

      // 표준 배치의 십자패드 버튼(12~15번)
      const dp = (n) => pad.mapping === 'standard' && !!(pad.buttons[n] && pad.buttons[n].pressed);

      // 스틱 · 십자패드 · 햇 중 '하나라도' 그쪽이면 그 방향!
      this._stick(player, slot, 'left',  x < -DEAD || hat.left  || dp(14));
      this._stick(player, slot, 'right', x >  DEAD || hat.right || dp(15));
      this._stick(player, slot, 'up',    y < -DEAD || hat.up    || dp(12));
      this._stick(player, slot, 'down',  y >  DEAD || hat.down  || dp(13));
    });
  }

  /* 스틱 방향도 버튼처럼 '방금 눌렸는지' 알아내는 도우미 */
  _stick(player, slot, action, isDown) {
    const key = slot + '-axis-' + action;
    const wasDown = this.lastPadState[key];

    if (isDown && !wasDown) player.setDown(action);
    if (!isDown && wasDown) player.setUp(action);

    this.lastPadState[key] = isDown;
  }

  /* -----------------------------------------------------------
     🕹️ 조이스틱 배정 바꾸기
     slot 번째 조이스틱이 player 번 친구를 조종하게 해.
     그 친구를 이미 다른 조이스틱이 조종하고 있으면 서로 바꿔줘!
     ----------------------------------------------------------- */
  setPadOwner(slot, player) {
    const other = this.padOwner.indexOf(player);
    if (other === slot) return;
    if (other >= 0) this.padOwner[other] = this.padOwner[slot];   // 자리 바꾸기
    this.padOwner[slot] = player;

    // 바뀌는 순간 누르고 있던 버튼이 '눌린 채로' 남지 않게 모두 떼어줘
    this.releaseAll();

    savePadOwner(this.padOwner);
    if (this.onOwnerChange) this.onOwnerChange(slot, player);
  }

  /* 모든 버튼에서 손을 뗀 걸로 해주기 (SELECT 기억은 남겨둬) */
  releaseAll() {
    for (const pl of this.players) {
      for (const a of ACTIONS) { pl.held[a] = false; pl.pressed[a] = false; }
    }
    for (const key in this.lastPadState) {
      if (!key.endsWith('-select')) this.lastPadState[key] = false;
    }
  }

  /* SELECT 를 누를 때마다 다음 친구로 (다영 → 태준 → 세은 → 다영 …) */
  cyclePad(slot) {
    this.setPadOwner(slot, (this.padOwner[slot] + 1) % this.players.length);
  }

  /* 한 장면이 끝날 때마다 '막 눌림' 표시를 지워줘 */
  endFrame() {
    for (const p of this.players) p.clearPressed();
  }

  /* 조종기가 몇 대 연결됐는지 세어주는 함수 */
  connectedPadCount() {
    return this.players.filter(p => p.padIndex !== null).length;
  }
}


/* -----------------------------------------------------------
   🕹️ 조이스틱 배정을 브라우저에 기억해 두기
   새로고침해도 '조이스틱 1번 = 다영' 같은 설정이 그대로 남아.
   (기억하는 기능이 막혀 있는 브라우저도 있어서 try 로 감싸 둬)
   ----------------------------------------------------------- */
function loadPadOwner() {
  try {
    const v = JSON.parse(localStorage.getItem('padOwner'));
    if (Array.isArray(v) && v.length === 3 && [0, 1, 2].every(n => v.includes(n))) return v;
  } catch (e) { /* 기억이 없으면 기본값을 써 */ }
  return null;
}

function savePadOwner(v) {
  try { localStorage.setItem('padOwner', JSON.stringify(v)); } catch (e) { /* 못 기억해도 괜찮아 */ }
}


/* -----------------------------------------------------------
   🧭 햇 스위치(십자 방향) 읽기 — DINPUT 모드에서만 쓰여

   윈도우 크롬에서는 9번 축(axes[9])에 숫자 하나로 와:
     -1 = 위, -0.71 = 오른쪽위, -0.43 = 오른쪽, -0.14 = 오른쪽아래,
     0.14 = 아래, 0.43 = 왼쪽아래, 0.71 = 왼쪽, 1 = 왼쪽위
     아무것도 안 누르면 1보다 큰 숫자(약 1.29)
   ----------------------------------------------------------- */
function readHat(pad) {
  const none = { up: false, down: false, left: false, right: false };
  if (pad.mapping === 'standard') return none;    // 표준 배치는 12~15번 버튼으로 와
  const v = pad.axes[9];
  if (v === undefined || v > 1.05 || v < -1.05) return none;

  // 8방향 중 몇 번째인지 (0=위부터 시계 방향)
  const dir = Math.round((v + 1) * 3.5) % 8;
  return {
    up:    dir === 7 || dir === 0 || dir === 1,
    right: dir === 1 || dir === 2 || dir === 3,
    down:  dir === 3 || dir === 4 || dir === 5,
    left:  dir === 5 || dir === 6 || dir === 7
  };
}
