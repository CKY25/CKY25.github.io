// Print pieces built from the game's own art: a business card (front and
// back) and an A4 booth sign. Backgrounds are pixel scenes painted at a fixed
// physical pixel size and upscaled without smoothing, so they stay crisp in a
// PDF or at 300 dpi. Text and the QR code stay vector on top.
import QRCode from 'qrcode';
import { makeHero, makeCat, makeTree, makePine, makeBush, makeLamp, makeRock } from './art';
import { makeBuilding } from './buildings';
import { Pix, hash, canvas } from './pix';
import { PROFILE } from './data';

// Always the live site, so a card printed from localhost still points
// somewhere recruiters can open. `?url=` overrides it.
export const SITE = new URLSearchParams(location.search).get('url') ?? 'https://cky25.github.io/';
export const SITE_LABEL = SITE.replace(/^https?:\/\//, '').replace(/\/$/, '');

// Malaysian standard card, 90 x 54 mm, with 3 mm bleed on every side.
export const CARD = { w: 90, h: 54, bleed: 3, safe: 4 };

const UP = 10; // upscale factor for the embedded scene images

// ------------------------------------------------------------------ pixel scene
type Prop = { img: HTMLCanvasElement; x: number; y: number; shadow?: boolean };
interface Scene {
  w: number; h: number; seed: number;
  ground: number; // y of the grass line
  path?: [number, number]; // y range of a dirt path along the ground
  soil?: number; // below this y the ground is a dark soil cross-section
  hills?: number; // y of the far hill line
  moon?: [number, number, number];
  quiet?: [number, number, number, number][]; // boxes kept free of stars (behind text)
  glows?: [number, number, number][];
  props: Prop[];
}

const SKY = ['#110f24', '#15122c', '#1a1634', '#201b3e', '#272048', '#302553', '#3c2b5c', '#4b3163'];
const GRASS = ['#4f9a3f', '#5aa846', '#64b14c', '#6fbb53'];
const DIRT = ['#b8925c', '#c9a56c', '#d5b278', '#dfbe85'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

function paintScene(s: Scene) {
  const { w, h, seed } = s;
  const p = new Pix(w, h, 0);
  const horizon = s.hills ?? s.ground;
  const inQuiet = (x: number, y: number) => s.quiet?.some(([qx, qy, qw, qh]) => x >= qx && x < qx + qw && y >= qy && y < qy + qh);

  // banded, dithered dusk sky
  for (let y = 0; y < s.ground; y++) {
    const t = Math.min(1, y / horizon) * (SKY.length - 1);
    for (let x = 0; x < w; x++) p.set(x, y, SKY[Math.min(SKY.length - 1, Math.floor(t + dith(x, y) - 0.5 + 0.5))]);
  }
  // stars: mostly single pixels, a few four-point sparkles
  for (let y = 1; y < horizon - 6; y++)
    for (let x = 1; x < w - 1; x++) {
      const r = hash(x, y, seed);
      const fade = 1 - y / horizon;
      if (r > 0.0075 * fade || inQuiet(x, y)) continue;
      const big = hash(x, y, seed + 1) < 0.12;
      const c = hash(x, y, seed + 2) < 0.3 ? '#ffe9a8' : '#e6e0ff';
      if (big && x > 2 && y > 2) {
        p.set(x, y, '#ffffff');
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(x + dx, y + dy, c);
      } else p.set(x, y, hash(x, y, seed + 3) < 0.5 ? c : '#8f86c4');
    }
  if (s.moon) {
    const [mx, my, mr] = s.moon;
    for (let y = -mr - 2; y <= mr + 2; y++)
      for (let x = -mr - 2; x <= mr + 2; x++) {
        const d = Math.hypot(x + 0.5, y + 0.5);
        const bite = Math.hypot(x + 0.5 - mr * 0.55, y + 0.5 + mr * 0.25);
        if (d <= mr && bite > mr * 0.8) {
          const lit = (-x - y) / (mr * 2);
          p.set(mx + x, my + y, bite < mr * 0.95 ? '#e8c879' : lit > 0.15 ? '#fff6d6' : '#ffe9a8');
        } else if (d <= mr + 2 && d > mr && bite > mr * 0.8 && dith(mx + x, my + y) < 0.35) p.mul(mx + x, my + y, 1, 1, 1.18);
      }
  }
  // far hills and a nearer tree line
  if (s.hills !== undefined) {
    const H = s.hills;
    for (let x = 0; x < w; x++) {
      const a = H - 4 - Math.round(5 * Math.sin((x + seed * 13) / 23) + 3 * Math.sin((x + seed * 7) / 9.5));
      for (let y = a; y < s.ground; y++) p.set(x, y, y === a ? '#3e3470' : '#2e2958');
      let b = H + 3 - Math.round(2.5 * Math.abs(Math.sin((x + seed) / 3.3)) + 2 * Math.sin((x + seed * 3) / 11));
      b = Math.min(b, s.ground - 1);
      for (let y = b; y < s.ground; y++) p.set(x, y, y === b ? '#2b4a52' : '#203643');
    }
  }
  // ground: grass with a lit top edge, an optional path, optional soil
  for (let y = s.ground; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = hash(x >> 1, y >> 1, seed + 9) * 0.6 + hash(x >> 3, y >> 2, seed + 10) * 0.4;
      let c = GRASS[Math.max(0, Math.min(3, Math.floor(n * 3.4 + dith(x, y) - 0.4)))];
      if (y === s.ground) c = '#88c95e';
      else if (y === s.ground + 1) c = hash(x, 1, seed) < 0.5 ? '#7ac55a' : c;
      if (s.path && y >= s.path[0] - 1 && y <= s.path[1] + 1) {
        const wob0 = s.path[0] + (hash(x >> 1, 7, seed) < 0.35 ? 1 : 0), wob1 = s.path[1] - (hash(x >> 1, 8, seed) < 0.35 ? 1 : 0);
        if (y >= wob0 && y <= wob1) {
          c = DIRT[Math.max(0, Math.min(3, Math.floor(n * 3.2 + dith(x, y) - 0.3)))];
          if (y === wob0) c = '#9a7848';
          if (hash(x, y, seed + 11) < 0.04) c = hash(x, y, seed + 12) < 0.5 ? '#e8cb94' : '#8f7a62';
        } else if (y === wob0 - 1) c = '#4f9a3f';
      }
      if (s.soil !== undefined && y >= s.soil) {
        const d = y - s.soil;
        const SOIL = ['#4a3324', '#3d2a20', '#31221d', '#26192a', '#1d1424', '#171021'];
        c = SOIL[Math.min(SOIL.length - 1, Math.floor(d / 5 + dith(x, y) * 0.9))];
        if (d === 0) c = '#5e4228';
        const st = hash(x >> 2, y >> 2, seed + 13);
        if (d > 2 && st < 0.05) c = d < 14 ? '#6b5a52' : '#3a2e3e';
      }
      p.set(x, y, c);
    }
  // grass blades poking above the line, flowers in the grass
  for (let x = 0; x < w; x++) {
    const r = hash(x, 3, seed);
    if (r < 0.28) p.set(x, s.ground - 1, r < 0.1 ? '#6fbb53' : '#88c95e');
    if (r < 0.05) p.set(x, s.ground - 2, '#88c95e');
  }
  const bottom = s.soil ?? h;
  for (let y = s.ground + 3; y < bottom - 1; y++)
    for (let x = 0; x < w; x++) {
      if (s.path && y >= s.path[0] - 2 && y <= s.path[1] + 2) continue;
      const r = hash(x, y, seed + 20);
      if (r < 0.012) { p.set(x, y, '#3f8a3a'); p.set(x - 1, y - 1, '#4f9a3f'); p.set(x + 1, y - 1, '#4f9a3f'); }
      else if (r < 0.016) { const c = r < 0.0135 ? '#ffd34d' : r < 0.015 ? '#ff8fb0' : '#ffffff'; p.set(x, y, c); p.set(x, y + 1, '#3f8a3a'); }
    }

  const [c, ctx] = canvas(w, h);
  ctx.drawImage(p.canvas(), 0, 0);
  // props, back to front, each with a soft contact shadow
  for (const pr of [...s.props].sort((a, b) => a.y - b.y)) {
    const x = Math.round(pr.x - pr.img.width / 2), y = Math.round(pr.y - pr.img.height);
    if (pr.shadow !== false) {
      const sw = Math.max(4, Math.round(pr.img.width * 0.62));
      ctx.fillStyle = 'rgba(16,14,40,.32)';
      ctx.fillRect(Math.round(pr.x - sw / 2), Math.round(pr.y) - 1, sw, 2);
      ctx.fillRect(Math.round(pr.x - sw / 2) + 2, Math.round(pr.y) + 1, sw - 4, 1);
    }
    ctx.drawImage(pr.img, x, y);
  }
  // warm light pools from lamps, in dithered rings
  if (s.glows?.length) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (const [gx, gy, gr] of s.glows)
      for (let y = Math.max(0, gy - gr); y < Math.min(h, gy + gr); y++)
        for (let x = Math.max(0, gx - gr); x < Math.min(w, gx + gr); x++) {
          const t = 1 - Math.hypot(x - gx, (y - gy) * 1.1) / gr;
          if (t <= 0) continue;
          const v = t + dith(x, y) * 0.18, k = v > 0.7 ? 0.22 : v > 0.42 ? 0.11 : v > 0.2 ? 0.045 : 0;
          const i = (y * w + x) * 4;
          d[i] += (255 - d[i]) * k; d[i + 1] += (214 - d[i + 1]) * k; d[i + 2] += (140 - d[i + 2]) * k * 0.6;
        }
    ctx.putImageData(img, 0, 0);
  }
  return c;
}

function upscale(src: HTMLCanvasElement, k = UP) {
  const [c, ctx] = canvas(src.width * k, src.height * k);
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

// ------------------------------------------------------------------ sprites
const COIN = ['..kkkk..', '.kyhyyk.', 'kyhyyydk', 'kyhyyydk', 'kyhyyydk', 'kyyyyddk', '.kyddyk.', '..kkkk..'];
function sprite(rows: string[], pal: Record<string, string>) {
  const p = new Pix(rows[0].length, rows.length, 0);
  p.sprite(rows, pal, 0, 0);
  return p.canvas();
}
const coin = () => sprite(COIN, { k: '#7a4e0c', y: '#ffd34d', h: '#fff3a0', d: '#e0a92a' });

/** A wooden signboard with a white panel `iw` x `ih`, standing on two posts. */
function board(iw: number, ih: number, post: number, f = 4) {
  const W = iw + f * 2, H = ih + f * 2;
  const p = new Pix(W, H + post, 0);
  const pw = Math.max(3, f);
  for (const px of [Math.round(W * 0.2), Math.round(W * 0.8) - pw])
    p.fill(px, H - 2, pw, post + 2, (i, j) => (i === 0 ? '#9a6a3a' : i === pw - 1 ? '#4e3220' : j % 9 === 4 ? '#5e3e26' : '#6e4628'));
  p.fill(0, 0, W, H, (i, j) => {
    const edge = Math.min(i, j, W - 1 - i, H - 1 - j);
    if (edge >= f) return '#ffffff';
    if (edge === f - 1) return j === f - 1 || i === f - 1 ? '#4e3220' : '#d9a466'; // inner bevel
    const top = j < f, left = i < f, right = i >= W - f;
    const base = top ? '#d9a466' : left ? '#c08a52' : right ? '#8a5a2e' : '#9a6a3a';
    return hash(top || j >= H - f ? i >> 3 : j >> 3, edge, 5) < 0.25 ? '#a8743f' : base;
  });
  for (const [x, y] of [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]]) p.set(x, y, '#ffe9a3');
  p.outline('#2a1d18');
  return p.canvas();
}

// ------------------------------------------------------------------ vector bits
async function qrSvg(margin: number) {
  return QRCode.toString(SITE, { type: 'svg', margin, errorCorrectionLevel: 'M', color: { dark: '#1d1a2b', light: '#ffffff' } });
}

const ICONS: Record<string, string[]> = {
  mail: ['xxxxxxx', 'xx...xx', 'x.x.x.x', 'x..x..x', 'xxxxxxx'],
  code: ['..x...x.x..', '.x...x...x.', 'x....x....x', '.x...x...x.', '..x.x...x..'],
  play: ['x....', 'xxx..', 'xxxxx', 'xxx..', 'x....'],
  down: ['xxxxxxx', '.xxxxx.', '..xxx..', '...x...'],
};
function icon(name: string, color = '#ffd34d') {
  const rows = ICONS[name];
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; }));
  return `<svg class="ico" viewBox="0 0 ${rows[0].length} ${rows.length}" fill="${color}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

function el(html: string) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

// ------------------------------------------------------------------ business card
// One art pixel is 1/60 inch, so at 300 dpi every art pixel is exactly 5 px.
const CU = 25.4 / 60;
const cw = Math.ceil((CARD.w + CARD.bleed * 2) / CU), ch = Math.ceil((CARD.h + CARD.bleed * 2) / CU);
const mm = (px: number) => `${(px * CU).toFixed(3)}mm`;

let cache: { front: string; back: string; qr: string } | null = null;
async function cardArt() {
  if (cache) return cache;
  const hero = makeHero(), cat = makeCat();
  const front = paintScene({
    w: cw, h: ch, seed: 3, ground: 114, hills: 106, path: [123, 130], moon: [198, 28, 7],
    quiet: [[0, 0, 150, 90]],
    glows: [[146, 97, 22]],
    props: [
      { img: makePine(4), x: 222, y: 117 },
      { img: makeTree(11), x: 203, y: 120 },
      { img: makeTree(21, true), x: 178, y: 116 },
      { img: makeBush(5, true), x: 190, y: 123 },
      { img: makeLamp(), x: 146, y: 124 },
      { img: makeBush(8), x: 14, y: 121 },
      { img: makeRock(2), x: 118, y: 120 },
      { img: hero.right[1], x: 84, y: 128 },
      { img: cat.right[0], x: 60, y: 128 },
      { img: coin(), x: 106, y: 120, shadow: false },
    ],
  });
  const back = paintScene({
    w: cw, h: ch, seed: 8, ground: 118, hills: 110,
    quiet: [[96, 14, 125, 90], [14, 18, 82, 92]],
    props: [
      { img: board(64, 64, 26), x: 54, y: 124 },
      { img: makeBush(3), x: 16, y: 124 },
      { img: makeBush(9, true), x: 96, y: 125 },
      { img: makeTree(14), x: 214, y: 121 },
      { img: makeRock(6), x: 196, y: 126 },
      { img: makeCat().left[1], x: 150, y: 129 },
    ],
  });
  cache = { front: upscale(front), back: upscale(back), qr: await qrSvg(3) };
  return cache;
}

function cardShell(side: 'front' | 'back', bg: string, inner: string) {
  return el(`<div class="bc bc-${side}">
    <img class="bc-bg" alt="" src="${bg}" style="width:${mm(cw)};height:${mm(ch)}" />
    ${inner}
    <div class="guides" aria-hidden="true"><i class="trim"></i><i class="safe"></i></div>
  </div>`);
}

export async function cardFront() {
  const a = await cardArt();
  const email = PROFILE.email, gh = PROFILE.github.replace(/^https?:\/\//, ''), itch = PROFILE.itch.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return cardShell('front', a.front, `
    <div class="bc-id">
      <h1 class="bc-name">Cheong Khe Yang</h1>
      <p class="bc-role">Junior Unity Game Developer</p>
      <p class="bc-tag">I build games, and the tools that build them.</p>
    </div>
    <ul class="bc-contact">
      <li>${icon('mail')}<span>${email}</span></li>
      <li>${icon('code')}<span>${gh}</span></li>
      <li>${icon('play')}<span>${itch}</span></li>
    </ul>`);
}

export async function cardBack() {
  const a = await cardArt();
  const back = cardShell('back', a.back, `
    <div class="bc-qr" style="left:${mm(22)};top:${mm(30)};width:${mm(64)};height:${mm(64)}">${a.qr}</div>
    <div class="bc-cta">
      <p class="bc-kicker">Interactive portfolio</p>
      <h2 class="bc-scan">Scan to play</h2>
      <p class="bc-desc">Walk around a pixel-art world of my games, or tap Quick View for the highlights.</p>
      <p class="bc-url">${icon('play', '#ff6f91')}<span>${SITE_LABEL}</span></p>
    </div>`);
  return back;
}

// ------------------------------------------------------------------ A4 booth sign
// One art pixel is 1/40 inch here, so buildings read from across a table.
const PU = 25.4 / 40;
const pw = Math.ceil(210 / PU), ph = Math.ceil(297 / PU);
const pmm = (px: number) => `${(px * PU).toFixed(3)}mm`;

export async function boothSign() {
  const hero = makeHero(), cat = makeCat();
  const home = makeBuilding('home', 8, 6, 1).img, dojo = makeBuilding('dojo', 7, 6, 2).img;
  const G = 392, BW = 150;
  const scene = paintScene({
    w: pw, h: ph, seed: 12, ground: G, hills: 372, path: [404, 414], soil: 424, moon: [292, 34, 9],
    quiet: [[0, 12, pw, 120]],
    glows: [[40, 379, 30], [292, 379, 30]],
    props: [
      { img: home, x: 34, y: G + 2 },
      { img: dojo, x: 300, y: G + 2 },
      { img: makeTree(31), x: 98, y: G + 4 },
      { img: makePine(7), x: 236, y: G + 3 },
      { img: board(BW, BW, 52, 6), x: pw / 2, y: G + 8 },
      { img: makeLamp(), x: 40, y: G + 14 },
      { img: makeLamp(), x: 292, y: G + 14 },
      { img: makeBush(4, true), x: 112, y: G + 12 },
      { img: makeBush(12), x: 220, y: G + 12 },
      { img: hero.right[1], x: 128, y: G + 20 },
      { img: cat.right[0], x: 104, y: G + 20 },
      { img: coin(), x: 196, y: G + 12, shadow: false },
    ],
  });
  const boardTop = G + 8 - 52 - (BW + 12), boardLeft = Math.round(pw / 2 - (BW + 12) / 2);
  const qr = await qrSvg(3);
  return el(`<div class="sign">
    <img class="bc-bg" alt="" src="${upscale(scene, 6)}" style="width:${pmm(pw)};height:${pmm(ph)}" />
    <div class="sign-head">
      <p class="sign-kicker">Interactive portfolio</p>
      <h1 class="sign-name">Cheong<br />Khe Yang</h1>
      <p class="sign-role">Junior Unity Game Developer</p>
    </div>
    <p class="sign-scan" style="top:${pmm(boardTop - 20)}">${icon('down', '#ff6f91')}<span>Scan to play my portfolio</span>${icon('down', '#ff6f91')}</p>
    <div class="sign-qr" style="left:${pmm(boardLeft + 6)};top:${pmm(boardTop + 6)};width:${pmm(BW)};height:${pmm(BW)}">${qr}</div>
    <div class="sign-foot" style="top:${pmm(426)}">
      <p class="sign-url">${icon('play', '#ff6f91')}<span>${SITE_LABEL}</span></p>
      <p class="sign-contact">${PROFILE.email} · ${PROFILE.github.replace(/^https?:\/\//, '')} · ${PROFILE.itch.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
    </div>
  </div>`);
}
