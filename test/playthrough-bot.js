/* 진짜 입력만으로 게임을 끝까지 하는 봇
   세은 = WASD 키, 태준 = 화살표 키, 다영 = 가짜 조이스틱 (표준 배치)
   길찾기: 게임의 hitBox/getSolids 를 그대로 써서 벽·가시·웅덩이·틀린 숫자 칸을 피함 */
(() => {
  const log = (...a) => console.log('BOT', ...a);
  const KEYS = [
    { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', act: 'KeyE', jump: 'Space', hint: 'KeyQ' },
    null, // 다영 = 조이스틱
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', act: 'Slash', jump: 'Enter', hint: 'Period' }
  ];
  const held = [new Set(), new Set(), new Set()];
  const pad = window.__pad;

  function key(code, down) {
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  }
  function setDirs(p, dirs) {
    if (p === 1) {
      pad.axes[0] = dirs.has('left') ? -1 : dirs.has('right') ? 1 : 0;
      pad.axes[1] = dirs.has('up') ? -1 : dirs.has('down') ? 1 : 0;
      return;
    }
    const k = KEYS[p];
    for (const d of ['up', 'down', 'left', 'right']) {
      const want = dirs.has(d), has = held[p].has(d);
      if (want && !has) { key(k[d], true); held[p].add(d); }
      if (!want && has) { key(k[d], false); held[p].delete(d); }
    }
  }
  const frame = () => new Promise(r => requestAnimationFrame(r));
  const frames = async n => { for (let i = 0; i < n; i++) await frame(); };
  async function press(p, what) {          // what: 'act' | 'jump' | 'hint'
    if (p === 1) {
      const n = { act: 3, jump: 2, hint: 4 }[what];
      pad.buttons[n].pressed = true; pad.buttons[n].value = 1; await frames(3);
      pad.buttons[n].pressed = false; pad.buttons[n].value = 0; await frames(3);
      return;
    }
    key(KEYS[p][what], true); await frames(3); key(KEYS[p][what], false); await frames(3);
  }

  /* ---------- 길찾기 ---------- */
  const C = 5;                              // 칸 크기 (픽셀)
  const GW = Math.ceil(960 / C), GH = Math.ceil(540 / C);
  const P_W_ = 30, FOOT = 20, PH = 48;
  function boxHit(x, y, h, b) {
    return x - P_W_ / 2 < b.x + b.w && x + P_W_ / 2 > b.x && y - h < b.y + b.h && y > b.y;
  }
  // 칸 값: 0 = 걸어갈 수 있음, 1 = 막힘(벽·가시), 2 = 점프로만 지나감(웅덩이·틀린 숫자 칸)
  function blockedMap(p, allow) {
    const sec = currentSection();
    const solids = getSolids(sec);
    const map = new Uint8Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const x = gx * C, y = gy * C;
      // 벽에서 3픽셀 떨어져서 걷기 (딱 붙으면 모서리에 걸려)
      // 3 = 진짜 벽은 아니고 '여유 거리'만 모자란 칸 (거기서 출발했을 때만 지나갈 수 있어)
      let v = solids.some(w => boxHit(x, y, FOOT, w)) ? 1
            : solids.some(w => x - 18 < w.x + w.w && x + 18 > w.x && y - FOOT - 3 < w.y + w.h && y + 3 > w.y) ? 3 : 0;
      if (!v && (sec.spikes || []).some(s => boxHit(x, y, PH, s))) v = 1;
      if (!v && (sec.puddles || []).some(w => x > w.x - 4 && x < w.x + w.w + 4 && y > w.y - 4 && y < w.y + w.h + 4)) v = 2;
      if (!v) for (const pz of (sec.puzzles || [])) {
        if (pz.type === 'device' || game.solved.has(pz.id)) continue;
        for (let d = 0; d < 10; d++) {
          if (allow && allow.pz === pz.id && allow.d === d) continue;
          const r = tileRect(pz, d);
          if (x >= r.x - 3 && x <= r.x + r.w + 3 && y >= r.y - 3 && y <= r.y + r.h + 3) { v = 2; break; }
        }
        if (v) break;
      }
      map[gy * GW + gx] = v;
    }
    return map;
  }
  // 문간(문이 있는 자리)에서는 멈춰 서지 않기 — 문이 닫히면 밀려나니까
  function inDoor(x, y) {
    return (currentSection().doors || []).some(d => x - 18 < d.x + d.w && x + 18 > d.x && y - FOOT - 3 < d.y + d.h && y + 3 > d.y);
  }
  function bfs(p, goalFn, allow) {
    const pl = game.players[p];
    const map = blockedMap(p, allow);
    // 먼저 점프 없이 가는 길 → 없으면 점프해서 넘어가는 길
    for (const jumpOk of [false, true]) {
      const sx = Math.round(pl.x / C), sy = Math.round(pl.y / C);
      const prev = new Int32Array(GW * GH).fill(-1);
      const q = [sy * GW + sx]; prev[q[0]] = q[0];
      let found = -1;
      for (let qi = 0; qi < q.length; qi++) {
        const c = q[qi], cx = c % GW, cy = (c / GW) | 0;
        if (goalFn(cx * C, cy * C) && map[c] !== 2 && map[c] !== 3 && !inDoor(cx * C, cy * C)) { found = c; break; }
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
          const n = ny * GW + nx;
          if (prev[n] !== -1 || map[n] === 1 || (map[n] === 2 && !jumpOk)) continue;
          if (map[n] === 3 && map[c] !== 3) continue;     // 여유 칸은 '빠져나올 때만'
          prev[n] = c; q.push(n);
        }
      }
      if (found < 0) continue;
      const path = [];
      for (let c = found; c !== prev[c]; c = prev[c]) path.push(c);
      path.reverse();
      return path.map(c => ({ x: (c % GW) * C, y: ((c / GW) | 0) * C, jump: map[c] === 2 }));
    }
    return null;
  }

  /* ---------- 목표 따라 움직이기 (매 장면) ---------- */
  const goals = [null, null, null];          // { fn, allow, path, t, done }
  let tick = 0;
  function driver() {
    tick++;
    if (game.screen === 'game' && !game.lockOpen && !game.paused) {
      for (let p = 0; p < 3; p++) {
        const g = goals[p];
        const pl = game.players[p];
        if (!g) { setDirs(p, new Set()); continue; }
        if (g.fn(pl.x, pl.y)) { g.done = true; setDirs(p, new Set()); continue; }
        g.done = false;
        if (!g.path || tick - g.t > 6) { g.path = bfs(p, g.fn, g.allow); g.t = tick; }
        if (!g.path || !g.path.length) { setDirs(p, new Set()); continue; }
        // 앞에 웅덩이·틀린 숫자 칸이 있으면 폴짝! (공중에서는 안 밟은 걸로 쳐)
        if (pl.z === 0 && !g.jumping && g.path.slice(0, 4).some(c => c.jump)) {
          g.jumping = true;
          press(p, 'jump').then(() => { g.jumping = false; });
        }
        const wp = g.path[Math.min(2, g.path.length - 1)];
        const dx = wp.x - pl.x, dy = wp.y - pl.y, dirs = new Set();
        // 제자리에 멈춰 있으면(벽에 1픽셀 걸림) 잠깐 '정밀 모드'로 아주 조금씩 맞춰
        if (g.lx === pl.x && g.ly === pl.y) g.still = (g.still || 0) + 1; else g.still = 0;
        g.lx = pl.x; g.ly = pl.y;
        const dz = (g.path.length <= 1 || g.still > 6) ? 0.3 : 1.5;
        if (dx > dz) dirs.add('right'); if (dx < -dz) dirs.add('left');
        if (dy > dz) dirs.add('down');  if (dy < -dz) dirs.add('up');
        setDirs(p, dirs);
      }
    } else {
      for (let p = 0; p < 3; p++) setDirs(p, new Set());
    }
    requestAnimationFrame(driver);
  }
  requestAnimationFrame(driver);

  async function until(cond, what, sec = 60) {
    const t0 = performance.now();
    while (!cond()) {
      if (performance.now() - t0 > sec * 1000) {
        const st = game.players.map(p => [Math.round(p.x), Math.round(p.y)]);
        throw new Error('시간 초과: ' + what + ' @ ' + currentSection().name + ' 위치 ' + JSON.stringify(st) +
          ' 목표길 ' + goals.map(g => g ? (g.path ? g.path.length : 'X') : '-').join(','));
      }
      await frame();
    }
  }
  const center = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const near = (pt, r = 4) => (x, y) => Math.abs(x - pt.x) <= r && Math.abs(y - pt.y) <= r;
  const touch = box => (x, y) => boxHit(x, y, PH, box);           // 조사할 수 있는 거리
  const onBtn = b => (x, y) => x > b.x + 8 && x < b.x + b.w - 8 && y > b.y + 12 && y < b.y + b.h - 2;
  function goTo(p, fn, allow) { goals[p] = { fn, allow }; }
  async function reach(p, fn, what, allow) { goTo(p, fn, allow); await until(() => goals[p].done, what); }

  const sec = () => currentSection();
  const obj = name => sec().objects.find(o => o.name === name);
  const btn = color => (excludeIdx) => sec().buttons.filter((b, i) => b.color === color && i !== excludeIdx);

  async function collect(p, name) {
    const o = obj(name);
    // 가구 바로 아래쪽 가운데로 가서 조사 (사람이 하듯이)
    await reach(p, (x, y) => boxHit(x, y, PH, o) && Math.abs(x - (o.x + o.w / 2)) < Math.max(8, o.w / 2 - 10), name + ' 가까이');
    const before = game.clues.length;
    for (let k = 0; k < 3 && !o.taken; k++) { await press(p, 'act'); await frames(6); }
    if (o.kind !== 'empty' && !game.clues.some(c => c.name === name)) throw new Error('단서를 못 얻음: ' + name);
    log('  📓 단서', name);
  }
  async function typeKeypad(text) {
    for (const ch of String(text) + '✓') {
      const target = ch === '✓' ? 11 : ch === '0' ? 10 : Number(ch) - 1;
      while (game.cursor !== target) { key('KeyD', true); await frames(2); key('KeyD', false); await frames(2); }
      key('KeyE', true); await frames(2); key('KeyE', false); await frames(3);
    }
  }
  async function device(p, id) {
    const pz = sec().puzzles.find(z => z.id === id);
    await reach(p, touch(pz.at), '장치 ' + id);
    // 옆에 아직 안 뒤진 가구가 있으면 그게 먼저 열려 → 사람처럼 한 번 더 눌러
    for (let k = 0; k < 4 && !game.lockOpen; k++) { await press(p, 'act'); await frames(10); }
    await until(() => game.lockOpen, '키패드 열림', 5);
    for (let k = 0; k < 3; k++) goals[k] = null;
    await typeKeypad(pz.answer);
    await until(() => game.solved.has(id), '장치 정답 ' + id, 5);
    log('  🔢 장치', id, '=', pz.answer, '→ 발판!');
  }
  async function tileStep(p, id, digit) {
    const pz = sec().puzzles.find(z => z.id === id);
    const r = tileRect(pz, digit);
    // 발 위치가 숫자 칸 안쪽(가장자리에서 6픽셀 안)에 들어가면 OK
    await reach(p, (x, y) => x > r.x + 6 && x < r.x + r.w - 6 && y > r.y + 8 && y < r.y + r.h - 4, '숫자 칸 ' + digit, { pz: id, d: digit });
  }
  async function team(id, order) {           // order[p] = 그 친구가 밟을 숫자
    const pz = sec().puzzles.find(z => z.id === id);
    await Promise.all([0, 1, 2].map(p => tileStep(p, id, order[p])));
    await until(() => game.solved.has(id), '셋이 밟기 ' + id, 10);
    log('  🟩 셋이 밟기', id, '→ 발판!');
  }
  async function hold(p, color, which = 0) {
    const b = sec().buttons.filter(b => b.color === color)[which];
    await reach(p, onBtn(b), HEROES[p].name + ' 버튼 밟기');
    await until(() => b.on, '버튼 눌림', 5);
  }
  async function lockOpen(p, pw) {
    await reach(p, touch(sec().lock), '자물쇠');
    for (let k = 0; k < 4 && !game.lockOpen; k++) { await press(p, 'act'); await frames(10); }
    await until(() => game.lockOpen, '자물쇠 창', 5);
    for (let k = 0; k < 3; k++) goals[k] = null;
    await typeKeypad(pw);
  }
  async function exitAll() {
    const e = sec().exit;
    const name = sec().name;
    await Promise.all([0, 1, 2].map(p => { goTo(p, (x, y) => boxHit(x, y, PH, { x: e.x + 8, y: e.y + 8, w: e.w - 16, h: e.h - 16 })); }));
    await until(() => currentSection().name !== name || game.screen !== 'game', '출구', 60);
    for (let k = 0; k < 3; k++) goals[k] = null;
  }
  const area = (x0, x1, y0 = 0, y1 = 540) => (x, y) => x > x0 && x < x1 && y > y0 && y < y1;

  /* ---------- 방마다 푸는 순서 (각 방 주석의 '푸는 방법' 그대로) ---------- */
  const SOLVE = {
    '기내 통로': async () => {
      await collect(0, '서비스 카트');
      await tileStep(2, 'r1', 6);                           // 숫자 칸은 왼쪽 칸에 있어
      await until(() => game.solved.has('r1'), '발판 r1', 5); log('  🟨 숫자 칸 6 → 발판!');
      await hold(1, 1);                                     // 다영 노랑 버튼
      goTo(0, area(500, 680, 300, 360)); goTo(2, area(500, 680, 300, 360));
      await until(() => goals[0].done && goals[2].done, '세은·태준 건너기');
      await hold(0, 0);                                     // 세은 초록 버튼
      await reach(1, area(500, 680, 300, 360), '다영 건너기');
      await exitAll();
    },
    '흔들리는 객실': async () => {
      await Promise.all([(async () => { await collect(0, '1B 좌석'); await collect(0, '1C 좌석'); })(),
                         (async () => { await collect(2, '2B 좌석'); await collect(2, '2D 좌석'); })()]);
      await device(0, 'r2');
      await hold(2, 2);                                     // 태준 빨강 버튼
      goTo(0, area(710, 850, 230, 280)); goTo(1, area(710, 850, 230, 280));
      await until(() => goals[0].done && goals[1].done, '세은·다영 건너기');
      await hold(0, 0);                                     // 세은 초록 버튼
      await reach(2, area(710, 850, 230, 280), '태준 건너기');
      await exitAll();
    },
    '조종실': async () => {
      await collect(0, '계기판'); await collect(1, '비행일지'); await collect(2, '기장 노트');
      await team('r3', [1, 0, 2]);
      await lockOpen(0, '1289');
    },
    '1학년 교실': async () => {
      await collect(0, '첫째 줄 책상');
      await hold(0, 0, 0);                                  // ① 세은 첫 칸 초록 버튼
      await Promise.all([reach(1, area(380, 600, 240, 290), '다영 가운데 칸'),
                         reach(2, area(650, 750, 270, 300), '태준 끝 칸')]);
      await hold(2, 2);                                     // ③ 태준 빨강 버튼
      await reach(0, area(380, 600, 330, 370), '세은 가운데 칸');
      await hold(1, 1);                                     // ⑤ 다영 노랑 버튼
      await reach(0, area(650, 750, 400, 450), '세은 끝 칸');
      await hold(0, 0, 1);                                  // ⑦ 세은 끝 칸 초록 버튼
      await reach(1, area(650, 750, 170, 230), '다영 끝 칸');
      await collect(1, '칠판');
      await device(1, 's1');
      await exitAll();
    },
    '어두운 복도': async () => {
      await collect(0, '2번 사물함'); await collect(2, '3번 사물함');
      await tileStep(1, 's2a', 4);
      await until(() => game.solved.has('s2a'), '발판 s2a', 5); log('  🟨 숫자 칸 4 → 발판!');
      await Promise.all([0, 1, 2].map(p => reach(p, area(360, 590, 150, 210), '둘째 칸')));
      await collect(0, '5번 사물함'); await collect(2, '6번 사물함');
      await team('s2b', [6, 5, 4]);
      await hold(1, 1);                                     // 다영 노랑 버튼
      goTo(0, area(640, 750, 290, 340)); goTo(2, area(640, 750, 290, 340));
      await until(() => goals[0].done && goals[2].done, '세은·태준 셋째 칸');
      await hold(0, 0);                                     // 세은 초록 버튼
      await reach(1, area(640, 750, 230, 290), '다영 셋째 칸');
      await exitAll();
    },
    '교무실': async () => {
      await collect(0, '서류함'); await collect(1, '알림판'); await collect(2, '출석부 더미');
      await device(2, 's3');
      await lockOpen(2, '9610');
    },
    '에어록': async () => {
      await collect(0, '보급 상자');
      await hold(0, 0, 0);                                  // ① 세은 초록 버튼
      await Promise.all([reach(1, area(380, 590, 160, 220), '다영 가운데'), reach(2, area(380, 590, 160, 220), '태준 가운데')]);
      await hold(2, 2);                                     // ② 태준 빨강 버튼
      await reach(0, area(380, 590, 180, 220), '세은 가운데');
      await collect(0, '로봇 카트');
      await tileStep(1, 'u1', 5);                           // ③ 숫자 칸 5
      await until(() => game.solved.has('u1'), '발판 u1', 5); log('  🟨 숫자 칸 5 → 발판!');
      await hold(1, 1);                                     // ④ 다영 노랑 버튼
      goTo(0, area(640, 750, 180, 240)); goTo(2, area(640, 750, 180, 240));
      await until(() => goals[0].done && goals[2].done, '세은·태준 끝 칸');
      await hold(0, 0, 1);                                  // ⑤ 세은 끝 칸 초록 버튼
      await reach(1, area(640, 750, 300, 360), '다영 끝 칸');
      await exitAll();
    },
    '우주 식물 연구실': async () => {
      await collect(0, '실험복 사물함'); await collect(2, '실험 노트');
      await device(0, 'u2a');
      await Promise.all([0, 1, 2].map(p => reach(p, area(360, 590, 150, 210), '가운데 칸')));
      await collect(0, '씨앗 상자'); await collect(2, '물 재활용기');
      await team('u2b', [3, 2, 1]);
      await hold(2, 2);                                     // 태준 빨강 버튼
      goTo(0, area(640, 750, 180, 240)); goTo(1, area(640, 750, 180, 240));
      await until(() => goals[0].done && goals[1].done, '세은·다영 끝 칸');
      await hold(1, 1);                                     // 다영 노랑 버튼
      await reach(2, area(640, 750, 180, 240), '태준 끝 칸');
      await exitAll();
    },
    '함교': async () => {
      await collect(0, '항법 컴퓨터'); await collect(2, '함장 의자');
      await press(0, 'hint');                               // 💡 힌트도 한 번 눌러 보기
      if (sec().hintsShown !== 1) throw new Error('힌트가 안 나옴');
      log('  💡 힌트 확인 (+15초)');
      await hold(2, 2);                                     // 태준 빨강 버튼
      goTo(0, area(400, 600, 250, 300)); goTo(1, area(400, 600, 250, 300));
      await until(() => goals[0].done && goals[1].done, '세은·다영 가운데');
      await hold(0, 0);                                     // 세은 초록 버튼
      await reach(2, area(400, 600, 250, 300), '태준 가운데');
      await collect(1, '별자리 지도');
      await device(1, 'u3');
      await lockOpen(1, '3574');
    }
  };

  window.__botDbg = { bfs, goals, goTo, area, blockedMap, inDoor, GW, C };
  window.__bot = async () => {
    const report = [];
    try {
      // 시작 화면: 세은 점프키(Space)로 Play
      await frames(30);
      key('Space', true); await frames(3); key('Space', false);
      await until(() => game.screen === 'game', '게임 시작', 5);
      let t0 = performance.now();
      while (true) {
        if (game.screen === 'game') {
          const name = sec().name;
          log('▶', currentStage().name, '·', name);
          const rt = performance.now();
          await SOLVE[name]();
          report.push([currentStage().name, name, ((performance.now() - rt) / 1000).toFixed(1) + '초']);
        }
        if (game.screen === 'clear') {
          const st = STAGES[game.stageIndex];
          log('🎉 클리어', st.name, '게임 시계', formatTime(game.elapsed, true), '별', game.stars);
          report.push(['클리어', st.name, '게임 시계 ' + game.elapsed.toFixed(1) + '초']);
          await frames(60);
          const last = game.stageIndex === STAGES.length - 1;
          const first = currentMenuButtons()[menuIndex];
          log('  끝 화면 첫 버튼:', first && first.id);
          key('Space', true); await frames(3); key('Space', false);
          if (last) {
            await until(() => game.screen === 'ending', '엔딩 화면', 5);
            for (let i = 0; i < ENDING.length - 1; i++) { await frames(20); key('Enter', true); await frames(3); key('Enter', false); }
            await frames(20);
            log('🎬 엔딩 마지막 장면:', endScene + 1, '/', ENDING.length, '·', document.getElementById('endStats').textContent);
            report.push(['엔딩', '장면 ' + (endScene + 1) + '/' + ENDING.length, document.getElementById('endStats').textContent]);
            break;
          }
          await until(() => game.screen === 'game', '다음 스테이지', 5);
        }
        await frame();
      }
      return { ok: true, report, total: ((performance.now() - t0) / 1000).toFixed(1) };
    } catch (e) {
      return { ok: false, error: e.message, report };
    }
  };
})();
