// Visitor progress: zones visited, coins found, achievements. Saved to
// localStorage when it is available; the site works the same without it.

export const ACHIEVEMENTS = [
  { id: 'start', icon: '🎮', name: 'Press Start', desc: 'Begin the adventure' },
  { id: 'speedrun', icon: '⚡', name: 'Speedrunner', desc: 'Open Quick View' },
  { id: 'scholar', icon: '🎓', name: 'Scholar', desc: 'Visit TARUMT Academy' },
  { id: 'ember', icon: '🔥', name: 'Into the Embers', desc: 'Enter Emberfall Keep' },
  { id: 'party', icon: '🎉', name: 'Party Starter', desc: 'Visit Party Pals Hall' },
  { id: 'arcade', icon: '🕹️', name: 'Arcade Regular', desc: 'Look at 3 game jam games' },
  { id: 'cat', icon: '🐱', name: 'Cat Person', desc: 'Pet the cat' },
  { id: 'coins', icon: '🪙', name: 'Treasure Hunter', desc: 'Find all 10 coins' },
  { id: 'contact', icon: '✉️', name: "Let's Talk", desc: 'Visit the Post Office' },
  { id: 'sidequest', icon: '🗡️', name: 'Side Quester', desc: 'Visit every shop on Side Quest Street' },
  { id: 'explorer', icon: '🗺️', name: 'Completionist', desc: 'Visit every building' },
] as const;
export type AchId = (typeof ACHIEVEMENTS)[number]['id'];

const KEY = 'cky-portfolio-v1';

interface Saved { visited: string[]; coins: number[]; ach: string[]; jams: string[] }

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { visited: [], coins: [], ach: [], jams: [], ...JSON.parse(raw) };
  } catch { /* storage blocked */ }
  return { visited: [], coins: [], ach: [], jams: [] };
}

const s = load();
export const progress = {
  visited: new Set(s.visited),
  coins: new Set(s.coins),
  ach: new Set(s.ach),
  jams: new Set(s.jams),
};

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      visited: [...progress.visited], coins: [...progress.coins], ach: [...progress.ach], jams: [...progress.jams],
    }));
  } catch { /* storage blocked */ }
}

export function resetProgress() {
  progress.visited.clear(); progress.coins.clear(); progress.ach.clear(); progress.jams.clear();
  save();
}
