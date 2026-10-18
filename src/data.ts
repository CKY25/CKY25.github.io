// Everything the site says lives here. Edit this file to change content;
// the world, the panels and Quick View all read from it.

const M = 'media/';

export const PROFILE = {
  name: 'Cheong Khe Yang',
  short: 'CKY',
  title: 'Junior Unity Game Developer',
  tagline: 'I build games, and the tools that build them.',
  location: 'Kota Damansara / Seremban, Malaysia',
  email: 'ckyy0625@gmail.com',
  github: 'https://github.com/CKY25',
  itch: 'https://jemydev.itch.io/',
  resume: 'Cheong-Khe-Yang-Resume.pdf',
  about: [
    'I graduated with a Distinction in Bachelor of Computer Science (Hons) in Interactive Software Technology from Tunku Abdul Rahman University of Management and Technology (TARUMT).',
    'I now build mini games and interactions in Unity at Youniverse Games. In my free time I enter game jams, ship games on itch.io, build bigger solo projects like Emberfall and Hot Potato Royale, and make tools and apps I use myself.',
    'At university I also competed in several CTF cybersecurity competitions, which sharpened my problem solving and teamwork.',
  ],
  facts: [
    { icon: '🎓', text: 'Distinction, CGPA 3.87 (Degree) and 3.98 (Diploma)' },
    { icon: '🎮', text: '7 games published on itch.io, most from game jams' },
    { icon: '🛡️', text: 'Took part in multiple CTF cybersecurity competitions' },
    { icon: '🗣️', text: 'Speaks English, Chinese, Malay, Cantonese and Japanese' },
    { icon: '🐱', text: 'A proud cat person (say hi to the cat following you)' },
  ],
};

export interface Link { label: string; url: string; kind?: 'play' | 'video' | 'code' | 'download' | 'private' | 'info' }
export interface Media { type: 'image' | 'video'; src: string; poster?: string; alt: string; fit?: 'contain' }
export interface Project {
  id: string;
  title: string;
  subtitle: string;
  category: 'featured' | 'work' | 'personal' | 'school' | 'jam';
  year: string;
  role: string;
  engine: string;
  platform: string;
  status: string;
  tech: string[];
  cover: string;
  coverFit?: 'contain';
  summary: string;
  highlights: string[];
  media: Media[];
  links: Link[];
  jam?: string;
  theme?: string;
}

const privateDemo = (title: string): Link => ({
  label: 'Private repo · request a demo',
  url: `mailto:${PROFILE.email}?subject=${encodeURIComponent(`Demo request: ${title}`)}`,
  kind: 'private',
});

export const PROJECTS: Project[] = [
  {
    id: 'emberfall',
    title: 'Emberfall',
    subtitle: 'Top-down 2D action souls-like',
    category: 'featured',
    year: '2026',
    role: 'Solo developer',
    engine: 'Unity 6.3 · URP 2D',
    platform: 'Windows (keyboard + mouse, gamepad)',
    status: 'v1.0.0 released build',
    tech: ['Unity 6', 'C#', 'URP 2D', 'uGUI + TextMeshPro', 'Python tooling'],
    cover: M + 'emberfall/poster.jpg',
    summary:
      "The world's last fire is going out. You are a Warden, sent to take back three Runes from the ancient beings who stole them to become undying. A tight-combat action game in the spirit of Death's Door, with hand-built regions, boss fights and a roguelite mode.",
    highlights: [
      'Responsive melee: a 3-hit combo, a charged slash that breaks guard, an invulnerable roll and spells that refill only through melee hits, so you have to play aggressively',
      'A hub, 3 regions (Ashen Hollow, the Drowned Abbey and the Thornwood) and a finale in the Pale Crown. Each region has its own tileset and ambience, and its boss has phases, a name card and its own music, ending with the 3-phase Undying King',
      'The Ember Depths: a roguelite mode with 4 floors laid out anew every run, 32 stacking charms, mimics, shrines, a shop and an echo of each boss',
      'Rooms are generated from text maps by a custom editor tool, and Python scripts check every room and that every door links back correctly',
      'Every action can be rebound for keyboard, mouse and gamepad, with accessibility options (screen shake, hit-stop, flashing, text size) and 3 save slots',
      'The trailer is recorded from the game itself and cut by script',
    ],
    media: [
      { type: 'video', src: M + 'emberfall/trailer.mp4', poster: M + 'emberfall/poster.jpg', alt: 'Emberfall official trailer' },
      { type: 'image', src: M + 'emberfall/abbot.jpg', alt: 'Fighting the Tide Abbot boss' },
      { type: 'image', src: M + 'emberfall/matron.jpg', alt: 'The Grave Matron boss name card' },
      { type: 'image', src: M + 'emberfall/lightning.jpg', alt: 'A spell exploding across a room' },
      { type: 'image', src: M + 'emberfall/abbey.jpg', alt: 'Combat in the Drowned Abbey' },
      { type: 'image', src: M + 'emberfall/hearth.jpg', alt: 'The Warden at the hearth' },
      { type: 'image', src: M + 'emberfall/arena.jpg', alt: 'A boss-arena fight' },
      { type: 'image', src: M + 'emberfall/gauntlet.jpg', alt: 'Picking up the Ember Gauntlet' },
    ],
    links: [privateDemo('Emberfall')],
  },
  {
    id: 'partypals',
    title: 'Party Pals · 欢乐派对',
    subtitle: 'Seven party games: one TV, everyone plays on their phone',
    category: 'featured',
    year: '2026',
    role: 'Solo developer',
    engine: 'React + Node.js',
    platform: 'Web browser (TV + phones, or phones only)',
    status: 'v1.1.0',
    tech: ['TypeScript', 'React 18', 'Node.js', 'Socket.IO', 'Vitest', 'Docker'],
    cover: M + 'partypals/tv-lobby.webp',
    summary:
      'Card and board games for family gatherings, played in the browser with nothing to install. The TV shows a QR code, guests join from their phones, and the app deals, keeps score and runs the rules. It is fully bilingual in English and 中文.',
    highlights: [
      '7 games: UNO, Exploding Kittens, Love Letter, Ludo / Aeroplane Chess, Werewolf, Monopoly and Cluedo',
      'Real-time multiplayer over Socket.IO; the server runs the rules and sends each phone only what that player may see',
      'AI players can fill empty seats. They follow the same rules and only see what their seat is allowed to see',
      'Werewolf needs no human moderator: phones handle the night and the TV narrates aloud',
      'Players drop straight back into their seat after a refresh or a locked phone',
      'Illustrated "How to play" walkthroughs for every game, with big touch targets and a phone buzz on your turn',
    ],
    media: [
      { type: 'image', src: M + 'partypals/tv-lobby.webp', alt: 'TV lobby with a QR code to join' },
      { type: 'image', src: M + 'partypals/tv-uno.webp', alt: 'UNO on the TV' },
      { type: 'image', src: M + 'partypals/tv-werewolf.webp', alt: 'Werewolf night on the TV' },
      { type: 'image', src: M + 'partypals/tv-monopoly.webp', alt: 'Monopoly on the TV' },
      { type: 'image', src: M + 'partypals/tv-exploding.webp', alt: 'Exploding Kittens on the TV' },
      { type: 'image', src: M + 'partypals/phone-uno.webp', alt: 'A UNO hand on a phone', fit: 'contain' },
      { type: 'image', src: M + 'partypals/phone-werewolf.webp', alt: "The witch's secret choice on a phone", fit: 'contain' },
    ],
    links: [privateDemo('Party Pals')],
  },
  {
    id: 'supernormal',
    title: 'SuperNormal',
    subtitle: 'Final Year Project · cross-platform VR + PC multiplayer',
    category: 'school',
    year: '',
    role: 'Developer',
    engine: 'Unity',
    platform: 'PC and VR (Meta Quest), cross-platform',
    status: 'Playable build',
    tech: ['Unity', 'C#', 'Netcode for GameObjects', 'Unity Lobby', 'XR Interaction Toolkit', 'OpenXR'],
    cover: M + 'school/supernormal-logo.png',
    coverFit: 'contain',
    summary:
      'A multiplayer cat-and-mouse game. SuperNormies have special abilities and must blend in with the NPCs while they finish their missions. Normies carry special equipment to find and eliminate them within 10 minutes. VR and PC players play in the same match.',
    highlights: [
      'Cross-platform play: VR and PC players join the same match',
      'Online multiplayer for up to 4 players with Netcode for GameObjects and Unity Lobby, in 1v1 and 2v2 modes',
      'Abilities and equipment that drive a social-deduction loop against NPC crowds',
      'Designed and built in about 3 months',
    ],
    media: [{ type: 'image', src: M + 'school/supernormal-logo.png', alt: 'SuperNormal logo', fit: 'contain' }],
    links: [
      { label: 'View on GitHub', url: 'https://github.com/CKY25/FYP_SuperNormal', kind: 'code' },
      { label: 'PC demo video', url: 'https://drive.google.com/file/d/1OfuQ7lDfpvYRITYy9ScwqCbWgK09X6O6/view?usp=sharing', kind: 'video' },
      { label: 'VR demo video', url: 'https://drive.google.com/file/d/1mLN6Zm8J9VxhfeVVuOtWNsl2yAxApawJ/view?usp=sharing', kind: 'video' },
      { label: 'Download build', url: 'https://drive.google.com/file/d/1HOxoJP_6YWuadVloHuAOr1UUfQ-T1jkN/view?usp=sharing', kind: 'download' },
    ],
  },
  {
    id: 'royaltd',
    title: 'Royal TD',
    subtitle: 'Isometric 2D tower defense · AACS2123 Computer Game Development',
    category: 'school',
    year: '',
    role: 'Developer',
    engine: 'Unity',
    platform: 'Windows',
    status: 'Playable build',
    tech: ['Unity', 'C#', '2D isometric', 'ScriptableObjects'],
    cover: '',
    summary:
      'Defend the town hall across 6 waves of monsters. Gather wood and stone that spawn at random around the map, build towers with different stats, block paths with destructible walls, and fight alongside them with unlockable weapons.',
    highlights: [
      'Gather randomly spawned resources and spend them on towers with different health and damage',
      'Destructible stone walls to reroute monster paths',
      'Unlockable weapons (blade, scythe) so the player can fight too',
      '6 waves with mini bosses and a final boss, plus a minimap that tracks monsters',
      'An in-game developer console (press ~) with cheat commands',
    ],
    media: [],
    links: [
      { label: 'View on GitHub', url: 'https://github.com/CKY25/2D_Game_Development', kind: 'code' },
      { label: 'Video demo', url: 'https://drive.google.com/file/d/1-EicgbQsuZ9jgEM12AZOI3lbVRoKgsaF/view?usp=sharing', kind: 'video' },
      { label: 'Download build', url: 'https://drive.google.com/file/d/11LsHP4PbmyBOpF0NswJLQipkFWiZOqzY/view?usp=sharing', kind: 'download' },
    ],
  },
  {
    id: 'vrcross',
    title: 'VR Cross Road',
    subtitle: 'Educational VR game that teaches children to cross the road · BACS3063 Virtual Reality',
    category: 'school',
    year: '',
    role: 'Team project',
    engine: 'Unity',
    platform: 'VR headset',
    status: 'Playable build',
    tech: ['Unity', 'C#', 'Unity XR'],
    cover: '',
    summary:
      'Teaches young children how to cross the road safely, one lesson per level. Built in under a month during a 7-week short semester.',
    highlights: [
      'Level 1: always look left and right before crossing',
      'Level 2: press the button at a pedestrian crossing and wait for the green light',
      'Level 3: put both lessons together to cross on your own',
    ],
    media: [],
    links: [
      { label: 'View on GitHub', url: 'https://github.com/CKY25/Virtual_Reality_Assignment', kind: 'code' },
      { label: 'Video demo', url: 'https://drive.google.com/file/d/1qJsh0Np-w6yeIH4_mhNn4k_knXjqorUo/view?usp=sharing', kind: 'video' },
      { label: 'Download build', url: 'https://drive.google.com/file/d/1S2UZyG1ZEMVlpy0ic2S23IVOaAiFhzYU/view?usp=sharing', kind: 'download' },
    ],
  },
  {
    id: 'pawspuzzles',
    title: 'Paws & Puzzles: Escape Meow-nia',
    subtitle: '3D puzzle game where you play a telekinetic lab cat · BACS3254 3D Game Development',
    category: 'school',
    year: '',
    role: 'Team project',
    engine: 'Unity',
    platform: 'Windows',
    status: 'Playable build',
    tech: ['Unity', 'C#', '3D'],
    cover: '',
    summary:
      'You are a cat who gained telekinesis from lab experiments. Escape the laboratory by cracking door passwords, taking keys from the security guards and collecting the capsules that open the way out.',
    highlights: [
      'Puzzles seen from a cat’s point of view, using telekinesis to move objects',
      'Password puzzles that teach simple encodings: Base64 and ROT13',
      'Keys taken from NPC security guards unlock capsule containers, and the capsules unlock doors',
      'Customizable cat skins',
      'Built in under a month during a 7-week short semester',
    ],
    media: [],
    links: [
      { label: 'View on GitHub', url: 'https://github.com/CKY25/3D_Game_Assignment', kind: 'code' },
      { label: 'Video demo', url: 'https://drive.google.com/file/d/1h1PAObgZOtKgj3By8OXM5lBy1hE6J07W/view?usp=sharing', kind: 'video' },
      { label: 'Download build', url: 'https://drive.google.com/file/d/19zOrYPixvEQ6PWnLJX7sLMSu5fBxR7dK/view?usp=sharing', kind: 'download' },
    ],
  },
  {
    id: 'wellspring',
    title: 'WellSpring',
    subtitle: 'Step-tracking fitness app with a virtual pet · BAIT2073 Mobile Application Development',
    category: 'school',
    year: '',
    role: 'Team project',
    engine: 'Native Android',
    platform: 'Android',
    status: 'Working prototype',
    tech: ['Kotlin', 'Android'],
    cover: '',
    summary:
      'Every 100 steps earns a coin. Spend coins on food, toys, clothes and new pets for your virtual pet, or on voucher codes. The app also tracks BMI and unlocks achievements to keep you moving.',
    highlights: [
      'Step tracking that pays out in-game coins',
      'A pet mini game: raise different pets, feed them, play with them and dress them up',
      'A BMI calculator with a history graph',
      'Achievements and an account / profile system',
    ],
    media: [],
    links: [
      { label: 'View on GitHub', url: 'https://github.com/CKY25/Mobile_Application_Development_Assignment', kind: 'code' },
      { label: 'Download the app', url: 'https://drive.google.com/file/d/1UnPBp-YlqU52dAmR2DuNathJ59Zbqwys/view?usp=sharing', kind: 'download' },
    ],
  },
  {
    id: 'haarwavelet',
    title: 'Haar Wavelet Image Compression',
    subtitle: 'The same algorithm on CPU, CUDA, OpenCL and OpenMP, benchmarked · BMCS3003 Distributed Systems',
    category: 'school',
    year: '2024',
    role: 'Developer',
    engine: 'C++',
    platform: 'Windows (NVIDIA GPU for CUDA)',
    status: 'Complete',
    tech: ['C++', 'CUDA', 'OpenCL', 'OpenMP', 'OpenCV'],
    cover: M + 'school/dspc.jpg',
    summary:
      'Compresses an image with the Haar wavelet transform four different ways (plain CPU, CUDA GPU, OpenCL GPU and OpenMP) and compares how fast each one is.',
    highlights: [
      'On the demo image, CUDA took 3 ms against about 47 ms on the CPU: 15.7× faster (OpenMP 3.6×, OpenCL 1.8×)',
      'Writes the compressed image as a binary file',
      'Reports compression ratio, MSE, PSNR, bit cost and file sizes',
      'Draws a bar chart of execution times and highlights the fastest approach',
    ],
    media: [{ type: 'video', src: M + 'school/dspc.mp4', poster: M + 'school/dspc.jpg', alt: 'Compression benchmark demo' }],
    links: [{ label: 'View on GitHub', url: 'https://github.com/CKY25/Distributed_System_-_Parallel_Computing', kind: 'code' }],
  },
  {
    id: 'sketchy',
    title: 'Sketchy Shoes',
    subtitle: 'Shoe e-commerce website with an admin dashboard · AMIT3083 GUI & Web Application Programming',
    category: 'school',
    year: '2022',
    role: 'Team member',
    engine: 'Java JSP',
    platform: 'Web',
    status: 'Prototype',
    tech: ['Java', 'JSP', 'JavaScript', 'PHP', 'HTML / CSS'],
    cover: M + 'school/shoe-report.jpg',
    summary:
      'Customers search for shoes, check out and track their orders. Admins manage the catalogue and see sales graphs and best-seller reports.',
    highlights: [
      'My modules (shown in the videos): admin product management, the shopping cart and checkout, and the top-5 best-seller report',
      'Customer accounts with profile editing, plus search by price',
      'Order history and tracking',
      'Admin create / update / delete for products, a sales graph and generated reports',
    ],
    media: [
      { type: 'video', src: M + 'school/shoe-cart.mp4', poster: M + 'school/shoe-cart.jpg', alt: 'Adding to cart and checking out' },
      { type: 'video', src: M + 'school/shoe-report.mp4', poster: M + 'school/shoe-report.jpg', alt: 'Top 5 best-selling products report' },
      { type: 'video', src: M + 'school/shoe-admin.mp4', poster: M + 'school/shoe-admin.jpg', alt: 'Admin product management (early version)' },
      { type: 'image', src: M + 'school/shoe-checkout.jpg', alt: 'Checkout page' },
    ],
    links: [{ label: 'View on GitHub', url: 'https://github.com/CKY25/GUI_-_Web_Application_Programming', kind: 'code' }],
  },
];

// Side Quest Street: projects built in my free time.
export const SIDE: Project[] = [
  {
    id: 'hotpotato',
    title: 'Hot Potato Royale',
    subtitle: 'Real-time multiplayer party game for 2–40 players',
    category: 'personal',
    year: '2026',
    role: 'Solo developer',
    engine: 'No engine: PixiJS + Colyseus',
    platform: 'Browser, desktop and mobile',
    status: 'In development (core loop complete)',
    tech: ['TypeScript', 'PixiJS 8', 'Colyseus', 'Node.js', 'Vite', 'Docker'],
    cover: M + 'hotpotato/blast.webp',
    summary:
      'One potato, a hidden fuse and up to 40 players. Tag or throw the potato before it blows; whoever is holding it takes a stacking, visible curse that makes them the target for the rest of the lobby.',
    highlights: [
      'An authoritative game server (Colyseus) with client-side prediction over a movement integrator shared by server and client',
      'Two timers drive the tension: your visible heat meter and a hidden fuse that keeps burning while the potato is mid-air',
      'Balance checked by simulation: a headless 40-match run proved spam-throwing no longer beats fair play',
      'Bots with 4 archetypes and a skill roll that scales reaction time, aim and awareness fill empty lobbies',
      'Six curses, three arenas (including a shrinking ring), spectating, reconnection and a results screen with XP and coins',
      'An offline first-run tutorial, touch and keyboard controls with equal precision, and synthesized sound for every event',
    ],
    media: [
      { type: 'image', src: M + 'hotpotato/blast.webp', alt: 'A potato exploding mid-throw in a match with bots' },
      { type: 'image', src: M + 'hotpotato/title.webp', alt: 'Title screen' },
      { type: 'image', src: M + 'hotpotato/throw.webp', alt: 'A throw in flight' },
      { type: 'image', src: M + 'hotpotato/countdown.webp', alt: 'Match countdown in the Open Plaza arena' },
      { type: 'image', src: M + 'hotpotato/lobby.webp', alt: 'Lobby with arena voting' },
    ],
    links: [privateDemo('Hot Potato Royale')],
  },
  {
    id: 'kana',
    title: 'Kana Practice',
    subtitle: 'Learn hiragana and katakana with AI handwriting checks',
    category: 'personal',
    year: '2026',
    role: 'Solo developer',
    engine: 'Vanilla HTML, CSS and JavaScript',
    platform: 'Browser (live)',
    status: 'Live on GitHub Pages',
    tech: ['JavaScript', 'Canvas', 'Gemini API', 'Cloudflare Workers'],
    cover: M + 'kana/home.webp',
    summary:
      'A single-page app for learning all 46 hiragana, 46 katakana and 25 dakuten / handakuten. Draw a character on the canvas and AI handwriting recognition checks it.',
    highlights: [
      'Character charts with romaji, row filters and stroke guides',
      'Handwriting practice on a drawing canvas, checked by Gemini through a Cloudflare Worker so the API key stays secret',
      'Quizzes in both directions (kana → romaji and romaji → kana)',
      'A session score, streaks and per-set progress saved in the browser',
    ],
    media: [
      { type: 'image', src: M + 'kana/home.webp', alt: 'Home page' },
      { type: 'image', src: M + 'kana/hira.webp', alt: 'Hiragana chart' },
      { type: 'image', src: M + 'kana/practice.webp', alt: 'Handwriting practice canvas' },
      { type: 'image', src: M + 'kana/quiz.webp', alt: 'Quiz' },
    ],
    links: [
      { label: 'Try it live', url: 'https://cky25.github.io/KanaLearn101/', kind: 'play' },
      { label: 'View on GitHub', url: 'https://github.com/CKY25/KanaLearn101', kind: 'code' },
    ],
  },
  {
    id: 'what2eat',
    title: 'What2Eat',
    subtitle: 'Swipe through nearby restaurants to decide what to eat',
    category: 'personal',
    year: '2026',
    role: 'Solo developer',
    engine: 'React + Express',
    platform: 'Web (mobile-first)',
    status: 'Working, backend deployed',
    tech: ['React 19', 'TypeScript', 'Vite', 'Express', 'Google Places API'],
    cover: M + 'what2eat/start.webp',
    coverFit: 'contain',
    summary:
      'Swipe right to save and left to skip. Google only returns 20 places per search, so the backend sweeps the area with a grid of overlapping searches and finds about 6x more restaurants than a single search.',
    highlights: [
      'Tiled search: 387 vs 62 places found on a simulated city of 800 restaurants',
      'Results cached for 24 hours on a ~110 m grid, with stale "open now" flags dropped after 15 minutes',
      'Cost controls: a per-day call budget in the server on top of a Google Cloud quota cap',
      'Filters with live counts (cuisine, rating, price, distance, open now), search, a "Decide for me" picker and a saved list',
      'Light and dark themes, keyboard swiping and a layout that works from 320 px up',
    ],
    media: [{ type: 'image', src: M + 'what2eat/start.webp', alt: 'Start screen', fit: 'contain' }],
    links: [privateDemo('What2Eat')],
  },
  {
    id: 'finsight',
    title: 'FinSight',
    subtitle: 'Personal finance tracker for Android',
    category: 'personal',
    year: '2026',
    role: 'Solo developer',
    engine: 'React Native (Expo)',
    platform: 'Android',
    status: 'Working app',
    tech: ['React Native', 'Expo', 'TypeScript', 'SQLite + Drizzle ORM', 'Zustand', 'NativeWind'],
    cover: '',
    summary: 'Track income and spending by category, set monthly budgets and see where the money goes. All data stays on the device in SQLite.',
    highlights: [
      'Transactions with categories, plus recurring transactions that fill themselves in each month',
      'Monthly budgets per category with progress bars',
      'Analytics: a monthly bar chart and a category breakdown pie chart',
      'CSV import and export',
      'A privacy mode that hides amounts, and a dark theme',
    ],
    media: [],
    links: [privateDemo('FinSight')],
  },
  {
    id: 'gymtrack',
    title: 'GymTrack',
    subtitle: 'A 3-day rotation gym tracker that tells you what to lift next',
    category: 'personal',
    year: '2026',
    role: 'Solo developer',
    engine: 'React Native (Expo)',
    platform: 'Android',
    status: 'Working app',
    tech: ['React Native', 'Expo', 'TypeScript', 'SQLite + Drizzle ORM', 'Zustand', 'NativeWind'],
    cover: '',
    summary: 'Built for my own training: it rotates through a 3-day program, suggests the weight for each exercise, works out which plates to load and times the rests. Everything stays on the device.',
    highlights: [
      'A double-progression engine: reps climb to the top of the range, then the weight goes up, with deloads when needed',
      'A plate-loading solver that only suggests weights you can actually build from the plates you own',
      'A rest timer with notifications and haptics',
      'Progress charts with estimated 1-rep max and volume, a training heatmap and bodyweight tracking',
      'Editable program days and a full session history',
    ],
    media: [],
    links: [privateDemo('GymTrack')],
  },
];

const jam = (p: Omit<Project, 'category' | 'role' | 'status'> & { status?: string }): Project => ({
  category: 'jam',
  role: 'Solo developer',
  status: 'Released on itch.io',
  ...p,
});
const J = M + 'jams/';

export const JAMS: Project[] = [
  jam({
    id: 'swarm',
    title: 'Project: SWARM',
    subtitle: 'Bullet-heaven roguelite · commercial release',
    year: '2026',
    engine: 'Unity',
    platform: 'Windows',
    status: 'Released on itch.io ($1.99, free demo)',
    tech: ['Unity', 'C#', 'Roguelite'],
    cover: J + 'project-swarm-cover.png',
    summary:
      'You are the hive; everything else is food. Grow from a handful of skittering minions into a screen-filling storm, draft mutations, hoard relics and come back stronger.',
    highlights: ['7 broods, each with its own playstyle and an 8-rank mastery tree', 'About 100 mutations and more than 50 relics drafted mid-run', '6 kingdoms to conquer, plus a hidden endgame arena'],
    media: [1, 2, 3].map((i) => ({ type: 'image' as const, src: `${J}project-swarm-${i}.jpg`, alt: `Project: SWARM screenshot ${i}` })),
    links: [
      { label: 'Get it on itch.io', url: 'https://jemydev.itch.io/project-swarm', kind: 'play' },
      { label: 'Free demo', url: 'https://jemydev.itch.io/project-swarm-demo', kind: 'play' },
    ],
  }),
  jam({
    id: 'stellar',
    title: 'Stellar Fates',
    subtitle: 'Meditative constellation puzzle',
    year: '2026',
    jam: 'GameDev.tv Game Jam 2026',
    theme: 'Connections',
    engine: 'Unity',
    platform: 'Browser · Windows',
    tech: ['Unity', 'C#', 'WebGL'],
    cover: J + 'stellar-fates-cover.png',
    summary: 'Trace constellations in the right order before the stars fade. Every wrong connection brings their end closer.',
    highlights: ['12 zodiac signs and 8 mythic constellations', 'A timer pressure mechanic: stars dim every second'],
    media: [1, 2, 3].map((i) => ({ type: 'image' as const, src: `${J}stellar-fates-${i}.jpg`, alt: `Stellar Fates screenshot ${i}` })),
    links: [{ label: 'Play in browser', url: 'https://jemydev.itch.io/stellar-fates', kind: 'play' }],
  }),
  jam({
    id: 'fishin',
    title: "Where Ya Fishin'",
    subtitle: 'Chill pixel-art fishing sim',
    year: '2026',
    jam: 'Brackeys Game Jam 2026.1',
    theme: 'Strange Places',
    engine: 'Unity',
    platform: 'Browser · Windows',
    tech: ['Unity', 'C#', 'Pixel art', 'WebGL'],
    cover: J + 'where-ya-fishin-cover.png',
    summary: 'Fish in strange places, reel in rare and legendary catches, upgrade your rod, line, bait and hook, and show off your best fish in your own aquarium.',
    highlights: ['Upgrade progression and an aquarium collection', 'Achievements as your collection grows'],
    media: [1, 2, 3].map((i) => ({ type: 'image' as const, src: `${J}where-ya-fishin-${i}.jpg`, alt: `Where Ya Fishin' screenshot ${i}` })),
    links: [{ label: 'Play in browser', url: 'https://jemydev.itch.io/where-ya-fishin', kind: 'play' }],
  }),
  jam({
    id: 'abnormalos',
    title: 'Abnormal OS',
    subtitle: 'Glitchy desktop-simulator puzzles',
    year: '2025',
    jam: 'Patch Notes v1.0 Jam',
    theme: 'The Error is the Feature',
    engine: 'Unity',
    platform: 'Browser · Windows',
    tech: ['Unity', 'C#', 'WebGL'],
    cover: J + 'abnormal-os-cover.jpg',
    summary: 'A chaotic desktop where the glitches are the challenge: resize, drag, chase and outsmart rebellious windows and buttons to find each level’s buggy twist.',
    highlights: ['Every level is a different "bug" turned into a mechanic'],
    media: [1, 2, 3].map((i) => ({ type: 'image' as const, src: `${J}abnormal-os-${i}.jpg`, alt: `Abnormal OS screenshot ${i}` })),
    links: [{ label: 'Play in browser', url: 'https://jemydev.itch.io/abnormal-os', kind: 'play' }],
  }),
  jam({
    id: 'cookiestd',
    title: 'CookiesTD',
    subtitle: '3D survival tower defense',
    year: '2025',
    jam: 'Brackeys Game Jam 2025.2',
    theme: 'Risk it for the Biscuit',
    engine: 'Unity',
    platform: 'Browser',
    tech: ['Unity', 'C#', '3D', 'Online leaderboard'],
    cover: J + 'cookiestd-cover.png',
    summary: 'Waves of quirky enemies come to steal your cookies. Spend biscuits to power up, gamble them on random events and survive as long as you can.',
    highlights: ['A risk-and-reward economy where your currency is also your health', 'An online leaderboard'],
    media: [1, 2, 3].map((i) => ({ type: 'image' as const, src: `${J}cookiestd-${i}.jpg`, alt: `CookiesTD screenshot ${i}` })),
    links: [{ label: 'Play in browser', url: 'https://jemydev.itch.io/cookiestd', kind: 'play' }],
  }),
  jam({
    id: 'waves',
    title: 'Waves Survival',
    subtitle: '3D wave survival with evolving powers',
    year: '2025',
    jam: 'Chili Code Jam #3',
    theme: 'Waves',
    engine: 'Unity',
    platform: 'Browser',
    tech: ['Unity', 'C#', '3D', 'Online leaderboard'],
    cover: J + 'waves-survival-cover.png',
    summary: 'Face endless waves with evolving powers: chain lightning, zones of wrath, spinning blades and more. Combine skills and see how long you last.',
    highlights: ['Combinable skill upgrades', 'An online leaderboard'],
    media: [1, 2, 3].map((i) => ({ type: 'image' as const, src: `${J}waves-survival-${i}.jpg`, alt: `Waves Survival screenshot ${i}` })),
    links: [{ label: 'Play in browser', url: 'https://jemydev.itch.io/waves-survival', kind: 'play' }],
  }),
  jam({
    id: 'dungeonloop',
    title: 'Dungeon Loop',
    subtitle: 'Turn-based time-loop puzzle',
    year: '2025',
    jam: 'GMTK Game Jam 2025',
    theme: 'Loop',
    engine: 'Unity',
    platform: 'Browser',
    tech: ['Unity', 'C#', '3D', 'Grid puzzles'],
    cover: J + 'dungeon-loop-cover.png',
    summary: 'A grid-based puzzle where your past actions loop and replay on later turns. Cooperate with echoes of yourself to hit switches, dodge traps and escape.',
    highlights: ['Echo replay system: each loop records and replays your moves', 'A rotatable 3D camera'],
    media: [{ type: 'image', src: J + 'dungeon-loop-cover.png', alt: 'Dungeon Loop cover' }],
    links: [{ label: 'Play in browser', url: 'https://jemydev.itch.io/dungeon-loop', kind: 'play' }],
  }),
];

// Branded mini games built at Youniverse Games for MDEC's Businesses in Metaverse (BiM) programme.
// They run inside Yooca: Your Life; the WebGL builds need a Yooca sign-in.
const W = M + 'work/';
const BIM = 'https://mdec.my/ip360-metaverse';
const work = (p: Omit<Project, 'category' | 'year' | 'engine' | 'status'> & { play: string }): Project => {
  const { play, ...rest } = p;
  return {
    ...rest,
    category: 'work',
    year: '2025',
    engine: 'Unity 6',
    status: 'Live in Yooca: Your Life',
    links: [
      { label: 'Play in browser (Yooca sign-in)', url: `https://webgl.youniverse.game/${play}/`, kind: 'play' },
      ...p.links,
      { label: 'About the BiM programme', url: BIM, kind: 'info' },
    ],
  };
};

export const WORK: Project[] = [
  work({
    id: 'picklesmash',
    play: 'pickleball',
    title: 'Pickle Smash',
    subtitle: 'Pickleball game for The Pickle Grounds · Businesses in Metaverse',
    role: 'Unity developer · Youniverse Games',
    platform: 'Yooca (PC) · Browser (WebGL)',
    tech: ['Unity 6', 'C#', '3D', 'AI opponents'],
    cover: W + 'pickle-title.webp',
    summary:
      'A 3D pickleball match against the computer, made for The Pickle Grounds. It follows the real rules: serve diagonally, only the serving side scores, and games go to 11, win by 2.',
    highlights: [
      'Easy, Normal and Hard bots to play against',
      'Move with WASD, and hit a backhand or forehand with the left or right mouse button',
      'Real pickleball serving, scoring and fault rules, explained in a How to Play screen',
    ],
    media: [
      { type: 'image', src: W + 'pickle-match.webp', alt: 'A match against the bot' },
      { type: 'image', src: W + 'pickle-title.webp', alt: 'Title screen' },
      { type: 'image', src: W + 'pickle-bots.webp', alt: 'Choosing a bot difficulty' },
      { type: 'image', src: W + 'pickle-rules.webp', alt: 'How to Play: serving and scoring rules' },
    ],
    links: [],
  }),
  work({
    id: 'chickendash',
    play: 'chickendash',
    title: 'Chicken Dash',
    subtitle: 'Crossy-road style game for Chicago Chicken City · Businesses in Metaverse',
    role: 'Unity developer · Youniverse Games',
    platform: 'Yooca (PC) · Browser (WebGL)',
    tech: ['Unity 6', 'C#', '3D', 'Procedural lanes'],
    cover: W + 'chicken-title.webp',
    summary:
      "Hop the restaurant's chicken mascot across roads full of traffic and rivers of drifting logs. Play for distance, or race the clock delivering the restaurant's real menu items.",
    highlights: [
      'Endless mode: lanes of roads, rivers and trees keep coming, and your score is how far you get',
      'Timed Order Delivery mode: pick up orders at the restaurant and drop them off before the timer runs out',
      'Orders are dishes from the Chicago Chicken City menu',
    ],
    media: [
      { type: 'image', src: W + 'chicken-delivery.webp', alt: 'Timed Order Delivery mode' },
      { type: 'image', src: W + 'chicken-title.webp', alt: 'Title screen' },
      { type: 'image', src: W + 'chicken-endless.webp', alt: 'Endless mode' },
    ],
    links: [],
  }),
  work({
    id: 'tunetalk',
    play: 'tunetalk',
    title: 'Tune Talk',
    subtitle: 'Tunnel runner for Tune Talk · Businesses in Metaverse',
    role: 'Unity developer · Youniverse Games',
    platform: 'Yooca (PC) · Browser (WebGL)',
    tech: ['Unity 6', 'C#', '3D'],
    cover: W + 'tunetalk-title.webp',
    summary:
      "Ride Tune Talk's mascot down a speeding tunnel, surfing around it to dodge obstacles and collecting mobile data along the way.",
    highlights: [
      'Steer with the arrow keys to surf around the tunnel, and press up to jump',
      'Speed builds as you go, with distance, time and data collected shown on screen',
      'Levels to choose from, starting with Malaysia',
      'A Top Runners leaderboard, plus Mission and Tutorial screens',
    ],
    media: [
      { type: 'image', src: W + 'tunetalk-run.webp', alt: 'Running down the tunnel' },
      { type: 'image', src: W + 'tunetalk-title.webp', alt: 'Title screen' },
      { type: 'image', src: W + 'tunetalk-levels.webp', alt: 'Level select and the Top Runners leaderboard' },
      { type: 'image', src: W + 'tunetalk-tutorial.webp', alt: 'Tutorial' },
    ],
    links: [],
  }),
  work({
    id: 'recode',
    play: 'recode',
    title: 'RE:CODE',
    subtitle: 'Dimension-switching platformer for MinistryXR · Businesses in Metaverse',
    role: 'Unity developer · Youniverse Games',
    platform: 'Yooca (PC) · Browser (WebGL)',
    tech: ['Unity 6', 'C#', '2D platformer'],
    cover: W + 'recode-title.webp',
    summary:
      'A neon platformer built around one mechanic: press Space to switch between an orange and a blue dimension on your way to the exit.',
    highlights: [
      'Switch between the orange and blue dimensions with Space',
      'Three hearts and a timer',
      'Move with WASD or the arrow keys',
    ],
    media: [
      { type: 'image', src: W + 'recode-orange.webp', alt: 'The orange dimension' },
      { type: 'image', src: W + 'recode-blue.webp', alt: 'The same room in the blue dimension' },
      { type: 'image', src: W + 'recode-title.webp', alt: 'Title screen' },
    ],
    links: [],
  }),
  work({
    id: 'rhythmnova',
    play: 'rhythmnova',
    title: 'RhythmNova',
    subtitle: 'Two-lane rhythm game · Businesses in Metaverse',
    role: 'Unity developer · Youniverse Games',
    platform: 'Yooca (PC) · Browser (WebGL)',
    tech: ['Unity 6', 'C#', 'Audio sync'],
    cover: W + 'rhythm-songs.webp',
    summary: 'Hit the notes in time as they scroll into two lanes. Pick from 8 songs, each with its own BPM and a difficulty from 1 to 5.',
    highlights: [
      'Two lanes, played with the F and J keys',
      '8 songs from 42 seconds to 1:20 long, each rated 1 to 5 for difficulty',
      'A song preview with BPM, difficulty and length before you start',
      'Score and hit feedback, with an optional hit sound',
    ],
    media: [
      { type: 'image', src: W + 'rhythm-play.webp', alt: 'Playing a song' },
      { type: 'image', src: W + 'rhythm-songs.webp', alt: 'Song list' },
      { type: 'image', src: W + 'rhythm-select.webp', alt: 'Song preview with BPM and difficulty' },
    ],
    links: [],
  }),
];

export const ALL_PROJECTS = [...PROJECTS, ...WORK, ...SIDE, ...JAMS];
export const projectById = (id: string) => ALL_PROJECTS.find((p) => p.id === id);

export const EXPERIENCE = [
  {
    company: 'Youniverse Games Sdn. Bhd.',
    role: 'Junior Unity Game Developer',
    period: 'Sept 2025 – Present',
    points: [
      'Built mini games for Chicago Chicken City, GTRecords, Alicafé, MinistryXR, The Pickle Grounds and Tune Talk for Businesses In Metaverse, an MDEC programme',
      'Built a soccer mini game with AI goalies and a leaderboard for FIFA 2026',
      'Built interactions such as a ride-able carousel and eating and drinking, animated with Final IK',
      'Built a trophy system where players unlock trophies and display them in their apartment, and a fish-mount system for showing off catches',
      'Built an item-decay system for the inventory, paired with fridges that slow the decay',
      'Helped build the onboarding that teaches new players how to play',
    ],
  },
  {
    company: 'Youniverse Games Sdn. Bhd.',
    role: 'Intern · Junior Unity Game Developer',
    period: 'Feb 2025 – July 2025',
    points: [
      'Built a fishing mini game with full progression: equipment, an encyclopedia, weekly competitions and a versus mode',
      'Built a rhythm game with combos, stats and rankings',
      'Built a Final IK look-at system so the player turns to look at nearby interactable objects',
    ],
  },
];

export const EDUCATION = [
  {
    school: 'Tunku Abdul Rahman University of Management and Technology (TARUMT)',
    course: 'Bachelor of Computer Science (Hons) in Interactive Software Technology',
    period: 'June 2023 – July 2025',
    grade: 'Distinction · CGPA 3.87',
  },
  {
    school: 'Tunku Abdul Rahman University of Management and Technology (TARUMT)',
    course: 'Diploma in Computer Science',
    period: 'June 2021 – June 2023',
    grade: 'CGPA 3.98',
  },
];

// level is a 1–5 rating shown as filled pips.
export const SKILLS: { group: string; items: { name: string; level: number; note?: string }[] }[] = [
  {
    group: 'Game engines',
    items: [
      { name: 'Unity', level: 5, note: 'Day job + every solo game' },
      { name: 'Unity multiplayer', level: 4, note: 'Mirror, Netcode for GameObjects, Lobby & Relay' },
      { name: 'Unity XR (VR / AR)', level: 4 },
      { name: 'Unreal Engine', level: 2 },
      { name: 'Blender', level: 3 },
    ],
  },
  {
    group: 'Languages',
    items: [
      { name: 'C#', level: 5 },
      { name: 'C++', level: 3 },
      { name: 'Java', level: 3 },
      { name: 'Python', level: 3 },
      { name: 'TypeScript / HTML', level: 3 },
      { name: 'Kotlin', level: 2 },
      { name: 'Assembly', level: 2 },
    ],
  },
  {
    group: 'Tools & workflow',
    items: [
      { name: 'Claude Code', level: 5, note: 'Experienced daily user' },
      { name: 'Git / GitHub', level: 4 },
      { name: 'Final IK', level: 4 },
    ],
  },
];

export const LANGUAGES = ['English', 'Chinese', 'Malay', 'Cantonese', 'Japanese'];
