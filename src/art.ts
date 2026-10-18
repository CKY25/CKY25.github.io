// Pixel art drawn in code: characters from string maps, everything else
// (trees, props, buildings) from small procedural painters. All sprites are
// cached canvases at native resolution (1 tile = 16 px).

export const T = 16;

export { rng, canvas } from './pix';
import { rng, canvas, Pix, hash, ramp } from './pix';

type Pal = Record<string, string>;

function fromRows(rows: string[], pal: Pal, flip = false) {
  const w = Math.max(...rows.map((r) => r.length));
  const [c, ctx] = canvas(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  });
  return c;
}

// ---------------------------------------------------------------- player
const HERO: Pal = {
  k: '#1d1a2b', h: '#3d2c4a', H: '#5d4870', s: '#f5c9a3', S: '#d99f7c', e: '#1d1a2b',
  c: '#3f7fd9', C: '#2b5aa6', w: '#e9eef7', p: '#34405e', b: '#6b4a33',
};
const D_HEAD = [
  '................',
  '.....kkkkkk.....',
  '....khhHHhhk....',
  '...khhHhhhhhk...',
  '...khhhhhhhhk...',
  '...khsssssshk...',
  '...ksessssesk...',
  '...kssssssssk...',
  '....kSssssSk....',
];
const U_HEAD = [
  '................',
  '.....kkkkkk.....',
  '....khhHHhhk....',
  '...khhHhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhHhhhk...',
  '...khhhhhhhhk...',
  '....khhhhhhk....',
];
const S_HEAD = [
  '................',
  '.....kkkkkk.....',
  '....khhhHhhk....',
  '...khhhhHhhhk...',
  '...khhhhhhhsk...',
  '...khhhhssssk...',
  '...khhhsssesk...',
  '...khhhsssssk...',
  '....khhsssSk....',
];
const D_BODY = [
  '..kCcccwwcccCk..',
  '..kCccwccwccCk..',
  '..ksccccccccsk..',
  '...kCCCCCCCCk...',
  '....kppppppk....',
];
const U_BODY = [
  '..kCccccccccCk..',
  '..kCccccccccCk..',
  '..ksccccccccsk..',
  '...kCCCCCCCCk...',
  '....kppppppk....',
];
const S_BODY = [
  '....kCccccCk....',
  '....kCccccCk....',
  '....kCccscCk....',
  '....kCCCCCCk....',
  '....kppppppk....',
];
const FB_LEGS = [
  ['....kppkkppk....', '....kbbkkbbk....'],
  ['....kppkkbbk....', '....kbbk........'],
  ['....kbbkkppk....', '........kbbk....'],
];
const S_LEGS = [
  ['.....kppppk.....', '.....kbbbbk.....'],
  ['....kppkkppk....', '...kbbk..kbbk...'],
  ['.....kppppk.....', '.....kbbbbk.....'],
];

export type Dir = 'down' | 'up' | 'left' | 'right';
export interface CharFrames { [dir: string]: HTMLCanvasElement[] }

export function makeHero(): CharFrames {
  const build = (head: string[], body: string[], legs: string[][], flip = false) =>
    legs.map((l) => fromRows([...head, ...body, ...l], HERO, flip));
  return {
    down: build(D_HEAD, D_BODY, FB_LEGS),
    up: build(U_HEAD, U_BODY, FB_LEGS),
    right: build(S_HEAD, S_BODY, S_LEGS),
    left: build(S_HEAD, S_BODY, S_LEGS, true),
  };
}

// ---------------------------------------------------------------- cat
const CAT: Pal = { k: '#2a1d1a', o: '#f2a65a', O: '#d27a3b', w: '#fff4e6', n: '#f59ab0', e: '#2a1d1a' };
const CAT_TOP = [
  '..........k..k..',
  '.........kokkok.',
  '.........koooook',
  '.kk......koooeok',
  '.ko......koooonk',
  '.ko.kkkkkkkwwwk.',
  '..kkoOoOoOowwwk.',
  '...kooooooooowk.',
  '...kooooooooook.',
];
const CAT_LEGS = ['...kwk..kwk.kwk.', '....kwkkwk..kwk.'];
export function makeCat(): CharFrames {
  const f = (flip: boolean) => CAT_LEGS.map((l) => fromRows([...CAT_TOP, l], CAT, flip));
  return { right: f(false), left: f(true) };
}

// ---------------------------------------------------------------- nature
// Foliage is built from overlapping clumps, each lit from the top left with a
// dark underside, drawn back to front so the front clumps read as volume.
interface Leaf { o: string; d2: string; d: string; m: string; l: string; h: string }
const LEAF: Leaf = { o: '#173523', d2: '#21492f', d: '#2c6338', m: '#3d8241', l: '#58a34b', h: '#88c95e' };
const BLOSSOM: Leaf = { o: '#6b2d48', d2: '#a84a6e', d: '#cf6f94', m: '#ec96b6', l: '#ffbcd3', h: '#fff0f5' };
const SHRUB: Leaf = { o: '#173523', d2: '#21492f', d: '#2e6b37', m: '#45923f', l: '#62b04c', h: '#94d266' };

function foliage(p: Pix, clumps: [number, number, number][], L: Leaf, seed: number) {
  for (const [cx, cy, r] of [...clumps].sort((a, b) => a[1] - b[1])) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy) / r;
        if (d > 1) continue;
        const n = hash(x, y, seed);
        if (d > 0.86 && n < 0.4) continue; // ragged leafy edge
        const lit = (-dx * 0.55 - dy * 0.85) / r + (n - 0.5) * 0.4;
        let c = lit > 0.6 ? L.h : lit > 0.2 ? L.l : lit > -0.3 ? L.m : lit > -0.72 ? L.d : L.d2;
        if (d > 0.78 && dy > r * 0.35) c = L.d2; // shade where clumps tuck under each other
        if (c === L.l && (x * 2 + y * 3) % 7 === 0) c = L.h; // leaf glints
        p.set(x, y, c);
      }
  }
}

function trunk(p: Pix, cx: number, top: number, bottom: number, bark = '#6e4a2e') {
  const R = ramp(bark);
  for (let y = top; y <= bottom; y++) {
    const flare = y >= bottom - 1 ? 1 : 0;
    for (let x = cx - 2 - flare; x <= cx + 2 + flare; x++) {
      const i = x - (cx - 2 - flare), w = 5 + flare * 2;
      p.set(x, y, i === 0 ? R.l : i === w - 1 ? R.d2 : i >= w - 2 ? R.d : (y + i * 3) % 7 === 0 ? R.d : R.m);
    }
  }
}

export function makeTree(seed: number, cherry = false) {
  const r = rng(seed);
  const j = () => (r() - 0.5) * 2.4;
  const p = new Pix(26, 32, 0);
  trunk(p, 13, 18, 29);
  const clumps: [number, number, number][] = [
    [13 + j(), 7 + j(), 6], [7 + j(), 10 + j(), 5], [19 + j(), 10 + j(), 5],
    [13, 13, 8.5], [6.5 + j(), 16 + j() * 0.5, 5.2], [19.5 + j(), 16 + j() * 0.5, 5.2], [13 + j(), 18, 5.6],
  ];
  foliage(p, clumps, cherry ? BLOSSOM : LEAF, seed);
  p.mul(11, 19, 5, 3, 0.7); // canopy shadow on the trunk
  if (cherry) for (let k = 0; k < 6; k++) p.set(Math.floor(5 + r() * 16), Math.floor(4 + r() * 14), '#ffffff');
  else for (let k = 0; k < 3; k++) if (r() < 0.5) p.set(Math.floor(6 + r() * 14), Math.floor(8 + r() * 10), r() < 0.5 ? '#e8576a' : '#ffd34d');
  p.outline(cherry ? BLOSSOM.o : LEAF.o);
  return p.canvas();
}

export function makePine(seed: number) {
  const r = rng(seed);
  const p = new Pix(22, 32, 0);
  trunk(p, 11, 22, 29, '#5e3e26');
  const R = { o: '#11291d', d2: '#173a29', d: '#1f4d35', m: '#2c6646', l: '#3f8357', h: '#64a86f' };
  // tiers from the bottom up, so each upper tier overlaps the one below
  const tiers: [number, number, number][] = [[25, 10, 9], [19, 8, 8], [13, 6.5, 7], [7.5, 4.5, 6]];
  for (const [bottom, half, hgt] of tiers) {
    for (let y = bottom - hgt; y <= bottom; y++) {
      const t = (y - (bottom - hgt)) / hgt, hw = half * t + 0.6;
      for (let x = Math.floor(11 - hw); x <= Math.ceil(11 + hw); x++) {
        const u = (x + 0.5 - 11) / hw;
        if (Math.abs(u) > 1) continue;
        if (y === bottom && (x + seed) % 3 === 0) continue; // jagged hem
        const n = r();
        let c = u < -0.45 ? R.l : u < 0.2 ? R.m : u < 0.7 ? R.d : R.d2;
        if (y >= bottom - 1) c = u < -0.3 ? R.m : R.d2;
        if (t < 0.25 && u < 0.3) c = R.l;
        if (n < 0.06 && u < 0.2) c = R.h;
        p.set(x, y, c);
      }
    }
  }
  p.outline(R.o);
  return p.canvas();
}

export function makeDeadTree(seed: number) {
  const r = rng(seed);
  const p = new Pix(22, 32, 0);
  const R = ramp('#4a3d4a');
  for (let y = 11; y <= 29; y++) for (let x = 9; x <= 13; x++) p.set(x, y, x === 9 ? R.l : x >= 12 ? R.d2 : (y + x) % 6 === 0 ? R.d : R.m);
  p.set(8, 29, R.d); p.set(14, 29, R.d2); p.set(8, 28, R.m);
  const branch = (x: number, y: number, dx: number, len: number) => {
    for (let i = 0; i < len; i++) {
      x += dx; if (r() < 0.6) y -= 1;
      p.set(x, y, R.m); p.set(x, y + 1, R.d2);
      if (i === len - 2 && r() < 0.6) { p.set(x + dx, y - 2, R.m); p.set(x, y - 1, R.m); }
    }
  };
  branch(10, 16, -1, 7); branch(12, 13, 1, 7); branch(11, 11, -1, 5); branch(12, 9, 1, 4);
  for (let y = 3; y < 11; y++) p.set(11 + (y % 2), y, R.m);
  p.outline('#1a1520');
  return p.canvas();
}

export function makeBush(seed: number, berries = false) {
  const r = rng(seed);
  const p = new Pix(18, 17, 0);
  foliage(p, [[9, 7, 5.5], [5, 9, 4.2], [13, 9, 4.2], [9, 10, 4.5]], SHRUB, seed + 30);
  if (berries) for (let i = 0; i < 5; i++) { const x = Math.floor(4 + r() * 10), y = Math.floor(5 + r() * 6); p.set(x, y, r() < 0.5 ? '#e8465f' : '#ffd34d'); p.set(x + 1, y + 1, '#8a2333'); }
  p.outline(SHRUB.o);
  return p.canvas();
}

export function makeRock(seed: number, dark = false) {
  const r = rng(seed);
  const p = new Pix(16, 15, 0);
  const R = ramp(dark ? '#443d4d' : '#9196a3');
  const cx = 8 + (r() - 0.5), cy = 7.5;
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - cx) / 6.6, dy = (y + 0.5 - cy) / 4.8;
      const d = dx * dx + dy * dy + Math.sin(x * 1.7 + seed) * 0.08;
      if (d > 1) continue;
      // two facets: a lit top plane and a shaded front
      const top = dy < -0.15 + dx * 0.25;
      const lit = top ? (dx < 0.2 ? R.h : R.l) : dx < -0.3 ? R.m : dx < 0.45 ? R.d : R.d2;
      p.set(x, y, d > 0.8 && !top ? R.d2 : lit);
    }
  p.set(6, 6, R.d); p.set(7, 7, R.d); p.set(8, 7, R.d);
  if (!dark) { p.set(4, 9, '#5aa84a'); p.set(5, 10, '#3d8241'); }
  p.outline(dark ? '#16121c' : '#2e3140');
  return p.canvas();
}

// ---------------------------------------------------------------- props
export function makeLamp() {
  const p = new Pix(12, 34, 0);
  const I = ramp('#3a3a4e');
  // tapered base, pole, crossbar and a lantern head
  p.fill(3, 29, 6, 4, (i, j) => (j === 0 ? I.l : i === 0 ? I.l : i === 5 ? I.d2 : I.m));
  p.fill(4, 27, 4, 2, (i) => (i === 0 ? I.l : i === 3 ? I.d2 : I.m));
  p.fill(5, 11, 2, 16, (i) => (i === 0 ? I.l : I.d));
  p.fill(4, 10, 4, 1, () => I.m);
  p.fill(2, 2, 8, 2, (i, j) => (j === 0 ? I.l : i === 7 ? I.d2 : I.m));
  p.fill(5, 0, 2, 2, (i) => (i ? I.d : I.l));
  p.fill(3, 4, 6, 6, (i, j) => (i === 0 || i === 5 ? I.m : j === 0 ? '#fff4c4' : (i + j) % 4 === 0 ? '#fff8de' : j > 3 ? '#ffc96e' : '#ffe08f'));
  p.fill(2, 9, 8, 1, (i) => (i === 7 ? I.d2 : I.m));
  p.outline('#1d1a2b');
  return p.canvas();
}

export function makeSign() {
  const p = new Pix(18, 19, 0);
  const W = ramp('#a8743f'), P = ramp('#6e4a2e');
  for (const x of [3, 13]) p.fill(x, 9, 2, 9, (i) => (i ? P.d : P.l));
  p.fill(1, 1, 16, 10, (i, j) => (j === 0 ? W.h : j === 9 ? W.d2 : i === 0 ? W.l : i === 15 ? W.d : j === 4 ? W.d : W.m));
  p.fill(3, 3, 11, 1, () => '#5a3a22'); p.fill(3, 6, 8, 1, () => '#5a3a22'); p.fill(3, 8, 10, 1, () => '#5a3a22');
  p.set(2, 2, '#e9dcc0'); p.set(14, 2, '#e9dcc0');
  p.mul(1, 11, 16, 1, 0.75);
  p.outline('#2a1d18');
  return p.canvas();
}

export function makeMailbox() {
  // a red pillar box
  const p = new Pix(12, 20, 0);
  const R = ramp('#d63a4a');
  p.fill(2, 3, 8, 14, (i, j) => (i === 0 ? R.l : i === 1 ? R.h : i >= 6 ? R.d : j === 0 ? R.l : R.m));
  p.fill(1, 1, 10, 3, (i, j) => (j === 0 ? R.h : i === 9 ? R.d : R.l));
  p.fill(3, 0, 6, 1, () => R.l);
  p.fill(3, 6, 6, 1, () => '#1d1a2b');
  p.fill(4, 9, 4, 3, (_i, j) => (j === 0 ? '#ffe9a3' : '#ffd34d'));
  p.fill(1, 17, 10, 2, (i) => (i === 9 ? '#1d1a2b' : '#3a3a4e'));
  p.outline('#2a1520');
  return p.canvas();
}

export function makeBarrel() {
  const p = new Pix(13, 15, 0);
  const W = ramp('#9a6634'), M = ramp('#5a5a6a');
  p.fill(1, 3, 11, 11, (i, j) => {
    const band = j === 1 || j === 8;
    const R = band ? M : W;
    return i === 0 ? R.l : i === 1 ? R.h : i >= 9 ? R.d2 : i >= 7 ? R.d : (i + j * 0) % 3 === 2 && !band ? W.d : R.m;
  });
  p.fill(2, 0, 9, 4, (i, j) => (j === 0 || i === 0 || i === 8 ? W.d : (i + j) % 3 === 0 ? W.d : W.l));
  p.fill(3, 1, 7, 2, (i) => (i % 3 === 1 ? '#5a3a22' : W.m));
  p.outline('#2a1d18');
  return p.canvas();
}

export function makeCrate() {
  const p = new Pix(15, 15, 0);
  const W = ramp('#b8864e');
  p.fill(1, 1, 13, 4, (i, j) => (j === 0 ? W.h : i % 4 === 0 ? W.d : W.l)); // top face
  p.fill(1, 5, 13, 9, (i, j) => (i === 0 || i === 12 || j === 0 || j === 8 ? W.d : Math.abs(i - j * 1.4) < 1 ? W.d : i < 2 ? W.l : W.m));
  p.mul(10, 5, 4, 9, 0.85);
  p.outline('#2a1d18');
  return p.canvas();
}

export function makeBench() {
  const p = new Pix(28, 16, 0);
  const W = ramp('#b07a42'), I = ramp('#3a3a4e');
  for (const x of [3, 23]) { p.fill(x, 1, 2, 14, (i) => (i ? I.d : I.l)); }
  for (const y of [1, 4]) p.fill(1, y, 26, 2, (i, j) => (j === 0 ? W.l : i === 25 ? W.d : W.m));
  p.fill(1, 8, 26, 3, (i, j) => (j === 0 ? W.h : j === 2 ? W.d : i === 25 ? W.d : W.l));
  p.mul(1, 11, 26, 1, 0.7);
  p.outline('#2a1d18');
  return p.canvas();
}

export function makeBrazier() {
  const p = new Pix(14, 18, 0);
  const I = ramp('#3d3745');
  p.fill(2, 5, 10, 5, (i, j) => (j === 0 ? '#ff8a3d' : j === 1 ? '#ffd27a' : i === 0 ? I.l : i === 9 ? I.d2 : I.m));
  p.fill(5, 10, 4, 6, (i) => (i === 0 ? I.l : i === 3 ? I.d2 : I.d));
  p.fill(3, 15, 8, 2, (i) => (i === 7 ? I.d2 : I.m));
  p.outline('#120e16');
  return p.canvas();
}

export function makeGravestone() {
  const p = new Pix(12, 15, 0);
  const R = ramp('#6a6276');
  p.fill(1, 2, 10, 12, (i, j) => (j < 2 && (i === 0 || i === 9) ? null : i === 0 ? R.l : i >= 8 ? R.d : j === 0 ? R.h : R.m));
  p.fill(4, 4, 4, 1, () => R.d2); p.fill(5, 3, 2, 6, () => R.d2);
  p.set(2, 12, '#3d8241'); p.set(9, 13, '#3d8241');
  p.outline('#1a1520');
  return p.canvas();
}

export function makeFountain() {
  const p = new Pix(48, 44, 0);
  const S = ramp('#c9c4d3');
  const ell = (cx: number, cy: number, rx: number, ry: number, f: (dx: number, dy: number, d: number) => string | null) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
        if (d <= 1) p.set(x, y, f(dx, dy, d));
      }
  };
  // outer basin wall, rim and water
  ell(24, 28, 23, 15, (dx, dy) => (dy > 0.2 ? (dx < -0.5 ? S.m : dx < 0.5 ? S.d : S.d2) : S.l));
  ell(24, 25, 22, 13, (dx, dy, d) => (d > 0.7 ? (dy < 0 ? (dx < 0 ? S.h : S.l) : S.m) : null));
  ell(24, 26, 18, 10, (dx, dy, d) => (d > 0.86 ? '#2f6fa8' : dy < -0.5 ? '#3b8fd6' : (Math.round(dx * 9 + dy * 4) % 4 === 0 && d < 0.6) ? '#bfe9ff' : '#4aa3df'));
  // pillar with a little bowl
  p.fill(21, 11, 6, 16, (i) => (i === 0 ? S.h : i === 1 ? S.l : i >= 4 ? S.d : S.m));
  ell(24, 11, 9, 3.5, (dx, dy) => (dy < -0.2 ? (dx < 0 ? S.h : S.l) : dx > 0.4 ? S.d : S.m));
  ell(24, 10.5, 6.5, 2, () => '#4aa3df');
  p.set(22, 10, '#bfe9ff'); p.set(26, 11, '#bfe9ff');
  p.fill(23, 6, 2, 4, (i) => (i ? S.d : S.h));
  p.outline('#2e2a3a');
  return p.canvas();
}
