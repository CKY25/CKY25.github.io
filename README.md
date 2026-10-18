# Cheong Khe Yang · Interactive Portfolio

An explorable pixel-art world where every building is one of my projects or a part of my story. It's built for career fairs: visitors scan a QR code, walk around on their phone, or tap **⚡ Quick View** to see everything on one page.

There's no game engine and there are no art assets. The world, characters and buildings are drawn in code with TypeScript and Canvas, and the sound effects and music are synthesized with WebAudio.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173 (also reachable from your phone on the same Wi-Fi)
npm run build      # production build in dist/
npm run preview    # serve dist/ locally
```

## Where things live

| File | What it holds |
|---|---|
| `src/data.ts` | **All the content**: profile, projects, game jams, experience, education, skills. Edit this to change what the site says. |
| `src/world.ts` | The map: building positions, roads, river, signs, coins. |
| `src/art.ts` | Pixel art painters for the hero, the cat, trees, props and buildings. |
| `src/game.ts` | Movement, tap-to-walk pathfinding, camera, particles and rendering. |
| `src/ui.ts` | Panels, Quick View, dialogs, toasts and achievements. |
| `src/audio.ts` | Sound effects and the music loop. |
| `public/media/` | Screenshots and the Emberfall trailer (720p, about 25 MB, only loaded when played). |
| `card.html` | Printable career-fair standee and business cards with a QR code. |

### Adding a project
1. Add an entry to `PROJECTS` or `JAMS` in `src/data.ts`, and put its images in `public/media/`.
2. For its own building, add a zone with the **same id** to `ZONES` in `src/world.ts`. Booths are the easiest: `kind: 'booth'`, 4×3 tiles. Otherwise it appears in Quick View, and jam games appear in the Arcade.

### Deep links
- `/#quick` opens Quick View directly. It's handy as a second QR code for recruiters in a hurry.
- `/#p=emberfall` opens a project. Any id from `data.ts` works.

## Deploy (GitHub Pages)

1. Create a **public** repo named `CKY25.github.io` (the site is then at `https://cky25.github.io/`), or any other name (the site is then at `https://cky25.github.io/<name>/`).
2. Push this folder to it.
3. In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

Netlify, Cloudflare Pages or Vercel also work: the build command is `npm run build` and the output folder is `dist`.

## Career fair checklist
- Open `/card.html` on the deployed site and print it. The QR codes always point at `https://cky25.github.io/` (set in `src/card.ts`; add `?url=...` to override).
- Open the site once on your own phone or laptop before the fair. It caches itself (except the trailer), so it keeps working on bad Wi-Fi.
