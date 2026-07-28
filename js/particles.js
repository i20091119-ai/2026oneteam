/* ===========================================================
   particles.js — 반짝이 조각 만들기 ✨
   -----------------------------------------------------------
   게임이 '살아 있는 느낌'을 주려면 작은 효과가 아주 중요해!

   착지할 때 폴폴 나는 먼지, 물을 밟았을 때 튀는 물방울,
   단서를 얻었을 때 반짝이는 별… 이런 걸 '파티클'이라고 불러.

   파티클 하나하나는 아주 단순해.
     "어디에 있고, 어느 쪽으로 얼마나 빨리 날아가고,
      얼마나 살아 있을 수 있는가"
   이것만 알면 돼. 그런데 여러 개가 한꺼번에 움직이면
   갑자기 진짜처럼 보여! 😲
   =========================================================== */

class Particles {
  constructor(max = 260) {
    this.list = [];
    this.max = max;        // 너무 많아지면 게임이 느려지니까 최대 개수를 정해둬
    this.seed = 0;
  }

  /* 조각 하나를 만들어 넣기 */
  add(p) {
    if (this.list.length >= this.max) this.list.shift();  // 가장 오래된 걸 버려
    this.list.push(p);
  }

  /* -----------------------------------------------------------
     💨 먼지 — 착지하거나 걸을 때 발밑에서 폴폴
     ----------------------------------------------------------- */
  dust(x, y, count = 6, color = '#c9bda9') {
    for (let i = 0; i < count; i++) {
      const a = Math.PI + Math.random() * Math.PI;   // 위쪽 반원 방향으로만
      this.add({
        x: x + (Math.random() - 0.5) * 14,
        y: y,
        vx: Math.cos(a) * (0.6 + Math.random() * 1.6),
        vy: Math.sin(a) * (0.5 + Math.random() * 1.1),
        g: 0.03,                       // 살짝만 아래로 끌림
        r: 3 + Math.random() * 4,
        life: 1, fade: 0.030 + Math.random() * 0.02,
        color: color, seed: this.seed++
      });
    }
  }

  /* -----------------------------------------------------------
     💧 물방울 — 물웅덩이를 밟았을 때 사방으로 촥!
     ----------------------------------------------------------- */
  splash(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * (0.15 + Math.random() * 0.7);
      const s = 1.6 + Math.random() * 3.4;
      this.add({
        x: x, y: y,
        vx: Math.cos(a) * s * (Math.random() < 0.5 ? -1 : 1),
        vy: Math.sin(a) * s,
        g: 0.30,                       // 물방울은 제대로 떨어져
        r: 2.5 + Math.random() * 3,
        life: 1, fade: 0.026,
        color: Math.random() < 0.5 ? '#8fd4ee' : '#ffffff',
        seed: this.seed++
      });
    }
  }

  /* -----------------------------------------------------------
     ✨ 반짝이 — 단서를 얻거나 문이 열릴 때 위로 뿅뿅
     ----------------------------------------------------------- */
  sparkle(x, y, color = '#ffd94a', count = 12, spread = 26) {
    for (let i = 0; i < count; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -0.7 - Math.random() * 1.8,   // 위로 떠올라
        g: -0.012,                        // 점점 더 위로!
        r: 2.5 + Math.random() * 3.5,
        life: 1, fade: 0.020,
        color: color, star: true, seed: this.seed++
      });
    }
  }

  /* -----------------------------------------------------------
     매 순간 조각들을 움직여줘
     ----------------------------------------------------------- */
  update() {
    for (const p of this.list) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;          // 중력(또는 떠오르는 힘)
      p.vx *= 0.97;         // 공기 때문에 점점 느려져
      p.life -= p.fade;     // 점점 사라져
    }
    // 다 사라진 조각은 목록에서 빼줘 (안 그러면 게임이 느려져!)
    this.list = this.list.filter(p => p.life > 0);
  }

  /* -----------------------------------------------------------
     조각들을 화면에 그려줘
     ----------------------------------------------------------- */
  draw(ctx) {
    ctx.save();
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;

      if (p.star) {
        // 반짝이는 네 갈래 별 모양 ✦
        const r = p.r * p.life;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r * 2);
        ctx.quadraticCurveTo(p.x, p.y, p.x + r * 2, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 2);
        ctx.quadraticCurveTo(p.x, p.y, p.x - r * 2, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 2);
        ctx.fill();
      } else {
        // 삐뚤빼뚤한 동그라미 (손그림 느낌 유지!)
        wobbleCircle(ctx, p.x, p.y, p.r * p.life, p.seed, 0.35);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() { this.list = []; }
}
