// Tiny WebAudio synth: chiptune sound effects and an optional music loop.
// Nothing plays until the visitor's first click or key press.

let ac: AudioContext | null = null;
let master: GainNode;
let sfxOn = true;
let musicOn = false;
let musicTimer = 0;

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, when = 0, slide = 0) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.08, when = 0, hp = 800) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + when;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

export type Sfx = 'blip' | 'select' | 'back' | 'door' | 'coin' | 'achieve' | 'meow' | 'step' | 'start' | 'sign';

export function sfx(name: Sfx) {
  if (!sfxOn) return;
  switch (name) {
    case 'blip': tone(880, 0.05, 'square', 0.05); break;
    case 'select': tone(660, 0.06, 'square', 0.08); tone(990, 0.08, 'square', 0.08, 0.06); break;
    case 'back': tone(520, 0.06, 'square', 0.07); tone(390, 0.08, 'square', 0.07, 0.05); break;
    case 'sign': tone(740, 0.05, 'triangle', 0.12); tone(990, 0.07, 'triangle', 0.1, 0.05); break;
    case 'door': noise(0.18, 0.05, 0, 1500); tone(220, 0.16, 'triangle', 0.12, 0, 220); tone(660, 0.12, 'square', 0.05, 0.12); break;
    case 'coin': tone(988, 0.07, 'square', 0.08); tone(1319, 0.22, 'square', 0.08, 0.07); break;
    case 'achieve': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.08, i * 0.09)); tone(1568, 0.35, 'triangle', 0.1, 0.36); break;
    case 'meow': tone(700, 0.12, 'sawtooth', 0.05, 0, 500); tone(1150, 0.25, 'sawtooth', 0.04, 0.11, -600); break;
    case 'step': noise(0.03, 0.02, 0, 2500); break;
    case 'start': [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.07, i * 0.07)); break;
  }
}

// --- music: a short, mellow 8-bar loop in C major --------------------------
const BPM = 104;
const STEP = 60 / BPM / 2; // eighth notes
const N: Record<string, number> = {};
['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].forEach((n, i) => {
  for (let o = 2; o <= 6; o++) N[n + o] = 440 * Math.pow(2, (i - 9 + (o - 4) * 12) / 12);
});
const LEAD = 'E5 . G5 . A5 . G5 E5 | D5 . E5 . C5 . . . | E5 . G5 . A5 . C6 A5 | G5 . . . . . . . | F5 . A5 . C6 . A5 F5 | E5 . G5 . C6 . G5 E5 | D5 . F5 . A5 . G5 F5 | E5 . D5 . C5 . . .';
const BASS = ['C3', 'A2', 'F2', 'G2', 'F2', 'C3', 'D3', 'G2'];
const leadSteps = LEAD.replace(/\|/g, '').trim().split(/\s+/);

function playBar(bar: number, t0: number) {
  const a = ctx();
  if (!a) return;
  const at = t0 - a.currentTime;
  for (let s = 0; s < 8; s++) {
    const n = leadSteps[bar * 8 + s];
    if (n && n !== '.') tone(N[n], STEP * 1.6, 'square', 0.035, at + s * STEP);
  }
  const b = N[BASS[bar]];
  for (let s = 0; s < 8; s += 2) tone(b, STEP * 1.2, 'triangle', 0.09, at + s * STEP);
  for (let s = 0; s < 8; s += 2) noise(0.02, 0.025, at + s * STEP + STEP, 6000);
}

function startMusic() {
  const a = ctx();
  if (!a) return;
  let bar = 0;
  let next = a.currentTime + 0.1;
  const tick = () => {
    if (!musicOn || !ac) return;
    while (next < ac.currentTime + 0.6) { playBar(bar, next); next += STEP * 8; bar = (bar + 1) % 8; }
    musicTimer = window.setTimeout(tick, 200);
  };
  tick();
}

export function setMusic(on: boolean) {
  musicOn = on;
  clearTimeout(musicTimer);
  if (on) startMusic();
}
export function setSfx(on: boolean) { sfxOn = on; }
export const isMusicOn = () => musicOn;
export const isSfxOn = () => sfxOn;
export function unlockAudio() { ctx(); }
