// Flight-deck sim: ship physics, bullets, splitting asteroids, particle
// bursts, crash/respawn, and the five nav nodes that open section cards
// on approach. Until the pilot touches the controls the ship drifts
// toward the next undiscovered node with fading control hints; flying
// into a planet starts the lander via an iris descent transition.
// Constants ported from design/Home.dc.html.

import type { Planet } from './background';
import { planetScreenPos } from './background';
import type { FlightDeckConfig, Keys, NodeDef } from './types';
import { burst, drawParticles, stepParticles, type Particle } from './particles';

/** Stroked crater ellipse, in units of the asteroid radius. */
interface Crater {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  verts: number[];
  craters: Crater[];
}

function makeCraters(r: number): Crater[] {
  const craters: Crater[] = [];
  const n = (1 + Math.floor(Math.random() * 2)) + (r > 24 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    // a few placement attempts so craters don't pile up on each other
    for (let attempt = 0; attempt < 6; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 0.12 + Math.random() * 0.33;
      const cr = 0.09 + Math.random() * 0.09;
      const x = Math.cos(ang) * dist;
      const y = Math.sin(ang) * dist;
      if (craters.some((c) => Math.hypot(c.x - x, c.y - y) < c.rx + cr + 0.04)) continue;
      craters.push({
        x,
        y,
        rx: cr,
        ry: cr * (0.55 + Math.random() * 0.35),
        rot: Math.random() * Math.PI,
      });
      break;
    }
  }
  return craters;
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
  /** Fires when the descent iris finishes: time to start the lander. */
  onDescend: () => void = () => {};

  private score = 0;
  private crashing = false;
  private crashTimer = 0;
  private shock: { x: number; y: number; r: number } | null = null;
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private fireCd = 0;
  private W = 0;
  private H = 0;
  /** Control hints, 1 → 0 once the pilot takes over. */
  private hintFade = 1;
  /** Iris transition into the lander, anchored at the planet hit. */
  private descent: { x: number; y: number; r: number; t: number } | null = null;
  /** Frames before planets can trigger another descent (post-lander). */
  private planetCd = 0;

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
      craters: makeCraters(r),
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

  /** Recenter the ship and hold planets off for a beat after the lander. */
  resetAfterLander(W: number, H: number): void {
    this.descent = null;
    this.shake = 0;
    this.planetCd = 150;
    this.ship.x = W / 2;
    this.ship.y = H / 2;
    this.ship.vx = 0;
    this.ship.vy = 0;
  }

  update(
    keys: Keys,
    W: number,
    H: number,
    frame: number,
    userInput: boolean,
    planets: Planet[]
  ): void {
    const ship = this.ship;
    this.W = W;
    this.H = H;

    if (this.planetCd > 0) this.planetCd--;
    this.hintFade = userInput ? Math.max(0, this.hintFade - 0.035) : 1;

    // Descent iris: freeze the sim while it closes over the planet.
    // The impact shake still decays, else it stays frozen at full
    // strength and vibrates the whole lander session.
    if (this.descent) {
      this.descent.t++;
      this.descent.r += 26;
      if (this.shake > 0) this.shake *= 0.85;
      if (this.descent.t > 46) {
        this.descent = null;
        this.shake = 0;
        this.onDescend();
      }
      return;
    }

    // Autopilot: drift toward the next undiscovered node until the pilot
    // takes over (discovery itself stays gated on real input).
    if (!userInput && !this.crashing) {
      const tgt = this.nodes.filter((n) => !n.discovered)[0] || this.nodes[0];
      if (tgt) {
        const d = Math.hypot(tgt.x - ship.x, tgt.y - ship.y);
        if (d > tgt.actR + 70) {
          const ang = Math.atan2(tgt.y - ship.y, tgt.x - ship.x);
          ship.vx += Math.cos(ang) * 0.075;
          ship.vy += Math.sin(ang) * 0.075;
        }
      }
    }

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
                craters: makeCraters(a.r * 0.58),
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
          if (userInput) {
            n.discovered = true;
            burst(this.particles, n.x, n.y, n.color, 20);
            this.onOpen(n.key);
          }
        } else if (d > n.actR + 46) {
          n.inRange = false;
        }
      }
    }

    if (!this.crashing && this.planetCd <= 0 && this.config.planetsLaunchLander) {
      const pxo = ship.x - W / 2;
      const pyo = ship.y - H / 2;
      for (const p of planets) {
        const { x: sx, y: sy } = planetScreenPos(p, pxo, pyo);
        const d = Math.hypot(ship.x - sx, ship.y - sy);
        p.near = d < p.r + 150;
        if (d < p.r + ship.r + 4) {
          this.descent = { x: sx, y: sy, r: 0, t: 0 };
          burst(this.particles, sx, sy, '#c98d63', 24);
          this.shake = 6;
          break;
        }
      }
    }

    this.particles = stepParticles(this.particles);
    if (this.shake > 0) this.shake *= 0.85;
  }

  draw(ctx: CanvasRenderingContext2D, keys: Keys, frame: number, planets: Planet[]): void {
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
      // rounded silhouette: verts act as control points, the path runs
      // through edge midpoints so corners come out smooth
      const pts = a.verts.map((v, i) => {
        const ang = (i / a.verts.length) * Math.PI * 2;
        return { x: Math.cos(ang) * a.r * v, y: Math.sin(ang) * a.r * v };
      });
      ctx.beginPath();
      const last = pts[pts.length - 1];
      ctx.moveTo((last.x + pts[0].x) / 2, (last.y + pts[0].y) / 2);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const q = pts[(i + 1) % pts.length];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(107,131,158,0.08)';
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      for (const c of a.craters) {
        ctx.beginPath();
        ctx.ellipse(c.x * a.r, c.y * a.r, c.rx * a.r, c.ry * a.r, c.rot, 0, Math.PI * 2);
        ctx.stroke();
      }
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

    this.drawHints(ctx, frame, planets);
    this.drawDescent(ctx);
  }

  private drawHints(ctx: CanvasRenderingContext2D, frame: number, planets: Planet[]): void {
    const ship = this.ship;
    const W = this.W;
    const H = this.H;

    for (const p of planets) {
      if (!p.near || this.descent) continue;
      const { x: sx, y: sy } = planetScreenPos(p, ship.x - W / 2, ship.y - H / 2);
      ctx.save();
      ctx.setLineDash([5, 7]);
      ctx.lineDashOffset = -frame * 0.5;
      ctx.strokeStyle = 'rgba(201,141,99,0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r + 22 + Math.sin(frame * 0.05) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e8b58c';
      ctx.font = '600 11.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▾ FLY IN TO LAND', sx, sy + p.r + 42);
      ctx.restore();
    }

    const f = this.hintFade;
    if (f <= 0 || this.crashing || this.descent) return;
    ctx.save();

    const tgt = this.nodes.filter((n) => !n.discovered)[0];
    if (tgt) {
      ctx.save();
      ctx.globalAlpha = f * 0.22;
      ctx.setLineDash([4, 9]);
      ctx.lineDashOffset = -frame * 0.6;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = f * 0.5;
    const rr = ship.r + 11 + Math.sin(frame * 0.06) * 2.5;
    ctx.setLineDash([3, 7]);
    ctx.lineDashOffset = frame * 0.5;
    ctx.strokeStyle = '#6bf5c0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // sits above the nav-nodes legend (~90px tall at the bottom edge)
    ctx.globalAlpha = f * 0.7;
    ctx.fillStyle = '#8b9bb0';
    ctx.font = '11.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WASD to fly  ·  SPACE to fire', W / 2, H - 120);
    ctx.restore();
  }

  private drawDescent(ctx: CanvasRenderingContext2D): void {
    const d = this.descent;
    if (!d) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, d.t / 30);
    ctx.fillStyle = '#0b0f18';
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, 1 - d.t / 46);
    ctx.strokeStyle = '#c98d63';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#c98d63';
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, d.t / 16);
    ctx.fillStyle = '#eaf2fb';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('INITIATING DESCENT', this.W / 2, this.H / 2 - 8);
    ctx.fillStyle = '#8b9bb0';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText('switching to landing sequence', this.W / 2, this.H / 2 + 14);
    ctx.restore();
  }
}
