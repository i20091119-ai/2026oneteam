/* ===========================================================
   🤖 처음부터 엔딩까지 자동으로 해 보는 테스트
   -----------------------------------------------------------
   진짜 입력만 써요: 세은 = WASD 키, 태준 = 화살표 키, 다영 = (가짜) 조이스틱
   봇이 길을 찾아 걷고, 가구를 조사하고, 버튼을 밟아 문을 열어 주고,
   키패드에 답을 넣고, 엔딩까지 가는지 확인해요.

   실행:  node test/run-playthrough.mjs            (조이스틱 XINPUT 모드)
          node test/run-playthrough.mjs mac        (맥 DINPUT 모드)
   필요한 것: Node.js + Playwright (npm i -g playwright)
   =========================================================== */
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
// 저장소 맨 위 폴더 (이 파일은 test/ 안에 있어)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = {'.js':'text/javascript','.css':'text/css','.png':'image/png','.html':'text/html; charset=utf-8'};
const mac = process.argv[2] === 'mac';
const port = 8930 + Math.floor(Math.random() * 50);
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const p = path.join(root, u);
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, {'Content-Type': types[path.extname(p)] || 'text/plain'}); r.end(d); }); }).listen(port);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1280, height: 800 },
  userAgent: mac ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' : undefined });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
pg.on('console', m => { const t = m.text(); if (t.startsWith('BOT')) console.log(t.slice(4)); });
await pg.addInitScript((mac) => {
  window.__pad = { id: mac ? 'Generic USB Joystick (DINPUT)' : 'Fake XInput Arcade Stick', index: 0, connected: true, mapping: mac ? '' : 'standard',
    buttons: Array.from({length: 17}, () => ({pressed: false, value: 0})), axes: [0,0,0,0], timestamp: 0 };
  navigator.getGamepads = () => [window.__pad];
  try { localStorage.clear(); } catch (e) {}
}, mac);
await pg.goto(`http://localhost:${port}/`); await pg.waitForTimeout(800);
await pg.addScriptTag({ path: path.join(root, 'test', 'playthrough-bot.js') });
const res = await pg.evaluate(() => window.__bot());
console.log(JSON.stringify(res, null, 1));
console.log('page errors:', errs);
if (!res.ok || errs.length) process.exitCode = 1;
await b.close(); srv.close();
