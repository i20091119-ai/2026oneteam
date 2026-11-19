/* ===========================================================
   audio.js — 소리 담당 부품 🔊
   -----------------------------------------------------------
   음악 파일을 하나도 안 쓰고, 컴퓨터가 직접 소리를 '만들어서' 내.
   이걸 Web Audio 라고 불러.

   소리는 사실 '떨림'이야. 1초에 몇 번 떨리는지를 정해주면
   컴퓨터가 그 떨림을 스피커로 보내줘서 소리가 나!
   - 적게 떨리면(낮은 숫자) → 낮은 소리 (도)
   - 많이 떨리면(큰 숫자)   → 높은 소리 (높은 도)
   =========================================================== */

class SoundBox {
  constructor() {
    this.ctx = null;     // 소리를 만드는 공장 (처음엔 비어 있어)
    this.on = true;      // 소리 켜짐/꺼짐
    this.song = null;    // 🎵 지금 틀고 있는 배경음악 이름
    this.want = null;    // 🎵 틀고 싶은 배경음악 (소리 공장이 켜지면 바로 틀어)
  }

  /* 소리 공장을 켜는 함수.
     브라우저 규칙 때문에 '사용자가 뭔가를 누른 뒤'에만 켤 수 있어서,
     시작 버튼을 누를 때 이 함수를 부를 거야. */
  wake() {
    if (!this.ctx) {
      // 사파리 같은 브라우저는 이름이 조금 달라서 둘 다 확인해
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    // 잠들어 있으면 깨워줘
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // 기다리던 배경음악이 있으면 이제 틀어
    if (this.want && this.song !== this.want) this.music(this.want);
  }

  /* 소리 켜기/끄기 스위치 (배경음악도 같이 꺼져) */
  toggle() {
    this.on = !this.on;
    if (this.musicGain) this.musicGain.gain.value = this.on ? 1 : 0;
    return this.on;
  }

  /* ===========================================================
     🎵 배경음악
     -----------------------------------------------------------
     기획서 10번: "소리는 스테이지에 따라 다르다"
     악보(SONGS)를 보고 음을 조금씩 미리 예약해서 연주해.
     음악이 끝나면 처음으로 돌아가서 계속 반복!
     =========================================================== */
  music(name) {
    this.want = name;
    if (!this.ctx) return;                     // 아직 소리 공장이 안 켜졌으면 나중에
    if (this.song === name) return;            // 이미 그 노래를 틀고 있어

    // 틀던 노래는 스르륵 줄이고 멈춰
    if (this.musicGain) {
      const old = this.musicGain;
      old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      setTimeout(() => old.disconnect(), 800);
    }
    clearInterval(this.timer);
    this.song = name;
    const song = SONGS[name];
    if (!song) return;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.on ? 1 : 0;
    this.musicGain.connect(this.ctx.destination);

    // 악기마다 '다음 음을 칠 시각'과 '몇 번째 음인지'를 기억해
    const start = this.ctx.currentTime + 0.1;
    const beat = 60 / song.bpm;
    const tracks = song.tracks.map(t => ({ ...t, notes: parseNotes(t.notes), i: 0, at: start }));
    const gain = this.musicGain;

    // 0.05초마다 '앞으로 0.25초 안에 칠 음'을 미리 예약해
    this.timer = setInterval(() => {
      const until = this.ctx.currentTime + 0.25;
      for (const t of tracks) {
        while (t.at < until) {
          const [freq, beats] = t.notes[t.i];
          const dur = beats * beat;
          if (freq === 'k') this.kick(t.at, t.vol, gain);
          else if (freq === 'h') this.hat(t.at, t.vol, gain);
          else if (freq > 0) this.tone(freq, t.at, dur * (t.legato || 0.9), t.wave, t.vol, gain);
          t.at += dur;
          t.i = (t.i + 1) % t.notes.length;
        }
      }
    }, 50);
  }

  /* 음 하나 (예약된 시각 when 에) */
  tone(freq, when, dur, wave, vol, out) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.setTargetAtTime(0, when + dur * 0.6, dur * 0.25);
    osc.connect(g); g.connect(out);
    osc.start(when); osc.stop(when + dur + 0.2);
  }

  /* 쿵 (북) */
  kick(when, vol, out) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    osc.connect(g); g.connect(out);
    osc.start(when); osc.stop(when + 0.16);
  }

  /* 칙 (심벌) — '쉬익' 잡음을 아주 짧게 */
  hat(when, vol, out) {
    if (!this.noise) {
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
      const d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = n;
    }
    const src = this.ctx.createBufferSource();
    const hp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    src.buffer = this.noise;
    hp.type = 'highpass'; hp.frequency.value = 6000;
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
    src.connect(hp); hp.connect(g); g.connect(out);
    src.start(when);
  }

  /* -----------------------------------------------------------
     소리 하나를 내는 기본 함수
     freq  = 얼마나 높은 소리인가 (숫자가 클수록 높아)
     dur   = 얼마나 오래 나는가 (초)
     type  = 소리의 성격
             'sine'(부드러움) 'square'(오락실 느낌)
             'triangle'(말랑) 'sawtooth'(거침)
     vol   = 소리 크기
     ----------------------------------------------------------- */
  beep(freq, dur = 0.12, type = 'sine', vol = 0.18) {
    if (!this.on || !this.ctx) return;

    const t = this.ctx.currentTime;

    // 오실레이터 = '떨림을 만드는 기계'
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    // 게인 = '소리 크기 조절 손잡이'
    const gain = this.ctx.createGain();

    // 소리가 갑자기 뚝 끊기면 '틱!' 하고 잡음이 나.
    // 그래서 부드럽게 커졌다가 부드럽게 작아지게 만들어줘.
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);          // 살짝 커지고
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);    // 스르륵 작아져

    // 기계 → 손잡이 → 스피커 순서로 연결해
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  /* 여러 음을 차례로 연주하는 함수 (작은 멜로디를 만들 때 씀) */
  melody(notes, type = 'square', vol = 0.16) {
    if (!this.on || !this.ctx) return;
    let delay = 0;
    for (const [freq, dur] of notes) {
      // setTimeout 은 '조금 이따가 해줘' 라는 뜻이야
      setTimeout(() => this.beep(freq, dur, type, vol), delay * 1000);
      delay += dur;
    }
  }

  /* -----------------------------------------------------------
     게임에서 실제로 쓰는 소리들 🎵
     ----------------------------------------------------------- */

  jump()     { this.beep(520, 0.10, 'square', 0.14); }            // 점프: 뿅!
  land()     { this.beep(180, 0.06, 'sine', 0.10); }              // 착지: 톡
  clue()     { this.melody([[660,.08],[880,.14]], 'triangle'); }  // 단서 획득: 딩동!
  door()     { this.melody([[440,.09],[554,.09],[659,.16]]); }    // 문 열림: 띠리링
  shut()     { this.melody([[420,.07],[260,.13]], 'square', .12); } // 문 닫힘: 쿵!
  wrong()    { this.beep(150, 0.22, 'sawtooth', 0.12); }          // 틀림: 부웅
  select()   { this.beep(700, 0.05, 'square', 0.10); }            // 메뉴 고르기: 딱
  swap()     { this.beep(600, 0.06, 'triangle', 0.10); }          // 캐릭터 바꾸기

  /* 스테이지 클리어! 도-미-솔-높은도 축하 소리 🎉 */
  clear() {
    this.melody([[523,.12],[659,.12],[784,.12],[1047,.30]], 'square', 0.18);
  }
}

/* ===========================================================
   🎼 배경음악 악보
   -----------------------------------------------------------
   '음이름 박자' 를 쉼표로 이어 써.  예) 'C5 1, E5 1, G5 2'
     C D E F G A B = 도 레 미 파 솔 라 시,  # = 반음 올림, b = 반음 내림
     숫자 = 옥타브 (클수록 높은 소리)
     - = 쉼표,  k = 쿵(북),  h = 칙(심벌)
   악기마다 박자를 다 더한 값이 같아야 노래가 어긋나지 않아! (모두 32박)
   =========================================================== */
const rep = (txt, n) => Array(n).fill(txt).join(', ');

const SONGS = {
  // 🏠 시작 화면 — 신나고 밝게
  title: { bpm: 132, tracks: [
    { wave: 'square',   vol: 0.035, notes:
      'E5 1, G5 1, C6 2, B5 1, G5 1, A5 2, G5 1, E5 1, F5 1, D5 1, E5 2, - 2, ' +
      'E5 1, G5 1, C6 2, D6 1, C6 1, A5 2, G5 1, A5 1, B5 1, D6 1, C6 3, - 1' },
    { wave: 'triangle', vol: 0.09, legato: 0.7, notes:
      'C3 2, G3 2, C3 2, G3 2, F3 2, C4 2, G3 2, G2 2, C3 2, G3 2, F3 2, A3 2, G3 2, B2 2, C3 2, G2 2' },
    { vol: 0.05, notes: rep('k 1, h 1', 16) }
  ]},

  // ✈️ 비행기 — 하늘을 나는 듯 가볍게
  plane: { bpm: 108, tracks: [
    { wave: 'triangle', vol: 0.07, notes:
      'C5 1, F5 1, A5 1, C6 1, A5 2, F5 2, G5 1, A5 1, A#5 1, A5 1, G5 4, ' +
      'A5 1, C6 1, D6 1, C6 1, A5 2, F5 2, G5 1, F5 1, E5 1, G5 1, F5 4' },
    { wave: 'sine', vol: 0.10, legato: 0.8, notes:
      'F3 2, C4 2, F3 2, C4 2, C3 2, G3 2, C3 2, G3 2, D3 2, A3 2, A#2 2, F3 2, C3 2, G3 2, F3 2, C4 2' },
    { vol: 0.02, notes: rep('- 1, h 1', 16) }
  ]},

  // 🏫 폐교 — 살짝 으스스하게 (단조)
  school: { bpm: 92, tracks: [
    { wave: 'square', vol: 0.03, notes:
      'A4 1, C5 1, E5 1, D#5 1, E5 2, - 2, A4 1, C5 1, E5 1, F5 1, E5 2, - 2, ' +
      'D5 1, F5 1, A5 1, G#5 1, A5 2, - 1, E5 1, D5 1, C5 1, B4 1, G#4 1, A4 2, - 2' },
    { wave: 'triangle', vol: 0.10, legato: 0.6, notes:
      'A2 2, E3 2, A2 2, E3 2, F2 2, C3 2, F2 2, C3 2, D2 2, A2 2, D2 2, A2 2, E2 2, B2 2, E2 2, G#2 2' }
  ]},

  // 🚀 우주선 — 신비롭게 반짝반짝
  space: { bpm: 100, tracks: [
    { wave: 'sine', vol: 0.08, notes:
      'D5 2, F5 1, A5 1, C6 2, A5 2, G5 2, E5 1, G5 1, A5 4, ' +
      'D5 2, F5 1, A5 1, D6 2, C6 2, A5 1, G5 1, F5 1, E5 1, D5 4' },
    { wave: 'triangle', vol: 0.06, legato: 0.5, notes:
      rep('D3 1, A3 1, D4 1, A3 1', 2) + ', ' + rep('C3 1, G3 1, C4 1, G3 1', 2) + ', ' +
      rep('A#2 1, F3 1, A#3 1, F3 1', 2) + ', ' + rep('A2 1, E3 1, A3 1, E3 1', 2) },
    { vol: 0.015, notes: rep('h 1, - 1', 16) }
  ]},

  // 🎬 엔딩 — 따뜻하게, 다 함께 해냈어!
  ending: { bpm: 96, tracks: [
    { wave: 'triangle', vol: 0.08, notes:
      'G4 1, C5 1, E5 1, G5 1, F5 2, E5 1, D5 1, E5 3, C5 1, D5 2, G4 2, ' +
      'A4 1, C5 1, F5 1, E5 1, D5 2, B4 2, C5 4, - 4' },
    { wave: 'sine', vol: 0.10, legato: 0.9, notes: 'C3 4, F3 4, C3 4, G3 4, F3 4, G3 4, C3 4, C3 4' },
    { vol: 0.04, notes: rep('k 2, h 2', 8) }
  ]}
};

/* 'C5 1, E5 2' → [[523.3, 1], [659.3, 2]] 처럼 바꿔주는 도우미 */
function parseNotes(text) {
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return text.split(',').map(x => x.trim()).filter(Boolean).map(tok => {
    const [n, b] = tok.split(/\s+/);
    const beats = parseFloat(b);
    if (n === '-' || n === 'k' || n === 'h') return [n === '-' ? 0 : n, beats];
    const m = n.match(/^([A-G])([#b]?)(\d)$/);
    const semi = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3]) + 1) * 12;
    return [440 * Math.pow(2, (semi - 69) / 12), beats];
  });
}

// 게임 전체에서 함께 쓸 소리 상자 하나를 만들어 둬
const sound = new SoundBox();
