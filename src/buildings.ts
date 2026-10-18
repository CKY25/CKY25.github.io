// Buildings, painted in code at 1 tile = 16 px. Everything is drawn into a
// small pixel buffer so shapes can be shaded, lit and outlined after they are
// laid down. Light comes from the top left: west faces are lit, east faces
// fall into shadow, and eaves cast a shadow onto the wall below them.
import { T } from './art';
import { Pix, clamp, hash, ramp, faceRamps, shade, textW, type Ramp } from './pix';

export type BuildingKind = 'academy' | 'library' | 'home' | 'party' | 'office' | 'post' | 'arcade' | 'keep' | 'booth'
  | 'stadium' | 'dojo' | 'diner' | 'bank' | 'gym';

export interface BuildingArt {
  img: HTMLCanvasElement;
  top: number; // extra pixels above the footprint
  lights: { x: number; y: number; color: string }[]; // blinking bulbs
  flames: { x: number; y: number }[]; // fire emitters
  smoke?: { x: number; y: number }; // chimney top
}

const OUT = '#241a2f';
const GLASS = { d: '#283f5e', m: '#3f6d95', l: '#6ea6cf', h: '#c6ecff' };
const WARM = { d: '#c7803a', m: '#ffc96e', l: '#ffe2a0', h: '#fff5d6' };

// ------------------------------------------------------------------ materials
type Mat = (p: Pix, x: number, y: number, w: number, h: number) => void;

const brick = (base: string, mortar: string, seed = 1): Mat => (p, x, y, w, h) => {
  const R = ramp(base);
  p.fill(x, y, w, h, (i, j) => {
    const row = Math.floor(j / 4), off = row % 2 ? 4 : 0, bi = Math.floor((i + off) / 8);
    if (j % 4 === 3 || (i + off) % 8 === 7) return mortar;
    const n = hash(bi, row, seed);
    if (j % 4 === 0 && (i + off) % 8 === 0) return R.l;
    return n < 0.16 ? R.d : n > 0.86 ? R.l : R.m;
  });
};

const siding = (base: string, seed = 1): Mat => (p, x, y, w, h) => {
  const R = ramp(base);
  p.fill(x, y, w, h, (i, j) => {
    const r = j % 5, row = Math.floor(j / 5);
    if (r === 4) return R.d;
    if (r === 0) return R.l;
    const joint = Math.floor(hash(row, 3, seed) * 40);
    return (i + joint) % 41 === 0 ? R.d : R.m;
  });
};

const ashlar = (base: string, rowH = 7, seed = 1): Mat => (p, x, y, w, h) => {
  const R = ramp(base);
  for (let j0 = 0, row = 0; j0 < h; j0 += rowH, row++) {
    let i0 = -Math.floor(hash(row, 1, seed) * 10);
    for (let b = 0; i0 < w; b++) {
      const bw = 10 + Math.floor(hash(row, b, seed) * 9);
      const tone = hash(b, row, seed + 7);
      const c = tone < 0.2 ? R.d : tone > 0.84 ? R.l : R.m;
      for (let j = 0; j < rowH && j0 + j < h; j++)
        for (let i = 0; i < bw; i++) {
          const X = i0 + i;
          if (X < 0 || X >= w) continue;
          let col = c;
          if (j === rowH - 1 || i === bw - 1) col = R.d2;
          else if (j === 0 || i === 0) col = c === R.l ? R.h : R.l;
          else if (hash(X, j0 + j, seed + 3) < 0.05) col = R.d;
          p.set(x + X, y + j0 + j, col);
        }
      i0 += bw;
    }
  }
};

const plaster = (base: string, seed = 1): Mat => (p, x, y, w, h) => {
  const R = ramp(base);
  p.fill(x, y, w, h, (i, j) => { const n = hash(i, j, seed); return n < 0.05 ? R.d : n > 0.975 ? R.l : R.m; });
};


/** Eave shadow at the top, a lit west edge, a shaded east edge and contact shadow at the bottom. */
function wallLight(p: Pix, x: number, y: number, w: number, h: number, eave = 4) {
  p.mul(x, y, w, Math.min(2, eave), 0.58);
  if (eave > 2) p.mul(x, y + 2, w, eave - 2, 0.78);
  p.mul(x, y + eave, 1, h - eave, 1.12);
  p.mul(x + w - 4, y, 4, h, 0.9);
  p.mul(x + w - 1, y, 1, h, 0.84);
  p.mul(x, y + h - 1, w, 1, 0.8);
}

function plinth(p: Pix, x: number, y: number, w: number, h: number, base: string) {
  const R = ramp(base);
  p.fill(x, y, w, h, (i, j) => {
    if (j === 0) return R.h;
    if (j === h - 1) return R.d2;
    const bi = Math.floor((i + (j > h / 2 ? 5 : 0)) / 11);
    if ((i + (j > h / 2 ? 5 : 0)) % 11 === 10) return R.d;
    return j === 1 ? R.l : hash(bi, j > h / 2 ? 1 : 0, 9) < 0.3 ? R.d : R.m;
  });
}

// ------------------------------------------------------------------ roofs
type RoofTex = (i: number, jj: number, R: Ramp, face: number) => string;


const slate = (seed = 1): RoofTex => (i, jj, R) => {
  const row = Math.floor(jj / 3), r = jj % 3, off = row % 2 ? 2 : 0, si = Math.floor((i + off) / 5);
  if (r === 2) return R.d2;
  if ((i + off) % 5 === 0) return R.d;
  const n = hash(si, row, seed);
  if (r === 0) return n < 0.5 ? R.l : R.m;
  return n < 0.15 ? R.d : n > 0.9 ? R.l : R.m;
};

const clay: RoofTex = (i, jj, R) => {
  const row = Math.floor(jj / 6), r = jj % 6, c = i % 4, n = hash(i >> 2, row, 5);
  if (r === 5) return c === 0 ? R.d2 : R.d; // shadow under the course above
  if (c === 0) return R.d;
  if (r === 0) return c === 1 ? R.h : c === 2 ? R.l : R.m; // rounded lip
  const col = c === 1 ? R.l : c === 2 ? R.m : R.d;
  return n < 0.12 ? (col === R.l ? R.m : R.d) : col;
};


interface RoofOpts { ridge: number; hip: number; tex: RoofTex; fascia?: string; noEave?: boolean }

/** Hipped roof seen from the front: a big south face, two side hips and a sliver of the north face. */
function hipRoof(p: Pix, x: number, y: number, w: number, h: number, base: string, o: RoofOpts) {
  const F = faceRamps(base);
  const { ridge, hip } = o;
  const face = (i: number, j: number) => {
    if (j < ridge) { const t = j / ridge; return i < hip * t ? 0 : i > w - 1 - hip * t ? 2 : 3; }
    const t = (h - 1 - j) / Math.max(1, h - 1 - ridge);
    return i < hip * t ? 0 : i > w - 1 - hip * t ? 2 : 1;
  };
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const f = face(i, j), R = F[f];
      let c = o.tex(i, h - 1 - j, R, f);
      if (f === 1 && j >= ridge && j < ridge + 2) c = j === ridge ? F[1].h : F[1].l; // ridge cap
      if (f === 3 && j === ridge - 1) c = F[3].d2;
      if (f === 0 && face(i + 1, j) !== 0) c = F[0].h; // hip lines
      if (f === 2 && face(i - 1, j) !== 2) c = F[2].d2;
      p.set(x + i, y + j, c);
    }
  if (!o.noEave) {
    const fa = ramp(o.fascia ?? shade(base, -1.4));
    p.rect(x, y + h - 3, w, 1, F[1].d2);
    p.rect(x, y + h - 2, w, 1, fa.m);
    p.rect(x, y + h - 1, w, 1, fa.d2);
    p.rect(x, y + h - 2, 1, 2, fa.l);
  }
}

/**
 * A gable facing the viewer (ridge running north-south). The triangle face is
 * filled by `face`; the two roof slopes run back (up the screen) by `depth`.
 */
function frontGable(p: Pix, cx: number, baseY: number, half: number, rise: number, depth: number, base: string, tex: RoofTex, face: Mat, trim: string) {
  const apex = baseY - rise;
  const F = faceRamps(base);
  const T2 = ramp(trim);
  // triangle face: texture a scratch buffer, then copy the triangle out of it
  const tri = new Pix(p.w, p.h, p.oy);
  face(tri, cx - half, apex, half * 2 + 1, rise + 1);
  const clip = (x: number, y: number) => y >= apex && y <= baseY && Math.abs(x - cx) <= Math.floor(((y - apex) / rise) * half);
  blitClip(p, tri, clip);
  // shadow under the bargeboards
  for (let y = apex; y <= baseY; y++) {
    const hw = Math.floor(((y - apex) / rise) * half);
    p.mul(cx - hw, y, 3, 1, 0.72);
    p.mul(cx + hw - 2, y, 3, 1, 0.72);
  }
  for (let y = apex; y < apex + 3; y++) p.mul(cx - 3, y, 7, 1, 0.75);
  // slopes
  for (let x = cx - half - 1; x <= cx + half + 1; x++) {
    const dx = Math.abs(x - cx);
    const yr = apex + Math.round((dx / half) * rise);
    for (let y = yr - depth; y <= yr; y++) {
      const left = x <= cx, R = left ? F[0] : F[2];
      let c = tex(dx + 40, yr - y, R, left ? 0 : 2);
      if (y >= yr - 1) c = left ? T2.l : T2.d; // bargeboard
      else if (y === yr - 2) c = left ? T2.h : T2.m;
      if (x === cx) c = y >= yr - 2 ? T2.l : F[1].h; // ridge
      p.set(x, y, c);
    }
  }
}

function blitClip(dst: Pix, src: Pix, clip: (x: number, y: number) => boolean) {
  for (let y = -dst.oy; y < dst.h - dst.oy; y++)
    for (let x = 0; x < dst.w; x++) if (clip(x, y) && src.has(x, y)) dst.d[(y + dst.oy) * dst.w + x] = src.d[(y + src.oy) * src.w + x];
}

/** Flat roof seen from above: parapet with a lit top, an inner shadow and fine gravel. */
function deck(p: Pix, x: number, y: number, w: number, h: number, base: string) {
  const R = ramp(base), seamC = shade(base, -0.35);
  p.fill(x, y, w, h, (i, j) => {
    if (j === 0 || i === 0) return R.h;
    if (j === 1 || i === 1) return R.l;
    if (i >= w - 2) return R.d;
    if (j === 2 || i === 2) return R.d2;
    if (j === 3 || i === 3) return R.d;
    const n = hash(i, j, 77);
    return n < 0.05 ? R.d : n > 0.96 ? R.l : (i - 4) % 28 === 27 ? seamC : R.m;
  });
}

// ------------------------------------------------------------------ parts
interface WinOpts { frame?: string; lit?: boolean; mull?: 'cross' | 'v' | 'h' | 'none' | 'grid'; arch?: boolean; shutters?: string; box?: boolean; curtain?: string; inner?: (p: Pix, x: number, y: number, w: number, h: number) => void }

function win(p: Pix, x: number, y: number, w: number, h: number, o: WinOpts = {}) {
  const F = ramp(o.frame ?? '#f1e8d6');
  const inArch = (i: number, j: number) => {
    if (!o.arch) return true;
    const r = w / 2, cy = r;
    return j >= cy || (i + 0.5 - r) ** 2 + (j + 0.5 - cy) ** 2 <= r * r;
  };
  // frame
  p.fill(x, y, w, h, (i, j) => (!inArch(i, j) ? null : i === 0 || j === 0 || !inArch(i, j - 1) || !inArch(i - 1, j) ? F.l : i === w - 1 || !inArch(i + 1, j) ? F.d : F.m));
  // glass
  const gx = x + 1, gy = y + 1, gw = w - 2, gh = h - 2;
  p.fill(gx, gy, gw, gh, (i, j) => {
    if (!inArch(i + 1, j + 1) || !inArch(i, j + 1) || !inArch(i + 2, j + 1) || !inArch(i + 1, j)) return null;
    if (o.lit) return j === 0 ? WARM.d : (i + j) % 7 === 0 ? WARM.l : WARM.m;
    if (j < 2) return GLASS.d;
    const s = (i + gh - j) % (gw + gh);
    if (s === 3 || s === 4 || s === 7) return GLASS.l;
    return j < gh / 2 ? GLASS.m : shade(GLASS.m, -0.4);
  });
  if (!o.lit) p.set(gx, gy + 2, GLASS.h);
  if (o.inner) o.inner(p, gx, gy, gw, gh);
  if (o.curtain) {
    const C = ramp(o.curtain);
    p.fill(gx, gy, 2, gh, (i, j) => (j < 1 ? null : i ? C.d : C.m));
    p.fill(gx + gw - 2, gy, 2, gh, (i, j) => (j < 1 ? null : i ? C.d : C.m));
  }
  const m = o.mull ?? 'cross';
  if (m === 'cross' || m === 'v') p.rect(x + Math.floor(w / 2), gy, 1, gh, F.m);
  if (m === 'cross' || m === 'h') p.rect(gx, y + Math.floor(h * 0.45), gw, 1, F.m);
  if (m === 'grid') { for (let i = 3; i < gw; i += 4) p.rect(gx + i, gy, 1, gh, F.m); for (let j = 3; j < gh; j += 4) p.rect(gx, gy + j, gw, 1, F.m); }
  // sill + its shadow
  p.rect(x - 1, y + h, w + 2, 1, F.h);
  p.rect(x - 1, y + h + 1, w + 2, 1, F.d);
  p.mul(x, y + h + 2, w + 1, 1, 0.75);
  if (o.shutters) {
    const S = ramp(o.shutters);
    for (const sx of [x - 4, x + w + 1]) p.fill(sx, y, 3, h, (i, j) => (j % 3 === 2 ? S.d : i === 0 ? S.l : i === 2 ? S.d : S.m));
    p.mul(x + w + 4, y + 1, 1, h, 0.8);
  }
  if (o.box) {
    const B = ramp('#8a5733');
    p.fill(x - 1, y + h + 1, w + 2, 3, (_i, j) => (j === 0 ? B.l : j === 2 ? B.d : B.m));
    const flowers = ['#ff6f91', '#ffd34d', '#ffffff', '#b58bff'];
    for (let i = 0; i < w; i++) {
      p.set(x + i, y + h, i % 2 ? '#3f8f3e' : '#58ad4a');
      if (i % 3 === 1) { p.set(x + i, y + h - 1, flowers[(i + x) % 4]); }
    }
  }
}

interface DoorOpts { frame?: string; style?: 'panel' | 'double' | 'glass' | 'arch'; knob?: string; light?: boolean }

function door(p: Pix, x: number, y: number, w: number, h: number, color: string, o: DoorOpts = {}) {
  const F = ramp(o.frame ?? '#e9dcc0'), D = ramp(color);
  const arch = o.style === 'arch';
  const inA = (i: number, j: number) => !arch || j >= w / 2 || (i + 0.5 - w / 2) ** 2 + (j + 0.5 - w / 2) ** 2 <= (w / 2) ** 2;
  // frame (1 px wider all round)
  p.fill(x - 1, y - 1, w + 2, h + 1, (i, j) => (inA(i - 0.5, j - 0.5) || !arch ? (i === 0 || j === 0 ? F.l : i === w + 1 ? F.d : F.m) : null));
  p.fill(x, y, w, h, (i, j) => {
    if (!inA(i, j)) return null;
    if (j === 0 || !inA(i, j - 1)) return D.o;
    if (i === 0) return D.d2;
    if (o.style === 'glass') {
      const mid = Math.floor(w / 2);
      if (i === mid || i === w - 1 || j === 1 || j === h - 1) return '#c9d2dc';
      return (i + j) % 9 === 0 ? GLASS.l : j < 4 ? GLASS.d : GLASS.m;
    }
    if (o.style === 'double' && i === Math.floor(w / 2)) return D.d2;
    const pi = o.style === 'double' ? i % Math.floor(w / 2) : i;
    const pw = o.style === 'double' ? Math.floor(w / 2) : w;
    // raised panels
    const inPanel = pi >= 2 && pi <= pw - 3 && ((j >= 3 && j <= h / 2 - 1) || (j >= h / 2 + 2 && j <= h - 3));
    if (inPanel) {
      if (pi === 2 || j === 3 || j === Math.ceil(h / 2 + 2)) return D.d;
      if (pi === pw - 3) return D.l;
      return D.m;
    }
    return i === w - 1 ? D.d : D.m;
  });
  if (o.light) p.fill(x + 2, y + 3, w - 4, 3, (i) => (i % 3 === 2 ? D.d : WARM.m));
  p.set(x + w - 3, y + Math.floor(h * 0.55), o.knob ?? '#ffd34d');
}

/** Stone steps that get a little wider as they go down. */
function steps(p: Pix, x: number, y: number, w: number, n: number, base = '#b8b2a6') {
  const R = ramp(base);
  for (let k = 0; k < n; k++) {
    const sx = x - k * 2, sw = w + k * 4, sy = y + k * 2;
    p.rect(sx, sy, sw, 1, R.h);
    p.rect(sx, sy + 1, sw, 1, R.d);
    p.set(sx, sy, R.l); p.set(sx + sw - 1, sy + 1, R.d2);
  }
}

function column(p: Pix, x: number, y: number, w: number, h: number, base: string, cap = true) {
  const R = ramp(base);
  p.fill(x, y, w, h, (i) => { const t = i / Math.max(1, w - 1); return t < 0.18 ? R.l : t < 0.42 ? R.h : t < 0.7 ? R.m : t < 0.9 ? R.d : R.d2; });
  if (!cap) return;
  p.fill(x - 1, y, w + 2, 3, (i, j) => (j === 0 ? R.h : j === 2 ? R.d : i === w + 1 ? R.d : R.l));
  p.fill(x - 1, y + h - 3, w + 2, 3, (i, j) => (j === 0 ? R.l : j === 2 ? R.d2 : i === w + 1 ? R.d : R.m));
}

function shrub(p: Pix, cx: number, cy: number, rx: number, ry: number, base = '#4f9a3f', seed = 1) {
  const R = ramp(base);
  for (let j = -ry; j <= ry; j++)
    for (let i = -rx; i <= rx; i++) {
      const d = (i * i) / (rx * rx) + (j * j) / (ry * ry);
      if (d > 1) continue;
      const n = hash(i + 50, j + 50, seed);
      if (d > 0.78 && n < 0.3) continue;
      const L = -(i / rx) * 0.6 - (j / ry) * 0.9 + (n - 0.5) * 0.6;
      p.set(cx + i, cy + j, d > 0.86 && j > 0 ? R.d2 : L > 0.75 ? R.h : L > 0.15 ? R.l : L > -0.55 ? R.m : R.d);
    }
}

function planter(p: Pix, x: number, y: number, w: number, base = '#8f8a84', leaf = '#4f9a3f', seed = 1) {
  const R = ramp(base);
  shrub(p, x + Math.floor(w / 2), y - 3, Math.floor(w / 2) + 1, 5, leaf, seed);
  p.fill(x, y, w, 6, (i, j) => (j === 0 ? R.h : i === 0 ? R.l : i === w - 1 || j === 5 ? R.d : R.m));
}

function lantern(p: Pix, x: number, y: number, glass = WARM.m) {
  p.sprite(['..kk..', '.kddk.', 'kgllgk', 'kglhgk', 'kgllgk', 'kggggk', '.kddk.', '..kk..'],
    { k: OUT, d: '#4a4658', g: glass, l: shade(glass, 1), h: '#fff8e0' }, x, y);
}

/** A wooden or painted sign with pixel lettering, centred on cx. Returns its width. */
function plank(p: Pix, cx: number, y: number, text: string, bg: string, fg: string, scale = 1) {
  const B = ramp(bg), tw = textW(text, scale), w = tw + 6 * scale, h = 5 * scale + 4, x = Math.round(cx - w / 2);
  p.rect(x - 1, y - 1, w + 2, h + 2, B.o);
  p.fill(x, y, w, h, (i, j) => (j === 0 ? B.l : j === h - 1 ? B.d2 : i === 0 ? B.l : i === w - 1 ? B.d : B.m));
  p.text(text, x + 3 * scale, y + 2 + scale, B.d2, scale);
  p.text(text, x + 3 * scale, y + 2, fg, scale);
  p.mul(x, y + h + 1, w + 1, 1, 0.7);
  return w;
}

function chimney(p: Pix, x: number, y: number, w: number, h: number, base: string) {
  brick(base, shade(base, -2.2), 4)(p, x, y, w, h);
  p.mul(x + w - 3, y, 3, h, 0.78);
  p.mul(x, y, 1, h, 1.12);
  const C = ramp('#7a7480');
  p.fill(x - 1, y - 3, w + 2, 3, (_i, j) => (j === 0 ? C.l : j === 1 ? C.m : C.d));
  p.rect(x + 1, y - 3, w - 2, 1, '#2a2430');
}

// ------------------------------------------------------------------ builder
interface B { p: Pix; W: number; H: number; top: number; lights: BuildingArt['lights']; flames: BuildingArt['flames']; smoke?: { x: number; y: number }; light: (x: number, y: number, c: string) => void }

const TOPS: Record<Exclude<BuildingKind, 'booth'>, number> = {
  academy: 44, library: 14, home: 30, party: 34, office: 26, post: 14, arcade: 40, keep: 44, stadium: 16, dojo: 24, diner: 28, bank: 34, gym: 4,
};

export function makeBuilding(kind: BuildingKind, wTiles: number, hTiles: number, _seed: number, booth?: { a: string; b: string; icon: string }): BuildingArt {
  const W = wTiles * T, H = hTiles * T, top = kind === 'booth' ? 12 : TOPS[kind];
  const p = new Pix(W, H + top, top);
  const lights: BuildingArt['lights'] = [];
  const b: B = { p, W, H, top, lights, flames: [], light: (x, y, c) => lights.push({ x, y: y + top, color: c }) };
  DRAW[kind](b, booth);
  p.outline(OUT);
  return { img: p.canvas(), top, lights: b.lights, flames: b.flames.map((f) => ({ x: f.x, y: f.y + top })), smoke: b.smoke && { x: b.smoke.x, y: b.smoke.y + top } };
}

const DRAW: Record<BuildingKind, (b: B, booth?: { a: string; b: string; icon: string }) => void> = {
  // -------------------------------------------------------------- home
  home(b) {
    const { p, W, H, light } = b; void light;
    const wallTop = 56, wx = 5, ww = W - 10, plY = H - 7;
    siding('#efe0c2')(p, wx, wallTop, ww, plY - wallTop);
    wallLight(p, wx, wallTop, ww, plY - wallTop);
    plinth(p, wx - 1, plY, ww + 2, 7, '#a39a8a');
    hipRoof(p, 1, -16, W - 2, wallTop + 4 + 16, '#c4573f', { ridge: 6, hip: 26, tex: clay, fascia: '#f3e6cc' });
    chimney(p, 92, -26, 12, 26, '#a85a44');
    b.smoke = { x: 98, y: -30 };
    // dormer
    const dc = 34;
    siding('#efe0c2')(p, dc - 9, 20, 19, 13);
    p.mul(dc - 9, 20, 19, 2, 0.6);
    win(p, dc - 5, 22, 11, 9, { mull: 'cross' });
    p.mul(dc - 9, 33, 19, 2, 0.7);
    frontGable(p, dc, 20, 11, 8, 6, '#c4573f', clay, siding('#efe0c2', 2), '#f3e6cc');
    // windows
    win(p, 18, 66, 16, 16, { shutters: '#3f7f86', box: true, curtain: '#f6d2dc' });
    win(p, 94, 66, 16, 16, { shutters: '#3f7f86', box: true, curtain: '#f6d2dc' });
    // porch
    const pc = 72;
    p.mul(54, 66, 37, 6, 0.75);
    door(p, 66, 71, 12, 18, '#8a4f2c', { light: true });
    for (const x of [55, 87]) column(p, x, 64, 3, plY - 64, '#f3e6cc', false);
    frontGable(p, pc, 64, 20, 11, 9, '#c4573f', clay, siding('#f6ecd8', 3), '#f3e6cc');
    lantern(p, 58, 72);
    steps(p, 64, plY + 1, 16, 3, '#b8b0a2');
    // doormat
    p.rect(66, H - 1, 12, 1, '#b8513d');
  },

  // -------------------------------------------------------------- library
  library(b) {
    const { p, W, H, light } = b; void light;
    const wallTop = 50, wx = 5, ww = W - 10, plY = H - 7;
    brick('#a8573f', '#d8c3a8', 2)(p, wx, wallTop, ww, plY - wallTop);
    // stone quoins on the corners
    for (const qx of [wx, wx + ww - 6]) for (let y = wallTop + 2; y < plY; y += 8) ashlar('#e1d3b5', 4, qx + y)(p, qx + (y / 8) % 2, y, 6, 4);
    wallLight(p, wx, wallTop, ww, plY - wallTop);
    plinth(p, wx - 1, plY, ww + 2, 7, '#b9ae98');
    hipRoof(p, 1, -12, W - 2, wallTop + 4 + 12, '#3e6b55', { ridge: 5, hip: 26, tex: slate(3), fascia: '#e9dcc0' });
    // arched windows full of books
    const books = (q: Pix, x: number, y: number, w: number, h: number) => {
      const cols = ['#c94a4a', '#4a7fc9', '#e0b84a', '#5aa065', '#9a5ac9', '#e8875a'];
      for (let row = 0; row < 3; row++) {
        const by = y + 4 + row * 6;
        if (by + 5 > y + h) break;
        q.rect(x, by + 4, w, 1, '#6e4628');
        for (let i = 0; i < w; i++) if ((i + row) % 5 !== 4) q.rect(x + i, by + (hash(i, row, 3) < 0.3 ? 1 : 0), 1, 4 - (hash(i, row, 3) < 0.3 ? 1 : 0), cols[(i * 3 + row) % 6]);
      }
    };
    for (const x of [16, 36, 96, 116]) win(p, x, 60, 12, 22, { arch: true, lit: true, mull: 'none', inner: books, frame: '#efe4cc' });
    // entrance pavilion
    const cx = 72;
    ashlar('#e1d3b5', 6, 5)(p, 52, wallTop, 41, plY - wallTop);
    wallLight(p, 52, wallTop, 41, plY - wallTop, 3);
    frontGable(p, cx, wallTop + 2, 24, 14, 10, '#3e6b55', slate(4), ashlar('#e9dcc0', 5, 6), '#f3e8d2');
    // oculus
    p.fill(cx - 4, wallTop - 9, 9, 8, (i, j) => ((i - 4) ** 2 + (j - 3.5) ** 2 <= 16 ? ((i - 4) ** 2 + (j - 3.5) ** 2 > 9 ? '#c4b28e' : j < 3 ? WARM.l : WARM.m) : null));
    plank(p, cx, wallTop + 4, 'LIBRARY', '#3e6b55', '#ffe9a3');
    door(p, 65, 70, 15, 19, '#5a3420', { style: 'arch', frame: '#efe4cc' });
    for (const x of [55, 86]) column(p, x, wallTop + 2, 4, plY - wallTop - 2, '#efe4cc');
    lantern(p, 60, 66); lantern(p, 79 + 0, 66);
    steps(p, 62, plY + 1, 21, 3);
    // ivy creeping up the west corner
    for (let k = 0; k < 40; k++) {
      const yy = plY - 2 - Math.floor(hash(k, 1, 7) * 30), xx = wx + Math.floor(hash(k, 2, 7) * (8 + (plY - yy) / 3));
      p.set(xx, yy, hash(k, 3, 7) < 0.5 ? '#3f8f3e' : '#58ad4a');
      p.set(xx + 1, yy, '#2e6b35');
    }
  },

  // -------------------------------------------------------------- academy
  academy(b) {
    const { p, W, H, light } = b; void light;
    const wallTop = 58, wx = 6, ww = W - 12, plY = H - 8;
    ashlar('#e6d7b6', 6, 11)(p, wx, wallTop, ww, plY - wallTop);
    // cornice
    p.fill(wx - 1, wallTop + 3, ww + 2, 3, (_i, j) => (j === 0 ? '#fff8e8' : j === 1 ? '#e6d7b6' : '#b7a582'));
    wallLight(p, wx, wallTop, ww, plY - wallTop);
    plinth(p, wx - 1, plY, ww + 2, 8, '#a59d90');
    hipRoof(p, 1, -14, W - 2, wallTop + 4 + 14, '#3b5f9e', { ridge: 5, hip: 34, tex: slate(7), fascia: '#f3ead6' });
    // cupola with a clock and the flag
    const cx = W / 2;
    ashlar('#efe2c4', 5, 13)(p, cx - 11, -26, 23, 22);
    p.mul(cx - 11, -26, 23, 2, 0.6); p.mul(cx + 8, -26, 4, 22, 0.82);
    p.fill(cx - 6, -21, 13, 13, (i, j) => { const d = (i - 6) ** 2 + (j - 6) ** 2; return d > 36 ? null : d > 25 ? '#3a3448' : d > 20 ? '#c9a646' : '#fffaf0'; });
    p.rect(cx, -18, 1, 4, OUT); p.rect(cx, -15, 3, 1, OUT);
    hipRoof(p, cx - 14, -36, 29, 12, '#3b5f9e', { ridge: 2, hip: 12, tex: slate(8), fascia: '#f3ead6' });
    p.rect(cx, -44, 1, 9, '#4b4a57');
    p.fill(cx + 1, -44, 13, 8, (i, j) => (Math.abs(j - 3.5) <= 3.5 - Math.max(0, i - 8) * 0.7 ? (j < 2 ? '#3d6fd1' : j > 5 ? '#1f3f8f' : '#2b55b8') : null));
    p.rect(cx + 4, -42, 3, 3, '#ffd34d');
    // portico
    const px0 = 62, pw = W - 124;
    ashlar('#efe2c4', 6, 17)(p, px0, wallTop, pw, plY - wallTop);
    p.mul(px0, wallTop + 6, pw, plY - wallTop - 6, 0.8);
    frontGable(p, cx, wallTop + 2, 44, 20, 12, '#3b5f9e', slate(9), ashlar('#f3e8d0', 5, 19), '#fff8e8');
    p.fill(cx - 8, wallTop - 12, 17, 9, (i, j) => { const d = ((i - 8) / 8) ** 2 + ((j - 4.5) / 4.5) ** 2; return d > 1 ? null : d > 0.6 ? '#c9a646' : '#ffe9a3'; });
    p.text('T', cx - 1, wallTop - 10, '#8a5a12');
    // frieze with the name
    p.fill(px0 - 2, wallTop + 2, pw + 4, 9, (_i, j) => (j === 0 ? '#fff8e8' : j === 8 ? '#b7a582' : '#e6d7b6'));
    p.text('TARUMT', cx - 11, wallTop + 4, '#2a4f88');
    for (const x of [px0 + 4, px0 + 18, W - px0 - 24, W - px0 - 10]) {
      column(p, x, wallTop + 11, 6, plY - wallTop - 11, '#f6eedd');
      p.mul(x + 7, wallTop + 11, 3, plY - wallTop - 11, 0.8);
    }
    door(p, cx - 9, 80, 18, plY - 80, '#4a3020', { style: 'double', frame: '#f3ead6' });
    p.fill(cx - 9, 72, 18, 7, (i, j) => (j === 0 ? '#f3ead6' : i % 3 === 0 ? '#f3ead6' : j < 3 ? GLASS.d : GLASS.m));
    steps(p, px0 + 4, plY + 2, pw - 8, 3);
    // tall arched windows on the wings
    for (const x of [18, 38, W - 50, W - 30]) win(p, x, 70, 12, 24, { arch: true, mull: 'grid', frame: '#fff8e8' });
    // banners
    for (const x of [px0 - 8, W - px0 + 3]) {
      p.rect(x - 1, wallTop + 8, 7, 1, '#4b4a57');
      p.fill(x, wallTop + 9, 5, 22, (i, j) => (j > 19 && i === 2 ? null : i === 0 ? '#3d6fd1' : i === 4 ? '#1f3f8f' : '#2b55b8'));
      p.rect(x + 1, wallTop + 13, 3, 3, '#ffd34d');
    }
  },

  // -------------------------------------------------------------- party hall
  party(b) {
    const { p, W, H, light } = b; void light;
    const wallTop = 80, wx = 6, ww = W - 12, plY = H - 6;
    siding('#f7bfd2', 4)(p, wx, wallTop, ww, plY - wallTop);
    wallLight(p, wx, wallTop, ww, plY - wallTop, 6);
    plinth(p, wx - 1, plY, ww + 2, 6, '#9d8ab8');
    // big-top tent: concave cone, stripes radiating from the peak, lit from the west
    const peakX = W / 2, peakY = -24, eaveY = wallTop + 6, half = W / 2 - 2;
    const PINK = ramp('#ff5d8f'), CREAM = ramp('#fff0dc');
    for (let y = peakY; y < eaveY; y++) {
      const t = (y - peakY) / (eaveY - peakY), hw = Math.max(1.5, half * Math.pow(t, 1.45));
      for (let x = Math.floor(peakX - hw); x <= Math.ceil(peakX + hw); x++) {
        const u = (x + 0.5 - peakX) / hw;
        if (Math.abs(u) > 1) continue;
        const sv = (Math.asin(u) + Math.PI / 2) / (Math.PI / 9);
        const R = Math.floor(sv) % 2 ? PINK : CREAM;
        const L = u;
        let c = L < -0.6 ? R.l : L < 0.15 ? R.m : L < 0.65 ? R.d : R.d2;
        if (t < 0.1) c = L < 0 ? CREAM.l : CREAM.d;
        else if (sv - Math.floor(sv) < 0.1) c = R.d2;
        p.set(x, y, c);
      }
    }
    // scalloped valance
    for (let x = 1, i = 0; x < W - 1; x += 10, i++) {
      const R = ramp(i % 2 ? '#ff5d8f' : '#fff0dc');
      p.fill(x, wallTop + 5, 10, 6, (u, v) => ((u - 4.5) ** 2 / 25 + (v / 5.5) ** 2 <= 1 ? (v === 0 ? R.l : u > 6 ? R.d : R.m) : null));
      light(x + 5, wallTop + 4, ['#ffe14a', '#4ad0ff', '#7ee07a', '#ff9a3d'][i % 4]);
    }
    p.mul(wx, wallTop + 11, ww, 3, 0.75);
    // flag on the top
    p.rect(peakX, -34, 1, 11, '#4b4a57');
    p.fill(peakX + 1, -34, 9, 6, (i, j) => (Math.abs(j - 2.5) <= 2.5 - i * 0.3 ? (j < 3 ? '#ffd34d' : '#e8a92d') : null));
    // balloons on the corner
    for (const [bx, by, col] of [[10, -8, '#4ad0ff'], [17, -14, '#ffd34d'], [24, -6, '#7ee07a'], [W - 14, -10, '#c58bff'], [W - 22, -4, '#ff9a3d']] as [number, number, string][]) {
      const R = ramp(col);
      p.fill(bx - 3, by - 4, 7, 8, (i, j) => ((i - 3) ** 2 / 9 + (j - 3.5) ** 2 / 14 <= 1 ? (i < 3 && j < 3 ? R.h : i > 4 ? R.d : R.m) : null));
      p.set(bx, by + 4, R.d);
      for (let y = by + 5; y < by + 16; y++) p.set(bx + ((y >> 2) % 2), y, '#5c5470');
    }
    // windows and big sign
    for (const x of [18, 40, W - 58, W - 36]) win(p, x, wallTop + 18, 16, 16, { lit: true, frame: '#fff6fa', box: true });
    plank(p, W / 2, wallTop + 16, 'PARTY PALS', '#7d4fd0', '#ffe14a');
    door(p, W / 2 - 8, wallTop + 27, 16, plY - wallTop - 27, '#7d4fd0', { style: 'double', frame: '#fff6fa' });
    steps(p, W / 2 - 9, plY + 1, 18, 3, '#c7b8dc');
    // bunting across the wall
    const cols = ['#ff5d7a', '#ffd34d', '#4ad0ff', '#7ee07a', '#c58bff'];
    for (let x = wx + 2, i = 0; x < W - 10; x += 6, i++) {
      if (x > W / 2 - 24 && x < W / 2 + 18) continue;
      const y = wallTop + 13 + Math.round(Math.sin(x / 10) * 1.5);
      p.rect(x, y, 6, 1, '#5c5470');
      p.fill(x + 1, y + 1, 4, 3, (u, v) => (u >= v / 2 && u <= 3 - v / 2 ? cols[i % 5] : null));
    }
  },

  // -------------------------------------------------------------- office
  office(b) {
    const { p, W, H, light } = b; void light;
    const roofY = -18, facadeY = 30, plY = H - 4;
    // roof deck with a parapet
    deck(p, 2, roofY, W - 4, facadeY - roofY, '#a3aab4');
    // solar panels
    for (let k = 0; k < 3; k++) {
      const sx = 12 + k * 18;
      p.fill(sx, roofY + 7, 15, 9, (i, j) => (i === 0 || j === 0 ? '#5b7fb8' : (i % 5 === 4 || j % 4 === 3) ? '#2b4677' : '#22365e'));
      p.mul(sx + 1, roofY + 16, 15, 2, 0.7);
    }
    // AC units
    for (const [ax, ay] of [[W - 50, roofY + 6], [W - 30, roofY + 8], [16, roofY + 22]] as [number, number][]) {
      const A = ramp('#d5d9df');
      p.fill(ax, ay, 14, 4, (i) => (i === 0 ? A.h : A.l));
      p.fill(ax, ay + 4, 14, 7, (i, j) => (j % 2 ? A.d : i === 13 ? A.d : A.m));
      p.fill(ax + 3, ay, 6, 4, (i, j) => ((i - 2.5) ** 2 + (j - 1.5) ** 2 < 6 ? '#7d858f' : null));
      p.mul(ax + 1, ay + 11, 15, 2, 0.7);
    }
    // the rooftop sign
    const name = 'YOUNIVERSE', sw = textW(name) + 24, sl = Math.floor(W / 2 - sw / 2) + 20;
    for (const x of [sl + 4, sl + sw - 6]) p.rect(x, -6, 2, 10, '#5d6470');
    p.fill(sl, -24, sw, 18, (i, j) => (j === 0 || i === 0 ? '#ffffff' : j === 17 || i === sw - 1 ? '#b9c0ca' : '#f4f6f8'));
    p.text(name, sl + 18, -17, '#4a2a8a');
    const star = ['....k....', '...kyk...', 'kkkkyykkk', '.kyyyyyk.', '..kyyyk..', '.kyk.kyk.', '.k.....k.'];
    p.sprite(star, { k: '#7a4ad6', y: '#b58bff' }, sl + 5, -21);
    p.mul(sl + 1, -6, sw, 2, 0.7);
    // curtain wall: three floors of glass between concrete bands
    const C = ramp('#e3e6ea');
    p.fill(2, facadeY, W - 4, plY - facadeY, (i) => (i < 2 ? C.l : i > W - 9 ? C.d : C.m));
    const floors = [facadeY + 4, facadeY + 30, facadeY + 56];
    for (const fy of floors) {
      p.fill(2, fy - 4, W - 4, 4, (_i, j) => (j === 0 ? C.h : j === 3 ? C.d2 : C.m));
      for (let x = 8; x < W - 12; x += 25) {
        const pw = 21, ph = fy === floors[2] ? 0 : 20;
        if (!ph) continue;
        const lit = hash(x, fy, 5) < 0.3;
        p.fill(x, fy, pw, ph, (i, j) => {
          if (i === 0 || j === 0) return '#6f7a88';
          if (i === 10) return '#9aa4b0';
          if (lit) return j < 3 ? WARM.d : (i + j) % 11 === 0 ? WARM.l : WARM.m;
          const s = (i + x - j * 1.2) % 34;
          if (s > 4 && s < 9) return GLASS.l;
          if (s >= 9 && s < 10) return GLASS.h;
          return j < 4 ? GLASS.d : GLASS.m;
        });
        if (lit) { p.rect(x + 4, fy + 11, 3, 9, '#5a4a6a'); p.rect(x + 4, fy + 9, 3, 3, '#e8b48f'); p.rect(x + 13, fy + 13, 6, 2, '#6e4628'); }
        p.mul(x, fy + ph, pw, 1, 0.75);
      }
    }
    // ground floor lobby
    const gy = floors[2];
    p.fill(4, gy, W - 8, plY - gy, (i, j) => (j < 2 ? '#6f7a88' : i % 20 === 0 ? '#9aa4b0' : j < 6 ? GLASS.d : (i + j) % 13 === 0 ? GLASS.l : shade(GLASS.m, -0.3)));
    door(p, 74, gy + 8, 20, plY - gy - 8, '#3a4656', { style: 'glass', frame: '#d0d6dd' });
    // canopy
    p.fill(62, gy - 2, 44, 4, (_i, j) => (j === 0 ? '#ffffff' : j === 3 ? '#8f96a3' : '#e1e5ec'));
    p.mul(64, gy + 2, 42, 3, 0.65);
    p.sprite(star, { k: '#7a4ad6', y: '#b58bff' }, 80, gy - 9);
    planter(p, 30, plY - 6, 18, '#8f96a3', '#3f8f3e', 2); planter(p, W - 48, plY - 6, 18, '#8f96a3', '#3f8f3e', 3);
    p.fill(2, plY, W - 4, 4, (_i, j) => (j === 0 ? '#c3c8cf' : '#8f96a3'));
    p.mul(W - 5, facadeY, 3, plY - facadeY, 0.85);
  },

  // -------------------------------------------------------------- post office
  post(b) {
    const { p, W, H, light } = b; void light;
    const wallTop = 50, wx = 5, ww = W - 10, plY = H - 7;
    plaster('#f1e8d8', 4)(p, wx, wallTop, ww, plY - wallTop);
    // red dado band
    p.fill(wx, plY - 12, ww, 12, (_i, j) => (j === 0 ? '#f07080' : j === 11 ? '#8a2333' : '#d63a4a'));
    wallLight(p, wx, wallTop, ww, plY - wallTop);
    plinth(p, wx - 1, plY, ww + 2, 7, '#8a8590');
    hipRoof(p, 1, -10, W - 2, wallTop + 4 + 10, '#34497a', { ridge: 5, hip: 28, tex: slate(12), fascia: '#f3ead6' });
    const cx = 72;
    frontGable(p, cx, wallTop + 2, 22, 13, 8, '#34497a', slate(13), plaster('#f6efe2', 6), '#ffffff');
    // envelope in the gable
    p.fill(cx - 6, wallTop - 8, 13, 9, (i, j) => (i === 0 || j === 0 || i === 12 || j === 8 ? '#b8323c' : Math.abs(i - 6) === j ? '#d63a4a' : '#fffaf0'));
    // windows with red frames and awnings
    for (const x of [16, 36, 92, 112]) {
      win(p, x, 62, 16, 15, { frame: '#d63a4a', mull: 'v' });
      p.fill(x - 2, 57, 20, 4, (i, j) => (j === 3 ? (i % 4 < 2 ? '#d63a4a' : '#ffffff') : i % 4 < 2 ? '#e8576a' : '#fff6f0'));
      p.mul(x - 1, 61, 19, 2, 0.75);
    }
    plank(p, cx, wallTop + 6, 'POST', '#2c3f6b', '#ffffff');
    door(p, 65, 69, 14, plY - 69, '#2c3f6b', { style: 'arch', frame: '#ffffff', knob: '#ffd34d' });
    p.rect(68, plY - 9, 6, 1, '#d6c38a');
    steps(p, 63, plY + 1, 18, 3);
    lantern(p, 56, 70); lantern(p, 84, 70);
  },

  // -------------------------------------------------------------- arcade
  arcade(b) {
    const { p, W, H, light } = b; void light;
    const roofY = 26, wallTop = 56, wx = 4, ww = W - 8, plY = H - 5;
    // roof deck
    deck(p, 2, roofY, W - 4, wallTop - roofY, '#3d3060');
    // billboard on legs
    for (const x of [20, W - 24]) { p.rect(x, 8, 3, 22, '#4a4658'); p.rect(x + 1, 8, 1, 22, '#6a6680'); p.rect(x - 4, 26, 11, 1, '#4a4658'); }
    const bx = 6, by = -38, bw = W - 12, bh = 46;
    p.fill(bx, by, bw, bh, (i, j) => (i < 3 || j < 3 || i > bw - 4 || j > bh - 4 ? (i < 1 || j < 1 ? '#ff7ae2' : '#ff4ad8') : '#1d1238'));
    p.fill(bx + 5, by + 5, bw - 10, bh - 10, (i, j) => ((i + j) % 2 && hash(i, j, 2) < 0.05 ? '#ffffff' : '#271850'));
    const label = 'GAME JAM', tw = textW(label, 3), tx = Math.round(W / 2 - tw / 2) + 10;
    p.text(label, tx + 1, by + 17, '#6a1a7a', 3);
    p.text(label, tx, by + 16, '#ffe14a', 3);
    // joystick
    const jx = tx - 22, jy = by + 14;
    p.fill(jx, jy + 12, 14, 5, (i, j) => (j === 0 ? '#ffffff' : i === 13 || j === 4 ? '#a6a6c0' : '#e8e8f0'));
    p.rect(jx + 6, jy + 3, 2, 9, '#c9c9d8');
    p.fill(jx + 4, jy - 1, 6, 5, (i, j) => ((i - 2.5) ** 2 + (j - 2) ** 2 <= 7 ? (i < 3 && j < 2 ? '#ff9aa8' : '#ff4a6a') : null));
    for (let i = 0; i < 3; i++) p.rect(jx + 1 + i * 4, jy + 13, 2, 1, ['#4af0ff', '#ffe14a', '#7ee07a'][i]);
    // invaders
    const inv = ['..x...x..', '...xxx...', '..xxxxx..', '.xx.x.xx.', 'xxxxxxxxx', 'x.xxxxx.x', 'x.x...x.x'];
    p.sprite(inv, { x: '#4af0ff' }, bx + bw - 22, by + 30);
    p.sprite(inv, { x: '#7ee07a' }, bx + 12, by + 31);
    for (let x = bx + 4; x < bx + bw - 3; x += 6) { light(x, by + 1, '#ffe14a'); light(x, by + bh - 2, '#ffe14a'); }
    // facade
    brick('#3b2d5e', '#2a1f45', 5)(p, wx, wallTop, ww, plY - wallTop);
    wallLight(p, wx, wallTop, ww, plY - wallTop, 3);
    p.fill(wx - 1, wallTop, ww + 2, 4, (_i, j) => (j === 0 ? '#6a5aa0' : j === 3 ? '#1d1238' : '#4d3d80'));
    p.rect(wx, wallTop + 5, ww, 1, '#4af0ff');
    for (let x = wx + 2; x < W - 6; x += 8) light(x, wallTop + 5, '#4af0ff');
    // shop windows with cabinets inside
    const cabinets = (q: Pix, x: number, y: number, w: number, h: number) => {
      q.rect(x, y, w, h, '#160f2c');
      for (let k = 0; k < 3; k++) {
        const cx = x + 2 + k * 11, sc = ['#4af0ff', '#ff4ad8', '#7ee07a'][k];
        q.fill(cx, y + 8, 9, h - 8, (i, j) => (i === 0 ? '#4a3a80' : i === 8 ? '#1d1238' : j < 3 ? '#3a2b6a' : '#2a1f55'));
        q.fill(cx + 1, y + 11, 7, 7, (i, j) => (j === 0 ? shade(sc, 1) : (i + j) % 4 === 0 ? shade(sc, -1) : sc));
        q.fill(cx + 1, y + 20, 7, 3, (i, j) => (j === 0 ? '#e8e8f0' : i === 2 ? '#ff4a6a' : i === 5 ? '#ffe14a' : '#c9c9d8'));
        q.mul(cx + 1, y + 23, 8, 2, 1.2);
      }
      q.mul(x, y, w, 3, 1.25);
    };
    for (const x of [11, W - 47]) {
      win(p, x, wallTop + 14, 36, 36, { frame: '#ff4ad8', mull: 'none', inner: cabinets });
      p.rect(x - 1, wallTop + 13, 38, 1, '#ff7ae2');
    }
    // door with a neon OPEN sign
    p.fill(W / 2 - 13, wallTop + 22, 26, plY - wallTop - 22, (i, j) => (i === 0 || j === 0 || i === 25 ? '#ff4ad8' : null));
    door(p, W / 2 - 10, wallTop + 26, 20, plY - wallTop - 26, '#2d1f55', { style: 'glass', frame: '#ff4ad8' });
    plank(p, W / 2, wallTop + 11, 'OPEN', '#1d1238', '#4af0ff');
    // posters
    for (const [x, c1, c2] of [[52, '#ffe14a', '#ff4a6a'], [W - 60, '#4af0ff', '#7d4fd0']] as [number, string, string][]) {
      p.fill(x, wallTop + 18, 8, 12, (i, j) => (i === 0 || j === 0 || i === 7 || j === 11 ? '#fff7e6' : j < 6 ? c1 : c2));
    }
    p.fill(2, plY, W - 4, 5, (_i, j) => (j === 0 ? '#5a4d78' : '#2a2140'));
  },

  // -------------------------------------------------------------- Emberfall keep
  keep(b) {
    const { p, W, H, light } = b; void light;
    const flames = b.flames;
    const STONE = '#4c4659', wallTop = 66, plY = H - 4;
    const crenel = (x: number, y: number, w: number, base: string) => {
      const R = ramp(base);
      for (let mx = x; mx < x + w - 2; mx += 8) {
        p.fill(mx, y, 6, 3, (i) => (i === 0 ? R.h : R.l)); // top face
        p.fill(mx, y + 3, 6, 6, (i, j) => (i === 0 ? R.l : i === 5 ? R.d : j === 5 ? R.d : R.m));
      }
      p.fill(x, y + 9, w, 3, (_i, j) => (j === 0 ? R.l : R.d));
    };
    // donjon behind
    const dx0 = 52, dw = W - 104;
    ashlar('#433d50', 7, 21)(p, dx0, -14, dw, wallTop - 4 + 14);
    p.mul(dx0 + dw - 8, -14, 8, wallTop + 10, 0.75);
    crenel(dx0 - 2, -26, dw + 4, '#544d63');
    win(p, W / 2 - 4, 2, 8, 14, { arch: true, lit: true, mull: 'none', frame: '#2e2a38' });
    // banner flag on the donjon
    p.rect(W / 2, -44, 1, 18, '#2e2a38');
    p.fill(W / 2 + 1, -44, 13, 8, (i, j) => (Math.abs(j - 3.5) <= 3.5 - Math.max(0, i - 8) * 0.8 ? (j < 4 ? '#c8323f' : '#962230') : null));
    // curtain wall
    ashlar(STONE, 7, 23)(p, 30, wallTop, W - 60, plY - wallTop);
    wallLight(p, 30, wallTop, W - 60, plY - wallTop, 2);
    crenel(28, wallTop - 12, W - 56, '#5d566d');
    // round towers
    for (const tx of [3, W - 37]) {
      const tw = 34;
      p.fill(tx, -6, tw, plY + 6, (i, j) => {
        const t = i / (tw - 1), row = Math.floor(j / 6), bi = Math.floor((i + row * 5) / 10);
        const base = t < 0.12 ? '#6b6380' : t < 0.4 ? '#5d566d' : t < 0.75 ? '#4c4659' : t < 0.92 ? '#3a3546' : '#2e2a38';
        const R = ramp(base);
        if (j % 6 === 5) return R.d2;
        if ((i + row * 5) % 10 === 0) return R.d2;
        if (j % 6 === 0) return R.l;
        const n = hash(bi, row, tx);
        return n < 0.18 ? R.d : n > 0.9 ? R.l : R.m;
      });
      // conical roof
      const cx = tx + tw / 2, apex = -44;
      for (let y = apex; y < -4; y++) {
        const hw = ((y - apex) / (-4 - apex)) * (tw / 2 + 3);
        for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
          const t = (x - (cx - hw)) / Math.max(1, hw * 2);
          const R = ramp('#3a3049');
          p.set(x, y, t < 0.25 ? R.l : t < 0.6 ? R.m : t < 0.85 ? R.d : R.d2);
          if ((y - apex) % 5 === 0) p.set(x, y, R.d2);
        }
      }
      p.rect(cx - 0.5, apex - 6, 1, 6, '#2e2a38');
      p.fill(cx + 0.5, apex - 6, 6, 4, (i, j) => (i <= 5 - j ? '#c8323f' : null));
      p.fill(tx - 1, -6, tw + 2, 3, (_i, j) => (j === 0 ? '#2e2a38' : '#1c1822'));
      // arrow slits with fire
      for (const sy of [20, 56]) p.fill(cx - 1, sy, 3, 9, (i, j) => (j === 0 || i === 0 ? '#1c1822' : j < 3 ? '#ffd27a' : '#ff8a3d'));
    }
    // war banners on the curtain wall
    for (const bx of [44, W - 52]) {
      p.rect(bx - 1, wallTop + 2, 10, 1, '#2e2a38');
      p.fill(bx, wallTop + 3, 8, 26, (i, j) => (j > 22 && Math.abs(i - 3.5) < (j - 22) ? null : i === 0 ? '#c8323f' : i === 7 ? '#7a1a26' : '#a3283a'));
      p.fill(bx + 2, wallTop + 9, 4, 7, (i, j) => (j < 3 ? (i === 1 || i === 2 ? '#ffd27a' : null) : '#ff8a3d'));
    }
    // gatehouse
    const gx = W / 2 - 16, gw = 32;
    ashlar('#544d63', 6, 31)(p, gx, wallTop - 6, gw, plY - wallTop + 6);
    crenel(gx - 2, wallTop - 18, gw + 4, '#665e78');
    p.mul(gx + gw - 4, wallTop - 6, 4, plY - wallTop + 6, 0.75);
    const ax = W / 2 - 11, ay = wallTop + 18, aw = 22;
    p.fill(ax - 2, ay - 2, aw + 4, plY - ay + 2, (i, j) => {
      const r = (aw + 4) / 2, inside = j >= r || (i + 0.5 - r) ** 2 + (j + 0.5 - r) ** 2 <= r * r;
      return inside ? ((i + j) % 4 === 0 ? '#6b6380' : '#5d566d') : null;
    });
    p.fill(ax, ay, aw, plY - ay, (i, j) => {
      const r = aw / 2, inside = j >= r || (i + 0.5 - r) ** 2 + (j + 0.5 - r) ** 2 <= r * r;
      if (!inside) return null;
      const glow = 1 - Math.min(1, Math.hypot(i - r, (j - (plY - ay)) * 0.7) / 26);
      if (j < 9 && (i % 4 === 1)) return '#2a2230'; // raised portcullis
      if (j === 9) return '#2a2230';
      return glow > 0.75 ? '#ffe2a0' : glow > 0.5 ? '#ffb15a' : glow > 0.25 ? '#ff7a2f' : '#9a3418';
    });
    flames.push({ x: W / 2 - 22, y: plY - 10 }, { x: W / 2 + 22, y: plY - 10 });
    // braziers by the gate
    for (const fx of [W / 2 - 22, W / 2 + 22]) {
      p.fill(fx - 4, plY - 10, 9, 4, (i, j) => (j === 0 ? '#ff8a3d' : i === 0 ? '#3d3745' : '#1c1822'));
      p.rect(fx - 1, plY - 6, 3, 6, '#2a2230');
      p.rect(fx - 3, plY - 1, 7, 1, '#2a2230');
    }
    // cracks and soot
    for (let k = 0; k < 18; k++) {
      let x = 34 + Math.floor(hash(k, 1, 5) * (W - 68)), y = wallTop + 4 + Math.floor(hash(k, 2, 5) * 40);
      if (Math.abs(x - W / 2) < 20) continue;
      for (let s = 0; s < 5; s++) { p.set(x, y, '#1c1822'); x += hash(k, s, 6) < 0.5 ? 1 : 0; y++; }
    }
    p.fill(28, plY, W - 56, 4, (_i, j) => (j === 0 ? '#5d566d' : '#2e2a38'));
  },

  // -------------------------------------------------------------- Hot Potato arena
  stadium(b) {
    const { p, W, H, light } = b; void light;
    const cx = W / 2, cy = 24, rx = W / 2 - 2, ry = 38;
    // stands as concentric rings
    for (let y = cy - ry - 2; y < cy + ry; y++)
      for (let x = 2; x < W - 2; x++) {
        const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
        if (d > 1) continue;
        let c: string;
        if (d > 0.9) c = d > 0.96 ? '#b49b74' : '#d9c39a';
        else if (d > 0.38) {
          const ring = Math.floor((Math.sqrt(d) - 0.62) * 40);
          const seat = ring % 2 === 0;
          const ang = Math.atan2((y - cy) / ry, (x - cx) / rx);
          const block = Math.floor((ang + Math.PI) / (Math.PI / 8)) % 2;
          c = seat ? (block ? '#ff9a3d' : '#8a5bd6') : (block ? '#c8641a' : '#6340a3');
          if (hash(x, y, 4) < 0.12 && seat) c = ['#f5c9a3', '#3d2c4a', '#ffffff', '#e8576a'][Math.floor(hash(y, x, 5) * 4)];
          if (y > cy) c = shade(c, -0.6);
        } else if (d > 0.34) c = '#7a6a58';
        else {
          const g = hash(x >> 1, y >> 1, 8);
          c = (x + y) % 9 === 0 ? '#79c35e' : g < 0.5 ? '#5aa84a' : '#62b04f';
          if (Math.abs(x - cx) < 0.6) c = '#e9f5e0';
        }
        p.set(x, y, c);
      }
    // centre circle + the hot potato
    for (let a = 0; a < 40; a++) p.set(Math.round(cx + Math.cos(a / 40 * Math.PI * 2) * 7), Math.round(cy + Math.sin(a / 40 * Math.PI * 2) * 4), '#e9f5e0');
    p.fill(cx - 5, cy - 4, 11, 8, (i, j) => ((i - 5) ** 2 / 25 + (j - 4) ** 2 / 14 <= 1 ? (i < 4 && j < 3 ? '#e8b878' : j > 5 ? '#9c6a3a' : '#c98a4a') : null));
    p.set(cx - 2, cy, '#8a5a2e'); p.set(cx + 2, cy + 1, '#8a5a2e');
    for (const [fx, fy] of [[cx - 3, cy - 6], [cx, cy - 8], [cx + 3, cy - 6]]) { p.rect(fx, fy, 1, 3, '#ff8a3d'); p.set(fx, fy - 1, '#ffd27a'); }
    // pennants on the far rim
    const cols = ['#ff9a3d', '#8a5bd6', '#ff5d7a', '#ffd34d'];
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k + 0.5) * (Math.PI / 7);
      const x = Math.round(cx + Math.cos(a) * (rx - 2)), y = Math.round(cy + Math.sin(a) * (ry - 1));
      p.rect(x, y - 13, 1, 13, '#4b4a57');
      p.fill(x + 1, y - 13, 7, 5, (i, j) => (Math.abs(j - 2) <= 2 - i * 0.3 ? cols[k % 4] : null));
    }
    // front facade following the curve, two tiers of arches
    const wallH = 52;
    for (let x = 2; x < W - 2; x++) {
      const t = (x + 0.5 - cx) / rx;
      const topY = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - t * t))) - 2;
      const lit = 1 - (t + 1) / 2; // west side is lit
      const R = ramp(lit > 0.75 ? '#efdcb4' : lit > 0.45 ? '#e2cc9f' : lit > 0.2 ? '#cdb487' : '#b39b70');
      for (let j = 0; j < wallH; j++) {
        const y = topY + j;
        if (y >= H) break;
        const u = Math.round((Math.asin(clamp(t, -1, 1)) + Math.PI / 2) * 30); // arc length along the wall
        const tier = j < 4 ? -1 : j < 24 ? 0 : 1;
        let c = R.m;
        if (j < 2) c = R.h; else if (j < 4) c = R.d;
        else {
          const ai = u % 12, aj = tier === 0 ? j - 4 : j - 24;
          const archH = tier === 0 ? 17 : 22;
          const inArch = ai >= 3 && ai <= 9 && (aj >= 4 || (ai - 6) ** 2 + (aj - 4) ** 2 <= 9) && aj < archH;
          if (inArch) c = aj < 6 ? '#3a2f3c' : shade('#5a4a52', -lit);
          else if (aj === 0 || aj === archH + 1) c = R.d;
          else if (ai === 2 || ai === 10) c = R.l;
          if (j === 23 || j === 24) c = j === 23 ? R.h : R.d;
        }
        if (j >= wallH - 2) c = R.d2;
        p.set(x, y, c);
      }
    }
    // main gate and banner
    const gy = H - 26;
    p.fill(cx - 10, gy, 20, 26, (i, j) => (j >= 10 || (i - 9.5) ** 2 + (j - 10) ** 2 <= 100 ? (i === 0 || j === 0 ? '#8f7a58' : j > 22 ? '#2a2026' : '#3a2f3c') : null));
    p.fill(cx - 7, gy + 8, 14, 18, (i, j) => (i % 3 === 0 ? '#6e5a44' : j % 4 === 0 ? '#5a4836' : null));
    plank(p, cx, gy - 14, 'HOT POTATO', '#c8641a', '#fff7e6');
  },

  // -------------------------------------------------------------- Kana dojo
  dojo(b) {
    const { p, W, H, light } = b; void light;
    const wallTop = 48, wx = 8, ww = W - 16, deckY = H - 10;
    plaster('#f6efe0', 8)(p, wx, wallTop, ww, deckY - wallTop);
    // dark timber posts and beams
    const P = ramp('#5a3a2a');
    for (const x of [wx, wx + 30, W - wx - 34, W - wx - 4]) p.fill(x, wallTop, 4, deckY - wallTop, (i) => (i === 0 ? P.l : i === 3 ? P.d2 : P.m));
    p.fill(wx, wallTop + 6, ww, 3, (_i, j) => (j === 0 ? P.l : j === 2 ? P.d2 : P.m));
    wallLight(p, wx, wallTop, ww, deckY - wallTop, 5);
    // shoji screens
    for (const x of [wx + 7, W - wx - 27]) {
      p.fill(x, wallTop + 13, 20, 22, (i, j) => (i === 0 || j === 0 || i === 19 || j === 21 ? P.m : i % 5 === 0 || j % 5 === 0 ? '#8a6a52' : (i + j) % 13 === 0 ? '#f7f0dc' : '#ece2c8'));
      p.mul(x, wallTop + 35, 21, 1, 0.75);
    }
    // engawa deck
    const D = ramp('#8a5f3c');
    p.fill(2, deckY, W - 4, 10, (i, j) => (j === 0 ? D.h : j === 1 ? D.l : j > 7 ? D.d2 : i % 9 === 0 ? D.d : D.m));
    for (const x of [6, W - 10]) p.rect(x, deckY + 3, 3, 7, P.d2);
    // irimoya roof, swept up at the corners
    const RB = '#4d5568';
    hipRoof(p, 3, -8, W - 6, wallTop + 4 + 8, RB, { ridge: 6, hip: 22, tex: clay, fascia: '#2e2a38' });
    const R = ramp(RB);
    for (const side of [-1, 1]) {
      // eave tips curl up past the wall line
      for (let k = 0; k < 5; k++) p.rect(side < 0 ? 1 + Math.floor(k / 2) : W - 3 - Math.floor(k / 2), wallTop + 3 - k, 2, 1, k === 0 ? '#2e2a38' : k < 3 ? R.d : R.l);
    }
    // ridge ornaments
    for (const x of [26, W - 30]) p.fill(x, -16, 4, 8, (i, j) => (j < 2 && i > 1 ? null : i === 0 ? R.l : R.d));
    p.fill(26, -10, W - 52, 3, (_i, j) => (j === 0 ? R.h : R.d));
    // noren curtain over the door
    const dc = W / 2;
    p.rect(dc - 10, wallTop + 12, 20, 2, P.m);
    door(p, dc - 7, wallTop + 16, 14, deckY - wallTop - 16, '#3a2a22', { style: 'double', frame: '#5a3a2a', knob: '#3a2a22' });
    p.fill(dc - 9, wallTop + 14, 18, 12, (i, j) => (i === 9 && j > 2 ? null : j === 11 && i % 9 === 4 ? null : i === 0 ? '#3a4f8a' : i === 17 ? '#1f2c55' : '#2c3f72'));
    p.fill(dc - 3, wallTop + 16, 7, 7, (i, j) => ((i - 3) ** 2 + (j - 3) ** 2 <= 9 ? ((i - 3) ** 2 + (j - 3) ** 2 > 4 ? '#f6efe0' : '#e8463a') : null));
    // paper lanterns
    for (const lx of [wx + 22, W - wx - 22]) {
      p.rect(lx, wallTop + 2, 1, 4, '#2e2a38');
      p.fill(lx - 3, wallTop + 6, 7, 9, (i, j) => (j === 0 || j === 8 ? '#2e2a38' : ((i - 3) ** 2 / 12 + (j - 4) ** 2 / 20 <= 1 ? (i < 3 && j < 4 ? '#ff7a6a' : j % 3 === 0 ? '#b8323c' : '#e8463a') : null)));
    }
    plank(p, dc, -2, 'KANA', '#b8323c', '#fff7e6');
    steps(p, dc - 8, deckY + 4, 16, 3, '#9a9184');
  },

  // -------------------------------------------------------------- What2Eat diner
  diner(b) {
    const { p, W, H, light } = b; void light;
    const roofY = 22, wallTop = 40, wx = 3, ww = W - 6, plY = H - 4;
    // flat roof and parapet
    deck(p, 2, roofY, W - 4, wallTop - roofY, '#b4aaa0');
    p.fill(W - 26, roofY + 6, 10, 8, (i, j) => (j < 2 ? (i === 0 ? '#ffffff' : '#e3e6ea') : i % 2 ? '#8f96a3' : '#a3aab4'));
    // big neon sign on the roof
    for (const x of [24, W - 28]) p.rect(x, 6, 3, 18, '#5c5470');
    p.fill(8, -26, W - 16, 32, (i, j) => (i < 2 || j < 2 || i > W - 19 || j > 29 ? '#ff5d7a' : '#2a1838'));
    const name = 'WHAT2EAT';
    p.text(name, W / 2 - textW(name, 2) / 2 + 1, -14, '#7a1a3a', 2);
    p.text(name, W / 2 - textW(name, 2) / 2, -15, '#fff0f4', 2);
    // fork + spoon
    p.rect(16, -22, 1, 5, '#e8e8f0'); p.rect(14, -22, 1, 2, '#e8e8f0'); p.rect(18, -22, 1, 2, '#e8e8f0'); p.rect(14, -20, 5, 1, '#e8e8f0'); p.rect(16, -17, 1, 6, '#e8e8f0');
    p.fill(W - 20, -22, 4, 4, (i, j) => ((i - 1.5) ** 2 + (j - 1.5) ** 2 <= 3 ? '#e8e8f0' : null)); p.rect(W - 19, -18, 1, 7, '#e8e8f0');
    for (let x = 12; x < W - 12; x += 6) { light(x, -25, '#ffe14a'); light(x, 4, '#ffe14a'); }
    // walls: cream top, red stripe, ribbed chrome below
    plaster('#fff3df', 3)(p, wx, wallTop, ww, plY - wallTop);
    p.fill(wx, plY - 16, ww, 16, (i, j) => (j < 3 ? (j === 0 ? '#ff8095' : j === 2 ? '#a82a42' : '#e8465f') : j % 3 === 0 ? '#9aa4b0' : i % 12 === 0 ? '#c3cad6' : '#dfe4ea'));
    wallLight(p, wx, wallTop, ww, plY - wallTop, 3);
    // windows with booths inside
    const booths = (q: Pix, x: number, y: number, w: number, h: number) => {
      q.rect(x, y + h - 7, w, 7, '#7a2a3a');
      for (let i = 0; i < w; i += 8) { q.rect(x + i, y + h - 9, 2, 9, '#c8324a'); q.rect(x + i + 3, y + h - 6, 4, 2, '#f3e7d8'); }
      q.mul(x, y, w, 3, 0.8);
    };
    win(p, 8, wallTop + 10, 34, 18, { frame: '#dfe4ea', lit: true, mull: 'v', inner: booths });
    win(p, W - 42, wallTop + 10, 34, 18, { frame: '#dfe4ea', lit: true, mull: 'v', inner: booths });
    // striped awning: top face + scalloped front
    for (let x = 4, i = 0; x < W - 4; x += 6, i++) {
      const c = i % 2 ? '#e8465f' : '#fff6f0';
      p.fill(x, wallTop + 2, 6, 5, (u, v) => (v === 0 ? shade(c, 1) : u === 5 ? shade(c, -0.6) : c));
      p.fill(x, wallTop + 7, 6, 3, (u, v) => (v < 2 || (u > 0 && u < 5) ? shade(c, -0.4) : null));
    }
    p.mul(wx, wallTop + 10, ww, 2, 0.7);
    door(p, W / 2 - 8, wallTop + 22, 16, plY - wallTop - 22, '#3a4656', { style: 'glass', frame: '#dfe4ea' });
    p.fill(2, plY, W - 4, 4, (_i, j) => (j === 0 ? '#e9e2d6' : '#a39a8c'));
  },

  // -------------------------------------------------------------- FinSight bank
  bank(b) {
    const { p, W, H, light } = b; void light;
    const wallTop = 56, wx = 4, ww = W - 8, plY = H - 8;
    ashlar('#eef0f2', 7, 41)(p, wx, wallTop, ww, plY - wallTop);
    wallLight(p, wx, wallTop, ww, plY - wallTop);
    plinth(p, wx - 1, plY, ww + 2, 8, '#a8aeb8');
    hipRoof(p, 1, 0, W - 2, wallTop + 4, '#6b7484', { ridge: 4, hip: 20, tex: slate(43), fascia: '#ffffff' });
    // copper dome
    const cx = W / 2, dy = 4;
    for (let y = -26; y < dy; y++)
      for (let x = cx - 22; x <= cx + 22; x++) {
        const nx = (x + 0.5 - cx) / 21, ny = (y + 0.5 - dy) / 28;
        if (nx * nx + ny * ny > 1 || y > dy - 1) continue;
        const L = -nx * 0.7 - ny * 0.5;
        const rib = Math.abs(Math.round(nx * 4) - nx * 4) < 0.12;
        p.set(x, y, rib ? '#2f8f6a' : L > 0.6 ? '#9be0bf' : L > 0.25 ? '#6cc59c' : L > -0.1 ? '#47ab84' : '#2f8f6a');
      }
    p.fill(cx - 23, dy - 1, 47, 4, (_i, j) => (j === 0 ? '#ffffff' : j === 3 ? '#a8aeb8' : '#e3e6ea'));
    p.fill(cx - 2, -32, 5, 7, (i, j) => (j === 0 ? '#ffe68a' : i === 0 ? '#fff3a0' : i === 4 ? '#b8860b' : '#ffd34d'));
    // pediment with a gold coin
    frontGable(p, cx, wallTop + 2, 50, 16, 8, '#6b7484', slate(44), ashlar('#f6f7f8', 5, 45), '#ffffff');
    p.fill(cx - 6, wallTop - 11, 13, 11, (i, j) => { const d = (i - 6) ** 2 + (j - 5) ** 2; return d > 30 ? null : d > 20 ? '#b8860b' : i < 6 && j < 5 ? '#fff3a0' : '#ffd34d'; });
    p.text('S', cx - 1, wallTop - 8, '#8a5a12'); p.rect(cx, wallTop - 9, 1, 7, '#8a5a12');
    // frieze
    p.fill(wx - 1, wallTop + 2, ww + 2, 9, (_i, j) => (j === 0 ? '#ffffff' : j === 8 ? '#b9c0ca' : '#e3e6ea'));
    p.text('FINSIGHT', cx - 15, wallTop + 4, '#1f6b4e');
    for (const x of [10, 26, W - 32, W - 16]) { column(p, x, wallTop + 11, 6, plY - wallTop - 11, '#ffffff'); p.mul(x + 7, wallTop + 11, 3, plY - wallTop - 11, 0.8); }
    door(p, cx - 7, wallTop + 22, 14, plY - wallTop - 22, '#1f6b4e', { style: 'double', frame: '#ffd34d', knob: '#ffd34d' });
    p.fill(cx - 7, wallTop + 15, 14, 6, (i, j) => (j === 0 || i % 4 === 0 ? '#ffd34d' : GLASS.m));
    steps(p, 12, plY + 2, W - 24, 3, '#d6dbe2');
  },

  // -------------------------------------------------------------- GymTrack gym
  gym(b) {
    const { p, W, H } = b;
    const roofY = -2, wallTop = 30, wx = 3, ww = W - 6, plY = H - 4;
    // plain flat roof: a skylight, an HVAC unit and a couple of vent pipes
    deck(p, 2, roofY, W - 4, wallTop - roofY, '#5d6470');
    p.fill(12, roofY + 8, 30, 12, (i, j) => (i === 0 || j === 0 ? '#c6ecff' : i === 29 || j === 11 ? '#5d7a98' : (i - j * 2) % 14 < 2 ? GLASS.l : GLASS.d));
    p.rect(26, roofY + 8, 1, 12, '#5d7a98');
    p.mul(13, roofY + 20, 30, 2, 0.7);
    const A = ramp('#d5d9df');
    p.fill(W - 44, roofY + 7, 22, 5, (i) => (i === 0 ? A.h : A.l));
    p.fill(W - 44, roofY + 12, 22, 8, (i, j) => (j % 2 ? A.d : i === 21 ? A.d : A.m));
    p.fill(W - 40, roofY + 7, 7, 5, (i, j) => ((i - 3) ** 2 + (j - 2) ** 2 < 7 ? '#7d858f' : null));
    p.mul(W - 43, roofY + 20, 22, 2, 0.7);
    for (const vx of [W - 14, W - 18]) { p.fill(vx, roofY + 10, 3, 6, (i, j) => (j === 0 ? '#2a2e34' : i === 0 ? '#c3cad6' : '#8f96a3')); p.mul(vx + 1, roofY + 16, 3, 1, 0.7); }
    // charcoal facade band with a backlit sign: dumbbell logo + name
    const C = ramp('#3b4048');
    p.fill(wx, wallTop, ww, 18, (i, j) => (j === 17 ? C.d2 : i === 0 ? C.l : (i + j) % 31 === 0 ? C.d : C.m));
    p.mul(wx, wallTop, ww, 2, 0.6);
    const name = 'GYMTRACK', sw = textW(name, 1) + 22, sx = Math.round(W / 2 - sw / 2);
    p.fill(sx, wallTop + 4, sw, 11, (i, j) => (i === 0 || j === 0 ? '#5b6270' : i === sw - 1 || j === 10 ? '#1d2026' : '#2a2e34'));
    const R = ramp('#e8465f');
    const lx = sx + 4, ly = wallTop + 7;
    p.rect(lx + 2, ly + 2, 5, 1, '#c3cad6');
    for (const ox of [lx, lx + 7]) { p.fill(ox, ly, 2, 5, (i, j) => (j === 0 ? R.h : i ? R.d : R.m)); }
    p.text(name, sx + 15, wallTop + 7, '#ffffff');
    // floor-to-ceiling glass with the gym inside
    const gy = wallTop + 18, gh = plY - gy;
    p.fill(wx, gy, ww, gh, (_i, j) => (j < 3 ? '#cfe3f2' : j < 5 ? '#b7d0e4' : '#e9f3fa'));
    p.rect(wx, plY - 6, ww, 6, '#9aa7b5'); // rubber floor
    // treadmills on the west side
    for (let k = 0; k < 2; k++) {
      const tx = wx + 6 + k * 15;
      p.fill(tx, plY - 5, 12, 3, (i, j) => (j === 0 ? '#5b6270' : i === 11 ? '#1d2026' : '#2a2e34'));
      p.rect(tx + 10, plY - 16, 2, 11, '#2a2e34'); p.rect(tx + 7, plY - 16, 5, 2, '#3b4048'); p.rect(tx + 8, plY - 16, 2, 1, '#4af0ff');
      p.rect(tx + 4, plY - 15, 3, 7, '#3d4a6a'); p.rect(tx + 4, plY - 18, 3, 3, '#e8b48f'); p.rect(tx + 4, plY - 19, 3, 1, '#3d2c4a');
      p.rect(tx + 3, plY - 8, 2, 3, '#2a2e34'); p.rect(tx + 6, plY - 8, 2, 3, '#2a2e34');
    }
    // weights rack and a bench on the east side
    const rx = W - 44;
    p.fill(rx, plY - 20, 30, 15, (i, j) => (i === 0 || i === 29 ? '#3b4048' : j === 5 || j === 11 ? '#5b6270' : null));
    for (let k = 0; k < 5; k++) for (const ry of [plY - 18, plY - 12]) { p.rect(rx + 3 + k * 5, ry, 4, 3, k % 2 ? '#e8465f' : '#2a2e34'); p.rect(rx + 4 + k * 5, ry + 1, 2, 1, '#c3cad6'); }
    p.fill(W - 26, plY - 9, 14, 3, (_i, j) => (j === 0 ? '#e8465f' : '#a82a42'));
    p.rect(W - 24, plY - 6, 2, 3, '#2a2e34'); p.rect(W - 15, plY - 6, 2, 3, '#2a2e34');
    // mullions, reflections and pilasters
    for (let x = wx; x < wx + ww; x++) for (let j = 0; j < gh - 1; j++) if ((x - j * 1.4) % 40 > 30 && (x - j * 1.4) % 40 < 33) p.mul(x, gy + j, 1, 1, 1.25);
    for (const mx of [wx, wx + 36, W - 40, wx + ww - 3]) p.fill(mx, gy, 3, gh, (i) => (i === 0 ? C.l : i === 2 ? C.d2 : C.m));
    // entrance with a red canopy
    door(p, W / 2 - 9, gy + 8, 18, plY - gy - 8, '#2a2e34', { style: 'glass', frame: '#3b4048' });
    p.fill(W / 2 - 14, gy + 2, 28, 5, (i, j) => (j === 0 ? R.h : j === 4 ? R.d2 : i === 27 ? R.d : R.m));
    p.mul(W / 2 - 12, gy + 7, 26, 2, 0.7);
    p.mul(wx, gy, ww, 1, 0.6);
    wallLight(p, wx, wallTop, ww, plY - wallTop, 0);
    p.fill(2, plY, W - 4, 4, (_i, j) => (j === 0 ? '#c3c8cf' : '#7d858f'));
  },

  // -------------------------------------------------------------- project fair booth
  booth(b, bo) {
    const { p, W, H } = b;
    const o = bo!;
    const A = ramp(o.a), Bc = ramp(o.b), WD = ramp('#8a5a2e');
    // back board with the project poster
    p.fill(4, -12, W - 8, 32, (i, j) => (j === 0 ? WD.h : i === 0 ? WD.l : i === W - 9 ? WD.d : j % 6 === 5 ? WD.d : WD.m));
    p.fill(W / 2 - 12, -9, 24, 20, (i, j) => (i === 0 || j === 0 ? '#ffffff' : i === 23 || j === 19 ? '#c9c2b4' : '#fffaf0'));
    drawIcon(p, o.icon, W / 2 - 9, -6);
    p.rect(W / 2 - 8, 6, 16, 2, o.a);
    // posts
    for (const x of [3, W - 7]) column(p, x, 14, 4, H - 26, '#7a5232', false);
    // awning: sloped top in stripes, then a scalloped valance
    for (let x = 1, i = 0; x < W - 1; x += 6, i++) {
      const R = i % 2 ? A : Bc;
      p.fill(x, 12, Math.min(6, W - 1 - x), 10, (u, v) => (v === 0 ? R.h : v < 3 ? R.l : u === 5 ? R.d : R.m));
      p.fill(x, 22, 6, 4, (u, v) => (v < 2 || (u > 0 && u < 5 && v < 3) || (u > 1 && u < 4) ? (v === 0 ? R.d : R.m) : null));
    }
    p.mul(5, 26, W - 10, 3, 0.7);
    // counter with things on it
    const C = ramp('#b0804a');
    p.fill(1, H - 17, W - 2, 4, (i, j) => (j === 0 ? C.h : j === 3 ? C.d : i === 0 ? C.l : C.l));
    p.fill(2, H - 13, W - 4, 12, (i, j) => (j === 0 ? C.d2 : i % 8 === 0 ? C.d : i === W - 5 ? C.d : C.m));
    p.fill(W / 2 - 9, H - 10, 18, 5, (i, j) => (j === 0 ? A.l : i === 0 ? A.l : A.m));
    // a laptop and a stack of flyers
    p.fill(10, H - 25, 12, 8, (i, j) => (i === 0 || j === 0 || i === 11 ? '#3a3a4a' : j < 3 ? shade(o.a, 1) : o.a));
    p.rect(8, H - 18, 16, 2, '#8a8d98');
    p.fill(W - 20, H - 20, 10, 3, (_i, j) => (j === 0 ? '#ffffff' : '#d8d4cc'));
    p.mul(1, H - 1, W - 2, 1, 0.75);
  },
};

// Booth poster icons (16x9 string maps).
function drawIcon(p: Pix, icon: string, x: number, y: number) {
  const maps: Record<string, { rows: string[]; pal: Record<string, string> }> = {
    mask: { rows: ['....kkkkkkkk....', '...kwwwwwwwwk...', '..kwwwwwwwwwwk..', '..kwkkwwwwkkwk..', '..kwkkwwwwkkwk..', '..kwwwwwwwwwwk..', '...kwwwkkwwwk...', '....kwwwwwwk....', '.....kkkkkk.....'], pal: { k: OUT, w: '#9a5ac9' } },
    tower: { rows: ['...k.k.k.k......', '...kkkkkkk......', '....kgggk.......', '....kgkgk..r....', '....kgggk.rrr...', '....kgggk..r....', '...kkgggkk......', '..kgggggggk.....', '..kkkkkkkkk.....'], pal: { k: OUT, g: '#8a8d98', r: '#e8576a' } },
    vr: { rows: ['................', '..kkkkkkkkkkkk..', '.kbbbbbbbbbbbbk.', '.kbwwwbbbbwwwbk.', '.kbwwwbkkbwwwbk.', '.kbbbbk..kbbbbk.', '..kkkk....kkkk..', '................', '................'], pal: { k: OUT, b: '#4a7fc9', w: '#bfe9ff' } },
    cat: { rows: ['..k.........k...', '..kok.....kok...', '..koooooooook...', '..kooeoooeook...', '..koooonooook...', '..koooooooook...', '...koooooook....', '....kkkkkkk.....', '................'], pal: { k: OUT, o: '#f2a65a', e: OUT, n: '#f59ab0' } },
    phone: { rows: ['.....kkkkkkk....', '.....kwwwwwk....', '.....kwgggwk....', '.....kwgwgwk....', '.....kwgggwk....', '.....kwwwwwk....', '.....kwwkwwk....', '.....kkkkkkk....', '................'], pal: { k: OUT, w: '#e8e8f0', g: '#5fd08a' } },
    chart: { rows: ['...k............', '...k.......rr...', '...k.......rr...', '...k..rr...rr...', '...k..rr...rr...', '...k..rr.g.rr...', '...k..rr.g.rr...', '...kkkkkkkkkkk..', '................'], pal: { k: OUT, r: '#e8463a', g: '#2bb3a6' } },
    shoe: { rows: ['................', '....kkk.........', '....kwwk........', '....kwwwkk......', '....kwsswwkkk...', '...kwwwssswwwk..', '...kkkkkkkkkkk..', '................', '................'], pal: { k: OUT, w: '#ffffff', s: '#e8576a' } },
  };
  const m = maps[icon];
  if (m) p.sprite(m.rows, m.pal, x + 1, y);
}
