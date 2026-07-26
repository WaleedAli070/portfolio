// Flight-deck controller: owns the canvas, input, resize, and the render
// loop; delegates simulation to Deck/Lander and drawing of the backdrop
// to Galaxy. DOM concerns (cards, legend, boot, HUD text) stay in the
// page script and communicate through the options callbacks.

import { Galaxy } from './background';
import { Deck } from './deck';
import { Lander } from './lander';
import type { FlightDeckConfig, Keys, NodeDef } from './types';

export type { FlightDeckConfig, NodeDef } from './types';

export interface FlightDeckOptions {
  canvas: HTMLCanvasElement;
  config: FlightDeckConfig;
  nodes: NodeDef[];
  hud: {
    coords: HTMLElement | null;
    alt: HTMLElement | null;
    vs: HTMLElement | null;
    hs: HTMLElement | null;
    fuel: HTMLElement | null;
  };
  onScore: (score: number) => void;
  onNodeOpen: (key: string, discovered: number) => void;
  /** Fires at touchdown for both outcomes. */
  onLanderResult: (kind: 'landed' | 'crashed') => void;
  /** Fires when the flag is planted, ~3s after a clean landing. */
  onLanderCelebrate: () => void;
}

export interface FlightDeckApi {
  /** Mark a node discovered and fire onNodeOpen (legend clicks). */
  openNode: (key: string) => void;
  setKey: (dir: keyof Keys, down: boolean) => void;
  startLander: () => void;
  exitLander: () => void;
  retryLander: () => void;
  destroy: () => void;
}

const KEY_MAP: Record<string, keyof Keys> = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
  ' ': 'fire',
};

export function createFlightDeck(opts: FlightDeckOptions): FlightDeckApi {
  const { canvas, hud } = opts;
  const ctx = canvas.getContext('2d')!;
  const keys: Keys = { up: false, down: false, left: false, right: false, fire: false };

  let W = 0;
  let H = 0;
  let frame = 0;
  let raf = 0;
  let mode: 'deck' | 'lander' = 'deck';

  const galaxy = new Galaxy();
  const deck = new Deck(opts.config, opts.nodes);
  const lander = new Lander();

  deck.onOpen = (key) => opts.onNodeOpen(key, deck.discoveredCount());
  deck.onScore = opts.onScore;
  lander.onResult = opts.onLanderResult;
  lander.onCelebrate = opts.onLanderCelebrate;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    deck.layout(W, H);
  }

  function update(): void {
    frame++;
    galaxy.tick(W);
    if (mode === 'lander') {
      const t = lander.update(keys);
      if (hud.alt) hud.alt.textContent = String(t.alt).padStart(3, '0');
      if (hud.vs) {
        hud.vs.textContent = (t.vy * 10).toFixed(1);
        hud.vs.style.color = Math.abs(t.vy) < 1.3 ? '#34d399' : '#f87171';
      }
      if (hud.hs) {
        hud.hs.textContent = (Math.abs(t.vx) * 10).toFixed(1);
        hud.hs.style.color = Math.abs(t.vx) < 0.75 ? '#34d399' : '#f87171';
      }
      if (hud.fuel) {
        hud.fuel.style.width = `${t.fuel * 100}%`;
        hud.fuel.style.background = t.fuel > 0.25 ? '#34d399' : '#f87171';
      }
      return;
    }
    deck.update(keys, W, H, frame);
    if (hud.coords) {
      hud.coords.textContent =
        'x:' +
        String(Math.round(deck.ship.x)).padStart(3, '0') +
        ' y:' +
        String(Math.round(deck.ship.y)).padStart(3, '0');
    }
  }

  function draw(): void {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (deck.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * deck.shake, (Math.random() - 0.5) * deck.shake);
    }
    galaxy.draw(ctx, W, H, deck.ship.x - W / 2, deck.ship.y - H / 2, frame);
    if (mode === 'lander') lander.draw(ctx, W, H);
    else deck.draw(ctx, keys);
    ctx.restore();
  }

  // Fixed 60Hz simulation steps regardless of display refresh rate —
  // the design's physics constants are per-frame values tuned at 60fps.
  const STEP = 1000 / 60;
  let last = 0;
  let acc = 0;
  function loop(now: number): void {
    if (last === 0) last = now;
    acc += now - last;
    last = now;
    if (acc > 100) acc = 100; // returning from a throttled tab: don't fast-forward
    while (acc >= STEP) {
      update();
      acc -= STEP;
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  const clearKeys = () => {
    for (const k of Object.keys(keys) as (keyof Keys)[]) keys[k] = false;
  };
  const onKeyDown = (e: KeyboardEvent) => handleKey(e, true);
  const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);
  function handleKey(e: KeyboardEvent, down: boolean): void {
    const k = e.key.toLowerCase();
    const dir = KEY_MAP[k];
    if (!dir) return;
    keys[dir] = down;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  }
  const onResize = () => resize();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  window.addEventListener('blur', clearKeys);

  resize();
  galaxy.init(W, H);
  deck.init(W, H);
  raf = requestAnimationFrame(loop);

  return {
    openNode(key) {
      deck.markDiscovered(key);
      opts.onNodeOpen(key, deck.discoveredCount());
    },
    setKey(dir, down) {
      keys[dir] = down;
    },
    startLander() {
      if (mode === 'lander') return;
      mode = 'lander';
      lander.init(W, H);
    },
    exitLander() {
      mode = 'deck';
    },
    retryLander() {
      lander.init(W, H);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', clearKeys);
    },
  };
}
