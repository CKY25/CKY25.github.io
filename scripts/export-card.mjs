// Renders print-card.html into the files a print shop needs:
//   public/print/cheong-khe-yang-card.pdf        front + back, 96 x 60 mm (vector text)
//   public/print/cheong-khe-yang-card-front.png  300 dpi, with bleed
//   public/print/cheong-khe-yang-card-back.png
//
// Needs Chrome and puppeteer-core (not a project dependency, to keep CI lean):
//   npm run build && npx vite preview --port 4173
//   PUPPETEER=<path to puppeteer-core> CHROME=<path to chrome> node scripts/export-card.mjs http://localhost:4173
// Use the production build: from the dev server, Chrome's PDF output drops the web fonts.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';

const base = process.argv[2] ?? 'http://localhost:4173';
const lib = process.env.PUPPETEER ? pathToFileURL(process.env.PUPPETEER).href : 'puppeteer-core';
const { default: puppeteer } = await import(lib);
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = fileURLToPath(new URL('../public/print/', import.meta.url));
const name = 'cheong-khe-yang-card';

// Stamp a pHYs chunk so print software reads the PNG as 300 dpi, not 72.
function dpi(file, d) {
  const png = readFileSync(file), ppm = Math.round(d / 0.0254);
  const body = Buffer.alloc(13);
  body.write('pHYs', 0, 'latin1'); body.writeUInt32BE(ppm, 4); body.writeUInt32BE(ppm, 8); body[12] = 1;
  const chunk = Buffer.alloc(21);
  chunk.writeUInt32BE(9, 0); body.copy(chunk, 4); chunk.writeUInt32BE(crc32(body), 17);
  const ihdrEnd = 8 + 25; // signature + IHDR
  writeFileSync(file, Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]));
}

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage();
await page.goto(`${base}/print-card.html?export`, { waitUntil: 'networkidle0' });
await page.waitForSelector('body[data-ready]');

// Chrome rounds page sizes, so print slightly oversize and then set exact
// boxes: media/bleed 96 x 60 mm, trim 90 x 54 mm (what print shops check).
const PT = 72 / 25.4, W = 96 * PT, H = 60 * PT, B = 3 * PT;
await page.addStyleTag({ content: '@page bcard { size: 97mm 61mm; margin: 0; }' });
const raw = await page.pdf({ preferCSSPageSize: true, printBackground: true });
const pdf = await PDFDocument.load(raw);
for (const pg of pdf.getPages()) {
  const top = pg.getHeight(); // the card sits at the top-left of the oversized page
  pg.setMediaBox(0, top - H, W, H);
  pg.setBleedBox(0, top - H, W, H);
  pg.setTrimBox(B, top - H + B, W - B * 2, H - B * 2);
}
pdf.setTitle('Cheong Khe Yang business card');
writeFileSync(`${out}${name}.pdf`, await pdf.save());

// 1 CSS px = 1/96 inch, so 300 dpi is a device scale of 300 / 96.
await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 300 / 96 });
const [front, back] = await page.$$('.bc');
await front.screenshot({ path: `${out}${name}-front.png` });
await back.screenshot({ path: `${out}${name}-back.png` });
for (const side of ['front', 'back']) dpi(`${out}${name}-${side}.png`, 300);
await browser.close();
console.log(`wrote ${out}${name}{.pdf,-front.png,-back.png}`);
