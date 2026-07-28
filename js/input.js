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
  7: 'pause',     // RT / R2 정지
  // 십자패드(D-pad)를 버튼으로 보내는 조종기도 있어서 같이 적어둬
  12: 'up', 13: 'down', 14: 'left', 15: 'right'
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

    // 조종기를 순서대로 세은 → 다영 → 태준에게 나눠줘
    // 조종기가 2대면 세은·다영이 쓰고, 태준이는 키보드를 쓰면 돼!
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].padIndex = livePads[i] ? livePads[i].index : null;
    }

    livePads.forEach((pad, slot) => {
      if (slot >= this.players.length) return;   // 조종기가 사람보다 많으면 남는 건 무시
      const player = this.players[slot];
      this.padIds[slot] = pad.id;

      // --- 버튼 확인 ---
      pad.buttons.forEach((btn, num) => {
        const action = PAD_BUTTONS[num];
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

      this._stick(player, slot, 'left',  x < -DEAD);
      this._stick(player, slot, 'right', x >  DEAD);
      this._stick(player, slot, 'up',    y < -DEAD);
      this._stick(player, slot, 'down',  y >  DEAD);
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

  /* 한 장면이 끝날 때마다 '막 눌림' 표시를 지워줘 */
  endFrame() {
    for (const p of this.players) p.clearPressed();
  }

  /* 조종기가 몇 대 연결됐는지 세어주는 함수 */
  connectedPadCount() {
    return this.players.filter(p => p.padIndex !== null).length;
  }
}
