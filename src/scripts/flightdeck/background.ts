// Deep-space backdrop: slowly rotating nebula band + distant stars, two
// drifting planets, and a near starfield with ship parallax and twinkle.
// Values ported from design/Home.dc.html.

interface Star {
  x: number;
  y: number;
  z: number;
  tw: number;
}

interface DeepStar {
  x: number;
  y: number;
  sz: number;
  a: number;
  col: string;
}

interface NebulaBlob {
  x: number;
  y: number;
  r: number;
  c1: string;
}

interface Planet {
  x: number;
  y: number;
  r: number;
  base: string;
  light: string;
  ring: string | null;
  depth: number;
  vx: number;
}

export class Galaxy {
  private stars: Star[] = [];
  private deepStars: DeepStar[] = [];
  private nebula: NebulaBlob[] = [];
  private planets: Planet[] = [];
  private deepRot = 0;

  init(W: number, H: number): void {
    this.stars = [];
    for (let i = 0; i < 160; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 0.8 + 0.2,
        tw: Math.random() * Math.PI * 2,
      });
    }

    this.deepStars = [];
    for (let i = 0; i < 220; i++) {
      const band = Math.random() < 0.62;
      let x: number, y: number;
      if (band) {
        const t = Math.random();
        x = t * W;
        y = H * 0.82 - t * H * 0.62 + (Math.random() - 0.5) * H * 0.15;
      } else {
        x = Math.random() * W;
        y = Math.random() * H;
      }
      this.deepStars.push({
        x,
        y,
        sz: Math.random() < 0.85 ? 1 : 1.5,
        a: 0.12 + Math.random() * 0.4,
        col: Math.random() < 0.18 ? '#cdd6ff' : Math.random() < 0.3 ? '#dcc6b0' : '#9fb4dd',
      });
    }

    this.nebula = [];
    const nc = [
      'rgba(72,92,164,0.11)',
      'rgba(126,74,156,0.10)',
      'rgba(48,124,142,0.08)',
      'rgba(94,82,176,0.10)',
    ];
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      this.nebula.push({
        x: t * W,
        y: H * 0.82 - t * H * 0.62 + (Math.random() - 0.5) * H * 0.1,
        r: H * (0.26 + Math.random() * 0.18),
        c1: nc[i % nc.length],
      });
    }

    this.planets = [
      {
        x: W * 0.83,
        y: H * 0.22,
        r: Math.min(W, H) * 0.07,
        base: '#7a4a38',
        light: '#c98d63',
        ring: null,
        depth: 0.6,
        vx: 0.05,
      },
      {
        x: W * 0.15,
        y: H * 0.7,
        r: Math.min(W, H) * 0.05,
        base: '#38566f',
        light: '#83b2d6',
        ring: 'rgba(160,186,214,0.55)',
        depth: 0.4,
        vx: 0.03,
      },
    ];
  }

  tick(W: number): void {
    this.deepRot += 0.0004;
    for (const p of this.planets) {
      p.x += p.vx;
      if (p.x < -p.r * 2) p.x = W + p.r * 2;
      if (p.x > W + p.r * 2) p.x = -p.r * 2;
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    px: number,
    py: number,
    frame: number
  ): void {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(this.deepRot);
    ctx.translate(-W / 2, -H / 2);
    for (const n of this.nebula) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.c1);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const s of this.deepStars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.col;
      ctx.fillRect(s.x, s.y, s.sz, s.sz);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    for (const p of this.planets) this.drawPlanet(ctx, p, px, py);

    for (const s of this.stars) {
      const x = ((s.x - px * s.z * 0.04) % W + W) % W;
      const y = ((s.y - py * s.z * 0.04) % H + H) % H;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(s.tw + frame * 0.02));
      ctx.globalAlpha = s.z * tw * 0.7;
      ctx.fillStyle = '#aecdf5';
      ctx.fillRect(x, y, s.z * 1.6, s.z * 1.6);
    }
    ctx.globalAlpha = 1;
  }

  private drawPlanet(ctx: CanvasRenderingContext2D, p: Planet, px: number, py: number): void {
    const x = p.x - px * 0.02 * p.depth;
    const y = p.y - py * 0.02 * p.depth;
    ctx.save();
    if (p.ring) {
      ctx.strokeStyle = p.ring;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.5);
      ctx.scale(1, 0.32);
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 1.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    const g = ctx.createRadialGradient(x - p.r * 0.4, y - p.r * 0.4, p.r * 0.1, x, y, p.r);
    g.addColorStop(0, p.light);
    g.addColorStop(0.55, p.base);
    g.addColorStop(1, '#05070c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
