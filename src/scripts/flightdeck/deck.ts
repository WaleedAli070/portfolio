// Flight-deck sim: ship physics, bullets, splitting asteroids, particle
// bursts, crash/respawn, and the five nav nodes that open section cards
// on approach. Constants ported from design/Home.dc.html.

import type { FlightDeckConfig, Keys, NodeDef } from './types';
import { burst, drawParticles, stepParticles, type Particle } from './particles';

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  verts: number[];
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface DeckNode extends NodeDef {
  x: number;
  y: number;
  r: number;
  actR: number;
  inRange: boolean;
  pulse: number;
  discovered: boolean;
}

export class Deck {
  ship = { x: 0, y: 0, vx: 0, vy: 0, heading: -Math.PI / 2, r: 13 };
  shake = 0;
  nodes: DeckNode[] = [];

  onOpen: (key: string) => void = () => {};
  onScore: (score: number) => void = () => {};

  private score = 0;
  private crashing = false;
  private crashTimer = 0;
  private shock: { x: number; y: number; r: number } | null = null;
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private fireCd = 0;

  constructor(
    private config: FlightDeckConfig,
    private defs: NodeDef[]
  ) {}

  init(W: number, H: number): void {
    this.ship.x = W / 2;
    this.ship.y = H / 2;
    this.layout(W, H);
    for (let i = 0; i < this.config.asteroidCount; i++) this.spawnAsteroid(W, H, true);
  }

  /** Recompute node positions for a new viewport, keeping discovery state. */
  layout(W: number, H: number): void {
    this.nodes = this.defs.map((d) => {
      const prev = this.nodes.find((n) => n.key === d.key);
      return {
        ...d,
        x: d.fx * W,
        y: d.fy * H,
        r: 24,
        actR: 24 + 13 + 8,
        inRange: false,
        pulse: Math.random() * Math.PI * 2,
        discovered: prev ? prev.discovered : false,
      };
    });
  }

  discoveredCount(): number {
    return this.nodes.filter((n) => n.discovered).length;
  }

  markDiscovered(key: string): void {
    const n = this.nodes.find((node) => node.key === key);
    if (n) n.discovered = true;
  }

  private spawnAsteroid(W: number, H: number, anywhere: boolean): void {
    const r = 16 + Math.random() * 20;
    let x: number, y: number;
    if (anywhere) {
      // keep initial rocks clear of the ship spawn at screen center
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (Math.hypot(x - W / 2, y - H / 2) < 140);
    } else {
      const edge = Math.floor(Math.random() * 4);
      x = edge === 0 ? -r : edge === 1 ? W + r : Math.random() * W;
      y = edge === 2 ? -r : edge === 3 ? H + r : Math.random() * H;
    }
    const a = Math.random() * Math.PI * 2;
    const sp = 0.25 + Math.random() * 0.5;
    const verts: number[] = [];
    const n = 9 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) verts.push(0.68 + Math.random() * 0.32);
    this.asteroids.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      r,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.02,
      verts,
    });
  }

  private crashShip(): void {
    this.crashing = true;
    this.crashTimer = 82;
    this.shake = 16;
    this.shock = { x: this.ship.x, y: this.ship.y, r: 0 };
    burst(this.particles, this.ship.x, this.ship.y, '#6bf5c0', 24);
    burst(this.particles, this.ship.x, this.ship.y, '#fbbf24', 18);
    burst(this.particles, this.ship.x, this.ship.y, '#f87171', 14);
    this.score = 0;
    this.onScore(0);
  }

  update(keys: Keys, W: number, H: number, frame: number): void {
    const ship = this.ship;

    if (this.crashing && --this.crashTimer <= 0) {
      this.crashing = false;
      this.shock = null;
      ship.x = W / 2;
      ship.y = H / 2;
      ship.vx = 0;
      ship.vy = 0;
      ship.heading = -Math.PI / 2;
    }

    if (!this.crashing) {
      const acc = this.config.thrustPower;
      if (keys.up) ship.vy -= acc;
      if (keys.down) ship.vy += acc;
      if (keys.left) ship.vx -= acc;
      if (keys.right) ship.vx += acc;
      ship.vx *= 0.93;
      ship.vy *= 0.93;
      const sp = Math.hypot(ship.vx, ship.vy);
      const max = 6;
      if (sp > max) {
        ship.vx = (ship.vx / sp) * max;
        ship.vy = (ship.vy / sp) * max;
      }
      if (sp > 0.25) ship.heading = Math.atan2(ship.vy, ship.vx);
      ship.x += ship.vx;
      ship.y += ship.vy;
      if (ship.x < -20) ship.x = W + 20;
      if (ship.x > W + 20) ship.x = -20;
      if (ship.y < -20) ship.y = H + 20;
      if (ship.y > H + 20) ship.y = -20;

      if (this.fireCd > 0) this.fireCd--;
      if (keys.fire && this.fireCd === 0) {
        const s = 8.5;
        this.bullets.push({
          x: ship.x + Math.cos(ship.heading) * ship.r,
          y: ship.y + Math.sin(ship.heading) * ship.r,
          vx: Math.cos(ship.heading) * s + ship.vx * 0.3,
          vy: Math.sin(ship.heading) * s + ship.vy * 0.3,
          life: 55,
        });
        this.fireCd = 11;
      }
    }

    this.bullets = this.bullets.filter((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      return b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10;
    });

    for (const a of this.asteroids) {
      a.x += a.vx;
      a.y += a.vy;
      a.rot += a.vr;
      if (a.x < -a.r) a.x = W + a.r;
      if (a.x > W + a.r) a.x = -a.r;
      if (a.y < -a.r) a.y = H + a.r;
      if (a.y > H + a.r) a.y = -a.r;
    }

    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
          this.bullets.splice(bi, 1);
          burst(this.particles, a.x, a.y, '#8fd9ff', 14);
          this.asteroids.splice(ai, 1);
          if (a.r > 22) {
            for (let s = 0; s < 2; s++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 0.6 + Math.random() * 0.6;
              const verts: number[] = [];
              for (let i = 0; i < 9; i++) verts.push(0.68 + Math.random() * 0.32);
              this.asteroids.push({
                x: a.x,
                y: a.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                r: a.r * 0.58,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.04,
                verts,
              });
            }
          }
          this.score += 100;
          this.onScore(this.score);
          break;
        }
      }
    }

    if (this.asteroids.length < this.config.asteroidCount && frame % 140 === 0) {
      this.spawnAsteroid(W, H, false);
    }

    if (!this.crashing) {
      for (const a of this.asteroids) {
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.r + ship.r) {
          if (this.config.lethalAsteroids) {
            this.crashShip();
          } else {
            const ang = Math.atan2(ship.y - a.y, ship.x - a.x);
            ship.vx += Math.cos(ang) * 1.6;
            ship.vy += Math.sin(ang) * 1.6;
            this.shake = 8;
          }
          break;
        }
      }
    }

    if (!this.crashing) {
      for (const n of this.nodes) {
        n.pulse += 0.05;
        const d = Math.hypot(ship.x - n.x, ship.y - n.y);
        if (d < n.actR && !n.inRange) {
          n.inRange = true;
          n.discovered = true;
          burst(this.particles, n.x, n.y, n.color, 20);
          this.onOpen(n.key);
        } else if (d > n.actR + 46) {
          n.inRange = false;
        }
      }
    }

    this.particles = stepParticles(this.particles);
    if (this.shake > 0) this.shake *= 0.85;
  }

  draw(ctx: CanvasRenderingContext2D, keys: Keys): void {
    const ship = this.ship;

    for (const n of this.nodes) {
      const pr = 1 + Math.sin(n.pulse) * 0.12;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.shadowBlur = 18;
      ctx.shadowColor = n.color;
      ctx.strokeStyle = n.color;
      ctx.globalAlpha = n.discovered ? 0.9 : 0.55;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, n.r * pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(0, 0, n.r * pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = n.discovered ? 1 : 0.75;
      ctx.fillStyle = n.color;
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.sigil, 0, 1);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#c6d3e3';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(n.label, 0, n.r + 15);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#6b839e';
    ctx.lineWidth = 1.4;
    for (const a of this.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(120,150,190,0.5)';
      ctx.beginPath();
      for (let i = 0; i < a.verts.length; i++) {
        const ang = (i / a.verts.length) * Math.PI * 2;
        const rr = a.r * a.verts[i];
        const x = Math.cos(ang) * rr;
        const y = Math.sin(ang) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    for (const b of this.bullets) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#34d399';
      ctx.strokeStyle = '#7dffcf';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 1.3, b.y - b.vy * 1.3);
      ctx.stroke();
      ctx.restore();
    }

    drawParticles(ctx, this.particles);

    if (this.crashing) {
      if (this.shock) {
        this.shock.r += 6;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - this.shock.r / 155);
        ctx.strokeStyle = '#6bf5c0';
        ctx.lineWidth = 2.4;
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#6bf5c0';
        ctx.beginPath();
        ctx.arc(this.shock.x, this.shock.y, this.shock.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.heading);
      if (keys.up || keys.down || keys.left || keys.right) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = 'rgba(251,191,36,0.85)';
        ctx.beginPath();
        ctx.moveTo(-ship.r * 0.7, 0);
        ctx.lineTo(-ship.r * 1.5 - Math.random() * 6, 3);
        ctx.lineTo(-ship.r * 1.5 - Math.random() * 6, -3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#34d399';
      ctx.strokeStyle = '#6bf5c0';
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(52,211,153,0.12)';
      ctx.beginPath();
      ctx.moveTo(ship.r, 0);
      ctx.lineTo(-ship.r * 0.8, ship.r * 0.7);
      ctx.lineTo(-ship.r * 0.45, 0);
      ctx.lineTo(-ship.r * 0.8, -ship.r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
