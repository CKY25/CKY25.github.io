import { PROFILE, PROJECTS, WORK, SIDE, JAMS, EXPERIENCE, EDUCATION, SKILLS, LANGUAGES, projectById, type Project, type Link } from './data';
import { ZONES, MW, MH, type Zone } from './world';
import { ACHIEVEMENTS, progress, save, resetProgress, type AchId } from './progress';
import { sfx } from './audio';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

export const ZONE_ICON: Record<string, string> = {
  academy: '🎓', supernormal: '🎭', royaltd: '🏰', vrcross: '🥽', pawspuzzles: '🐱', wellspring: '👟', haarwavelet: '🧮', sketchy: '🛒', library: '📚', home: '🏡',
  partypals: '🎉', emberfall: '🔥', office: '💼', post: '✉️', arcade: '🕹️',
  hotpotato: '🥔', kana: '🌸', what2eat: '🍜', finsight: '💰', gymtrack: '🏋️',
  picklesmash: '🏓', chickendash: '🐔', tunetalk: '📶', recode: '💠', rhythmnova: '🎵',
};
const PROJECT_ACCENT: Record<string, string> = {
  emberfall: '#ff8a3d', partypals: '#ff6f91', supernormal: '#b98be0', royaltd: '#ff7a8a', vrcross: '#6a9be0', pawspuzzles: '#f2a65a', wellspring: '#5fd08a', haarwavelet: '#2bb3a6', sketchy: '#b9bcc6',
  hotpotato: '#ff9a3d', kana: '#f2a2c0', what2eat: '#ff5d7a', finsight: '#47ab84', gymtrack: '#9fb3c8',
  picklesmash: '#c6d93a', chickendash: '#f2a03d', tunetalk: '#ff5a4a', recode: '#4ab8ff', rhythmnova: '#c45cff',
};
const accentFor = (p: Project) => PROJECT_ACCENT[p.id] ?? '#4af0ff';
const iconFor = (p: Project) => ZONE_ICON[p.id] ?? '🕹️';

// ------------------------------------------------------------------ busy state
let listeners: (() => void)[] = [];
export const onBusyChange = (fn: () => void) => listeners.push(fn);
const changed = () => listeners.forEach((f) => f());
export const isBusy = () => !!stack.length || dialogOpen || !$('#quick').hidden;

// ------------------------------------------------------------------ panels
export interface View {
  accent: string;
  icon: string;
  title: string;
  sub?: string;
  render(body: HTMLElement, nav: Nav): void;
}
interface Nav { push(v: View): void; back(): void; close(): void }
interface Open { el: HTMLElement; views: View[]; onClose?: () => void; restore: Element | null }
const stack: Open[] = [];

export function openPanel(view: View, onClose?: () => void) {
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `<section class="panel" role="dialog" aria-modal="true"><header class="panel-head"></header><div class="panel-body"></div></section>`;
  const entry: Open = { el, views: [view], onClose, restore: document.activeElement };
  stack.push(entry);
  $('#panel-root').append(el);
  el.addEventListener('pointerdown', (e) => { if (e.target === el) closeTop(); });
  renderTop();
  changed();
}

function renderTop() {
  const top = stack[stack.length - 1];
  if (!top) return;
  const v = top.views[top.views.length - 1];
  const panel = $('.panel', top.el);
  panel.style.setProperty('--accent', v.accent);
  const head = $('.panel-head', top.el);
  const canBack = top.views.length > 1;
  head.innerHTML = `${canBack ? '<button class="panel-back" aria-label="Back">◀</button>' : ''}
    <div class="panel-icon" aria-hidden="true">${v.icon}</div>
    <div><h2>${esc(v.title)}</h2>${v.sub ? `<p>${esc(v.sub)}</p>` : ''}</div>
    <span class="spacer"></span>
    <button class="panel-x" aria-label="Close">✕</button>`;
  $('.panel-x', head).onclick = () => closeTop();
  if (canBack) $('.panel-back', head).onclick = () => nav.back();
  const body = $('.panel-body', top.el);
  body.scrollTop = 0;
  body.innerHTML = '';
  v.render(body, nav);
  $<HTMLButtonElement>(canBack ? '.panel-back' : '.panel-x', head).focus({ preventScroll: true });
}

const nav: Nav = {
  push(v) { const top = stack[stack.length - 1]; if (!top) return; sfx('select'); top.views.push(v); renderTop(); },
  back() { const top = stack[stack.length - 1]; if (!top || top.views.length < 2) return; sfx('back'); stopMedia(top.el); top.views.pop(); renderTop(); },
  close() { closeTop(); },
};

function stopMedia(root: HTMLElement) { root.querySelectorAll('video').forEach((v) => v.pause()); }

export function closeTop() {
  const top = stack.pop();
  if (!top) return;
  sfx('back');
  stopMedia(top.el);
  top.el.classList.add('closing');
  setTimeout(() => top.el.remove(), 160);
  if (top.restore instanceof HTMLElement) top.restore.focus({ preventScroll: true });
  top.onClose?.();
  if (location.hash.startsWith('#p=')) history.replaceState(null, '', location.pathname + location.search + (!$('#quick').hidden ? '#quick' : ''));
  changed();
}

addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (dialogOpen) { closeDialog(); return; }
  if (stack.length) { const top = stack[stack.length - 1]; if (top.views.length > 1) nav.back(); else closeTop(); return; }
  if (!$('#quick').hidden) closeQuick();
});

// ------------------------------------------------------------------ project view
const stat = (label: string, value: string) => `<div class="stat"><small>${label}</small><span>${esc(value)}</span></div>`;
const LINK_ICON: Record<NonNullable<Link['kind']>, string> = { play: '▶', video: '🎬', code: '⌨️', download: '⬇', private: '🔒', info: 'ℹ️' };

function linkBtn(l: Link, i: number) {
  const ext = l.kind !== 'private';
  const cls = i === 0 ? 'btn btn-accent' : 'btn btn-dark';
  return `<a class="${cls}" href="${esc(l.url)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${LINK_ICON[l.kind ?? 'play']} ${esc(l.label)}</a>`;
}

function placeholder(p: Project) {
  return `<div class="ph"><div><span>${iconFor(p)}</span><b>${esc(p.title)}</b></div></div>`;
}

function viewer(p: Project) {
  if (!p.media.length) return `<div class="viewer viewer-ph">${placeholder(p)}</div>`;
  const thumbs = p.media.length > 1
    ? `<div class="thumbs">${p.media.map((m, i) => `<button class="thumb${i ? '' : ' on'}" data-i="${i}" aria-label="Show ${esc(m.alt)}"><img src="${esc(m.poster ?? m.src)}" alt="" loading="lazy" />${m.type === 'video' ? '<span class="play">▶</span>' : ''}</button>`).join('')}</div>`
    : '';
  return `<div class="viewer"><div class="stage"></div>${thumbs}</div>`;
}

function bindViewer(root: HTMLElement, p: Project) {
  const stage = root.querySelector<HTMLElement>('.stage');
  if (!stage) return;
  let cur = 0;
  const show = (i: number) => {
    stopMedia(stage);
    cur = (i + p.media.length) % p.media.length;
    const m = p.media[cur];
    stage.innerHTML = m.type === 'video'
      ? `<video src="${esc(m.src)}" poster="${esc(m.poster ?? '')}" controls playsinline preload="none" aria-label="${esc(m.alt)}"></video>`
      : `<img src="${esc(m.src)}" alt="${esc(m.alt)}" class="${m.fit === 'contain' ? 'contain' : ''}" />`;
    if (p.media.length > 1) stage.insertAdjacentHTML('beforeend', `<button class="nav prev" aria-label="Previous">◀</button><button class="nav next" aria-label="Next">▶</button><span class="count">${cur + 1} / ${p.media.length}</span>`);
    stage.querySelector<HTMLElement>('.prev')?.addEventListener('click', () => { sfx('blip'); show(cur - 1); });
    stage.querySelector<HTMLElement>('.next')?.addEventListener('click', () => { sfx('blip'); show(cur + 1); });
    root.querySelectorAll('.thumb').forEach((t, k) => t.classList.toggle('on', k === cur));
    root.querySelector<HTMLElement>(`.thumb[data-i="${cur}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  root.querySelectorAll<HTMLElement>('.thumb').forEach((t) => t.addEventListener('click', () => { sfx('blip'); show(Number(t.dataset.i)); }));
  show(0);
}

export function projectView(p: Project): View {
  return {
    accent: accentFor(p),
    icon: iconFor(p),
    title: p.title,
    sub: p.subtitle,
    render(b) {
      b.innerHTML = `
        ${p.jam ? `<div class="jam-tag">🏁 ${esc(p.jam)} · Theme: “${esc(p.theme ?? '')}”</div>` : ''}
        ${viewer(p)}
        <p class="lead">${esc(p.summary)}</p>
        <div class="stats">${p.year ? stat('Year', p.year) : ''}${stat('Role', p.role)}${stat('Engine', p.engine)}${stat('Platform', p.platform)}${stat('Status', p.status)}</div>
        <h3>Highlights</h3>
        <ul class="feat">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <h3>Built with</h3>
        <ul class="chips">${p.tech.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="links">${p.links.map(linkBtn).join('')}</div>`;
      bindViewer(b, p);
      if (p.category === 'jam') { progress.jams.add(p.id); save(); if (progress.jams.size >= 3) unlock('arcade'); }
    },
  };
}

function card(p: Project, wide = false) {
  const cover = p.cover
    ? `<img src="${esc(p.cover)}" alt="" loading="lazy" class="${p.coverFit === 'contain' ? 'contain' : ''}" />`
    : placeholder(p);
  const web = p.platform.includes('Browser') && p.category !== 'work' ?'<span class="badge-web">Play in browser</span>' : '';
  const jamBadge = p.jam ? `<span class="badge-jam">${esc(p.jam)}</span>` : '';
  return `<button class="card${wide ? ' card-wide' : ''}" data-p="${p.id}" style="--accent:${accentFor(p)}">
    <div class="cv">${cover}${jamBadge}${web}</div>
    <div class="cb"><b>${esc(p.title)}</b><span>${esc(p.subtitle)}</span></div></button>`;
}

function bindCards(root: HTMLElement, open: (p: Project) => void) {
  root.querySelectorAll<HTMLElement>('[data-p]').forEach((el) => el.addEventListener('click', () => open(projectById(el.dataset.p!)!)));
}

// ------------------------------------------------------------------ zone views
const eduHTML = () => `<div class="tl">${EDUCATION.map((e) => `
  <article class="tl-item"><header><h4>${esc(e.course)}</h4><span class="when">${esc(e.period)}</span></header>
  <div class="where">${esc(e.school)}</div><span class="grade">${esc(e.grade)}</span></article>`).join('')}</div>`;

const workIntro = `<p class="sub">Branded mini games for <a href="https://mdec.my/ip360-metaverse" target="_blank" rel="noopener">Businesses in Metaverse</a>, an MDEC programme that brought 200 Malaysian businesses into Yooca: Your Life. Players win coupons for the brands' real outlets.</p>`;

const expHTML = () => `<div class="tl">${EXPERIENCE.map((x) => `
  <article class="tl-item"><header><h4>${esc(x.role)}</h4><span class="when">${esc(x.period)}</span></header>
  <div class="where">${esc(x.company)}</div><ul class="feat">${x.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></article>`).join('')}</div>`;

const skillsHTML = () => `<div class="skill-groups">${SKILLS.map((g) => `
  <section class="skill-group"><h4>${esc(g.group)}</h4>${g.items.map((s) => `
    <div class="skill"><b>${esc(s.name)}</b><span class="pips" aria-label="${s.level} out of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= s.level ? 'on' : ''}"></i>`).join('')}</span>${s.note ? `<small>${esc(s.note)}</small>` : ''}</div>`).join('')}
  </section>`).join('')}</div>
  <h3>Spoken languages</h3><ul class="chips">${LANGUAGES.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;

const contactHTML = () => `<div class="contact-grid">
  <a class="contact-card" href="mailto:${PROFILE.email}"><span class="ci">✉️</span><div><b>Email me</b><span>${PROFILE.email}</span></div></a>
  <a class="contact-card" href="${PROFILE.resume}" target="_blank" rel="noopener"><span class="ci">📄</span><div><b>Resume</b><span>Download the PDF</span></div></a>
  <a class="contact-card" href="${PROFILE.github}" target="_blank" rel="noopener"><span class="ci">⌨️</span><div><b>GitHub</b><span>github.com/CKY25</span></div></a>
  <a class="contact-card" href="${PROFILE.itch}" target="_blank" rel="noopener"><span class="ci">🕹️</span><div><b>itch.io</b><span>jemydev.itch.io</span></div></a>
</div>
<div class="links"><button class="btn btn-dark btn-sm" data-copy>📋 Copy email address</button></div>`;

function bindCopy(root: HTMLElement) {
  root.querySelector<HTMLElement>('[data-copy]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLElement;
    try { await navigator.clipboard.writeText(PROFILE.email); b.textContent = '✅ Copied!'; } catch { b.textContent = PROFILE.email; }
  });
}

const achHTML = () => `<div class="ach">${ACHIEVEMENTS.map((a) => `<div class="${progress.ach.has(a.id) ? '' : 'locked'}"><span>${a.icon}</span><div><b>${a.name}</b><small>${a.desc}</small></div></div>`).join('')}</div>`;

export function zoneView(z: Zone): View {
  const base = { accent: z.color, icon: ZONE_ICON[z.id], title: z.name, sub: z.short };
  const p = projectById(z.id);
  if (p) return projectView(p);
  switch (z.id) {
    case 'academy':
      return { ...base, sub: 'Education · University projects', render(b, n) {
        b.innerHTML = `<p class="lead">I studied at Tunku Abdul Rahman University of Management and Technology for four years, starting with a Diploma and finishing with a Distinction in the Bachelor's degree. Each project below also has its own stall at the project fair outside.</p>
          <h3>Education</h3>${eduHTML()}
          <h3>University projects</h3><div class="cards">${PROJECTS.filter((q) => q.category === 'school').map((q) => card(q)).join('')}</div>`;
        bindCards(b, (q) => n.push(projectView(q)));
      } };
    case 'library':
      return { ...base, sub: 'Skills & tools', render(b) { b.innerHTML = `<p class="lead">My toolbox. Unity and C# are my daily drivers, and the rest gets picked up whenever a project needs it.</p>${skillsHTML()}`; } };
    case 'home':
      return { ...base, sub: 'About me', render(b) {
        b.innerHTML = `${PROFILE.about.map((t) => `<p class="lead">${esc(t)}</p>`).join('')}
          <h3>Quick facts</h3><ul class="facts">${PROFILE.facts.map((f) => `<li><span>${f.icon}</span>${esc(f.text)}</li>`).join('')}</ul>
          <h3>Your achievements</h3>${achHTML()}
          <div class="links"><button class="btn btn-dark btn-sm" data-reset>↺ Reset my progress</button></div>`;
        b.querySelector<HTMLElement>('[data-reset]')!.onclick = () => { if (confirm('Reset your exploration progress?')) { resetProgress(); location.reload(); } };
      } };
    case 'office':
      return { ...base, sub: 'Work experience', render(b, n) {
        b.innerHTML = `<p class="lead">I build mini games and interactions for metaverse experiences at Youniverse Games. I started as an intern and joined full-time after graduating.</p>
          <h3>Projects at Youniverse Games</h3>${workIntro}<div class="cards">${WORK.map((q) => card(q)).join('')}</div>
          <h3>Experience</h3>${expHTML()}`;
        bindCards(b, (q) => n.push(projectView(q)));
      } };
    case 'post':
      return { ...base, sub: 'Contact', render(b) { b.innerHTML = `<p class="lead">Thanks for stopping by! I'm open to game development roles and always happy to talk about games. The fastest way to reach me is email.</p>${contactHTML()}`; bindCopy(b); } };
    case 'arcade':
      return { ...base, sub: 'Game jams & itch.io releases', render(b, n) {
        b.innerHTML = `<p class="lead">Game jams are how I practise: a theme, a deadline of a few days, and a finished game at the end. Most of these play right in your browser.</p>
          <div class="cards">${JAMS.map((q) => card(q)).join('')}</div>
          <div class="links"><a class="btn btn-accent" href="${PROFILE.itch}" target="_blank" rel="noopener">🕹️ See all on itch.io</a></div>`;
        bindCards(b, (q) => n.push(projectView(q)));
      } };
  }
  return { ...base, render(b) { b.textContent = ''; } };
}

export function openProject(id: string) {
  const p = projectById(id);
  if (!p) return;
  history.replaceState(null, '', '#p=' + id);
  openPanel(projectView(p));
}

// ------------------------------------------------------------------ map & trophies
export function openMap(drawMap: (c: HTMLCanvasElement) => void, travel: (z: Zone) => void, travelTo: (fx: number, fy: number) => void) {
  openPanel({
    accent: '#5fd08a', icon: '🗺️', title: 'World Map', sub: 'Pick a place to fast-travel',
    render(b, n) {
      const pins = ZONES.map((z) => `<span class="pin" style="left:${((z.x + z.w / 2) / MW) * 100}%;top:${((z.y + z.h / 2) / MH) * 100}%" title="${esc(z.name)}">${ZONE_ICON[z.id]}</span>`).join('');
      b.innerHTML = `<div class="map-wrap"><canvas width="384" height="348"></canvas>${pins}</div>
        <div class="dest">${ZONES.map((z) => `<button data-z="${z.id}" style="--c:${z.color}"><span>${ZONE_ICON[z.id]}</span><div><b>${esc(z.name)}</b><small>${esc(z.short)}</small></div>${progress.visited.has(z.id) ? '<em>✓</em>' : ''}</button>`).join('')}</div>`;
      const c = b.querySelector('canvas')!;
      drawMap(c);
      c.addEventListener('click', (e) => {
        const r = c.getBoundingClientRect();
        const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
        n.close();
        travelTo(fx, fy);
      });
      b.querySelectorAll<HTMLElement>('[data-z]').forEach((el) => el.addEventListener('click', () => { n.close(); travel(ZONES.find((z) => z.id === el.dataset.z)!); }));
    },
  });
}

export function openTrophies() {
  openPanel({ accent: '#ffd34d', icon: '🏆', title: 'Achievements', sub: `${progress.ach.size} / ${ACHIEVEMENTS.length} unlocked`, render(b) { b.innerHTML = achHTML(); } });
}

// ------------------------------------------------------------------ quick view
let quickBuilt = false;
export function openQuick(avatar: HTMLCanvasElement) {
  const q = $('#quick');
  if (!quickBuilt) { buildQuick(q, avatar); quickBuilt = true; }
  q.hidden = false;
  q.scrollTop = 0;
  history.replaceState(null, '', '#quick');
  unlock('speedrun');
  sfx('select');
  $<HTMLElement>('[data-close-quick]', q).focus({ preventScroll: true });
  changed();
}
export function closeQuick() {
  const q = $('#quick');
  if (q.hidden) return;
  q.hidden = true;
  stopMedia(q);
  history.replaceState(null, '', location.pathname + location.search);
  sfx('back');
  changed();
}

function buildQuick(q: HTMLElement, avatar: HTMLCanvasElement) {
  const featured = PROJECTS.filter((p) => p.category === 'featured');
  const school = PROJECTS.filter((p) => p.category === 'school');
  q.innerHTML = `
    <div class="q-top"><b>⚡ Quick View</b><button class="btn btn-gold btn-sm" data-close-quick>🎮 Explore the world</button></div>
    <div class="q-wrap">
      <header class="q-hero">
        <canvas class="q-avatar" width="16" height="16" aria-hidden="true"></canvas>
        <div>
          <h1>${esc(PROFILE.name)}</h1>
          <div class="role">${esc(PROFILE.title)}</div>
          <p>${esc(PROFILE.tagline)} Graduated from TARUMT with a Distinction, now building Unity games at Youniverse Games.</p>
          <div class="q-actions">
            <a class="btn btn-gold btn-sm" href="mailto:${PROFILE.email}">✉️ ${PROFILE.email}</a>
            <a class="btn btn-sm" href="${PROFILE.resume}" target="_blank" rel="noopener">📄 Resume</a>
            <a class="btn btn-sm" href="${PROFILE.github}" target="_blank" rel="noopener">⌨️ GitHub</a>
            <a class="btn btn-sm" href="${PROFILE.itch}" target="_blank" rel="noopener">🕹️ itch.io</a>
          </div>
        </div>
      </header>

      <section class="q-sec q-about"><h2>👋 About</h2>${PROFILE.about.map((t) => `<p>${esc(t)}</p>`).join('')}</section>

      <section class="q-sec" style="--accent:#ff8a3d"><h2>⭐ Featured projects</h2><div class="cards">${featured.map((p) => card(p, true)).join('')}</div></section>

      <section class="q-sec" style="--accent:#7fb8e3"><h2>💼 Built at Youniverse Games</h2>${workIntro}<div class="cards">${WORK.map((p) => card(p)).join('')}</div></section>

      <section class="q-sec" style="--accent:#ff9a3d"><h2>🗡️ Side quests</h2><p class="sub">Projects I build in my free time: games, tools and apps I use myself.</p><div class="cards">${SIDE.map((p) => card(p)).join('')}</div></section>

      <section class="q-sec" style="--accent:#b98be0"><h2>🎓 University projects</h2><div class="cards">${school.map((p) => card(p)).join('')}</div></section>

      <section class="q-sec" style="--accent:#ff4ad8"><h2>🕹️ Game jams & itch.io</h2><p class="sub">7 games published on itch.io. Most were built in a few days for game jams, and most play in the browser.</p><div class="cards">${JAMS.map((p) => card(p)).join('')}</div></section>

      <section class="q-sec" style="--accent:#7fb8e3"><h2>💼 Experience</h2>${expHTML()}</section>

      <section class="q-sec" style="--accent:#5a8ad1"><h2>🎓 Education</h2>${eduHTML()}</section>

      <section class="q-sec" style="--accent:#5fd08a"><h2>📚 Skills</h2>${skillsHTML()}</section>

      <section class="q-sec" style="--accent:#ff6f91"><h2>✉️ Contact</h2>${contactHTML()}</section>

      <p class="q-foot">Built from scratch with TypeScript and Canvas: every pixel of the world is drawn in code.<br />© ${new Date().getFullYear()} ${esc(PROFILE.name)}</p>
    </div>`;
  const av = q.querySelector<HTMLCanvasElement>('.q-avatar')!;
  const c = av.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(avatar, 0, 0);
  $<HTMLElement>('[data-close-quick]', q).onclick = () => closeQuick();
  bindCards(q, (p) => openProject(p.id));
  bindCopy(q);
}

// ------------------------------------------------------------------ dialog
let dialogOpen = false;
let dialogDone: (() => void) | null = null;
let typer = 0;
let advance: (() => void) | null = null;

export interface DialogAction { label: string; href?: string; onClick?: () => void; gold?: boolean }

export function showDialog(name: string, lines: string[], actions: DialogAction[] = []) {
  return new Promise<void>((resolve) => {
    const d = $('#dialog');
    const text = $('#dialog-text');
    const acts = $('#dialog-actions');
    $('#dialog-name').textContent = name;
    d.hidden = false;
    dialogOpen = true;
    changed();
    let i = 0;
    const showLine = () => {
      clearInterval(typer);
      acts.innerHTML = '';
      const full = lines[i];
      let n = 0;
      text.textContent = '';
      let typing = true;
      typer = window.setInterval(() => {
        n += 2;
        text.textContent = full.slice(0, n);
        if (n >= full.length) { clearInterval(typer); typing = false; finishLine(); }
      }, 16);
      advance = () => {
        if (typing) { clearInterval(typer); typing = false; text.textContent = full; finishLine(); return; }
        if (i < lines.length - 1) { i++; sfx('blip'); showLine(); } else closeDialog();
      };
    };
    const finishLine = () => {
      if (i === lines.length - 1 && actions.length) {
        acts.innerHTML = actions.map((a, k) => a.href
          ? `<a class="btn btn-sm ${a.gold ? 'btn-gold' : 'btn-dark'}" href="${esc(a.href)}" target="_blank" rel="noopener" data-k="${k}">${esc(a.label)}</a>`
          : `<button class="btn btn-sm ${a.gold ? 'btn-gold' : 'btn-dark'}" data-k="${k}">${esc(a.label)}</button>`).join('');
        acts.querySelectorAll<HTMLElement>('[data-k]').forEach((el) => el.addEventListener('click', (e) => {
          e.stopPropagation();
          const a = actions[Number(el.dataset.k)];
          closeDialog();
          a.onClick?.();
        }));
      }
    };
    dialogDone = resolve;
    showLine();
  });
}

export function closeDialog() {
  if (!dialogOpen) return;
  clearInterval(typer);
  $('#dialog').hidden = true;
  dialogOpen = false;
  advance = null;
  const done = dialogDone;
  dialogDone = null;
  changed();
  done?.();
}

$('#dialog').addEventListener('click', () => advance?.());
addEventListener('keydown', (e) => {
  if (!dialogOpen) return;
  if (['Enter', ' ', 'e', 'E'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); advance?.(); }
}, true);

// ------------------------------------------------------------------ toasts & achievements
export function toast(icon: string, title: string, sub: string) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="ti">${icon}</span><div><small>${esc(sub)}</small><b>${esc(title)}</b></div>`;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 4000);
}

export function unlock(id: AchId) {
  if (progress.ach.has(id)) return;
  progress.ach.add(id);
  save();
  const a = ACHIEVEMENTS.find((x) => x.id === id)!;
  sfx('achieve');
  toast(a.icon, a.name, 'Achievement unlocked');
}

export function updateHud() {
  const v = progress.visited.size, n = ZONES.length;
  $('#explored').textContent = `${v}/${n}`;
  $('#explored-bar').style.width = `${(v / n) * 100}%`;
  $('#coins').textContent = `${progress.coins.size}/10`;
}
