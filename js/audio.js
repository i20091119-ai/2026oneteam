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
  }

  /* 소리 켜기/끄기 스위치 */
  toggle() {
    this.on = !this.on;
    return this.on;
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

// 게임 전체에서 함께 쓸 소리 상자 하나를 만들어 둬
const sound = new SoundBox();
