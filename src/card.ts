import './card.css';
import { SITE, cardFront, cardBack, boothSign } from './cardkit';

document.getElementById('site-url')!.textContent = SITE;
document.getElementById('print')!.addEventListener('click', () => print());

// A4 sheet: 2 x 4 cards with their bleed touching, centred so the fronts and
// backs line up when printed two-sided. Crop marks sit in the margins.
async function sheet(make: () => Promise<HTMLElement>) {
  const page = document.createElement('div');
  page.className = 'page zoom';
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (let i = 0; i < 8; i++) grid.append(await make());
  page.append(grid);
  const X = 9, Y = 28.5, L = 5, GAP = 1.5;
  const mark = (x: number, y: number, w: number, h: number) => {
    const m = document.createElement('i');
    m.className = 'mark';
    Object.assign(m.style, { left: `${x}mm`, top: `${y}mm`, width: `${w}mm`, height: `${h}mm` });
    page.append(m);
  };
  for (const cx of [3, 93, 99, 189]) {
    mark(X + cx - 0.1, Y - GAP - L, 0.2, L);
    mark(X + cx - 0.1, Y + 240 + GAP, 0.2, L);
  }
  for (let r = 0; r < 4; r++)
    for (const cy of [3, 57]) {
      const y = Y + r * 60 + cy - 0.1;
      mark(X - GAP - L + 1.5, y, L - 1.5, 0.2);
      mark(X + 192 + GAP, y, L - 1.5, 0.2);
    }
  return page;
}

const fit = () => document.documentElement.style.setProperty('--z', String(Math.min(0.62, (innerWidth - 32) / 793.7)));
fit();
addEventListener('resize', fit);

(async () => {
  document.getElementById('sign')!.append(Object.assign(await boothSign(), { className: 'sign zoom' }));
  document.getElementById('fronts')!.append(await sheet(cardFront));
  document.getElementById('backs')!.append(await sheet(cardBack));
  await document.fonts.ready;
  document.body.dataset.ready = '1';
})();
