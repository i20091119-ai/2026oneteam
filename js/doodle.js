/* ===========================================================
   doodle.js — 하찮은 손그림 그리기 도구 ✏️
   -----------------------------------------------------------
   컴퓨터가 그린 그림은 선이 너무 반듯해서 딱딱해 보여.
   그래서 일부러 선을 삐뚤빼뚤하게 만들어주는 도구를 만들었어!

   비밀은 '조금씩 어긋나게 그리기'야.
   동그라미를 그릴 때 점들을 아주 살짝씩 밀어주면
   손으로 대충 그린 것 같은 하찮은 그림이 돼 😂
   =========================================================== */


/* -----------------------------------------------------------
   가짜 무작위 숫자 만들기

   진짜 무작위(Math.random)를 쓰면 매 순간 모양이 바뀌어서
   그림이 부들부들 심하게 떨려.
   그래서 '같은 숫자를 넣으면 항상 같은 값이 나오는'
   가짜 무작위를 만들어 썼어.
   ----------------------------------------------------------- */
function rnd(seed) {
  // sin 을 이용한 간단한 속임수야. 결과는 0~1 사이 숫자!
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/* -0.5 ~ +0.5 사이 값 (어느 쪽으로 밀지 정할 때 씀) */
function wob(seed) { return rnd(seed) - 0.5; }


/* -----------------------------------------------------------
   그림이 '보글보글' 떨리는 정도

   숫자를 1초에 8번만 바꿔주면
   손으로 그린 만화처럼 자연스럽게 꿈틀거려!
   ----------------------------------------------------------- */
let doodleSeed = 0;
function updateDoodleSeed(time) {
  doodleSeed = Math.floor(time / 125);   // 125밀리초마다 1씩 커져
}


/* -----------------------------------------------------------
   삐뚤빼뚤한 동그라미 ⭕
   cx, cy = 가운데 위치, r = 반지름
   amt = 얼마나 삐뚤빼뚤하게 할지
   ----------------------------------------------------------- */
function wobbleCircle(ctx, cx, cy, r, seed, amt = 0.14) {
  const N = 11;                       // 점 11개로 동그라미를 만들어
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (Math.PI * 2 / N) * i;
    // 점마다 반지름을 조금씩 다르게 해서 울퉁불퉁하게!
    const rr = r * (1 + wob(seed + i * 7.3 + doodleSeed) * amt);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else         ctx.lineTo(x, y);
  }
  ctx.closePath();
}


/* -----------------------------------------------------------
   삐뚤빼뚤한 네모 ▭
   ----------------------------------------------------------- */
function wobbleRect(ctx, x, y, w, h, seed, amt = 3) {
  // 네 귀퉁이를 조금씩 밀어서 반듯하지 않게 만들어
  const p = [
    [x     + wob(seed+1+doodleSeed)*amt, y     + wob(seed+2+doodleSeed)*amt],
    [x + w + wob(seed+3+doodleSeed)*amt, y     + wob(seed+4+doodleSeed)*amt],
    [x + w + wob(seed+5+doodleSeed)*amt, y + h + wob(seed+6+doodleSeed)*amt],
    [x     + wob(seed+7+doodleSeed)*amt, y + h + wob(seed+8+doodleSeed)*amt]
  ];

  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < 4; i++) {
    // 변의 가운데도 살짝 휘게 해서 손그림 느낌을 더해
    const a = p[i - 1], b = p[i];
    const mx = (a[0]+b[0])/2 + wob(seed+i*11+doodleSeed)*amt;
    const my = (a[1]+b[1])/2 + wob(seed+i*13+doodleSeed)*amt;
    ctx.quadraticCurveTo(mx, my, b[0], b[1]);
  }
  // 마지막 변 (네 번째 → 첫 번째)
  const a = p[3], b = p[0];
  ctx.quadraticCurveTo(
    (a[0]+b[0])/2 + wob(seed+41+doodleSeed)*amt,
    (a[1]+b[1])/2 + wob(seed+43+doodleSeed)*amt,
    b[0], b[1]
  );
  ctx.closePath();
}


/* -----------------------------------------------------------
   삐뚤빼뚤한 선 ╱
   가운데를 살짝 휘게 해서 손으로 그은 것처럼 만들어
   ----------------------------------------------------------- */
function wobbleLine(ctx, x1, y1, x2, y2, seed, amt = 3) {
  const mx = (x1 + x2) / 2 + wob(seed + doodleSeed) * amt;
  const my = (y1 + y2) / 2 + wob(seed + 5 + doodleSeed) * amt;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);
}


/* -----------------------------------------------------------
   '색칠을 삐져나가게' 칠하기 🖍️
   -----------------------------------------------------------
   어린이가 색칠할 때 선 밖으로 삐져나가잖아?
   그 느낌을 내려고 색을 살짝 옆으로 밀어서 칠한 다음
   그 위에 테두리를 그려. 그럼 훨씬 하찮고 귀여워져 😂
   ----------------------------------------------------------- */
function sloppyFill(ctx, drawShape, color, seed, shift = 2) {
  ctx.save();
  // 색칠을 살짝 옆으로 밀어
  ctx.translate(wob(seed + doodleSeed) * shift, wob(seed + 9 + doodleSeed) * shift);
  ctx.fillStyle = color;
  drawShape();
  ctx.fill();
  ctx.restore();

  // 테두리는 제자리에 그려
  drawShape();
  ctx.stroke();
}
