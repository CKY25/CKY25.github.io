// Shared pixel-art toolkit: seeded randomness, hue-shifted colour ramps and a
// tiny pixel buffer that can shade, light and outline what is drawn into it.

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

// ------------------------------------------------------------------ colour
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function fromHsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Hue-shifted shade: k < 0 darkens towards blue-violet, k > 0 lightens towards warm yellow. */
export function shade(hex: string, k: number) {
  const [h0, s0, l0] = toHsl(hex);
  const target = k < 0 ? 250 : 48;
  let h = target;
  if (s0 >= 0.08) {
    const dh = ((target - h0 + 540) % 360) - 180;
    h = h0 + Math.sign(dh) * Math.min(Math.abs(dh), 7 * Math.abs(k));
  }
  const l = clamp(l0 + k * 0.085, 0.03, 0.97);
  const s = clamp(k < 0 ? s0 + 0.04 * -k + (s0 < 0.08 ? 0.05 : 0) : s0 - 0.03 * k, 0, 1);
  return fromHsl((h + 360) % 360, s, l);
}

export interface Ramp { o: string; d2: string; d: string; m: string; l: string; h: string }
const ramps = new Map<string, Ramp>();
export const ramp = (m: string): Ramp => {
  let r = ramps.get(m);
  if (!r) ramps.set(m, (r = { o: shade(m, -4.4), d2: shade(m, -2), d: shade(m, -1), m, l: shade(m, 1), h: shade(m, 2) }));
  return r;
};
/** Ramps for the four faces of a roof: west (lit), south (front), east (shade), north (back). */
export const faceRamps = (base: string) => [ramp(shade(base, 0.8)), ramp(base), ramp(shade(base, -1.1)), ramp(shade(base, -0.5))];


export const hash = (a: number, b: number, s = 0) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ------------------------------------------------------------------ pixel buffer
const packed = new Map<string, number>();
function pack(c: string) {
  let v = packed.get(c);
  if (v === undefined) {
    const n = parseInt(c.slice(1), 16);
    v = ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
    packed.set(c, v);
  }
  return v;
}

export type Col = string | null | undefined | false;

// 3x5 pixel font for signs
const FONT: Record<string, string> = {
  A: '.x.x.xxxxx.xx.x', B: 'xx.x.xxx.x.xxx.', C: '.xxx..x..x...xx', D: 'xx.x.xx.xx.xxx.', E: 'xxxx..xx.x..xxx',
  F: 'xxxx..xx.x..x..', G: '.xxx..x.xx.x.xx', H: 'x.xx.xxxxx.xx.x', I: 'xxx.x..x..x.xxx', J: '..x..x..xx.x.x.',
  K: 'x.xx.xxx.x.xx.x', L: 'x..x..x..x..xxx', M: 'x.xxxxxxxx.xx.x', N: 'xx.x.xx.xx.xx.x', O: '.x.x.xx.xx.x.x.',
  P: 'xx.x.xxx.x..x..', Q: '.x.x.xx.xxx..xx', R: 'xx.x.xxx.x.xx.x', S: '.xxx...x...xxx.', T: 'xxx.x..x..x..x.',
  U: 'x.xx.xx.xx.xxxx', V: 'x.xx.xx.xx.x.x.', W: 'x.xx.xxxxxxxx.x', X: 'x.xx.x.x.x.xx.x', Y: 'x.xx.x.x..x..x.',
  Z: 'xxx..x.x.x..xxx', '0': 'xxxx.xx.xx.xxxx', '1': '.x.xx..x..x.xxx', '2': '.x.x.x..x.x.xxx', '3': 'xxx..x.xx..xxxx',
  '4': 'x.xx.xxxx..x..x', '5': 'xxxx..xxx..xxxx', '6': 'xxxx..xxxx.xxxx', '7': 'xxx..x.x..x..x.', '8': 'xxxx.xxxxx.xxxx',
  '9': 'xxxx.xxxx..xxxx', ' ': '...............', '.': '............x..', '-': '......xxx......', '!': '.x..x..x.....x.',
  '&': '.x.x.x.x.x.x.xx', ':': '....x.....x....', "'": '.x..x..........',
};
export const textW = (s: string, scale = 1) => s.length * 4 * scale - scale;

export class Pix {
  d: Uint32Array;
  constructor(readonly w: number, readonly h: number, readonly oy: number) { this.d = new Uint32Array(w * h); }
  private i(x: number, y: number) {
    x = Math.floor(x); y = Math.floor(y) + this.oy;
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x;
  }
  set(x: number, y: number, c: Col) { if (!c) return; const i = this.i(x, y); if (i >= 0) this.d[i] = pack(c); }
  has(x: number, y: number) { const i = this.i(x, y); return i >= 0 && this.d[i] !== 0; }
  rect(x: number, y: number, w: number, h: number, c: Col) { if (c) for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) this.set(x + k, y + j, c); }
  /** Fill a box; `f` gets local coordinates. */
  fill(x: number, y: number, w: number, h: number, f: (i: number, j: number) => Col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, f(i, j)); }
  /** Darken (f < 1) or lighten (f > 1) whatever is already there. Shadows lean blue. */
  mul(x: number, y: number, w: number, h: number, f: number) {
    for (let j = 0; j < h; j++)
      for (let k = 0; k < w; k++) {
        const i = this.i(x + k, y + j);
        if (i < 0 || !this.d[i]) continue;
        const v = this.d[i];
        let r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
        if (f < 1) { r *= f; g *= f; b *= f + (1 - f) * 0.4; }
        else { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t * 0.95; b += (255 - b) * t * 0.7; }
        this.d[i] = ((255 << 24) | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255)) >>> 0;
      }
  }
  /** 1 px outline around everything drawn so far. */
  outline(c: string) {
    const add: number[] = [], { w, h, d } = this;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (d[i]) continue;
        if ((x > 0 && d[i - 1]) || (x < w - 1 && d[i + 1]) || (y > 0 && d[i - w]) || (y < h - 1 && d[i + w])) add.push(i);
      }
    const v = pack(c);
    for (const i of add) d[i] = v;
  }
  sprite(rows: string[], pal: Record<string, string>, x: number, y: number) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) this.set(x + i, y + j, pal[row[i]]); });
  }
  text(s: string, x: number, y: number, c: string, scale = 1) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT[' '];
      for (let i = 0; i < 15; i++) if (g[i] === 'x') this.rect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale, c);
      cx += 4 * scale;
    }
  }
  canvas() {
    const [c, ctx] = canvas(this.w, this.h);
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.d);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}
