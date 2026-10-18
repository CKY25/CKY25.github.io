import './card.css';
import { SITE, cardFront, cardBack } from './cardkit';

// `?export` strips the page down to the two cards for scripts/export-card.mjs.
const exporting = new URLSearchParams(location.search).has('export');
document.getElementById('site-url')!.textContent = SITE;

const fit = () => document.documentElement.style.setProperty('--z', String(exporting ? 1 : Math.min(2, (innerWidth - 32) / 362.8)));
fit();
addEventListener('resize', fit);

const guides = document.getElementById('guides') as HTMLInputElement;
guides.addEventListener('change', () => document.body.classList.toggle('show-guides', guides.checked));

(async () => {
  const box = document.getElementById('cards')!;
  for (const c of [await cardFront(), await cardBack()]) { c.classList.add('zoom'); box.append(c); }
  if (exporting) {
    document.body.classList.add('export');
    document.querySelectorAll('.no-print').forEach((e) => e.remove());
  }
  await document.fonts.ready;
  document.body.dataset.ready = '1';
})();
