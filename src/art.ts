// Pixel art drawn in code: characters from string maps, everything else
// (trees, props, buildings) from small procedural painters. All sprites are
// cached canvases at native resolution (1 tile = 16 px).

export const T = 16;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx] as const;
}

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
function blob(ctx: CanvasRenderingContext2D, circles: [number, number, number][], pal: { o: string; d: string; m: string; l: string; h: string }, r: () => number) {
  const inside = (x: number, y: number) => circles.some(([cx, cy, cr]) => (x - cx) ** 2 + (y - cy) ** 2 <= cr * cr);
  const w = ctx.canvas.width, h = ctx.canvas.height;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      const edge = !inside(x - 0.5, y + 0.5) || !inside(x + 1.5, y + 0.5) || !inside(x + 0.5, y - 0.5) || !inside(x + 0.5, y + 1.5);
      const [cx, cy] = circles[0];
      const shade = (x - cx) * 0.6 + (y - cy) + (r() - 0.5) * 3;
      ctx.fillStyle = edge ? pal.o : shade > 3.5 ? pal.d : shade < -5 ? (r() < 0.25 ? pal.h : pal.l) : pal.m;
      ctx.fillRect(x, y, 1, 1);
    }
}

export function makeTree(seed: number, cherry = false) {
  const r = rng(seed);
  const [c, ctx] = canvas(22, 28);
  // trunk
  ctx.fillStyle = '#4e3220';
  ctx.fillRect(9, 17, 5, 10);
  ctx.fillStyle = '#7a5232';
  ctx.fillRect(10, 17, 3, 9);
  ctx.fillStyle = '#93663f';
  ctx.fillRect(10, 18, 1, 6);
  const j = () => (r() - 0.5) * 2;
  blob(ctx, [[11, 10, 8.4], [6 + j(), 12 + j(), 5.2], [16 + j(), 12 + j(), 5.2], [11 + j(), 5, 5.5]], cherry
    ? { o: '#8a3d5c', d: '#d97aa0', m: '#f2a2c0', l: '#ffc4d8', h: '#fff0f5' }
    : { o: '#1f4a2a', d: '#2e6b35', m: '#3f8f3e', l: '#58ad4a', h: '#7dcb5e' }, r);
  return c;
}

export function makePine(seed: number) {
  const r = rng(seed);
  const [c, ctx] = canvas(20, 30);
  ctx.fillStyle = '#4e3220';
  ctx.fillRect(8, 23, 4, 6);
  const tiers = [[10, 3, 4], [10, 9, 7], [10, 16, 9]];
  for (const [cx, top, half] of tiers) {
    const height = half + 3;
    for (let y = 0; y < height; y++) {
      const hw = Math.round((y / height) * half);
      for (let x = -hw; x <= hw; x++) {
        const edge = Math.abs(x) === hw || y === height - 1;
        const light = x < 0 && r() < 0.6;
        ctx.fillStyle = edge ? '#173d2c' : light ? '#3b8457' : '#2b6847';
        if (!edge && r() < 0.08) ctx.fillStyle = '#5aa86f';
        ctx.fillRect(cx + x, top + y, 1, 1);
      }
    }
  }
  return c;
}

export function makeDeadTree(seed: number) {
  const r = rng(seed);
  const [c, ctx] = canvas(20, 28);
  const px = (x: number, y: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); };
  ctx.fillStyle = '#2a2230';
  ctx.fillRect(8, 10, 5, 18);
  ctx.fillStyle = '#4a3d4a';
  ctx.fillRect(9, 10, 3, 17);
  ctx.fillStyle = '#5e4f5c';
  ctx.fillRect(9, 12, 1, 12);
  const branch = (x: number, y: number, dx: number, len: number) => {
    for (let i = 0; i < len; i++) {
      x += dx; if (r() < 0.6) y -= 1;
      px(x, y, '#2a2230'); px(x, y + 1, '#4a3d4a');
    }
  };
  branch(9, 14, -1, 6); branch(11, 12, 1, 6); branch(10, 10, -1, 4); branch(11, 9, 1, 3);
  for (let y = 3; y < 10; y++) px(10 + (y % 2), y, '#3a2f3c');
  return c;
}

export function makeBush(seed: number, berries = false) {
  const r = rng(seed);
  const [c, ctx] = canvas(16, 13);
  blob(ctx, [[8, 7, 6.2], [4.5, 8.5, 4], [11.5, 8.5, 4]], { o: '#1f4a2a', d: '#2e6b35', m: '#45973f', l: '#5fb34d', h: '#84d063' }, r);
  if (berries) for (let i = 0; i < 4; i++) { ctx.fillStyle = r() < 0.5 ? '#e8576a' : '#f7d154'; ctx.fillRect(3 + Math.floor(r() * 10), 4 + Math.floor(r() * 6), 1, 1); }
  return c;
}

export function makeRock(seed: number, dark = false) {
  const r = rng(seed);
  const [c, ctx] = canvas(16, 12);
  blob(ctx, [[8, 7, 5.6], [5, 8, 3.6], [11, 8, 3.8]], dark
    ? { o: '#1c1822', d: '#2e2934', m: '#3d3745', l: '#544c5d', h: '#6b6175' }
    : { o: '#3d3f4a', d: '#6c6f7b', m: '#8a8d98', l: '#a7aab3', h: '#c8cad0' }, r);
  return c;
}

export function makeLamp() {
  const [c, ctx] = canvas(10, 30);
  ctx.fillStyle = '#23222e'; ctx.fillRect(4, 8, 2, 21); ctx.fillRect(2, 27, 6, 2);
  ctx.fillStyle = '#3b3a4b'; ctx.fillRect(4, 9, 1, 18);
  ctx.fillStyle = '#23222e'; ctx.fillRect(1, 1, 8, 8);
  ctx.fillStyle = '#ffe9a3'; ctx.fillRect(2, 3, 6, 5);
  ctx.fillStyle = '#fff7d6'; ctx.fillRect(3, 4, 2, 2);
  ctx.fillStyle = '#23222e'; ctx.fillRect(3, 0, 4, 1);
  return c;
}

export function makeSign() {
  const [c, ctx] = canvas(16, 18);
  ctx.fillStyle = '#4e3220'; ctx.fillRect(7, 9, 2, 9);
  ctx.fillStyle = '#4e3220'; ctx.fillRect(1, 1, 14, 10);
  ctx.fillStyle = '#b07a45'; ctx.fillRect(2, 2, 12, 8);
  ctx.fillStyle = '#c8935a'; ctx.fillRect(2, 2, 12, 1);
  ctx.fillStyle = '#6e4628';
  ctx.fillRect(4, 4, 8, 1); ctx.fillRect(4, 6, 6, 1); ctx.fillRect(4, 8, 7, 1);
  return c;
}

export function makeMailbox() {
  const [c, ctx] = canvas(12, 18);
  ctx.fillStyle = '#4e3220'; ctx.fillRect(5, 9, 2, 9);
  ctx.fillStyle = '#7a1f2b'; ctx.fillRect(1, 2, 10, 8);
  ctx.fillStyle = '#d63a4a'; ctx.fillRect(2, 2, 8, 7); ctx.fillRect(3, 1, 6, 1);
  ctx.fillStyle = '#f07080'; ctx.fillRect(3, 2, 5, 1);
  ctx.fillStyle = '#1d1a2b'; ctx.fillRect(3, 5, 6, 1);
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(10, 3, 1, 3);
  return c;
}

export function makeBarrel() {
  const [c, ctx] = canvas(12, 14);
  ctx.fillStyle = '#3d2616'; ctx.fillRect(1, 1, 10, 13);
  ctx.fillStyle = '#8a5a2e'; ctx.fillRect(2, 1, 8, 12);
  ctx.fillStyle = '#a8743f'; ctx.fillRect(3, 2, 2, 10);
  ctx.fillStyle = '#4b4b55'; ctx.fillRect(1, 3, 10, 1); ctx.fillRect(1, 10, 10, 1);
  ctx.fillStyle = '#6b4424'; ctx.fillRect(2, 0, 8, 2);
  return c;
}

export function makeCrate() {
  const [c, ctx] = canvas(14, 14);
  ctx.fillStyle = '#4e3220'; ctx.fillRect(0, 0, 14, 14);
  ctx.fillStyle = '#b0804a'; ctx.fillRect(1, 1, 12, 12);
  ctx.fillStyle = '#8a5f34'; ctx.fillRect(1, 6, 12, 2);
  for (let i = 1; i < 13; i++) { ctx.fillStyle = '#6e4628'; ctx.fillRect(i, i, 1, 1); }
  return c;
}

export function makeBench() {
  const [c, ctx] = canvas(26, 14);
  ctx.fillStyle = '#3d2616'; ctx.fillRect(2, 8, 2, 6); ctx.fillRect(22, 8, 2, 6);
  ctx.fillStyle = '#4e3220'; ctx.fillRect(0, 1, 26, 4); ctx.fillRect(0, 6, 26, 4);
  ctx.fillStyle = '#a8743f'; ctx.fillRect(1, 2, 24, 2); ctx.fillRect(1, 7, 24, 2);
  return c;
}

export function makeBrazier() {
  const [c, ctx] = canvas(14, 18);
  ctx.fillStyle = '#1c1822'; ctx.fillRect(2, 6, 10, 5); ctx.fillRect(5, 11, 4, 6); ctx.fillRect(3, 16, 8, 2);
  ctx.fillStyle = '#3d3745'; ctx.fillRect(3, 7, 8, 3); ctx.fillRect(6, 11, 2, 5);
  ctx.fillStyle = '#ff8a3d'; ctx.fillRect(3, 6, 8, 1);
  return c;
}

export function makeGravestone() {
  const [c, ctx] = canvas(12, 14);
  ctx.fillStyle = '#1c1822'; ctx.fillRect(1, 2, 10, 12); ctx.fillRect(2, 1, 8, 1);
  ctx.fillStyle = '#5c5466'; ctx.fillRect(2, 2, 8, 11);
  ctx.fillStyle = '#756c80'; ctx.fillRect(2, 2, 8, 1); ctx.fillRect(2, 2, 1, 11);
  ctx.fillStyle = '#2e2934'; ctx.fillRect(5, 4, 2, 6); ctx.fillRect(4, 5, 4, 1);
  return c;
}

export function makeFountain() {
  const [c, ctx] = canvas(48, 44);
  const ell = (cx: number, cy: number, rx: number, ry: number, col: string) => {
    ctx.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const hw = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2));
      ctx.fillRect(cx - hw, cy + y, hw * 2, 1);
    }
  };
  ell(24, 26, 23, 16, '#4b4a57');
  ell(24, 25, 22, 15, '#a8a3b4');
  ell(24, 24, 21, 13, '#c9c4d3');
  ell(24, 26, 18, 11, '#5b5a6a');
  ell(24, 27, 17, 10, '#3b8fd6');
  ell(24, 28, 15, 8, '#4aa3df');
  // pillar + top bowl
  ctx.fillStyle = '#4b4a57'; ctx.fillRect(20, 10, 8, 18);
  ctx.fillStyle = '#c9c4d3'; ctx.fillRect(21, 10, 6, 17);
  ctx.fillStyle = '#e4e0ea'; ctx.fillRect(21, 10, 2, 17);
  ell(24, 10, 10, 4, '#4b4a57');
  ell(24, 9, 9, 3, '#c9c4d3');
  ell(24, 10, 7, 2, '#4aa3df');
  return c;
}

// ---------------------------------------------------------------- 3x5 pixel font
const FONT: Record<string, string> = {
  A: '.x.x.xxxxx.xx.x', B: 'xx.x.xxx.x.xxx.', C: '.xxx..x..x...xx', D: 'xx.x.xx.xx.xxx.', E: 'xxxx..xx.x..xxx',
  F: 'xxxx..xx.x..x..', G: '.xxx..x.xx.x.xx', H: 'x.xx.xxxxx.xx.x', I: 'xxx.x..x..x.xxx', J: '..x..x..xx.x.x.',
  K: 'x.xx.xxx.x.xx.x', L: 'x..x..x..x..xxx', M: 'x.xxxxxxxx.xx.x', N: 'xx.x.xx.xx.xx.x', O: '.x.x.xx.xx.x.x.',
  P: 'xx.x.xxx.x..x..', R: 'xx.x.xxx.x.xx.x', S: '.xxx...x...xxx.', T: 'xxx.x..x..x..x.', U: 'x.xx.xx.xx.xxxx',
  V: 'x.xx.xx.xx.x.x.', W: 'x.xx.xxxxxxxx.x', Y: 'x.xx.x.x..x..x.', Z: 'xxx..x.x.x..xxx', '2': '.x.x.x..x.x.xxx', ' ': '...............',
};
/** Draw text in a 3x5 pixel font; returns its width. */
export function pixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) if (g[i] === 'x') ctx.fillRect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
    cx += 4 * scale;
  }
  return text.length * 4 * scale - scale;
}
const textWidth = (text: string, scale = 1) => text.length * 4 * scale - scale;

// ---------------------------------------------------------------- buildings
export type BuildingKind = 'academy' | 'library' | 'home' | 'party' | 'office' | 'post' | 'arcade' | 'keep' | 'booth'
  | 'stadium' | 'dojo' | 'diner' | 'bank' | 'gym';

export interface BuildingArt {
  img: HTMLCanvasElement;
  top: number; // extra pixels above the footprint
  lights: { x: number; y: number; color: string }[]; // blinking bulbs (arcade, party)
  flames: { x: number; y: number }[]; // fire emitters (keep)
  smoke?: { x: number; y: number };
}

interface Look {
  wall: string; wallD: string; wallL: string; style: 'brick' | 'plank' | 'stone' | 'glass' | 'plaster' | 'darkstone';
  roof: string; roofD: string; roofL: string; roofStyle: 'shingle' | 'flat' | 'crenel';
  roofH: number; door: number; windows: number[]; top?: number;
}

const LOOKS: Record<Exclude<BuildingKind, 'booth'>, Look> = {
  academy: { wall: '#e9dcc0', wallD: '#c4b28e', wallL: '#f7eedb', style: 'stone', roof: '#3d6fb8', roofD: '#2a4f88', roofL: '#5a8ad1', roofStyle: 'shingle', roofH: 50, door: 6, windows: [1, 3, 9, 11], top: 22 },
  library: { wall: '#d8c4a0', wallD: '#a88f68', wallL: '#eadbbd', style: 'brick', roof: '#3f7f4d', roofD: '#2b5a36', roofL: '#5aa065', roofStyle: 'shingle', roofH: 42, door: 4, windows: [1, 2, 6, 7], top: 4 },
  home: { wall: '#f3e7cf', wallD: '#cbb894', wallL: '#fffaf0', style: 'plaster', roof: '#c24f3d', roofD: '#8f3328', roofL: '#de6e57', roofStyle: 'shingle', roofH: 44, door: 4, windows: [1, 6], top: 14 },
  party: { wall: '#ffd6e5', wallD: '#e3a6bf', wallL: '#fff0f6', style: 'plank', roof: '#8a5bd6', roofD: '#6340a3', roofL: '#a77ee8', roofStyle: 'shingle', roofH: 50, door: 5, windows: [1, 3, 7, 8], top: 16 },
  office: { wall: '#9fc7e6', wallD: '#5d86a8', wallL: '#d4ecff', style: 'glass', roof: '#c7ccd6', roofD: '#8f96a3', roofL: '#e1e5ec', roofStyle: 'flat', roofH: 40, door: 5, windows: [], top: 10 },
  post: { wall: '#c96f4a', wallD: '#9a4e33', wallL: '#e08a64', style: 'brick', roof: '#3a4f7a', roofD: '#283858', roofL: '#55709f', roofStyle: 'shingle', roofH: 38, door: 4, windows: [1, 2, 6, 7], top: 8 },
  arcade: { wall: '#3a2b5c', wallD: '#2a1f45', wallL: '#4d3b78', style: 'brick', roof: '#23193b', roofD: '#150f26', roofL: '#352857', roofStyle: 'flat', roofH: 46, door: 5, windows: [1, 2, 8], top: 18 },
  stadium: { wall: '#d9c39a', wallD: '#b59d72', wallL: '#ecdcb8', style: 'stone', roof: '#c9a26b', roofD: '#9c7a4a', roofL: '#e4c58e', roofStyle: 'crenel', roofH: 50, door: 5, windows: [1, 3, 7, 8], top: 16 },
  dojo: { wall: '#f3ead8', wallD: '#cbbfa5', wallL: '#fffaf0', style: 'plaster', roof: '#34404f', roofD: '#222b36', roofL: '#4a5a6e', roofStyle: 'shingle', roofH: 40, door: 3, windows: [1, 5], top: 6 },
  diner: { wall: '#fff1dc', wallD: '#e2cfae', wallL: '#ffffff', style: 'plank', roof: '#e8576a', roofD: '#b83a4c', roofL: '#f47a8a', roofStyle: 'shingle', roofH: 38, door: 3, windows: [1, 5], top: 4 },
  bank: { wall: '#eef0f2', wallD: '#c9ced6', wallL: '#ffffff', style: 'stone', roof: '#2f8f6a', roofD: '#1f6b4e', roofL: '#47ab84', roofStyle: 'shingle', roofH: 44, door: 3, windows: [1, 5], top: 4 },
  gym: { wall: '#8d96a0', wallD: '#6b737c', wallL: '#a9b1ba', style: 'brick', roof: '#3b4048', roofD: '#2a2e34', roofL: '#4f555e', roofStyle: 'flat', roofH: 28, door: 3, windows: [1, 5], top: 18 },
  keep: { wall: '#4a4458', wallD: '#2e2a38', wallL: '#5d566d', style: 'darkstone', roof: '#3b3646', roofD: '#25212d', roofL: '#544d63', roofStyle: 'crenel', roofH: 50, door: 5, windows: [2, 8], top: 18 },
};

export function makeBuilding(kind: BuildingKind, wTiles: number, hTiles: number, seed: number, booth?: { a: string; b: string; icon: string }): BuildingArt {
  if (kind === 'booth') return makeBooth(wTiles, hTiles, booth!);
  const L = LOOKS[kind];
  const r = rng(seed);
  const W = wTiles * T, H = hTiles * T, top = L.top ?? 0;
  const [c, ctx] = canvas(W, H + top);
  const px = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y + top, w, h); };
  const lights: BuildingArt['lights'] = [];
  const flames: BuildingArt['flames'] = [];
  const roofH = L.roofH;
  const wallTop = roofH;
  const wallH = H - roofH;

  // walls (inset 2px under the eaves)
  px(1, wallTop - 2, W - 2, wallH + 2, '#1d1a2b');
  px(2, wallTop - 2, W - 4, wallH + 1, L.wall);
  if (L.style === 'brick') {
    for (let y = wallTop; y < H - 1; y += 4) {
      px(2, y, W - 4, 1, L.wallD);
      const off = ((y / 4) | 0) % 2 ? 4 : 0;
      for (let x = 2 + off; x < W - 2; x += 8) px(x, y, 1, 4, L.wallD);
      for (let x = 3 + off; x < W - 3; x += 8) if (r() < 0.25) px(x, y + 1, 3, 1, L.wallL);
    }
  } else if (L.style === 'plank') {
    for (let y = wallTop + 5; y < H - 1; y += 6) px(2, y, W - 4, 1, L.wallD);
    for (let y = wallTop; y < H - 1; y += 6) for (let x = 6 + ((y / 6) % 2) * 8; x < W - 4; x += 16) px(x, y, 1, 5, L.wallD);
    for (let i = 0; i < W * wallH * 0.02; i++) px(2 + Math.floor(r() * (W - 4)), wallTop + Math.floor(r() * wallH), 2, 1, L.wallL);
  } else if (L.style === 'stone' || L.style === 'darkstone') {
    for (let y = wallTop; y < H - 1; y += 6) {
      px(2, y, W - 4, 1, L.wallD);
      let x = 2 + Math.floor(r() * 6);
      while (x < W - 2) { px(x, y, 1, 6, L.wallD); px(x + 1, y + 1, 3, 1, L.wallL); x += 6 + Math.floor(r() * 7); }
    }
  } else if (L.style === 'plaster') {
    for (let i = 0; i < W * wallH * 0.05; i++) px(2 + Math.floor(r() * (W - 4)), wallTop + Math.floor(r() * wallH), 1, 1, L.wallD);
    px(2, wallTop + 2, W - 4, 2, '#6e4628');
    for (let x = 2; x < W - 2; x += 24) px(x, wallTop, 3, wallH - 1, '#6e4628');
    px(W - 5, wallTop, 3, wallH - 1, '#6e4628');
  } else if (L.style === 'glass') {
    px(2, wallTop, W - 4, wallH - 1, '#e9eef5');
    for (let y = wallTop + 4; y < H - 6; y += 14) {
      px(2, y + 11, W - 4, 2, '#c3cad6');
      for (let x = 6; x < W - 16; x += 16) {
        px(x, y, 14, 10, '#2d4a66');
        px(x + 1, y + 1, 12, 8, r() < 0.22 ? '#fff1b8' : '#8cc8f0');
        px(x + 1, y + 1, 4, 1, '#e6f6ff'); px(x + 1, y + 2, 2, 1, '#e6f6ff');
        px(x + 7, y + 1, 1, 8, '#2d4a66');
      }
    }
  }
  // base strip
  px(1, H - 2, W - 2, 2, L.wallD);

  // roof
  if (L.roofStyle === 'shingle') {
    px(0, 0, W, roofH, '#1d1a2b');
    px(1, 1, W - 2, roofH - 3, L.roof);
    for (let y = 4; y < roofH - 3; y += 4) {
      px(1, y, W - 2, 1, L.roofD);
      const off = ((y / 4) | 0) % 2 ? 0 : 4;
      for (let x = 1 + off; x < W - 1; x += 8) px(x, y - 3, 1, 3, L.roofD);
    }
    px(1, 1, W - 2, 2, L.roofL);
    px(1, roofH - 3, W - 2, 2, L.roofD);
  } else if (L.roofStyle === 'flat') {
    px(0, 0, W, roofH, '#1d1a2b');
    px(1, 1, W - 2, roofH - 3, L.roof);
    px(1, 1, W - 2, 2, L.roofL);
    px(3, 4, W - 6, roofH - 9, L.roofD);
    px(4, 5, W - 8, roofH - 11, L.roof);
    px(1, roofH - 3, W - 2, 2, L.roofD);
  } else {
    // battlements
    px(0, 6, W, roofH - 6, '#1d1a2b');
    px(1, 7, W - 2, roofH - 9, L.roof);
    for (let y = 10; y < roofH - 3; y += 6) { px(1, y, W - 2, 1, L.roofD); let x = 1 + Math.floor(r() * 5); while (x < W - 1) { px(x, y, 1, 6, L.roofD); x += 7 + Math.floor(r() * 6); } }
    for (let x = 0; x < W; x += 10) { px(x, 0, 7, 8, '#1d1a2b'); px(x + 1, 1, 5, 7, L.roofL); px(x + 1, 1, 5, 1, '#6e6680'); }
    px(1, roofH - 3, W - 2, 2, L.roofD);
  }

  // windows
  const wy = wallTop + Math.max(3, Math.floor((wallH - 14) / 2) - 2);
  for (const col of L.windows) {
    const x = col * T + 3;
    if (kind === 'keep') {
      px(x + 1, wy - 2, 8, 14, '#1d1a2b'); px(x + 2, wy - 1, 6, 12, '#ff9a4a'); px(x + 3, wy, 4, 10, '#ffd27a'); px(x + 4, wy - 2, 2, 1, '#1d1a2b');
      continue;
    }
    px(x, wy, 10, 11, kind === 'arcade' ? '#120c22' : '#4a3020');
    if (kind === 'library') {
      px(x + 1, wy + 1, 8, 9, '#3a2416');
      const books = ['#c94a4a', '#4a7fc9', '#e0b84a', '#5aa065', '#9a5ac9'];
      for (let i = 0; i < 8; i++) { px(x + 1 + i, wy + 2 + (i % 3 === 0 ? 1 : 0), 1, 3 - (i % 3 === 0 ? 1 : 0), books[i % 5]); px(x + 1 + i, wy + 6, 1, 3, books[(i + 2) % 5]); }
      px(x + 1, wy + 5, 8, 1, '#5a3a22');
    } else if (kind === 'arcade') {
      px(x + 1, wy + 1, 8, 9, '#1b1236');
      px(x + 2, wy + 2, 6, 4, ['#4af0ff', '#ff4ad8', '#ffe14a'][col % 3]);
      px(x + 3, wy + 7, 1, 2, '#e8e8f0'); px(x + 6, wy + 7, 2, 1, '#ff4a6a');
    } else {
      px(x + 1, wy + 1, 8, 9, '#8fd3ff');
      px(x + 1, wy + 1, 8, 4, '#b8e6ff');
      px(x + 5, wy + 1, 1, 9, '#4a3020'); px(x + 1, wy + 5, 8, 1, '#4a3020');
      px(x + 2, wy + 2, 2, 1, '#ffffff');
      if (kind === 'home' || kind === 'party') { px(x - 1, wy + 10, 12, 3, '#7a4a2a'); for (let i = 0; i < 5; i++) px(x + i * 2, wy + 9, 1, 1, ['#ff6f91', '#ffd34d', '#ffffff'][i % 3]); }
    }
  }

  // door
  const dx = L.door * T + 3;
  const dh = 14;
  const dy = H - dh - 1;
  if (kind === 'keep') {
    px(dx - 3, dy - 6, 16, dh + 7, '#1d1a2b');
    px(dx - 2, dy - 4, 14, dh + 5, '#2b1a14');
    px(dx - 1, dy - 2, 12, dh + 3, '#ff7a2f');
    px(dx + 1, dy, 8, dh + 1, '#ffb15a');
    px(dx + 3, dy + 3, 4, dh - 2, '#ffe2a0');
    px(dx - 2, dy - 6, 2, 2, '#1d1a2b'); px(dx + 10, dy - 6, 2, 2, '#1d1a2b');
    flames.push({ x: dx - 9, y: dy + 2 + top }, { x: dx + 19, y: dy + 2 + top });
    px(dx - 12, dy + 4, 8, 11, '#1c1822'); px(dx - 11, dy + 4, 6, 2, '#3d3745');
    px(dx + 14, dy + 4, 8, 11, '#1c1822'); px(dx + 15, dy + 4, 6, 2, '#3d3745');
    // banners
    for (const bx of [2 * T - 4, 8 * T + 10]) { px(bx, wallTop + 1, 8, 18, '#1d1a2b'); px(bx + 1, wallTop + 1, 6, 16, '#a3283a'); px(bx + 3, wallTop + 6, 2, 5, '#ff9a4a'); px(bx + 1, wallTop + 17, 2, 1, '#1d1a2b'); px(bx + 5, wallTop + 17, 2, 1, '#1d1a2b'); }
  } else if (kind === 'office') {
    px(dx - 2, dy - 1, 14, dh + 1, '#2d4a66');
    px(dx - 1, dy, 5, dh, '#b8e6ff'); px(dx + 6, dy, 5, dh, '#b8e6ff');
    px(dx, dy + 1, 1, dh - 3, '#ffffff'); px(dx + 7, dy + 1, 1, dh - 3, '#ffffff');
  } else {
    px(dx - 1, dy - 1, 12, dh + 1, '#1d1a2b');
    px(dx, dy, 10, dh, kind === 'arcade' ? '#120c22' : '#7a4a2a');
    if (kind !== 'arcade') { for (let x = dx + 2; x < dx + 10; x += 3) px(x, dy, 1, dh, '#5e3720'); px(dx + 7, dy + 7, 1, 1, '#ffd34d'); }
    else { px(dx + 1, dy + 1, 8, dh - 2, '#2d1f55'); px(dx + 1, dy + 4, 8, 1, '#ff4ad8'); }
    px(dx - 1, dy - 1, 1, 1, L.wall); px(dx + 10, dy - 1, 1, 1, L.wall);
  }
  px(dx - 3, H - 1, 16, 1, '#8a8d98');

  // name plank over the door
  const PLANK: Partial<Record<BuildingKind, [string, string, string]>> = {
    academy: ['TARUMT', '#2a4f88', '#fff7e6'], library: ['LIBRARY', '#6e4628', '#ffe9a3'], party: ['PARTY', '#8a5bd6', '#fff7e6'],
    post: ['POST', '#283858', '#fff7e6'], arcade: ['ARCADE', '#120c22', '#ff4ad8'],
    stadium: ['HOT POTATO', '#c8641a', '#fff7e6'], dojo: ['KANA', '#b8323c', '#fff7e6'], diner: ['WHAT2EAT', '#e8576a', '#ffffff'],
    bank: ['FINSIGHT', '#1f6b4e', '#fff7e6'], gym: ['GYMTRACK', '#22262c', '#ffd34d'],
  };
  const pl = PLANK[kind];
  if (pl) {
    const tw = textWidth(pl[0]);
    const x0 = Math.round(dx + 5 - tw / 2) - 3, y0 = dy - 11;
    px(x0 - 1, y0 - 1, tw + 8, 9, '#1d1a2b'); px(x0, y0, tw + 6, 7, pl[1]);
    pixelText(ctx, pl[0], x0 + 3, y0 + 1 + top, pl[2]);
  }

  // kind-specific extras
  if (kind === 'academy') {
    // pillars
    for (const x of [2 * T + 8, 5 * T + 4, 8 * T + 2, 10 * T + 8]) { px(x, wallTop, 5, wallH - 2, '#cfc4ab'); px(x + 1, wallTop, 2, wallH - 2, '#ffffff'); px(x - 1, wallTop, 7, 2, '#b8ac93'); }
    // pediment + clock
    const cx = W / 2;
    for (let y = 0; y < 16; y++) px(cx - 2 * y - 2, roofH - 20 + y - 18, 4 * y + 4, 1, y === 0 ? '#1d1a2b' : y % 5 === 0 ? '#c4b28e' : '#efe4cc');
    px(cx - 6, roofH - 30, 12, 12, '#1d1a2b'); px(cx - 5, roofH - 29, 10, 10, '#fffaf0'); px(cx, roofH - 27, 1, 4, '#1d1a2b'); px(cx, roofH - 24, 3, 1, '#1d1a2b');
    // flag
    px(cx - 1, -top, 2, top + 6, '#4b4a57');
    px(cx + 1, -top + 1, 14, 9, '#1d1a2b'); px(cx + 1, -top + 2, 13, 7, '#e83a4a'); px(cx + 1, -top + 2, 13, 2, '#ffffff'); px(cx + 4, -top + 4, 3, 3, '#ffe14a');
  }
  if (kind === 'library') {
    px(W / 2 - 10, roofH - 22, 20, 12, '#1d1a2b'); px(W / 2 - 9, roofH - 21, 18, 10, '#f3e7cf');
    px(W / 2 - 7, roofH - 19, 14, 1, '#6e4628'); px(W / 2 - 7, roofH - 16, 10, 1, '#6e4628'); px(W / 2 - 7, roofH - 13, 12, 1, '#6e4628');
  }
  if (kind === 'home') {
    px(W - 30, -top, 10, top + 12, '#1d1a2b'); px(W - 29, -top + 1, 8, top + 10, '#9a4e33');
    for (let y = -top + 3; y < 12; y += 4) px(W - 29, y, 8, 1, '#7a3a26');
    px(W - 30, -top, 10, 2, '#4b4a57');
  }
  if (kind === 'party') {
    // bunting along the eave
    const cols = ['#ff5d7a', '#ffd34d', '#4ad0ff', '#7ee07a', '#c58bff'];
    for (let x = 4, i = 0; x < W - 8; x += 7, i++) {
      const y = roofH + 1 + Math.round(Math.sin(x / 9) * 1.5);
      px(x, y, 7, 1, '#1d1a2b');
      for (let k = 0; k < 4; k++) px(x + 1 + k / 2, y + 1 + k, 5 - k, 1, cols[i % 5]);
    }
    // balloons rising over the roof
    for (const [bx, col] of [[8, '#ff5d7a'], [16, '#ffd34d'], [W - 18, '#4ad0ff'], [W - 10, '#c58bff']] as [number, string][]) {
      const by = -top + (bx % 3) * 2;
      px(bx - 3, by, 7, 8, '#1d1a2b'); px(bx - 2, by + 1, 5, 6, col); px(bx - 1, by + 2, 1, 2, '#ffffff');
      for (let y = by + 8; y < 8; y++) px(bx + ((y >> 2) % 2), y, 1, 1, '#4b4a57');
    }
    for (let i = 0; i < 6; i++) lights.push({ x: 10 + i * ((W - 20) / 5), y: roofH - 6 + top, color: cols[i % 5] });
  }
  if (kind === 'office') {
    // rooftop sign with a star logo + AC units
    const name = 'YOUNIVERSE', nw = textWidth(name);
    const signW = nw + 22, sl = Math.floor(W / 2 - signW / 2); // whole pixels, or the glyphs blur
    px(sl, -top + 2, signW, 14, '#1d1a2b'); px(sl + 1, -top + 3, signW - 2, 12, '#ffffff');
    pixelText(ctx, name, sl + 15, -top + 6 + top, '#4a2a8a');
    const sx = sl + 3, sy = -top + 4;
    const star = ['....k....', '...kyk...', 'kkkkyykkk', '.kyyyyyk.', '..kyyyk..', '.kyk.kyk.', '.k.....k.'];
    star.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') px(sx + x, sy + y + 1, 1, 1, row[x] === 'k' ? '#7a4ad6' : '#b58bff'); });
    px(10, 8, 12, 8, '#8f96a3'); px(11, 9, 10, 2, '#e1e5ec'); px(W - 24, 8, 12, 8, '#8f96a3'); px(W - 23, 9, 10, 2, '#e1e5ec');
  }
  if (kind === 'post') {
    px(W / 2 - 9, roofH - 18, 18, 12, '#1d1a2b'); px(W / 2 - 8, roofH - 17, 16, 10, '#fffaf0');
    for (let i = 0; i < 6; i++) { px(W / 2 - 8 + i, roofH - 17 + i, 1, 1, '#d63a4a'); px(W / 2 + 7 - i, roofH - 17 + i, 1, 1, '#d63a4a'); }
  }
  if (kind === 'arcade') {
    // marquee board on the roof
    px(8, -top + 2, W - 16, 22, '#1d1a2b'); px(9, -top + 3, W - 18, 20, '#ff4ad8'); px(11, -top + 5, W - 22, 16, '#2a1650');
    // pixel joystick + buttons
    const label = 'GAME JAM', tw = textWidth(label, 2);
    const tx = Math.round(W / 2 - tw / 2) + 8;
    pixelText(ctx, label, tx + 1, -top + 9 + top, '#5a1a6a', 2);
    pixelText(ctx, label, tx, -top + 8 + top, '#ffe14a', 2);
    const jx = tx - 22, jy = -top + 9;
    px(jx, jy + 6, 10, 4, '#e8e8f0'); px(jx + 4, jy, 2, 7, '#e8e8f0'); px(jx + 3, jy - 2, 4, 3, '#ff4a6a');
    for (let x = 10; x < W - 10; x += 6) { lights.push({ x, y: -top + 3 + top, color: '#ffe14a' }); lights.push({ x, y: -top + 22 + top, color: '#ffe14a' }); }
    for (let y = wallTop; y < H - 4; y += 6) { lights.push({ x: 3, y: y + top, color: '#4af0ff' }); lights.push({ x: W - 4, y: y + top, color: '#4af0ff' }); }
  }
  if (kind === 'stadium') {
    // pennants along the battlements and a big potato crest
    const cols = ['#ff9a3d', '#8a5bd6', '#ff5d7a', '#ffd34d'];
    for (let x = 6, i = 0; x < W - 6; x += 22, i++) {
      px(x, -top + 2, 1, top + 6, '#4b4a57');
      for (let k = 0; k < 5; k++) px(x + 1, -top + 2 + k, 7 - k, 1, cols[i % 4]);
    }
    const cx = Math.floor(W / 2), cy = wallTop + 8;
    px(cx - 9, cy - 5, 18, 11, '#1d1a2b'); px(cx - 8, cy - 4, 16, 9, '#c98a4a'); px(cx - 8, cy - 4, 16, 2, '#e0a868');
    px(cx - 4, cy - 1, 2, 2, '#8a5a2e'); px(cx + 3, cy + 1, 2, 2, '#8a5a2e'); px(cx - 1, cy + 2, 1, 1, '#8a5a2e');
    for (const [fx, fy] of [[cx - 7, cy - 7], [cx, cy - 9], [cx + 6, cy - 7]] as [number, number][]) { px(fx, fy, 1, 3, '#ff8a3d'); px(fx, fy - 1, 1, 1, '#ffd27a'); }
  }
  if (kind === 'dojo') {
    // upturned eaves, red pillars and paper lanterns
    px(-0, roofH - 7, 3, 2, L.roofD); px(0, roofH - 9, 2, 2, L.roofD); px(W - 3, roofH - 7, 3, 2, L.roofD); px(W - 2, roofH - 9, 2, 2, L.roofD);
    px(1, 0, W - 2, 2, '#1d1a2b');
    px(dx - 11, wallTop, 3, wallH - 2, '#b8323c'); px(dx + 19, wallTop, 3, wallH - 2, '#b8323c');
    for (const lx of [dx - 16, dx + 25]) { px(lx, dy + 1, 1, 2, '#1d1a2b'); px(lx - 3, dy + 3, 7, 8, '#1d1a2b'); px(lx - 2, dy + 4, 5, 6, '#e8463a'); px(lx - 2, dy + 6, 5, 1, '#ffd34d'); }
  }
  if (kind === 'diner') {
    // striped awning across the front
    const ay = wallTop + 1;
    px(1, ay, W - 2, 9, '#1d1a2b');
    for (let x = 2, i = 0; x < W - 2; x += 6, i++) { px(x, ay + 1, Math.min(6, W - 2 - x), 6, i % 2 ? '#e8576a' : '#ffffff'); px(x + 1, ay + 7, 4, 1, i % 2 ? '#e8576a' : '#ffffff'); }
    // fork and spoon sign on the roof
    const sx = Math.floor(W / 2) - 7, sy = 6;
    px(sx - 2, sy - 2, 18, 14, '#1d1a2b'); px(sx - 1, sy - 1, 16, 12, '#fff7e6');
    px(sx + 3, sy + 1, 1, 9, '#8a8d98'); px(sx + 2, sy + 1, 1, 3, '#8a8d98'); px(sx + 4, sy + 1, 1, 3, '#8a8d98');
    px(sx + 9, sy + 4, 1, 6, '#8a8d98'); px(sx + 8, sy + 1, 3, 3, '#8a8d98');
    lights.push({ x: dx + 15, y: dy + 3 + top, color: '#ff5d7a' }, { x: dx + 17, y: dy + 3 + top, color: '#ff5d7a' });
  }
  if (kind === 'bank') {
    for (const x of [8, 32, W - 34, W - 10]) { px(x, wallTop, 3, wallH - 2, '#d6dbe2'); px(x, wallTop, 1, wallH - 2, '#ffffff'); }
    const cx = Math.floor(W / 2), cy = roofH - 22;
    px(cx - 7, cy - 7, 14, 14, '#1d1a2b'); px(cx - 6, cy - 6, 12, 12, '#ffd34d'); px(cx - 5, cy - 5, 4, 2, '#fff3a0');
    pixelText(ctx, 'S', cx - 1, cy - 2 + top, '#9a6a10'); px(cx, cy - 4, 1, 9, '#9a6a10');
  }
  if (kind === 'gym') {
    // dumbbell sign on the roof
    const cx = Math.floor(W / 2), cy = -top + 9;
    px(cx - 16, cy - 1, 32, 3, '#1d1a2b'); px(cx - 15, cy, 30, 1, '#c3cad6');
    for (const s2 of [-1, 1]) { const ox = cx + s2 * 13 - 3; px(ox, cy - 7, 7, 15, '#1d1a2b'); px(ox + 1, cy - 6, 5, 13, '#e8576a'); px(ox + 1, cy - 6, 2, 13, '#f47a8a'); }
    px(cx - 1, cy - 1, 2, top - 6, '#4b4a57');
    for (let x = 10; x < W - 16; x += 22) { px(x, 6, 16, 9, '#1d1a2b'); px(x + 1, 7, 14, 7, '#8cc8f0'); px(x + 1, 7, 5, 2, '#e6f6ff'); px(x + 8, 7, 1, 7, '#1d1a2b'); }
  }
  if (kind === 'keep') {
    for (let i = 0; i < 14; i++) { const x = 4 + Math.floor(r() * (W - 8)), y = wallTop + Math.floor(r() * (wallH - 6)); px(x, y, 1, 3, '#1d1a2b'); px(x + 1, y + 2, 1, 2, '#1d1a2b'); }
  }
  return { img: c, top, lights, flames };
}

function makeBooth(wTiles: number, hTiles: number, b: { a: string; b: string; icon: string }): BuildingArt {
  const W = wTiles * T, H = hTiles * T, top = 6;
  const [c, ctx] = canvas(W, H + top);
  const px = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y + top, w, h); };
  // back board + poster
  px(3, -top, W - 6, 26, '#1d1a2b'); px(4, -top + 1, W - 8, 24, '#8a5a2e'); px(4, -top + 1, W - 8, 2, '#a8743f');
  px(W / 2 - 11, -top + 4, 22, 18, '#1d1a2b'); px(W / 2 - 10, -top + 5, 20, 16, '#fffaf0');
  drawIcon(ctx, b.icon, W / 2 - 8, 8);
  // awning
  px(0, 18, W, 12, '#1d1a2b');
  for (let x = 1, i = 0; x < W - 1; x += 6, i++) px(x, 19, Math.min(6, W - 1 - x), 9, i % 2 ? b.a : b.b);
  for (let x = 1, i = 0; x < W - 1; x += 6, i++) { px(x, 28, 6, 2, i % 2 ? b.a : b.b); px(x + 2, 30, 2, 1, i % 2 ? b.a : b.b); }
  px(1, 19, W - 2, 1, 'rgba(255,255,255,0.45)');
  // posts + counter
  px(3, 30, 3, H - 30, '#4e3220'); px(W - 6, 30, 3, H - 30, '#4e3220');
  px(1, H - 14, W - 2, 13, '#1d1a2b'); px(2, H - 13, W - 4, 11, '#b0804a'); px(2, H - 13, W - 4, 2, '#d6a46a');
  for (let x = 8; x < W - 4; x += 8) px(x, H - 11, 1, 9, '#8a5f34');
  px(W / 2 - 6, H - 16, 12, 3, '#1d1a2b'); px(W / 2 - 5, H - 16, 10, 2, b.a);
  return { img: c, top, lights: [], flames: [] };
}

// x, y in canvas space (the booth's `top` offset already applied by the caller).
function drawIcon(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number) {
  const maps: Record<string, { rows: string[]; pal: Pal }> = {
    mask: { rows: ['....kkkkkkkk....', '...kwwwwwwwwk...', '..kwwwwwwwwwwk..', '..kwkkwwwwkkwk..', '..kwkkwwwwkkwk..', '..kwwwwwwwwwwk..', '...kwwwkkwwwk...', '....kwwwwwwk....', '.....kkkkkk.....'], pal: { k: '#1d1a2b', w: '#9a5ac9' } },
    tower: { rows: ['...k.k.k.k......', '...kkkkkkk......', '....kgggk.......', '....kgkgk..r....', '....kgggk.rrr...', '....kgggk..r....', '...kkgggkk......', '..kgggggggk.....', '..kkkkkkkkk.....'], pal: { k: '#1d1a2b', g: '#8a8d98', r: '#e8576a' } },
    vr: { rows: ['................', '..kkkkkkkkkkkk..', '.kbbbbbbbbbbbbk.', '.kbwwwbbbbwwwbk.', '.kbwwwbkkbwwwbk.', '.kbbbbk..kbbbbk.', '..kkkk....kkkk..', '................', '................'], pal: { k: '#1d1a2b', b: '#4a7fc9', w: '#bfe9ff' } },
    cat: { rows: ['..k.........k...', '..kok.....kok...', '..koooooooook...', '..kooeoooeook...', '..koooonooook...', '..koooooooook...', '...koooooook....', '....kkkkkkk.....', '................'], pal: { k: '#1d1a2b', o: '#f2a65a', e: '#1d1a2b', n: '#f59ab0' } },
    phone: { rows: ['.....kkkkkkk....', '.....kwwwwwk....', '.....kwgggwk....', '.....kwgwgwk....', '.....kwgggwk....', '.....kwwwwwk....', '.....kwwkwwk....', '.....kkkkkkk....', '................'], pal: { k: '#1d1a2b', w: '#e8e8f0', g: '#5fd08a' } },
    chart: { rows: ['...k............', '...k.......rr...', '...k.......rr...', '...k..rr...rr...', '...k..rr...rr...', '...k..rr.g.rr...', '...k..rr.g.rr...', '...kkkkkkkkkkk..', '................'], pal: { k: '#1d1a2b', r: '#e8463a', g: '#2bb3a6' } },
    shoe: { rows: ['................', '....kkk.........', '....kwwk........', '....kwwwkk......', '....kwsswwkkk...', '...kwwwssswwwk..', '...kkkkkkkkkkk..', '................', '................'], pal: { k: '#1d1a2b', w: '#ffffff', s: '#e8576a' } },
  };
  const m = maps[icon];
  if (!m) return;
  m.rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) { const col = m.pal[row[rx]]; if (col) { ctx.fillStyle = col; ctx.fillRect(x + rx + 1, y + ry, 1, 1); } } });
}
