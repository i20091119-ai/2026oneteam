/* ===========================================================
   🪤 억울한 함정 찾기
   -----------------------------------------------------------
   모든 방에서 아래를 확인해요 (문은 다 열리고 발판은 다 생긴 걸로 치고).
   - 출구 · 자물쇠 · 버튼 · 숫자 장치 · 문제 가구까지
     웅덩이·가시·숫자 칸에서 12픽셀 넘게 떨어져서 걸어갈 수 있나?
   - 정답 숫자 칸마다, 다른 숫자 칸을 안 밟고(12픽셀 떨어져서) 걸어갈 수 있나?
   실행:  node test/check-traps.mjs     → '좁은 길 없음' 이 나오면 통과!
   =========================================================== */
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = {'.js':'text/javascript','.css':'text/css','.png':'image/png','.html':'text/html; charset=utf-8'};
const port = 8980 + Math.floor(Math.random() * 15);
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const p = path.join(root, u);
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, {'Content-Type': types[path.extname(p)] || 'text/plain'}); r.end(d); }); }).listen(port);
const b = await chromium.launch(); const pg = await b.newPage();
pg.on('pageerror', e => console.log('ERR', e.message));
await pg.goto(`http://localhost:${port}/`); await pg.waitForTimeout(500);
const out = await pg.evaluate(() => {
  const C = 3, GW = 320, GH = 180, FOOT = 20;
  const hitF = (x, y, h, b, m = 0) => x - 15 - m < b.x + b.w && x + 15 + m > b.x && y - h - m < b.y + b.h && y + m > b.y;
  const near = (x, y, r, pad) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
  const res = [];
  startGame();
  STAGES.forEach((st, si) => st.sections.forEach((sec, i) => {
    game.stageIndex = si; game.sectionIndex = i; loadSection();
    const tag = st.name + ' · ' + sec.name;
    const solids = sec.walls.concat(sec.waters || []);
    function map(pad, wallPad, allowTile) {
      const m = new Uint8Array(GW * GH);
      for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
        const x = gx * C, y = gy * C;
        let bad = solids.some(w => hitF(x, y, FOOT, w, wallPad));
        if (!bad) bad = (sec.puddles || []).some(w => near(x, y, w, pad));
        if (!bad) bad = (sec.spikes || []).some(s => hitF(x, y, FOOT, s, pad));
        if (!bad) bad = (sec.puzzles || []).some(pz => pz.tiles && [...Array(10).keys()].some(d =>
          !(allowTile && allowTile.pz === pz.id && allowTile.d === d) && near(x, y, tileRect(pz, d), pad)));
        m[gy * GW + gx] = bad ? 1 : 0;
      }
      return m;
    }
    function reach(m, from, goal) {
      const s = Math.round(from.y / C) * GW + Math.round(from.x / C);
      const seen = new Uint8Array(GW * GH); const q = [s]; seen[s] = 1;
      for (let k = 0; k < q.length; k++) {
        const c = q[k], x = (c % GW) * C, y = ((c / GW) | 0) * C;
        if (goal(x, y)) return true;
        for (const n of [c + 1, c - 1, c + GW, c - GW]) {
          if (n < 0 || n >= GW * GH || seen[n] || m[n]) continue;
          seen[n] = 1; q.push(n);
        }
      }
      return false;
    }
    const sp = sec.spawns[0];
    const targets = [];
    if (sec.exit) targets.push(['출구', b => (x, y) => hitF(x, y, FOOT, sec.exit)]);
    if (sec.lock) targets.push(['자물쇠', b => (x, y) => hitF(x, y, 48, sec.lock)]);
    (sec.buttons || []).forEach((bt, k) => targets.push(['버튼' + k + '(' + HEROES[bt.color].name + ')', b => (x, y) => hitF(x, y, FOOT, bt)]));
    (sec.puzzles || []).filter(p => p.at).forEach(p => targets.push(['장치 ' + p.id, b => (x, y) => hitF(x, y, 48, p.at)]));
    (sec.objects || []).filter(o => o.kind !== 'empty').forEach(o => targets.push([o.name, b => (x, y) => hitF(x, y, 48, o)]));
    const PAD = 12, WALLPAD = 6;
    const m = map(PAD, WALLPAD, null);
    for (const [name, mk] of targets) if (!reach(m, sp, mk())) res.push([tag, name + ' — 가는 길이 좁아요 (함정에서 12픽셀 안쪽으로 지나가야 함)']);
    for (const pz of (sec.puzzles || []).filter(p => p.tiles)) for (const d of String(pz.answer).split('').map(Number)) {
      const r = tileRect(pz, d);
      if (!reach(map(PAD, WALLPAD, { pz: pz.id, d }), sp, (x, y) => x > r.x + 5 && x < r.x + r.w - 5 && y > r.y + 5 && y < r.y + r.h - 5))
        res.push([tag, '정답 칸 ' + d + ' — 다른 칸 12픽셀 안쪽으로 지나가야 함']);
    }
  }));
  return res;
});
console.log(out.map(x => x.join(' | ')).join('\n') || '좁은 길 없음');
if (out.length) process.exitCode = 1;
await b.close(); srv.close();
