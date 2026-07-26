// Lunar-lander mini-game: generated terrain with a landing pad, gravity,
// rotation + thrust with limited fuel, and landed/crashed verdicts.
// Constants ported from design/Home.dc.html.

import type { Keys } from './types';
import { burst, drawParticles, stepParticles, type Particle } from './particles';

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
  onResult: (kind: 'landed' | 'crashed') => void = () => {};

  private W = 0;
  private H = 0;
  private terrain: { x: number; y: number }[] = [];
  private pad = { x1: 0, x2: 0, y: 0 };
  private craters: { x: number; y: number; rx: number; ry: number }[] = [];
  private pocks: { x: number; y: number }[] = [];
  private particles: Particle[] = [];
  private rocket: Rocket = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, r: 11, fuel: 1, thrusting: false };
  private done = false;

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
      const gy = this.terrainYAt(r.x);
      if (r.y + r.r >= gy) {
        r.y = gy - r.r;
        const onPad = r.x >= this.pad.x1 && r.x <= this.pad.x2;
        const ang = Math.atan2(Math.sin(r.angle), Math.cos(r.angle));
        const gentle = Math.abs(r.vy) < 1.3 && Math.abs(r.vx) < 0.75 && Math.abs(ang) < 0.22;
        this.done = true;
        if (onPad && gentle) {
          this.onResult('landed');
        } else {
          burst(this.particles, r.x, r.y, '#f87171', 26);
          this.onResult('crashed');
        }
      }
    }
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

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
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
    if (r.thrusting) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.beginPath();
      ctx.moveTo(-4, r.r * 0.7);
      ctx.lineTo(0, r.r * 0.7 + 8 + Math.random() * 8);
      ctx.lineTo(4, r.r * 0.7);
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
    ctx.moveTo(0, -r.r * 1.2);
    ctx.lineTo(r.r * 0.6, -r.r * 0.2);
    ctx.lineTo(r.r * 0.6, r.r * 0.7);
    ctx.lineTo(-r.r * 0.6, r.r * 0.7);
    ctx.lineTo(-r.r * 0.6, -r.r * 0.2);
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
  }
}
