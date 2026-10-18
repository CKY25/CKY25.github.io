import * as A from './art';
import { T } from './art';
import { World, ZONES, SIGNS, SPAWN, MW, MH, doorTile, type Zone, type Sign, type Particle, type Obj } from './world';
import { sfx } from './audio';
import { progress } from './progress';

export interface GameEvents {
  enterZone(z: Zone): void;
  sign(s: Sign): void;
  petCat(): void;
  coin(found: number, total: number): void;
}

interface Vec { x: number; y: number }

const SPEED = 84; // px / s
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Game {
  world = new World();
  cvs: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = 1;
  zoom = 3;
  view = { w: 0, h: 0 };
  cam = { x: 0, y: 0 };
  hero = A.makeHero();
  catArt = A.makeCat();
  player = { x: SPAWN.x * T + 8, y: SPAWN.y * T + 12, dir: 'up' as A.Dir, moving: false, anim: 0, path: [] as Vec[], fast: false, onDoor: -1, pendingSign: null as Sign | null, pendingCat: false };
  cat = { x: SPAWN.x * T - 10, y: SPAWN.y * T + 14, dir: 'right' as 'left' | 'right', anim: 0, moving: false };
  trail: Vec[] = [];
  particles: Particle[] = [];
  keys = new Set<string>();
  time = 0;
  paused = true;
  attract = true;
  marker: { x: number; y: number; t: number } | null = null;
  hoverZone: Zone | null = null;
  touch = matchMedia('(pointer: coarse)').matches;
  holding: { id: number; x: number; y: number; last: number } | null = null;
  nearby: { kind: 'sign'; sign: Sign } | { kind: 'cat' } | null = null;
  stepTimer = 0;
  idle = 0;
  private last = 0;

  constructor(cvs: HTMLCanvasElement, private ev: GameEvents) {
    this.cvs = cvs;
    this.ctx = cvs.getContext('2d')!;
    for (const c of this.world.coins) if (progress.coins.has(c.i)) c.taken = true;
    this.resize();
    addEventListener('resize', () => this.resize());
    this.bindInput();
    this.cam.x = this.player.x - this.view.w / 2;
    this.cam.y = this.player.y - this.view.h / 2;
    requestAnimationFrame((t) => this.frame(t));
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.dpr = Math.min(devicePixelRatio || 1, 3);
    this.cvs.width = Math.round(w * this.dpr);
    this.cvs.height = Math.round(h * this.dpr);
    this.cvs.style.width = w + 'px';
    this.cvs.style.height = h + 'px';
    const tilesAcross = w < 640 ? 11 : w < 1100 ? 17 : 23;
    let zoom = Math.max(1, Math.round(this.cvs.width / (tilesAcross * T)));
    while (zoom > 1 && this.cvs.height / (zoom * T) < 9) zoom--;
    this.zoom = zoom;
    this.view.w = this.cvs.width / zoom;
    this.view.h = this.cvs.height / zoom;
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---------------------------------------------------------------- input
  private bindInput() {
    addEventListener('keydown', (e) => {
      if (this.paused) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === 'e' || k === 'enter' || k === ' ') { this.interact(); return; }
      this.keys.add(k);
      this.player.path = []; this.player.fast = false;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    const toWorld = (e: PointerEvent) => ({ x: this.cam.x + (e.clientX * this.dpr) / this.zoom, y: this.cam.y + (e.clientY * this.dpr) / this.zoom });
    this.cvs.addEventListener('pointerdown', (e) => {
      if (this.paused) return;
      const w = toWorld(e);
      this.holding = { id: e.pointerId, x: w.x, y: w.y, last: this.time };
      this.tapAt(w.x, w.y);
    });
    this.cvs.addEventListener('pointermove', (e) => {
      const w = toWorld(e);
      if (this.holding && this.holding.id === e.pointerId) { this.holding.x = w.x; this.holding.y = w.y; }
      const z = this.zoneAt(w.x, w.y);
      this.hoverZone = z;
      this.cvs.style.cursor = z || this.signAt(w.x, w.y) || this.isCatAt(w.x, w.y) ? 'pointer' : 'default';
    });
    const up = (e: PointerEvent) => { if (this.holding?.id === e.pointerId) this.holding = null; };
    this.cvs.addEventListener('pointerup', up);
    this.cvs.addEventListener('pointercancel', up);
    this.cvs.addEventListener('pointerleave', up);
  }

  private zoneAt(wx: number, wy: number) {
    for (const z of ZONES) {
      const top = (z.y + z.h) * T - z.art!.img.height;
      if (wx >= z.x * T && wx < (z.x + z.w) * T && wy >= top && wy < (z.y + z.h) * T) return z;
    }
    return null;
  }
  private signAt(wx: number, wy: number) {
    return SIGNS.find((s) => wx >= s.x * T && wx < s.x * T + T && wy >= s.y * T - 4 && wy < s.y * T + T) ?? null;
  }
  private isCatAt(wx: number, wy: number) { return Math.abs(wx - this.cat.x) < 10 && wy > this.cat.y - 14 && wy < this.cat.y + 4; }

  tapAt(wx: number, wy: number, fast = false) {
    const p = this.player;
    p.pendingSign = null; p.pendingCat = false;
    const z = this.zoneAt(wx, wy);
    if (z) { this.walkToZone(z, fast); return; }
    const s = this.signAt(wx, wy);
    if (s) {
      if (this.dist(p, { x: s.x * T + 8, y: s.y * T + 8 }) < 26) { this.openSign(s); return; }
      p.pendingSign = s;
      this.walkTo(s.x, s.y + 1, fast);
      return;
    }
    if (this.isCatAt(wx, wy)) {
      if (this.dist(p, this.cat) < 26) { this.petCat(); return; }
      p.pendingCat = true;
      this.walkTo(Math.floor(this.cat.x / T), Math.floor(this.cat.y / T), fast);
      return;
    }
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    this.walkTo(tx, ty, fast);
  }

  walkToZone(z: Zone, fast = false) {
    const d = doorTile(z);
    this.walkTo(d.x, d.y, fast, true);
  }

  private walkTo(tx: number, ty: number, fast: boolean, door = false) {
    const p = this.player;
    let goal = { x: tx, y: ty };
    if (!door && this.world.isSolid(tx, ty)) goal = this.world.nearestFree(tx, ty);
    const sx = Math.floor(p.x / T), sy = Math.floor((p.y - 2) / T);
    const path = this.world.findPath(sx, sy, goal.x, goal.y);
    if (!path) return;
    p.path = path.map((n) => ({ x: n.x * T + 8, y: n.y * T + 12 }));
    p.fast = fast;
    this.marker = { x: goal.x * T + 8, y: goal.y * T + 12, t: 0 };
    this.keys.clear();
  }

  interact() {
    if (!this.nearby) return;
    if (this.nearby.kind === 'sign') this.openSign(this.nearby.sign);
    else this.petCat();
  }

  private openSign(s: Sign) {
    sfx('sign');
    const p = this.player;
    p.path = [];
    const dy = s.y * T + 8 - p.y, dx = s.x * T + 8 - p.x;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    this.ev.sign(s);
  }

  private petCat() {
    sfx('meow');
    this.player.path = [];
    for (let i = 0; i < 6; i++) this.particles.push({ x: this.cat.x + (Math.random() - 0.5) * 10, y: this.cat.y - 10, vx: (Math.random() - 0.5) * 14, vy: -18 - Math.random() * 14, life: 1.4, max: 1.4, color: '#ff6f91', size: 0, g: 0 });
    this.ev.petCat();
  }

  /** Put the player in front of a zone's door, e.g. after closing its panel. */
  exitZone(z: Zone) {
    const d = doorTile(z);
    const p = this.player;
    p.x = d.x * T + 8; p.y = (d.y + 1) * T + 12; p.dir = 'down'; p.path = []; p.onDoor = this.world.idx(d.x, d.y);
    this.keys.clear();
  }

  // ---------------------------------------------------------------- update
  private frame(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  private dist(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y); }

  private blocked(x: number, y: number) {
    const w = this.world;
    for (const [ox, oy] of [[-4, -4], [4, -4], [-4, -1], [4, -1]]) {
      const tx = Math.floor((x + ox) / T), ty = Math.floor((y + oy) / T);
      if (w.isSolid(tx, ty) && !w.doors.has(w.idx(tx, ty))) return true;
    }
    return false;
  }

  private update(dt: number) {
    const p = this.player;
    let vx = 0, vy = 0;
    if (!this.paused) {
      if (this.holding && this.time - this.holding.last > 0.18 && this.dist(p, this.holding) > 12) {
        this.holding.last = this.time;
        if (!this.zoneAt(this.holding.x, this.holding.y)) this.tapAt(this.holding.x, this.holding.y);
      }
      const k = this.keys;
      if (k.has('arrowleft') || k.has('a')) vx -= 1;
      if (k.has('arrowright') || k.has('d')) vx += 1;
      if (k.has('arrowup') || k.has('w')) vy -= 1;
      if (k.has('arrowdown') || k.has('s')) vy += 1;
      if (vx || vy) { const l = Math.hypot(vx, vy); vx /= l; vy /= l; }
      else if (p.path.length) {
        const n = p.path[0];
        const dx = n.x - p.x, dy = n.y - p.y, l = Math.hypot(dx, dy);
        const step = SPEED * (p.fast ? 1.9 : 1) * dt;
        if (l <= step) { p.x = n.x; p.y = n.y; p.path.shift(); if (!p.path.length) this.arrived(); }
        else { vx = dx / l; vy = dy / l; }
      }
    }
    const sp = SPEED * (p.fast ? 1.9 : 1) * dt;
    p.moving = !!(vx || vy) || (!this.paused && p.path.length > 0);
    if (vx || vy) {
      if (p.path.length) { p.x += vx * sp; p.y += vy * sp; }
      else {
        if (!this.blocked(p.x + vx * sp, p.y)) p.x += vx * sp;
        if (!this.blocked(p.x, p.y + vy * sp)) p.y += vy * sp;
      }
      p.dir = Math.abs(vx) > Math.abs(vy) + 0.01 ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      p.anim += dt * (p.fast ? 13 : 9);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) { this.stepTimer = p.fast ? 0.18 : 0.28; if (p.fast) this.dust(); }
    } else p.anim = 0;

    // door triggers
    const w = this.world;
    const ti = w.idx(Math.floor(p.x / T), Math.floor((p.y - 2) / T));
    const z = w.doors.get(ti);
    if (z && p.onDoor !== ti && !this.paused) { p.onDoor = ti; p.path = []; this.keys.clear(); sfx('door'); this.ev.enterZone(z); }
    else if (!z) p.onDoor = -1;

    // coins
    for (const c of w.coins) {
      if (c.taken || this.dist(p, c) > 11) continue;
      c.taken = true;
      progress.coins.add(c.i);
      sfx('coin');
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; this.particles.push({ x: c.x, y: c.y - 4, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.5, max: 0.5, color: '#ffe14a', size: 1 }); }
      this.ev.coin(w.coins.filter((q) => q.taken).length, w.coins.length);
    }

    // nearby interactables
    this.nearby = null;
    if (!this.paused) {
      const s = SIGNS.find((s) => this.dist(p, { x: s.x * T + 8, y: s.y * T + 12 }) < 22);
      if (s) this.nearby = { kind: 'sign', sign: s };
      else if (this.dist(p, this.cat) < 20) this.nearby = { kind: 'cat' };
    }
    this.idle = p.moving ? 0 : this.idle + dt;

    // cat follows the trail
    const last = this.trail[this.trail.length - 1];
    if (!last || this.dist(last, p) > 1.5) { this.trail.push({ x: p.x, y: p.y }); if (this.trail.length > 60) this.trail.shift(); }
    const target = this.trail[Math.max(0, this.trail.length - 13)];
    const c = this.cat;
    const cd = target ? this.dist(c, target) : 0;
    c.moving = cd > 2;
    if (target && c.moving && this.dist(c, p) > 14) {
      const k = Math.min(1, dt * 7);
      const nx = c.x + (target.x + 2 - c.x) * k;
      if (Math.abs(nx - c.x) > 0.05) c.dir = nx > c.x ? 'right' : 'left';
      c.x = nx;
      c.y += (target.y + 2 - c.y) * k;
      c.anim += dt * 10;
    }

    // marker
    if (this.marker) { this.marker.t += dt; if (!p.path.length) this.marker = null; }

    // camera
    let tx = p.x - this.view.w / 2, ty = p.y - 8 - this.view.h / 2;
    if (this.attract) { tx = 520 + Math.sin(this.time * 0.07) * 330 - this.view.w / 2; ty = 380 + Math.sin(this.time * 0.05 + 1) * 190 - this.view.h / 2; }
    const clampX = (v: number) => (this.view.w >= MW * T ? (MW * T - this.view.w) / 2 : Math.max(0, Math.min(MW * T - this.view.w, v)));
    const clampY = (v: number) => (this.view.h >= MH * T ? (MH * T - this.view.h) / 2 : Math.max(0, Math.min(MH * T - this.view.h, v)));
    const ck = this.attract ? 1 : Math.min(1, dt * 6);
    this.cam.x += (clampX(tx) - this.cam.x) * ck;
    this.cam.y += (clampY(ty) - this.cam.y) * ck;

    this.ambient(dt);
    for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g ?? 0) * dt; }
    this.particles = this.particles.filter((q) => q.life > 0);
  }

  private arrived() {
    const p = this.player;
    p.fast = false;
    if (p.pendingSign) { const s = p.pendingSign; p.pendingSign = null; this.openSign(s); }
    if (p.pendingCat) { p.pendingCat = false; if (this.dist(p, this.cat) < 30) this.petCat(); }
  }

  private dust() {
    const p = this.player;
    this.particles.push({ x: p.x + (Math.random() - 0.5) * 6, y: p.y - 1, vx: (Math.random() - 0.5) * 10, vy: -6, life: 0.35, max: 0.35, color: '#e8dcc0', size: 1 });
  }

  private inView(x: number, y: number, m = 32) {
    return x > this.cam.x - m && x < this.cam.x + this.view.w + m && y > this.cam.y - m && y < this.cam.y + this.view.h + m;
  }

  private ambient(dt: number) {
    const w = this.world;
    const k = reduced ? 0.25 : 1;
    for (const f of w.flames) {
      if (!this.inView(f.x, f.y) || Math.random() > 0.55 * k) continue;
      this.particles.push({ x: f.x + (Math.random() - 0.5) * 6, y: f.y, vx: (Math.random() - 0.5) * 8, vy: -20 - Math.random() * 22, life: 0.7, max: 0.7, color: Math.random() < 0.5 ? '#ff8a3d' : '#ffd27a', size: 1, glow: true });
    }
    for (const s of w.smoke) if (this.inView(s.x, s.y) && Math.random() < dt * 2.2 * k) this.particles.push({ x: s.x + Math.random() * 4, y: s.y, vx: 6 + Math.random() * 4, vy: -10, life: 2.6, max: 2.6, color: 'rgba(230,230,240,0.7)', size: 3 });
    // fountain spray
    const fx = w.fountain.x * T + 24, fy = (w.fountain.y + 3) * T - 44 + 6;
    if (this.inView(fx, fy) && Math.random() < 0.7 * k) this.particles.push({ x: fx + (Math.random() - 0.5) * 2, y: fy, vx: (Math.random() - 0.5) * 26, vy: -26 - Math.random() * 10, life: 0.9, max: 0.9, color: '#d6f1ff', size: 1, g: 70 });
    // embers drifting over the ash
    if (Math.random() < dt * 14 * k) {
      const x = this.cam.x + Math.random() * this.view.w, y = this.cam.y + this.view.h * (0.3 + Math.random() * 0.8);
      if (w.isAsh(Math.floor(x / T), Math.floor(y / T))) this.particles.push({ x, y, vx: (Math.random() - 0.3) * 10, vy: -12 - Math.random() * 10, life: 2.5, max: 2.5, color: '#ff9a4a', size: 1, glow: true });
    }
    // fireflies by the pond
    if (Math.random() < dt * 2 * k) {
      const x = (34 + Math.random() * 9) * T, y = (31 + Math.random() * 8) * T;
      if (this.inView(x, y)) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 3, max: 3, color: '#f4ff8a', size: 1, glow: true });
    }
    // drifting petals
    if (Math.random() < dt * 1.4 * k) {
      const x = this.cam.x + Math.random() * this.view.w, y = this.cam.y - 4;
      if (!w.isAsh(Math.floor(x / T), Math.floor((y + 40) / T))) this.particles.push({ x, y, vx: 10 + Math.random() * 8, vy: 14 + Math.random() * 6, life: 6, max: 6, color: Math.random() < 0.5 ? '#ffc4d6' : '#ffffff', size: 1 });
    }
  }

  // ---------------------------------------------------------------- draw
  private draw() {
    const { ctx, zoom, cam, world: w } = this;
    const ox = Math.round(cam.x * zoom), oy = Math.round(cam.y * zoom);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1f3b2a';
    ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
    ctx.setTransform(zoom, 0, 0, zoom, -ox, -oy);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(w.groundCanvas, 0, 0);

    // water shimmer
    const tick = Math.floor(this.time * 2.5);
    ctx.fillStyle = '#bfe9ff';
    for (const i of w.water) {
      const x = (i % MW) * T, y = Math.floor(i / MW) * T;
      if (!this.inView(x, y, 16)) continue;
      const h = (i * 7 + tick) % 6;
      if (h >= 2) continue;
      const sx = x + ((i * 5 + tick * 3) % 11) + 1, sy = y + ((i * 3) % 12) + 2;
      if (w.waterMask[sy * MW * T + sx] && w.waterMask[sy * MW * T + sx + 2]) ctx.fillRect(sx, sy, 3, 1);
    }

    // target marker
    if (this.marker) {
      const m = this.marker, s = 1 + Math.sin(m.t * 10) * 0.25;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(m.x, m.y - 1, 5 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // y-sorted sprites
    type D = { base: number; draw: () => void };
    const list: D[] = [];
    for (const o of w.objects) {
      if (o.x > cam.x + this.view.w + 8 || o.x + o.img.width < cam.x - 8 || o.y > cam.y + this.view.h + 8 || o.y + o.img.height < cam.y - 8) continue;
      list.push({ base: o.base, draw: () => this.drawObj(o) });
    }
    for (const c of w.coins) {
      if (c.taken || !this.inView(c.x, c.y)) continue;
      list.push({ base: c.y, draw: () => this.drawCoin(c.x, c.y, c.i) });
    }
    const p = this.player, cat = this.cat;
    list.push({ base: cat.y, draw: () => {
      const fr = this.catArt[cat.dir][cat.moving ? Math.floor(cat.anim) % 2 : 0];
      ctx.fillStyle = 'rgba(20,18,40,0.25)';
      ctx.beginPath(); ctx.ellipse(Math.round(cat.x), Math.round(cat.y), 6, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(fr, Math.round(cat.x - 8), Math.round(cat.y - 10));
    } });
    if (!this.attract) list.push({ base: p.y, draw: () => {
      const seq = [0, 1, 0, 2];
      const fi = p.moving ? seq[Math.floor(p.anim) % 4] : 0;
      const bob = p.moving && fi === 0 ? -1 : 0;
      ctx.fillStyle = 'rgba(20,18,40,0.28)';
      ctx.beginPath(); ctx.ellipse(Math.round(p.x), Math.round(p.y), 6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(this.hero[p.dir][fi], Math.round(p.x - 8), Math.round(p.y - 16 + bob));
    } });
    list.sort((a, b) => a.base - b.base);
    for (const d of list) d.draw();

    // blinking bulbs
    for (const l of w.lights) {
      if (!this.inView(l.x, l.y)) continue;
      const on = (Math.floor(this.time * 4) + l.i) % 3 !== 0;
      ctx.fillStyle = on ? l.color : 'rgba(40,30,60,0.8)';
      ctx.fillRect(l.x - 1, l.y - 1, 2, 2);
    }

    // particles
    for (const q of this.particles) {
      if (!this.inView(q.x, q.y)) continue;
      const a = Math.min(1, q.life / q.max * 1.5);
      ctx.globalAlpha = a;
      if (q.size === 0) { this.heart(q.x, q.y); }
      else {
        if (q.glow) { ctx.globalAlpha = a * 0.35; ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3); ctx.globalAlpha = a; }
        ctx.fillStyle = q.color;
        const s = q.size === 3 ? 2 + (1 - q.life / q.max) * 3 : q.size;
        ctx.fillRect(Math.round(q.x), Math.round(q.y), s, s);
      }
    }
    ctx.globalAlpha = 1;

    // flame glow
    ctx.globalCompositeOperation = 'lighter';
    for (const f of w.flames) {
      if (!this.inView(f.x, f.y)) continue;
      const r = 14 + Math.sin(this.time * 9 + f.x) * 1.5;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, 'rgba(255,140,60,0.35)'); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    this.drawOverlay();
  }

  private drawObj(o: Obj) {
    const ctx = this.ctx;
    ctx.drawImage(o.img, Math.round(o.x), Math.round(o.y));
    if (o.zone && this.hoverZone === o.zone && !this.touch) {
      ctx.globalAlpha = 0.12;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(o.img, Math.round(o.x), Math.round(o.y));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    if (o.zone?.kind === 'keep') {
      // pulsing light from the open gate
      const z = o.zone, d = doorTile(z);
      const x = d.x * T + 8, y = (d.y + 1) * T;
      const r = 20 + Math.sin(this.time * 3) * 3;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,150,70,0.35)'); g.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private drawCoin(x: number, y: number, i: number) {
    const ctx = this.ctx;
    const t = this.time * 3 + i;
    const bob = Math.round(Math.sin(t * 1.3) * 1.5);
    const half = Math.max(0.5, Math.abs(Math.cos(t)) * 4); // spin: squash horizontally
    ctx.fillStyle = 'rgba(20,18,40,0.25)';
    ctx.fillRect(x - 3, y, 6, 1);
    const cy = y - 6 + bob;
    // pixel circle, radius 4 vertically, `half` horizontally
    for (let dy = -4; dy <= 3; dy++) {
      const r = Math.sqrt(Math.max(0, 16 - (dy + 0.5) ** 2)) / 4;
      const w = Math.max(1, Math.round(r * half * 2));
      ctx.fillStyle = Math.abs(dy + 0.5) > 3 || r < 0.7 ? '#9a6a10' : '#ffd34d';
      ctx.fillRect(Math.round(x - w / 2), cy + dy, w, 1);
      if (w > 4 && Math.abs(dy + 0.5) <= 3) { ctx.fillStyle = '#9a6a10'; ctx.fillRect(Math.round(x - w / 2), cy + dy, 1, 1); ctx.fillRect(Math.round(x + w / 2) - 1, cy + dy, 1, 1); }
    }
    if (half > 2) { ctx.fillStyle = '#fff3a0'; ctx.fillRect(Math.round(x - half / 2), cy - 2, 1, 3); ctx.fillStyle = '#c8901a'; ctx.fillRect(Math.round(x + half / 3), cy - 1, 1, 3); }
  }

  private heart(x: number, y: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ff6f91';
    const X = Math.round(x), Y = Math.round(y);
    ctx.fillRect(X - 2, Y, 2, 2); ctx.fillRect(X + 1, Y, 2, 2); ctx.fillRect(X - 2, Y + 1, 5, 2); ctx.fillRect(X - 1, Y + 3, 3, 1); ctx.fillRect(X, Y + 4, 1, 1);
  }

  // screen-space labels and prompts, crisp at device resolution
  private drawOverlay() {
    const { ctx, zoom, cam, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const S = (wx: number, wy: number) => ({ x: Math.round((wx - cam.x) * zoom), y: Math.round((wy - cam.y) * zoom) });
    const fs = Math.round((this.view.w * zoom < 700 * dpr ? 16 : 19) * dpr);
    ctx.font = `${fs}px "Jersey 10", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const z of ZONES) {
      const top = (z.y + z.h) * T - z.art!.img.height;
      const s = S(z.x * T + (z.w * T) / 2, top - 2);
      if (s.x < -200 || s.x > this.cvs.width + 200 || s.y < -60 || s.y > this.cvs.height + 120) continue;
      const visited = progress.visited.has(z.id);
      const label = z.name;
      const tw = ctx.measureText(label).width;
      const padX = 8 * dpr, h = fs + 8 * dpr;
      const y = s.y - h / 2 - 4 * dpr;
      ctx.fillStyle = 'rgba(18,16,34,0.82)';
      roundRect(ctx, s.x - tw / 2 - padX, y - h / 2, tw + padX * 2, h, 6 * dpr); ctx.fill();
      ctx.strokeStyle = z.color; ctx.lineWidth = 2 * dpr; ctx.stroke();
      ctx.fillStyle = '#fff7e6';
      ctx.fillText(label, s.x, y + 1 * dpr);
      if (!visited && !this.attract) {
        const bx = s.x + tw / 2 + padX + 2 * dpr, by = y - h / 2 + Math.sin(this.time * 5 + z.x) * 3 * dpr;
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath(); ctx.arc(bx, by, 8 * dpr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1d1a2b'; ctx.fillText('!', bx, by + 1 * dpr);
      } else if (visited) {
        const bx = s.x + tw / 2 + padX + 2 * dpr, by = y - h / 2;
        ctx.fillStyle = '#5fd08a';
        ctx.beginPath(); ctx.arc(bx, by, 7 * dpr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10301d'; ctx.fillText('✓', bx, by + 1 * dpr);
      }
    }
    // prompt over a sign / the cat
    // the cat is always close by, so only offer petting until it's been done once
    const showCat = this.nearby?.kind === 'cat' && !progress.ach.has('cat') && this.idle > 0.8;
    if (this.nearby && !this.paused && (this.nearby.kind === 'sign' || showCat)) {
      const n = this.nearby;
      const at = n.kind === 'sign' ? S(n.sign.x * T + 8, n.sign.y * T - 6) : S(this.cat.x, this.cat.y - 14);
      const text = this.touch ? (n.kind === 'sign' ? 'Tap to read' : 'Tap to pet') : n.kind === 'sign' ? 'E  Read' : 'E  Pet';
      const tw = ctx.measureText(text).width;
      const h = fs + 8 * dpr, y = at.y - h / 2 + Math.sin(this.time * 4) * 2 * dpr;
      ctx.fillStyle = '#fff7e6';
      roundRect(ctx, at.x - tw / 2 - 8 * dpr, y - h / 2, tw + 16 * dpr, h, 6 * dpr); ctx.fill();
      ctx.strokeStyle = '#1d1a2b'; ctx.lineWidth = 2 * dpr; ctx.stroke();
      ctx.fillStyle = '#1d1a2b'; ctx.fillText(text, at.x, y + 1 * dpr);
    }
  }

  // minimap data for the HUD
  drawMinimap(m: HTMLCanvasElement) {
    const c = m.getContext('2d')!;
    const sx = m.width / MW, sy = m.height / MH;
    if (!(m as unknown as { _base?: boolean })._base) {
      const w = this.world;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const i = w.idx(x, y), g = w.ground[i];
        c.fillStyle = g === 3 ? '#4aa3df' : g === 1 || g === 4 ? '#dcbc80' : g === 2 ? '#cfc8ba' : g === 5 ? '#4f4858' : w.solid[i] ? '#3f8f3e' : '#6fbf55';
        c.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
      }
      for (const z of ZONES) { c.fillStyle = '#1d1a2b'; c.fillRect(z.x * sx - 1, z.y * sy - 1, z.w * sx + 2, z.h * sy + 2); c.fillStyle = z.color; c.fillRect(z.x * sx, z.y * sy, z.w * sx, z.h * sy); }
      (m as unknown as { _base?: ImageData })._base = c.getImageData(0, 0, m.width, m.height) as never;
    }
    c.putImageData((m as unknown as { _base: ImageData })._base, 0, 0);
    const p = this.player;
    const px = (p.x / T) * sx, py = (p.y / T) * sy;
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(px, py, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e83a4a'; c.beginPath(); c.arc(px, py, 2.2, 0, Math.PI * 2); c.fill();
    // view rectangle
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1;
    c.strokeRect((this.cam.x / T) * sx, (this.cam.y / T) * sy, (this.view.w / T) * sx, (this.view.h / T) * sy);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
