// Lunar-lander mini-game: generated terrain with a landing pad, gravity,
// rotation + thrust with limited fuel, and landed/crashed verdicts.
// Constants ported from design/Home.dc.html. On a clean landing a pixel
// astronaut climbs out and plants a flag; onCelebrate fires once the
// flag is up so the page can delay the success modal past the animation.

import type { Keys } from './types';
import { burst, drawParticles, stepParticles, type Particle } from './particles';

// Celebration timeline, in 60Hz frames from touchdown.
const ANIM_APPEAR = 36;
const ANIM_WALK_END = 180;
const ANIM_POLE_END = 216;
const ANIM_CLOTH_END = 246;
const ANIM_RESULT_AT = 282;

const PX = 3; // pixel-art cell size

const SPRITE_COLORS: Record<string, string> = {
  S: '#cdd2dc', // suit
  V: '#34d399', // visor
  P: '#8b9bb0', // backpack
  G: '#34d399', // flag cloth
  D: '#13996e', // flag cloth shading
};

// 7-wide astronaut, drawn facing right; two leg frames for the walk.
const ASTRO_BODY = [
  '..SSS..',
  '..SVV..',
  '..SSS..',
  '.PSSSS.',
  '.PSSSS.',
  '.PSSS..',
];
const ASTRO_LEGS_A = ['..S.S..', '..S.S..', '.SS.SS.'];
const ASTRO_LEGS_B = ['..S.S..', '.S...S.', 'SS...SS'];

// Two ripple frames for the planted flag cloth.
const FLAG_A = ['GGGGGGGG', 'GGDGGGDG', 'GGGGDGGG', 'GDGGGGGG', 'GGGGGGDG', 'GGGDGGGG'];
const FLAG_B = ['GGGGGGGG', 'GGGGDGGG', 'GDGGGGDG', 'GGGGGDGG', 'GGDGGGGG', 'GGGGGGGG'];

interface LandingAnim {
  t: number;
  side: 1 | -1;
  startX: number;
  targetX: number;
}

export interface Telemetry {
  alt: number;
  vy: number;
  vx: number;
  fuel: number;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  r: number;
  fuel: number;
  thrusting: boolean;
}

export class Lander {
  /** Fires at touchdown for both outcomes. */
  onResult: (kind: 'landed' | 'crashed') => void = () => {};
  /** Fires once the flag is planted after a clean landing. */
  onCelebrate: () => void = () => {};
  /** Fires after climbing out the top: return to the flight deck. */
  onExit: () => void = () => {};

  private anim: LandingAnim | null = null;
  /** "Leaving orbit" transition back to the deck. */
  private ascent: { t: number } | null = null;
  private W = 0;
  private H = 0;
  private terrain: { x: number; y: number }[] = [];
  private pad = { x1: 0, x2: 0, y: 0 };
  private craters: { x: number; y: number; rx: number; ry: number }[] = [];
  private pocks: { x: number; y: number }[] = [];
  private particles: Particle[] = [];
  private rocket: Rocket = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, r: 11, fuel: 1, thrusting: false };
  private done = false;
  /** Flame intensity: 1 while thrusting, eases to 0 after touchdown. */
  private thrustFade = 0;

  init(W: number, H: number): void {
    this.W = W;
    this.H = H;
    this.terrain = [];
    const segs = 12;
    let y = H * 0.66 + Math.random() * H * 0.08;
    for (let i = 0; i <= segs; i++) {
      this.terrain.push({ x: (W / segs) * i, y });
      y += (Math.random() - 0.5) * H * 0.08;
      y = Math.max(H * 0.5, Math.min(H * 0.82, y));
    }
    const padI = 2 + Math.floor(Math.random() * (segs - 4));
    const padY = Math.min(this.terrain[padI].y, this.terrain[padI + 1].y);
    this.terrain[padI].y = padY;
    this.terrain[padI + 1].y = padY;
    this.pad = { x1: this.terrain[padI].x, x2: this.terrain[padI + 1].x, y: padY };

    this.craters = [];
    for (let i = 0; i < 12; i++) {
      const cx = Math.random() * W;
      if (cx > this.pad.x1 - 24 && cx < this.pad.x2 + 24) {
        i--;
        continue;
      }
      const rad = 6 + Math.random() * 22;
      this.craters.push({
        x: cx,
        y: this.terrainYAt(cx) + rad * 0.55 + Math.random() * (H * 0.14),
        rx: rad,
        ry: rad * (0.42 + Math.random() * 0.22),
      });
    }
    this.pocks = [];
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * W;
      this.pocks.push({ x: cx, y: this.terrainYAt(cx) + 4 + Math.random() * (H * 0.2) });
    }

    this.rocket = {
      x: W * 0.5 + (Math.random() - 0.5) * W * 0.34,
      y: H * 0.12,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 0,
      angle: (Math.random() - 0.5) * 0.3,
      r: 11,
      fuel: 1,
      thrusting: false,
    };
    this.particles = [];
    this.done = false;
    this.anim = null;
    this.ascent = null;
    this.thrustFade = 0;
  }

  private terrainYAt(x: number): number {
    const t = this.terrain;
    if (!t.length) return this.H;
    for (let i = 0; i < t.length - 1; i++) {
      if (x >= t[i].x && x <= t[i + 1].x) {
        const f = (x - t[i].x) / (t[i + 1].x - t[i].x);
        return t[i].y + (t[i + 1].y - t[i].y) * f;
      }
    }
    return t[t.length - 1].y;
  }

  update(keys: Keys): Telemetry {
    const r = this.rocket;
    const W = this.W;
    if (this.ascent) {
      this.ascent.t++;
      if (this.ascent.t > 34) {
        this.ascent = null;
        this.onExit();
      }
      return { alt: 0, vy: r.vy, vx: r.vx, fuel: r.fuel };
    }
    if (!this.done) {
      if (keys.left) r.angle -= 0.045;
      if (keys.right) r.angle += 0.045;
      r.thrusting = (keys.up || keys.fire) && r.fuel > 0;
      if (r.thrusting) {
        const t = 0.052;
        r.vx += Math.sin(r.angle) * t;
        r.vy -= Math.cos(r.angle) * t;
        r.fuel = Math.max(0, r.fuel - 0.0024);
      }
      r.vy += 0.018;
      r.x += r.vx;
      r.y += r.vy;
      if (r.x < 0) r.x = W;
      if (r.x > W) r.x = 0;
      if (r.y + r.r < -30) {
        this.ascent = { t: 0 };
        burst(this.particles, r.x, 8, '#fbbf24', 20);
        return { alt: 999, vy: r.vy, vx: r.vx, fuel: r.fuel };
      }
      const gy = this.terrainYAt(r.x);
      if (r.y + r.r >= gy) {
        r.y = gy - r.r;
        const onPad = r.x >= this.pad.x1 && r.x <= this.pad.x2;
        const ang = Math.atan2(Math.sin(r.angle), Math.cos(r.angle));
        const gentle = Math.abs(r.vy) < 1.3 && Math.abs(r.vx) < 0.75 && Math.abs(ang) < 0.22;
        this.done = true;
        if (onPad && gentle) {
          const side: 1 | -1 = r.x < this.W / 2 ? 1 : -1;
          this.anim = { t: 0, side, startX: r.x + side * (r.r + 8), targetX: r.x + side * 64 };
          this.onResult('landed');
        } else {
          burst(this.particles, r.x, r.y, '#f87171', 26);
          this.onResult('crashed');
        }
      }
    }
    if (this.anim) {
      this.anim.t++;
      if (this.anim.t === ANIM_RESULT_AT) this.onCelebrate();
    }
    if (this.done) this.thrustFade *= 0.955; // engine winds down after touchdown
    else this.thrustFade = r.thrusting ? 1 : 0;
    this.particles = stepParticles(this.particles);
    const gy = this.terrainYAt(r.x);
    return { alt: Math.max(0, Math.round(gy - (r.y + r.r))), vy: r.vy, vx: r.vx, fuel: r.fuel };
  }

  private traceTerrain(ctx: CanvasRenderingContext2D, dy: number): void {
    const t = this.terrain;
    for (let i = 0; i < t.length - 1; i++) {
      const xc = (t[i].x + t[i + 1].x) / 2;
      const yc = (t[i].y + t[i + 1].y) / 2 + dy;
      ctx.quadraticCurveTo(t[i].x, t[i].y + dy, xc, yc);
    }
    ctx.lineTo(t[t.length - 1].x, t[t.length - 1].y + dy);
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number): void {
    const r = this.rocket;
    if (!this.terrain.length) return;

    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(this.terrain[0].x, this.terrain[0].y);
    this.traceTerrain(ctx, 0);
    ctx.lineTo(W, H);
    ctx.closePath();
    const gg = ctx.createLinearGradient(0, H * 0.4, 0, H);
    gg.addColorStop(0, '#3c414c');
    gg.addColorStop(0.5, '#252932');
    gg.addColorStop(1, '#0e1117');
    ctx.fillStyle = gg;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(this.terrain[0].x, this.terrain[0].y);
    this.traceTerrain(ctx, 0);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.clip();
    for (const c of this.pocks) {
      ctx.fillStyle = 'rgba(10,12,16,0.4)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const c of this.craters) {
      ctx.fillStyle = 'rgba(9,11,15,0.5)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(170,177,190,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - c.ry * 0.32, c.rx * 0.92, c.ry * 0.9, 0, Math.PI * 1.02, Math.PI * 1.98);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + c.ry * 0.28, c.rx * 0.88, c.ry * 0.8, 0, 0.12, Math.PI * 0.88);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = '#cdd2dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.terrain[0].x, this.terrain[0].y);
    this.traceTerrain(ctx, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(86,92,104,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.terrain[0].x, this.terrain[0].y + 3);
    this.traceTerrain(ctx, 3);
    ctx.stroke();

    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#34d399';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.pad.x1, this.pad.y);
    ctx.lineTo(this.pad.x2, this.pad.y);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#34d399';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LAND', (this.pad.x1 + this.pad.x2) / 2, this.pad.y + 15);

    drawParticles(ctx, this.particles);

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    const flame = this.thrustFade;
    if (flame > 0.05) {
      ctx.save();
      ctx.globalAlpha = flame;
      ctx.shadowBlur = 12 * flame;
      ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.beginPath();
      ctx.moveTo(-4 * flame, r.r * 0.7);
      ctx.lineTo(0, r.r * 0.7 + (8 + Math.random() * 8) * flame);
      ctx.lineTo(4 * flame, r.r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#34d399';
    ctx.strokeStyle = '#9fe8c7';
    ctx.lineWidth = 1.8;
    ctx.fillStyle = 'rgba(52,211,153,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, -r.r * 1.9);
    ctx.lineTo(r.r * 0.6, -r.r * 0.9);
    ctx.lineTo(r.r * 0.6, r.r * 0.7);
    ctx.lineTo(-r.r * 0.6, r.r * 0.7);
    ctx.lineTo(-r.r * 0.6, -r.r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r.r * 0.6, r.r * 0.7);
    ctx.lineTo(-r.r * 1.05, r.r * 1.2);
    ctx.moveTo(r.r * 0.6, r.r * 0.7);
    ctx.lineTo(r.r * 1.05, r.r * 1.2);
    ctx.stroke();
    ctx.restore();

    this.drawCelebration(ctx);

    if (this.ascent) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.ascent.t / 12);
      ctx.fillStyle = '#eaf2fb';
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LEAVING ORBIT', W / 2, H / 2 - 8);
      ctx.fillStyle = '#8b9bb0';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('returning to open space', W / 2, H / 2 + 14);
      ctx.restore();
    } else if (!this.done) {
      // the way out: climb above this line to return to the flight deck
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(frame * 0.05) * 0.16;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = frame * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 26);
      ctx.lineTo(W, 26);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▴ climb above this line to fly back to space', W / 2, 18);
      ctx.restore();
    }
  }

  /** Draw a pixel sprite anchored at bottom-center; flip mirrors horizontally. */
  private drawSprite(
    ctx: CanvasRenderingContext2D,
    rows: string[],
    x: number,
    yBottom: number,
    flip: boolean
  ): void {
    const w = rows[0].length;
    const x0 = x - (w * PX) / 2;
    const y0 = yBottom - rows.length * PX;
    for (let ry = 0; ry < rows.length; ry++) {
      for (let cx = 0; cx < w; cx++) {
        const c = rows[ry][flip ? w - 1 - cx : cx];
        const color = SPRITE_COLORS[c];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x0 + cx * PX, y0 + ry * PX, PX, PX);
      }
    }
  }

  private drawCelebration(ctx: CanvasRenderingContext2D): void {
    const anim = this.anim;
    if (!anim || anim.t < ANIM_APPEAR) return;
    const t = anim.t;

    // astronaut position: walk from the ship hatch to the planting spot
    const walk = Math.min(1, Math.max(0, (t - ANIM_APPEAR) / (ANIM_WALK_END - ANIM_APPEAR)));
    const flagX = anim.targetX + anim.side * 8;
    const astroX =
      t < ANIM_WALK_END
        ? anim.startX + (anim.targetX - anim.startX) * walk
        : anim.targetX; // stands beside the pole while planting
    const walking = t < ANIM_WALK_END;
    const bob = walking ? Math.abs(Math.sin(t * 0.18)) * 2.5 : 0;
    const legs = walking && Math.floor(t / 12) % 2 === 0 ? ASTRO_LEGS_B : ASTRO_LEGS_A;
    const astroY = this.terrainYAt(astroX) + 1 - bob;
    this.drawSprite(ctx, [...ASTRO_BODY, ...legs], astroX, astroY, anim.side === -1);

    // flag: pole rises, then the cloth unfurls, then it ripples forever
    if (t <= ANIM_WALK_END) return;
    const groundY = this.terrainYAt(flagX) + 1;
    const poleH = 44 * Math.min(1, (t - ANIM_WALK_END) / (ANIM_POLE_END - ANIM_WALK_END));
    ctx.fillStyle = SPRITE_COLORS.S;
    ctx.fillRect(flagX - PX / 2, groundY - poleH, PX * 0.6, poleH);
    if (t <= ANIM_POLE_END) return;
    const cloth = Math.floor(t / 26) % 2 === 0 ? FLAG_A : FLAG_B;
    const unfurl = Math.min(1, (t - ANIM_POLE_END) / (ANIM_CLOTH_END - ANIM_POLE_END));
    const cols = Math.max(1, Math.round(cloth[0].length * unfurl));
    const clothRows = cloth.map((row) => row.slice(0, cols));
    const clothW = cols * PX;
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#34d399';
    for (let ry = 0; ry < clothRows.length; ry++) {
      for (let cx = 0; cx < clothRows[ry].length; cx++) {
        const color = SPRITE_COLORS[clothRows[ry][cx]];
        if (!color) continue;
        ctx.fillStyle = color;
        const px = anim.side === 1 ? flagX + PX * 0.4 + cx * PX : flagX - PX * 0.4 - clothW + cx * PX;
        ctx.fillRect(px, groundY - poleH + ry * PX, PX, PX);
      }
    }
    ctx.restore();
  }
}
