import './style.css';
import { Game } from './game';
import { ZONES, MW, MH, type Zone } from './world';
import { T } from './art';
import * as ui from './ui';
import { progress, save } from './progress';
import { sfx, setMusic, setSfx, isMusicOn, isSfxOn, unlockAudio } from './audio';
import { PROFILE, SIDE } from './data';

const $ = <E extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as E;
const canvas = $<HTMLCanvasElement>('#world');
const title = $('#title');
const hud = $('#hud');
let started = false;

const game = new Game(canvas, {
  enterZone(z) {
    const first = !progress.visited.has(z.id);
    progress.visited.add(z.id);
    save();
    ui.updateHud();
    ui.openPanel(ui.zoneView(z), () => {
      game.exitZone(z);
      if (first) afterVisit(z);
    });
    if (z.id === 'academy') ui.unlock('scholar');
    if (z.id === 'emberfall') ui.unlock('ember');
    if (z.id === 'partypals') ui.unlock('party');
    if (z.id === 'post') ui.unlock('contact');
    if (SIDE.every((p) => progress.visited.has(p.id))) ui.unlock('sidequest');
    setHint('');
  },
  sign(s) { ui.showDialog(s.title, s.lines); },
  petCat() {
    ui.unlock('cat');
    const purrs = ['Mrrrp!', 'Purrrr…', 'Meow! ♥', '*happy headbutt*'];
    ui.toast('😻', purrs[Math.floor(Math.random() * purrs.length)], 'You pet the cat');
  },
  coin(found, total) {
    save();
    ui.updateHud();
    if (found === total) ui.unlock('coins');
    else ui.toast('🪙', `Coin ${found} / ${total}`, 'Found a coin');
  },
});

function afterVisit(_z: Zone) {
  if (progress.visited.size === ZONES.length && !progress.ach.has('explorer')) {
    ui.unlock('explorer');
    setTimeout(() => ui.showDialog('You did it!', [
      "You've explored every building in my world. Thank you for taking the time! 🎉",
      "If you liked what you saw, I'd love to talk about how I can help your team.",
    ], [
      { label: '✉️ Email me', href: `mailto:${PROFILE.email}`, gold: true },
      { label: '📄 Resume', href: PROFILE.resume },
    ]), 400);
  }
}

// pause the world whenever something is on top of it
const sync = () => { game.paused = !started || ui.isBusy(); };
ui.onBusyChange(sync);

// ------------------------------------------------------------------ hud
const avatar = $<HTMLCanvasElement>('#avatar');
{
  const c = avatar.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(game.hero.down[0], 0, 0);
}

let hintTimer = 0;
function setHint(text: string, ms = 0) {
  $('#hint').textContent = text;
  clearTimeout(hintTimer);
  if (ms) hintTimer = window.setTimeout(() => ($('#hint').textContent = ''), ms);
}

function act(name: string) {
  unlockAudio();
  switch (name) {
    case 'start': start(); break;
    case 'quick': ui.openQuick(avatar); break;
    case 'map':
      sfx('select');
      ui.openMap((c) => game.drawMinimap(c), (z) => game.walkToZone(z, true), (fx, fy) => travelTo(fx * MW * T, fy * MH * T));
      break;
    case 'trophies': sfx('select'); ui.openTrophies(); break;
    case 'music': setMusic(!isMusicOn()); refreshToggles(); break;
    case 'sfx': setSfx(!isSfxOn()); refreshToggles(); sfx('blip'); break;
  }
}
document.querySelectorAll<HTMLElement>('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act!)));

function refreshToggles() {
  const m = $('[data-act="music"]'), s = $('[data-act="sfx"]');
  m.setAttribute('aria-pressed', String(isMusicOn()));
  s.setAttribute('aria-pressed', String(isSfxOn()));
  s.querySelector('span')!.textContent = isSfxOn() ? '🔊' : '🔈';
}

function travelTo(wx: number, wy: number) {
  const z = ZONES.find((z) => wx >= z.x * T && wx < (z.x + z.w) * T && wy >= z.y * T && wy < (z.y + z.h) * T);
  if (z) game.walkToZone(z, true);
  else game.tapAt(wx, wy, true);
}

const mini = $<HTMLCanvasElement>('#minimap');
mini.addEventListener('click', (e) => {
  const r = mini.getBoundingClientRect();
  travelTo(((e.clientX - r.left) / r.width) * MW * T, ((e.clientY - r.top) / r.height) * MH * T);
});
setInterval(() => { if (started && mini.offsetParent) game.drawMinimap(mini); }, 120);

// ------------------------------------------------------------------ title
function start() {
  if (started) return;
  started = true;
  unlockAudio();
  sfx('start');
  title.classList.add('out');
  hud.hidden = false;
  game.attract = false;
  ui.updateHud();
  sync();
  setTimeout(() => {
    ui.unlock('start');
    const touch = game.touch;
    const returning = progress.visited.size > 0;
    ui.showDialog('Khe Yang', returning
      ? ["Welcome back! 👋 Your progress is saved. The buildings marked with ! are the ones you haven't explored yet."]
      : [
        "Hi, I'm Khe Yang! 👋 Welcome to my little world.",
        'Every building here is one of my projects or a part of my story. Walk into a door to step inside. The ones marked with ! are still unexplored.',
        touch ? 'Tap anywhere to walk there, or tap a building to go straight in. Short on time? ⚡ Quick View, top right, has everything on one page.'
          : 'Move with WASD or the arrow keys, or click anywhere to walk. Short on time? ⚡ Quick View, top right, has everything on one page.',
      ]).then(() => setHint(touch ? 'Tap to walk · Walk into doors' : 'WASD / click to move · Walk into doors', 9000));
  }, 500);
}

addEventListener('keydown', (e) => {
  if (started || ui.isBusy()) return;
  if (e.key === 'Enter' || e.key === ' ') {
    if (document.activeElement instanceof HTMLButtonElement || document.activeElement instanceof HTMLAnchorElement) return;
    e.preventDefault();
    start();
  }
});

// closing Quick View from the title screen should land back on the title
ui.onBusyChange(() => { if (!started && !ui.isBusy()) title.querySelector<HTMLElement>('[data-act="start"]')?.focus({ preventScroll: true }); });

// ------------------------------------------------------------------ deep links
const hash = location.hash;
if (hash === '#quick') ui.openQuick(avatar);
else if (hash.startsWith('#p=')) ui.openProject(hash.slice(3));
else title.querySelector<HTMLElement>('[data-act="start"]')?.focus({ preventScroll: true });

refreshToggles();
sync();
if (import.meta.env.DEV) Object.assign(window, { game, ui });

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
