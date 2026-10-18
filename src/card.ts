import QRCode from 'qrcode';
import './card.css';

// Always the live site, so a card printed from localhost or a phone on the
// LAN still points somewhere recruiters can open. `?url=` overrides it.
const SITE = 'https://cky25.github.io/';
const site = new URLSearchParams(location.search).get('url') ?? SITE;
document.getElementById('site-url')!.textContent = site;

for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas.qr')) {
  QRCode.toCanvas(c, site, { width: Number(c.dataset.size), margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d1a2b', light: '#ffffff' } });
}
