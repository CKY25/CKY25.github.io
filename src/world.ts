import * as A from './art';
import { T, rng } from './art';

export const MW = 64;
export const MH = 58;

const enum G { Grass, Path, Plaza, Water, Bridge, Ash }

export interface Zone {
  id: string;
  name: string;
  short: string;
  kind: A.BuildingKind;
  x: number; y: number; w: number; h: number; door: number;
  color: string;
  booth?: { a: string; b: string; icon: string };
  art?: A.BuildingArt;
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
      const art = (z.art = A.makeBuilding(z.kind, z.w, z.h, z.x * 31 + z.y, z.booth));
      for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) this.solid[this.idx(x, y)] = 1;
      this.reserve(z.x - 1, z.y - 1, z.w + 2, z.h + 2);
      const d = doorTile(z);
      this.solid[this.idx(d.x, d.y)] = 0;
      this.doors.set(this.idx(d.x, d.y), z);
      const top = (z.y + z.h) * T - art.img.height;
      this.objects.push({ img: art.img, x: z.x * T, y: top, base: (z.y + z.h) * T - 1, zone: z });
      for (const f of art.flames) this.flames.push({ x: z.x * T + f.x, y: top + f.y });
      art.lights.forEach((l, i) => this.lights.push({ x: z.x * T + l.x, y: top + l.y, color: l.color, i }));
      if (z.kind === 'home') this.smoke.push({ x: z.x * T + z.w * T - 25, y: top });
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
          this.objects.push({ img, x: x * T + 8 - img.width / 2, y: (y + 1) * T - img.height - 1, base: (y + 1) * T - 3, tag: 'tree' });
        } else if (!border && r() < (ash ? 0.04 : 0.025)) {
          const img = ash ? drocks[Math.floor(r() * 2)] : r() < 0.6 ? bushes[Math.floor(r() * 3)] : rocks[Math.floor(r() * 2)];
          this.solid[i] = 1;
          this.objects.push({ img, x: x * T + 8 - img.width / 2, y: (y + 1) * T - img.height - 1, base: (y + 1) * T - 3 });
        }
      }

    for (let i = 0; i < MW * MH; i++) if (this.ground[i] === G.Water) this.water.push(i);
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
    const r = rng(77);
    const px = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    const g = (x: number, y: number) => (this.inb(x, y) ? this.ground[this.idx(x, y)] : G.Grass);
    const landLike = (v: G) => v !== G.Water && v !== G.Bridge;

    for (let ty = 0; ty < MH; ty++)
      for (let tx = 0; tx < MW; tx++) {
        const X = tx * T, Y = ty * T, v = g(tx, ty);
        if (v === G.Grass) {
          px(X, Y, T, T, '#6fbf55');
          for (let k = 0; k < 10; k++) px(X + Math.floor(r() * 16), Y + Math.floor(r() * 16), 1, 1, r() < 0.5 ? '#62b04b' : '#7ccb5f');
          if (r() < 0.45) { const ax = X + 2 + Math.floor(r() * 11), ay = Y + 3 + Math.floor(r() * 10); px(ax, ay, 1, 2, '#4f9a3f'); px(ax + 2, ay, 1, 2, '#4f9a3f'); px(ax + 1, ay + 1, 1, 2, '#4f9a3f'); }
        } else if (v === G.Path) {
          px(X, Y, T, T, '#dcbc80');
          for (let k = 0; k < 8; k++) px(X + Math.floor(r() * 16), Y + Math.floor(r() * 16), 1, 1, r() < 0.6 ? '#c9a86e' : '#ead09a');
          if (r() < 0.2) px(X + 3 + Math.floor(r() * 9), Y + 3 + Math.floor(r() * 9), 2, 1, '#a99a86');
        } else if (v === G.Plaza) {
          px(X, Y, T, T, '#cfc8ba');
          px(X, Y, T, 1, '#aca493'); px(X, Y + 8, T, 1, '#aca493');
          px(X + ((ty % 2) ? 0 : 8), Y, 1, 8, '#aca493'); px(X + ((ty % 2) ? 8 : 0), Y + 8, 1, 8, '#aca493');
          px(X + 1, Y + 1, 6, 1, '#e2dccf'); px(X + 9, Y + 9, 6, 1, '#e2dccf');
        } else if (v === G.Water) {
          px(X, Y, T, T, '#4aa3df');
          for (let k = 0; k < 4; k++) px(X + Math.floor(r() * 14), Y + Math.floor(r() * 16), 3, 1, '#3b8fd6');
        } else if (v === G.Bridge) {
          px(X, Y, T, T, '#a8743f');
          for (let x = 0; x < T; x += 4) px(X + x, Y, 1, T, '#7a4f28');
          if (g(tx, ty - 1) === G.Water) { px(X, Y, T, 3, '#5e3a1c'); px(X, Y, T, 1, '#8a5a2e'); }
          if (g(tx, ty + 1) === G.Water) { px(X, Y + T - 3, T, 3, '#5e3a1c'); px(X, Y + T - 3, T, 1, '#8a5a2e'); }
        } else if (v === G.Ash) {
          px(X, Y, T, T, '#575061');
          for (let k = 0; k < 10; k++) px(X + Math.floor(r() * 16), Y + Math.floor(r() * 16), 1, 1, r() < 0.5 ? '#4b4555' : '#665e71');
          if (r() < 0.25) px(X + Math.floor(r() * 15), Y + Math.floor(r() * 15), 1, 1, '#ff8a3d');
          if (r() < 0.15) { let cx = X + 2 + Math.floor(r() * 10), cy = Y + 2 + Math.floor(r() * 10); for (let k = 0; k < 5; k++) { px(cx, cy, 1, 1, '#2e2934'); cx += r() < 0.5 ? 1 : 0; cy += 1; } }
        }
      }

    // edges
    for (let ty = 0; ty < MH; ty++)
      for (let tx = 0; tx < MW; tx++) {
        const X = tx * T, Y = ty * T, v = g(tx, ty);
        const nb: [number, number, number, number][] = [[0, -1, 0, 0], [0, 1, 0, T - 1], [-1, 0, 0, 0], [1, 0, T - 1, 0]];
        for (const [dx, dy, ox, oy] of nb) {
          const n = g(tx + dx, ty + dy);
          const horiz = dy !== 0;
          const line = (col: string, inset: number, chance = 1) => {
            for (let k = 0; k < T; k++) {
              if (r() > chance) continue;
              const x = horiz ? X + k : X + ox + (dx > 0 ? -inset : inset);
              const y = horiz ? Y + oy + (dy > 0 ? -inset : inset) : Y + k;
              px(x, y, 1, 1, col);
            }
          };
          if (v === G.Path && n === G.Grass) { line('#6fbf55', 0, 0.55); line('#b8975e', 1, 0.5); }
          if (v === G.Ash && n === G.Grass) { line('#6fbf55', 0, 0.5); line('#5d7a4f', 1, 0.4); }
          if (v === G.Water && landLike(n)) { line('#2f6fa8', 0); line('#bfe9ff', 1, 0.5); }
          if (v === G.Grass && n === G.Water) line('#4f9a3f', 0);
          if (v === G.Plaza && (n === G.Grass || n === G.Path)) line('#8f887a', 0);
        }
      }

    // lily pads in the pond
    for (let k = 0; k < 7; k++) {
      const x = (35 + r() * 7) * T, y = (32.5 + r() * 5) * T;
      if (g(Math.floor(x / T), Math.floor(y / T)) !== G.Water) continue;
      px(x - 3, y - 2, 6, 4, '#2e7a3a'); px(x - 2, y - 2, 4, 1, '#4a9a4a'); px(x, y - 2, 1, 2, '#4aa3df');
      if (r() < 0.4) px(x + 1, y - 1, 2, 2, '#ffb3c6');
    }

    // flowers and mushrooms
    for (let ty = 0; ty < MH; ty++)
      for (let tx = 0; tx < MW; tx++) {
        const i = this.idx(tx, ty);
        if (this.solid[i] || this.reserved[i]) continue;
        const X = tx * T, Y = ty * T, v = g(tx, ty);
        if (v === G.Grass && r() < 0.09) {
          const cols = [['#ffffff', '#ffd34d'], ['#ff8fb1', '#fff3a0'], ['#ffd34d', '#c2701e'], ['#a98bff', '#ffffff']][Math.floor(r() * 4)];
          for (let k = 0; k < 3; k++) { const fx = X + 2 + Math.floor(r() * 11), fy = Y + 2 + Math.floor(r() * 11); px(fx - 1, fy, 3, 1, cols[0]); px(fx, fy - 1, 1, 3, cols[0]); px(fx, fy, 1, 1, cols[1]); }
        } else if (v === G.Grass && r() < 0.012) {
          const fx = X + 5, fy = Y + 6; px(fx, fy, 5, 2, '#d63a4a'); px(fx + 1, fy - 1, 3, 1, '#d63a4a'); px(fx + 1, fy, 1, 1, '#ffffff'); px(fx + 2, fy + 2, 1, 2, '#f3e7cf');
        }
      }

    // soft shadows under everything that stands up
    ctx.fillStyle = 'rgba(20,18,40,0.22)';
    for (const z of ZONES) {
      ctx.fillRect(z.x * T + 4, (z.y + z.h) * T, z.w * T - 2, 4);
      ctx.fillRect((z.x + z.w) * T, z.y * T + 10, 4, z.h * T - 6);
    }
    for (const o of this.objects) {
      if (o.zone) continue;
      const cx = o.x + o.img.width / 2, cy = o.base + 1;
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
