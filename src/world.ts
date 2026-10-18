import * as A from './art';
import { makeBuilding, type BuildingArt, type BuildingKind } from './buildings';
import { T, rng } from './art';
import { hash } from './pix';

export const MW = 64;
export const MH = 58;

const enum G { Grass, Path, Plaza, Water, Bridge, Ash }

export interface Zone {
  id: string;
  name: string;
  short: string;
  kind: BuildingKind;
  x: number; y: number; w: number; h: number; door: number;
  color: string;
  booth?: { a: string; b: string; icon: string };
  art?: BuildingArt;
}

// The world map. x/y/w/h are in tiles; `door` is the column (within the
// footprint) of the door on the bottom row. Walking onto it opens the zone.
export const ZONES: Zone[] = [
  { id: 'academy', name: 'TARUMT Academy', short: 'Education', kind: 'academy', x: 26, y: 4, w: 13, h: 7, door: 6, color: '#5a8ad1' },
  // TARUMT project fair: two rows of stalls, doors face the walkways at y=16 and y=20
  { id: 'supernormal', name: 'SuperNormal', short: 'Final Year Project', kind: 'booth', x: 16, y: 13, w: 4, h: 3, door: 2, color: '#9a5ac9', booth: { a: '#9a5ac9', b: '#f3e7ff', icon: 'mask' } },
  { id: 'royaltd', name: 'Royal TD', short: 'Tower defense', kind: 'booth', x: 21, y: 13, w: 4, h: 3, door: 2, color: '#e8576a', booth: { a: '#e8576a', b: '#fff1e6', icon: 'tower' } },
  { id: 'vrcross', name: 'VR Cross Road', short: 'Virtual Reality', kind: 'booth', x: 26, y: 13, w: 4, h: 3, door: 2, color: '#4a7fc9', booth: { a: '#4a7fc9', b: '#e6f0ff', icon: 'vr' } },
  { id: 'pawspuzzles', name: 'Paws & Puzzles', short: '3D Game Development', kind: 'booth', x: 35, y: 13, w: 4, h: 3, door: 2, color: '#f2a65a', booth: { a: '#f2a65a', b: '#fff4e6', icon: 'cat' } },
  { id: 'wellspring', name: 'WellSpring', short: 'Mobile App Development', kind: 'booth', x: 16, y: 17, w: 4, h: 3, door: 2, color: '#5fd08a', booth: { a: '#3fb06a', b: '#eafff2', icon: 'phone' } },
  { id: 'haarwavelet', name: 'Haar Wavelet', short: 'Parallel Computing', kind: 'booth', x: 21, y: 17, w: 4, h: 3, door: 2, color: '#2bb3a6', booth: { a: '#2bb3a6', b: '#e6fffb', icon: 'chart' } },
  { id: 'sketchy', name: 'Sketchy Shoes', short: 'Web Application', kind: 'booth', x: 26, y: 17, w: 4, h: 3, door: 2, color: '#8a8d98', booth: { a: '#3a3a4a', b: '#f0f0f0', icon: 'shoe' } },
  { id: 'library', name: 'Skill Library', short: 'Skills', kind: 'library', x: 5, y: 5, w: 9, h: 6, door: 4, color: '#5aa065' },
  { id: 'home', name: "Khe Yang's House", short: 'About me', kind: 'home', x: 49, y: 5, w: 8, h: 6, door: 4, color: '#de6e57' },
  { id: 'partypals', name: 'Party Pals Hall', short: 'Party Pals', kind: 'party', x: 4, y: 18, w: 10, h: 8, door: 5, color: '#ff6f91' },
  { id: 'emberfall', name: 'Emberfall Keep', short: 'Emberfall', kind: 'keep', x: 50, y: 17, w: 11, h: 9, door: 5, color: '#ff8a3d' },
  { id: 'office', name: 'Youniverse Games', short: 'Experience', kind: 'office', x: 5, y: 33, w: 10, h: 8, door: 5, color: '#7fb8e3' },
  { id: 'post', name: 'Post Office', short: 'Contact', kind: 'post', x: 19, y: 35, w: 9, h: 6, door: 4, color: '#d63a4a' },
  { id: 'arcade', name: 'Game Jam Arcade', short: 'Game jams', kind: 'arcade', x: 48, y: 32, w: 10, h: 9, door: 5, color: '#ff4ad8' },
  // Side Quest Street: things I built in my free time
  { id: 'hotpotato', name: 'Hot Potato Arena', short: 'Hot Potato Royale', kind: 'stadium', x: 6, y: 45, w: 10, h: 8, door: 5, color: '#ff9a3d' },
  { id: 'kana', name: 'Kana Dojo', short: 'Kana Practice', kind: 'dojo', x: 21, y: 47, w: 7, h: 6, door: 3, color: '#f2a2c0' },
  { id: 'what2eat', name: 'What2Eat Diner', short: 'What2Eat', kind: 'diner', x: 34, y: 47, w: 7, h: 6, door: 3, color: '#ff5d7a' },
  { id: 'finsight', name: 'FinSight Bank', short: 'FinSight', kind: 'bank', x: 47, y: 46, w: 7, h: 7, door: 3, color: '#47ab84' },
  { id: 'gymtrack', name: 'GymTrack Gym', short: 'GymTrack', kind: 'gym', x: 55, y: 47, w: 7, h: 6, door: 3, color: '#c3cad6' },
];

export const doorTile = (z: Zone) => ({ x: z.x + z.door, y: z.y + z.h - 1 });

export interface Sign { x: number; y: number; title: string; lines: string[] }
export const SIGNS: Sign[] = [
  { x: 29, y: 28, title: 'Welcome!', lines: [
    "Welcome to Khe Yang's world! I'm a Unity game developer, and every building here is a project or a part of my story.",
    'Walk with WASD or the arrow keys, or just tap where you want to go. Walk into a door to go inside.',
    'In a hurry? The ⚡ Quick View button at the top shows everything on one page.',
  ] },
  { x: 30, y: 14, title: 'TARUMT Project Fair', lines: ['My university projects from Tunku Abdul Rahman University of Management and Technology, one per stall. Walk up to a counter to take a look.'] },
  { x: 49, y: 28, title: 'Warning', lines: ['Beyond this point: Emberfall. The last fire is going out. Wardens only.'] },
  { x: 30, y: 44, title: 'Side Quest Street', lines: [
    'Side Quest Street: the projects I build in my free time. Multiplayer games and apps I use every day.',
    'Each shop is one project. Walk in to take a look!',
  ] },
  { x: 46, y: 39, title: 'Arcade ahead', lines: ['The Game Jam Arcade: 7 games I made, mostly in 48 to 96 hours. Most of them play right in your browser!'] },
];

export const SPAWN = { x: 32, y: 29 };
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const;
const COIN_SPOTS = [[16, 8], [41, 7], [60, 9], [3, 15], [18, 30], [40, 30], [61, 34], [14, 44], [37, 44], [58, 29]];

export interface Obj { img: HTMLCanvasElement; x: number; y: number; base: number; zone?: Zone; tag?: string }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; glow?: boolean; g?: number }
export interface Coin { x: number; y: number; taken: boolean; i: number }

export class World {
  ground = new Uint8Array(MW * MH);
  solid = new Uint8Array(MW * MH);
  reserved = new Uint8Array(MW * MH);
  groundCanvas!: HTMLCanvasElement;
  objects: Obj[] = [];
  coins: Coin[] = [];
  doors = new Map<number, Zone>();
  water: number[] = [];
  waterMask!: Uint8Array; // per pixel, after the corners are rounded
  fountain = { x: 31, y: 24 };
  flames: { x: number; y: number }[] = [];
  lights: { x: number; y: number; color: string; i: number }[] = [];
  smoke: { x: number; y: number }[] = [];

  constructor() {
    this.layout();
    this.paint();
  }

  idx = (x: number, y: number) => y * MW + x;
  inb = (x: number, y: number) => x >= 0 && y >= 0 && x < MW && y < MH;
  isSolid = (x: number, y: number) => !this.inb(x, y) || this.solid[this.idx(x, y)] === 1;
  isAsh = (x: number, y: number) => this.inb(x, y) && this.ground[this.idx(x, y)] === G.Ash;
  riverX = (y: number) => 43 + Math.round(Math.sin(y * 0.33) * 1.1);

  private setG(x: number, y: number, g: G) { if (this.inb(x, y)) this.ground[this.idx(x, y)] = g; }
  private reserve(x: number, y: number, w = 1, h = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.inb(i, j)) this.reserved[this.idx(i, j)] = 1;
  }
  private road(x0: number, y0: number, x1: number, y1: number) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        const g = this.ground[this.idx(x, y)];
        this.setG(x, y, g === G.Water || g === G.Bridge ? G.Bridge : g === G.Plaza ? G.Plaza : G.Path);
        this.reserve(x, y);
      }
  }

  private layout() {
    const r = rng(25);
    // ash land around the keep, with a soft wavy edge
    const edge = valueNoise(MW, MH, 3, 11);
    for (let y = 0; y < MH; y++)
      for (let x = 0; x < MW; x++) {
        const d = ((x - 55.5) / 10) ** 2 + ((y - 22.5) / 8.6) ** 2;
        if (d < 0.86 + edge(x, y) * 0.3 && x > this.riverX(y) + 1) this.setG(x, y, G.Ash);
      }
    // river
    for (let y = 0; y < MH; y++) { const rx = this.riverX(y); for (const x of [rx, rx + 1]) { this.setG(x, y, G.Water); this.reserve(x, y); } }
    // pond
    for (let y = 31; y < 40; y++) for (let x = 34; x < 43; x++) if (((x - 38.5) / 3.6) ** 2 + ((y - 35.3) / 2.6) ** 2 < 1) { this.setG(x, y, G.Water); this.reserve(x - 1, y - 1, 3, 3); }
    // plaza
    for (let y = 21; y <= 31; y++) for (let x = 26; x <= 38; x++) { const corner = (x === 26 || x === 38) && (y === 21 || y === 31); if (!corner) { this.setG(x, y, G.Plaza); this.reserve(x, y); } }
    // roads
    this.road(31, 11, 33, 54); // main north-south
    this.road(6, 11, 57, 12); // north road
    this.road(15, 16, 41, 16); // project fair walkways
    this.road(15, 20, 30, 20);
    this.road(6, 26, 27, 27); // west
    this.road(37, 26, 57, 27); // east
    this.road(6, 41, 57, 42); // south
    this.road(4, 53, 59, 54); // Side Quest Street
    for (const z of ZONES) {
      const d = doorTile(z);
      this.road(d.x, d.y + 1, d.x, d.y + 1);
    }

    // buildings
    for (const z of ZONES) {
      const art = (z.art = makeBuilding(z.kind, z.w, z.h, z.x * 31 + z.y, z.booth));
      for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) this.solid[this.idx(x, y)] = 1;
      this.reserve(z.x - 1, z.y - 1, z.w + 2, z.h + 2);
      const d = doorTile(z);
      this.solid[this.idx(d.x, d.y)] = 0;
      this.doors.set(this.idx(d.x, d.y), z);
      const top = (z.y + z.h) * T - art.img.height;
      this.objects.push({ img: art.img, x: z.x * T, y: top, base: (z.y + z.h) * T - 1, zone: z });
      for (const f of art.flames) this.flames.push({ x: z.x * T + f.x, y: top + f.y });
      art.lights.forEach((l, i) => this.lights.push({ x: z.x * T + l.x, y: top + l.y, color: l.color, i }));
      if (art.smoke) this.smoke.push({ x: z.x * T + art.smoke.x, y: top + art.smoke.y });
    }

    // water is solid except bridges
    for (let i = 0; i < MW * MH; i++) if (this.ground[i] === G.Water) this.solid[i] = 1;

    // fountain (3x3)
    const f = this.fountain;
    for (let y = f.y; y < f.y + 3; y++) for (let x = f.x; x < f.x + 3; x++) this.solid[this.idx(x, y)] = 1;
    this.objects.push({ img: A.makeFountain(), x: f.x * T, y: (f.y + 3) * T - 44, base: (f.y + 3) * T - 4, tag: 'fountain' });

    // props
    const prop = (img: HTMLCanvasElement, tx: number, ty: number, w = 1, tag?: string) => {
      for (let i = 0; i < w; i++) this.solid[this.idx(tx + i, ty)] = 1;
      this.reserve(tx, ty, w, 1);
      this.objects.push({ img, x: tx * T + (w * T - img.width) / 2, y: (ty + 1) * T - img.height, base: (ty + 1) * T - 2, tag });
    };
    const lamp = A.makeLamp();
    for (const [x, y] of [[26, 21], [38, 21], [26, 31], [38, 31], [34, 18], [30, 43], [34, 43]]) prop(lamp, x, y);
    const bench = A.makeBench();
    prop(bench, 27, 22, 2); prop(bench, 36, 22, 2);
    const sign = A.makeSign();
    for (const s of SIGNS) prop(sign, s.x, s.y, 1, 'sign');
    prop(A.makeMailbox(), 18, 40);
    prop(A.makeBarrel(), 15, 39); prop(A.makeCrate(), 15, 38);
    prop(A.makeBarrel(), 3, 24); prop(A.makeCrate(), 14, 24);
    const cherry = [A.makeTree(401, true), A.makeTree(402, true)];
    prop(cherry[0], 21, 45); prop(cherry[1], 26, 45); prop(cherry[0], 18, 52);
    prop(A.makeBrazier(), 47, 25); prop(A.makeBrazier(), 47, 28);
    this.flames.push({ x: 47 * T + 8, y: 25 * T + 4 }, { x: 47 * T + 8, y: 28 * T + 4 });
    const grave = A.makeGravestone();
    for (const [x, y] of [[59, 28], [61, 30], [57, 31], [49, 15], [61, 16]]) if (!this.reserved[this.idx(x, y)]) prop(grave, x, y);

    // coins
    COIN_SPOTS.forEach(([x, y], i) => {
      let [cx, cy] = [x, y];
      if (this.isSolid(cx, cy)) { const n = this.nearestFree(cx, cy); cx = n.x; cy = n.y; }
      this.reserve(cx, cy);
      this.coins.push({ x: cx * T + 8, y: cy * T + 10, taken: false, i });
    });
    this.reserve(SPAWN.x - 2, SPAWN.y - 1, 5, 3);

    // trees and bushes
    const noise = valueNoise(MW, MH, 6, 7);
    const trees = [0, 1, 2, 3, 4, 5].map((s) => A.makeTree(100 + s));
    const pines = [0, 1, 2].map((s) => A.makePine(200 + s));
    const dead = [0, 1, 2].map((s) => A.makeDeadTree(300 + s));
    const bushes = [A.makeBush(1), A.makeBush(2, true), A.makeBush(3)];
    const rocks = [A.makeRock(1), A.makeRock(2)];
    const drocks = [A.makeRock(3, true), A.makeRock(4, true)];
    const plants = new Map<number, Obj>(); // tile -> tree/bush/rock, so we can clear a way to coins
    for (let y = 0; y < MH; y++)
      for (let x = 0; x < MW; x++) {
        const i = this.idx(x, y);
        if (this.reserved[i] || this.solid[i]) continue;
        const border = x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2;
        const nearBorder = x < 3 || y < 3 || x >= MW - 3 || y >= MH - 3;
        const n = noise(x, y);
        const ash = this.ground[i] === G.Ash;
        const p = border ? 1 : nearBorder ? 0.55 : ash ? 0.07 : 0.03 + Math.max(0, n - 0.55) * 0.9;
        if (r() < p) {
          const img = ash ? dead[Math.floor(r() * 3)] : (y < 16 || border) && r() < 0.45 ? pines[Math.floor(r() * 3)] : trees[Math.floor(r() * 6)];
          this.solid[i] = 1;
          // every tree sprite has its trunk base 2px above the bottom edge
          const o: Obj = { img, x: x * T + 8 - img.width / 2, y: (y + 1) * T - img.height - 1, base: (y + 1) * T - 3, tag: 'tree' };
          this.objects.push(o); plants.set(i, o);
        } else if (!border && r() < (ash ? 0.04 : 0.025)) {
          const img = ash ? drocks[Math.floor(r() * 2)] : r() < 0.6 ? bushes[Math.floor(r() * 3)] : rocks[Math.floor(r() * 2)];
          this.solid[i] = 1;
          const o: Obj = { img, x: x * T + 8 - img.width / 2, y: (y + 1) * T - img.height - 1, base: (y + 1) * T - 3 };
          this.objects.push(o); plants.set(i, o);
        }
      }
    this.clearWayToCoins(plants);

    for (let i = 0; i < MW * MH; i++) if (this.ground[i] === G.Water) this.water.push(i);
  }

  // Random trees can wall a coin in. Flood-fill from the spawn, then for each
  // coin that can't be reached, cut the shortest path through vegetation.
  private clearWayToCoins(plants: Map<number, Obj>) {
    const reach = () => {
      const seen = new Uint8Array(MW * MH);
      const q = [this.idx(SPAWN.x, SPAWN.y)];
      seen[q[0]] = 1;
      while (q.length) {
        const c = q.pop()!, cx = c % MW, cy = Math.floor(c / MW);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy, n = this.idx(nx, ny);
          if (this.inb(nx, ny) && !seen[n] && !this.isSolid(nx, ny)) { seen[n] = 1; q.push(n); }
        }
      }
      return seen;
    };
    for (const coin of this.coins) {
      const seen = reach();
      const start = this.idx(Math.floor(coin.x / T), Math.floor(coin.y / T));
      if (seen[start]) continue;
      const came = new Int32Array(MW * MH).fill(-1);
      const q = [start];
      came[start] = start;
      let hit = -1;
      while (q.length && hit < 0) {
        const c = q.shift()!, cx = c % MW, cy = Math.floor(c / MW);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy, n = this.idx(nx, ny);
          if (!this.inb(nx, ny) || came[n] >= 0 || (this.solid[n] && !plants.has(n))) continue;
          came[n] = c;
          if (seen[n]) { hit = n; break; }
          q.push(n);
        }
      }
      for (let c = hit; c >= 0 && c !== start; c = came[c]) {
        const o = plants.get(c);
        if (!o) continue;
        this.objects.splice(this.objects.indexOf(o), 1);
        plants.delete(c);
        this.solid[c] = 0;
      }
    }
  }

  nearestFree(x: number, y: number) {
    const seen = new Set<number>();
    const q: [number, number][] = [[x, y]];
    while (q.length) {
      const [cx, cy] = q.shift()!;
      if (!this.inb(cx, cy) || seen.has(this.idx(cx, cy))) continue;
      seen.add(this.idx(cx, cy));
      if (!this.isSolid(cx, cy)) return { x: cx, y: cy };
      q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return { x: SPAWN.x, y: SPAWN.y };
  }

  // ------------------------------------------------------------ painting
  private paint() {
    const [c, ctx] = A.canvas(MW * T, MH * T);
    this.groundCanvas = c;
    const PW = MW * T, PH = MH * T;
    const img = ctx.createImageData(PW, PH);
    const buf = new Uint32Array(img.data.buffer);
    const col = new Map<string, number>();
    const pk = (hex: string) => {
      let v = col.get(hex);
      if (v === undefined) { const n = parseInt(hex.slice(1), 16); v = ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; col.set(hex, v); }
      return v;
    };
    const set = (x: number, y: number, hex: string) => { if (x >= 0 && y >= 0 && x < PW && y < PH) buf[y * PW + x] = pk(hex); };
    const g = (x: number, y: number) => (this.inb(x, y) ? this.ground[this.idx(x, y)] : G.Grass);
    const gp = (px: number, py: number) => g(Math.floor(px / T), Math.floor(py / T));
    const land = (v: G) => v !== G.Water && v !== G.Bridge;
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const big = valueNoise(PW, PH, 28, 5), small = valueNoise(PW, PH, 7, 9);

    const CR = 8;
    const cutCorner = (x: number, y: number) => {
      const tx = Math.floor(x / T), ty = Math.floor(y / T), lx = x - tx * T + 0.5, ly = y - ty * T + 0.5;
      for (const [sx, sy] of CORNERS) {
        const a = g(tx + sx, ty), b = g(tx, ty + sy);
        if (!land(a) || !land(b)) continue;
        const cx = sx < 0 ? CR : T - CR, cy = sy < 0 ? CR : T - CR;
        if ((sx < 0 ? lx < cx : lx > cx) && (sy < 0 ? ly < cy : ly > cy) && Math.hypot(lx - cx, ly - cy) > CR) return a;
      }
      return -1;
    };
    const wm = (this.waterMask = new Uint8Array(PW * PH)); // final water mask, after rounding
    // Main ground pass. Runs over ~1M pixels on phones, so it works tile by
    // tile with pre-packed colours and only measures edge distances on tiles
    // that actually border something different.
    const P = (a: string[]) => a.map(pk);
    const GRASS = P(['#5aa846', '#64b14c', '#6fbb53', '#7ac55a']);
    const DIRT = P(['#c9a56c', '#d5b278', '#dfbe85', '#e8cb94']);
    const ASH = P(['#4b4555', '#534c5e', '#5b5367', '#645c70']);
    const [RIM, WORN] = P(['#4f9a3f', '#bf9a60']);
    const PLAZA = P(['#c2bbad', '#cec7b9', '#d9d3c6', '#9e9688', '#e4dfd4', '#b4ac9d']);
    const WATER = P(['#62bce8', '#4aa3df', '#3b8fd6']);
    const BRIDGE = P(['#c08a52', '#6e4628', '#9a6a3a', '#a8743f', '#4e3220']);
    const [EMBER, EMBER2] = P(['#ff8a3d', '#ffd27a']);
    const HW = PW >> 1, nf = new Float32Array(HW * (PH >> 1)), wf = new Float32Array(HW * (PH >> 1));
    for (let y = 0; y < PH; y += 2) for (let x = 0; x < PW; x += 2) { const s2 = small(x, y), k = (y >> 1) * HW + (x >> 1); nf[k] = big(x, y) * 0.75 + s2 * 0.25; wf[k] = s2; }
    const nAt = (x: number, y: number) => (y >> 1) * HW + (x >> 1);
    const nbrs = (tx: number, ty: number, pred: (v: G) => boolean) => {
      const out: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && pred(g(tx + dx, ty + dy))) out.push(dx, dy);
      return out;
    };
    // distance from a pixel (local lx, ly) to the nearest neighbour tile in `nb`
    const dist = (nb: number[], lx: number, ly: number) => {
      let d = 99;
      for (let k = 0; k < nb.length; k += 2) {
        const dx = nb[k], dy = nb[k + 1];
        const ex = dx < 0 ? lx + 0.5 : dx > 0 ? T - lx - 0.5 : 0, ey = dy < 0 ? ly + 0.5 : dy > 0 ? T - ly - 0.5 : 0;
        const e = dx && dy ? Math.sqrt(ex * ex + ey * ey) : ex + ey;
        if (e < d) d = e;
      }
      return d;
    };
    const isGrass = (k: G) => k === G.Grass;
    for (let ty = 0; ty < MH; ty++)
      for (let tx = 0; tx < MW; tx++) {
        const v0 = g(tx, ty);
        const pathNb = v0 === G.Path ? nbrs(tx, ty, isGrass) : [];
        const waterNb = v0 === G.Water ? nbrs(tx, ty, land) : [];
        const pathEdge = pathNb.length > 0, waterEdge = waterNb.length > 0;
        for (let ly = 0; ly < T; ly++)
          for (let lx = 0; lx < T; lx++) {
            const x = tx * T + lx, y = ty * T + ly, i = y * PW + x;
            let v = v0;
            if (v === G.Water) { if (waterEdge) { const k = cutCorner(x, y); if (k >= 0) v = k === G.Plaza ? G.Grass : k; } if (v === G.Water) wm[i] = 1; }
            const ni = nAt(x, y), dv = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
            const tf = Math.floor(nf[ni] * 3.2 + dv * 1.1 - 0.35), ti = tf < 0 ? 0 : tf > 3 ? 3 : tf;
            let c: number;
            if (v === G.Grass) c = GRASS[ti];
            else if (v === G.Path) {
              c = DIRT[ti];
              if (pathEdge) {
                const d = dist(pathNb, lx, ly), wob = 1.2 + wf[nAt((x * 3) % PW, (y * 3) % PH)] * 2.2;
                if (d < wob) c = d < wob - 1 ? GRASS[ti] : RIM;
                else if (d < wob + 1.4) c = WORN;
              }
            } else if (v === G.Plaza) {
              const row = y >> 3, off = row % 2 ? 4 : 0, px = (x + off) % 10, py = y & 7, h = hash(Math.floor((x + off) / 10), row);
              c = PLAZA[h < 0.2 ? 0 : h > 0.8 ? 2 : 1];
              if (px === 9 || py === 7) c = PLAZA[3];
              else if (px === 0 || py === 0) c = PLAZA[4];
              else if (px === 8 || py === 6 || hash(x, y) < 0.03) c = PLAZA[5];
            } else if (v === G.Water) {
              const d = waterEdge ? dist(waterNb, lx, ly) : 99;
              const deep = Math.min(1, d / 14) + (wf[ni] - 0.5) * 0.15;
              c = WATER[deep < 0.18 ? 0 : deep + dv * 0.12 < 0.5 ? 1 : 2];
            } else if (v === G.Bridge) {
              const px = x & 3;
              c = px === 0 ? BRIDGE[0] : px === 3 ? BRIDGE[1] : hash(x >> 2, 3) < 0.3 ? BRIDGE[2] : BRIDGE[3];
              if ((ly === 3 || ly === 12) && px === 1) c = BRIDGE[4];
            } else {
              c = ASH[ti];
              const h = hash(x, y);
              if (h < 0.004) c = EMBER; else if (h < 0.006) c = EMBER2;
            }
            buf[i] = c;
          }
      }

    // water edges, per pixel so they follow the rounded corners: an earthy bank
    // face where land is above, a shadow under bridges, and foam everywhere else
    const isW = (x: number, y: number) => x < 0 || y < 0 || x >= PW || y >= PH || wm[y * PW + x] === 1;
    for (let y = 0; y < PH; y++)
      for (let x = 0; x < PW; x++) {
        if (!wm[y * PW + x]) {
          if (isW(x, y + 1) && y + 1 < PH && gp(x, y) === G.Grass) set(x, y, '#3f8a3a');
          continue;
        }
        const up = !isW(x, y - 1) ? 1 : !isW(x, y - 2) ? 2 : !isW(x, y - 3) ? 3 : !isW(x, y - 4) ? 4 : 0;
        const underBridge = up && gp(x, y - up) === G.Bridge;
        const k = hash(x, 5) < 0.5 ? 0 : 1;
        if (up && underBridge) { if (up <= 2) set(x, y, up === 1 ? '#2a5f95' : '#2f6fa8'); continue; }
        if (up === 1) { set(x, y, '#7a5a3a'); continue; }
        if (up === 2) { set(x, y, '#5e4228'); continue; }
        if (up === 3) { set(x, y, k ? '#5e4228' : '#2f6fa8'); continue; }
        if (up === 4) { set(x, y, k ? '#2f6fa8' : '#3b8fd6'); continue; }
        const near1 = !isW(x - 1, y) || !isW(x + 1, y) || !isW(x, y + 1);
        const near2 = !isW(x - 2, y) || !isW(x + 2, y) || !isW(x, y + 2);
        if (near1 && hash(x, y, 3) > 0.2) set(x, y, '#d8f3ff');
        else if ((near1 || near2) && hash(x, y, 4) > 0.3) set(x, y, '#9fd9f5');
      }
    for (let ty = 0; ty < MH; ty++)
      for (let tx = 0; tx < MW; tx++) {
        if (g(tx, ty) !== G.Bridge) continue;
        const X = tx * T, Y = ty * T;
        // railings along both water edges, with posts
        for (const [dy, ry] of [[-1, 0], [1, T - 3]] as [number, number][]) {
          if (g(tx, ty + dy) !== G.Water) continue;
          for (let x = 0; x < T; x++) { set(X + x, Y + ry, '#d9a466'); set(X + x, Y + ry + 1, '#8a5a2e'); set(X + x, Y + ry + 2, '#4e3220'); }
          for (let x = 1; x < T; x += 5) { set(X + x, Y + ry, '#f0c890'); set(X + x + 1, Y + ry, '#6e4628'); }
        }
      }

    // grass tufts, flowers and mushrooms on free grass
    const r = rng(77);
    for (let ty = 0; ty < MH; ty++)
      for (let tx = 0; tx < MW; tx++) {
        const i = this.idx(tx, ty);
        const X = tx * T, Y = ty * T, v = g(tx, ty);
        if (v !== G.Grass) continue;
        for (let k = 0; k < 2; k++) {
          if (r() > 0.55) continue;
          const ax = X + 2 + Math.floor(r() * 11), ay = Y + 4 + Math.floor(r() * 10);
          set(ax, ay, '#4f9a3f'); set(ax + 2, ay, '#4f9a3f'); set(ax + 1, ay, '#4f9a3f');
          set(ax, ay - 1, '#5aa846'); set(ax + 2, ay - 2, '#8ccf63'); set(ax + 1, ay - 1, '#7ac55a'); set(ax - 1, ay - 2, '#8ccf63');
        }
        if (this.solid[i] || this.reserved[i]) continue;
        if (r() < 0.09) {
          const cols = [['#ffffff', '#ffd34d'], ['#ff8fb1', '#fff3a0'], ['#ffd34d', '#c2701e'], ['#a98bff', '#ffffff']][Math.floor(r() * 4)];
          for (let k = 0; k < 3; k++) {
            const fx = X + 2 + Math.floor(r() * 11), fy = Y + 2 + Math.floor(r() * 11);
            set(fx, fy + 1, '#3f8a3a');
            set(fx - 1, fy, cols[0]); set(fx + 1, fy, cols[0]); set(fx, fy - 1, cols[0]); set(fx, fy, cols[1]);
          }
        } else if (r() < 0.012) {
          const fx = X + 5, fy = Y + 6;
          for (let k = 0; k < 5; k++) set(fx + k, fy, '#d63a4a');
          for (let k = 1; k < 4; k++) set(fx + k, fy - 1, '#e8576a');
          set(fx + 1, fy, '#ffffff'); set(fx + 3, fy - 1, '#ffffff'); set(fx + 2, fy + 1, '#f3e7cf'); set(fx + 2, fy + 2, '#d9c9a8');
        }
      }
    // pebbles on paths
    for (let ty = 0; ty < MH; ty++)
      for (let tx = 0; tx < MW; tx++) {
        if (g(tx, ty) !== G.Path) continue;
        for (let k = 0; k < 2; k++) {
          if (r() > 0.4) continue;
          const px = tx * T + 3 + Math.floor(r() * 10), py = ty * T + 3 + Math.floor(r() * 10);
          set(px, py, '#efe2c4'); set(px + 1, py, '#c8b89a'); set(px, py + 1, '#a8916c'); set(px + 1, py + 1, '#8f7756');
        }
      }
    ctx.putImageData(img, 0, 0);

    // lily pads
    for (let k = 0; k < 7; k++) {
      const x = Math.floor((35 + r() * 7) * T), y = Math.floor((32.5 + r() * 5) * T);
      if (g(Math.floor(x / T), Math.floor(y / T)) !== G.Water) continue;
      ctx.fillStyle = '#245f30'; ctx.fillRect(x - 3, y - 1, 7, 4);
      ctx.fillStyle = '#3d8241'; ctx.fillRect(x - 3, y - 2, 6, 4);
      ctx.fillStyle = '#58a34b'; ctx.fillRect(x - 2, y - 2, 3, 1);
      ctx.fillStyle = '#4aa3df'; ctx.fillRect(x, y - 2, 1, 2);
      if (r() < 0.45) { ctx.fillStyle = '#ffb3c6'; ctx.fillRect(x + 1, y - 2, 2, 2); ctx.fillStyle = '#fff0f5'; ctx.fillRect(x + 1, y - 2, 1, 1); }
    }

    // shadows: each building casts its own silhouette towards the bottom right
    for (const z of ZONES) {
      const art = z.art!;
      const top = (z.y + z.h) * T - art.img.height;
      const footTop = z.y * T - top; // first image row inside the footprint
      const [sc, sx] = A.canvas(art.img.width, art.img.height);
      sx.drawImage(art.img, 0, 0);
      sx.globalCompositeOperation = 'source-in';
      sx.fillStyle = 'rgba(24,20,48,0.3)';
      sx.fillRect(0, 0, sc.width, sc.height);
      const rows = art.img.height - footTop;
      ctx.drawImage(sc, 0, footTop, sc.width, rows, z.x * T + 5, z.y * T + 4, sc.width, rows);
    }
    ctx.fillStyle = 'rgba(24,20,48,0.24)';
    for (const o of this.objects) {
      if (o.zone) continue;
      const cx = o.x + o.img.width / 2 + 1, cy = o.base + 1;
      const rx = Math.min(8, o.img.width / 2 - 1);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ------------------------------------------------------------ pathfinding
  findPath(sx: number, sy: number, tx: number, ty: number, allowGoal = false): { x: number; y: number }[] | null {
    if (!this.inb(tx, ty)) return null;
    const goal = this.idx(tx, ty), start = this.idx(sx, sy);
    const passable = (x: number, y: number) => !this.isSolid(x, y) || (allowGoal && x === tx && y === ty);
    const gScore = new Float32Array(MW * MH).fill(Infinity);
    const came = new Int32Array(MW * MH).fill(-1);
    const closed = new Uint8Array(MW * MH);
    const open: number[] = [start];
    const f = new Float32Array(MW * MH).fill(Infinity);
    const h = (i: number) => { const dx = Math.abs((i % MW) - tx), dy = Math.abs(Math.floor(i / MW) - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    gScore[start] = 0; f[start] = h(start);
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) {
        const path: { x: number; y: number }[] = [];
        for (let c = cur; c !== start; c = came[c]) path.unshift({ x: c % MW, y: Math.floor(c / MW) });
        return path;
      }
      closed[cur] = 1;
      const cx = cur % MW, cy = Math.floor(cur / MW);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (!this.inb(nx, ny) || !passable(nx, ny)) continue;
          if (dx && dy && (this.isSolid(cx + dx, cy) || this.isSolid(cx, cy + dy))) continue;
          const ni = this.idx(nx, ny);
          if (closed[ni]) continue;
          const ng = gScore[cur] + (dx && dy ? 1.414 : 1);
          if (ng < gScore[ni]) {
            came[ni] = cur; gScore[ni] = ng; f[ni] = ng + h(ni);
            if (!open.includes(ni)) open.push(ni);
          }
        }
    }
    return null;
  }
}

function valueNoise(w: number, h: number, cell: number, seed: number) {
  const r = rng(seed);
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const grid = Array.from({ length: gw * gh }, () => r());
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), ux = s(fx - ix), uy = s(fy - iy);
    const v = (a: number, b: number) => grid[b * gw + a];
    return (v(ix, iy) * (1 - ux) + v(ix + 1, iy) * ux) * (1 - uy) + (v(ix, iy + 1) * (1 - ux) + v(ix + 1, iy + 1) * ux) * uy;
  };
}
