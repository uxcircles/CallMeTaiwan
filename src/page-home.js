import './nav.js';

// ── Name cycling ──────────────────────────────────────────────────────────────
const NAMES = [
  { text: '"Chinese Taipei"',              ctx: 'Olympics & international sports · imposed 1981', color: '#e63946', badgeColor: 'red'   },
  { text: 'Republic of China',             ctx: 'On the passport · inherited name from 1912',     color: '#8888aa', badgeColor: 'black' },
  { text: '"Taiwan, Province of China"',   ctx: 'Some UN agencies & forms · pushed by Beijing',   color: '#c1121f', badgeColor: 'red'   },
];

let ni = 0;
const nameEl      = document.getElementById('hs-name');
const ctxEl       = document.getElementById('hs-ctx');
const badgeEl     = document.getElementById('hs-badge-name');
const badgeWrap   = document.getElementById('hs-badge');
const badgeTwEl   = document.querySelector('.hs-badge-taiwan');

// Tilt angles — varied mix, never the same twice in a row
const TILTS = [-6, -3, -8, 3, -5, 2, -7, 4, -4];
let tiltIdx  = 0;

function nextTilt() {
  tiltIdx = (tiltIdx + Math.floor(Math.random() * (TILTS.length - 1)) + 1) % TILTS.length;
  return TILTS[tiltIdx];
}

// Badge — static, always "Chinese Taipei" (most iconic imposed name).
// The cycling happens only in the left text panel; the badge is a permanent symbol.
const BADGE_FIXED = NAMES[0]; // '"Chinese Taipei"', badgeColor: 'red'
if (badgeEl) {
  badgeEl.textContent = BADGE_FIXED.text;
  badgeEl.style.color = '#c1121f';
}
if (badgeTwEl) badgeTwEl.style.textDecorationColor = '#c1121f';

if (badgeWrap) {
  setTimeout(() => {
    badgeWrap.style.transform = `rotate(${TILTS[tiltIdx]}deg)`;
    badgeWrap.style.opacity   = '1';
  }, 900);
}

function cycleName() {
  const n = NAMES[ni % NAMES.length];
  nameEl.style.opacity = '0';
  ctxEl.style.opacity  = '0';

  setTimeout(() => {
    nameEl.textContent = n.text;
    ctxEl.textContent  = n.ctx;
    nameEl.style.color = n.color;
    document.documentElement.style.setProperty('--cc', n.color);
    nameEl.style.opacity = '1';
    ctxEl.style.opacity  = '1';
  }, 350);
  ni++;
}

cycleName();
setInterval(cycleName, 3200);

// ── TopoJSON shared fetch ─────────────────────────────────────────────────────
// Ally data: id = ISO numeric, dot = needs radial-gradient dot (tiny island),
// flagLon/flagLat = optional display offset so flags don't overlap
// Current as of 2025: 12 allies
// Removed: Honduras (broke ties Mar 2023), Nauru (broke ties Jan 2024)
// Added: Eswatini (Africa's only ally)
const ALLY_INFO = [
  { id: 84,  flag: '🇧🇿', lon: -88.5, lat:  17.2 },                              // Belize
  { id: 748, flag: '🇸🇿', lon:  31.5, lat: -26.5 },                              // Eswatini
  { id: 320, flag: '🇬🇹', lon: -90.3, lat:  15.8 },                              // Guatemala
  { id: 332, flag: '🇭🇹', lon: -73.0, lat:  18.9 },                              // Haiti
  { id: 600, flag: '🇵🇾', lon: -58.0, lat: -23.3 },                              // Paraguay
  { id: 584, flag: '🇲🇭', lon: 171.2, lat:   7.1, dot: true },                   // Marshall Islands
  { id: 585, flag: '🇵🇼', lon: 134.6, lat:   7.5, dot: true },                   // Palau
  { id: 659, flag: '🇰🇳', lon: -62.7, lat:  17.3, dot: true, flagLat: 18.1 },   // St Kitts & Nevis
  { id: 662, flag: '🇱🇨', lon: -61.0, lat:  13.9, dot: true, flagLat: 14.7 },   // St Lucia
  { id: 670, flag: '🇻🇨', lon: -61.2, lat:  13.3, dot: true, flagLat: 12.5 },   // St Vincent & Grenadines
  { id: 798, flag: '🇹🇻', lon: 179.2, lat:  -8.5, dot: true },                   // Tuvalu
  { id: 336, flag: '🇻🇦', lon:  12.5, lat:  41.9, dot: true },                   // Vatican City
];
const ALLIES = new Set(ALLY_INFO.map(a => a.id));

function decodeTopo(topo, name) {
  const { scale: s, translate: t } = topo.transform;
  function decArc(i) {
    const rev = i < 0, src = topo.arcs[rev ? ~i : i];
    let x = 0, y = 0;
    const pts = src.map(([dx, dy]) => [(x += dx)*s[0]+t[0], (y += dy)*s[1]+t[1]]);
    return rev ? pts.slice().reverse() : pts;
  }
  const polys = [];
  topo.objects[name].geometries.forEach(g => {
    const id = +g.id;
    const rings = g.type === 'Polygon'      ? g.arcs
                : g.type === 'MultiPolygon' ? g.arcs.flat() : [];
    rings.forEach(r => polys.push({ ring: r.flatMap(decArc), id }));
  });
  return polys;
}

// Single fetch, shared by both canvases
let topoPromise = null;
function getTopoData() {
  if (!topoPromise) {
    topoPromise = fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .catch(() => null);
  }
  return topoPromise;
}

// ── Hero: Taiwan shape from local SVG via Path2D ─────────────────────────────
let svgPaths = null; // cache parsed paths

async function drawTaiwanSvg(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = canvas.offsetHeight;
  if (!W || !H) return;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Fetch + parse SVG once
  if (!svgPaths) {
    const res = await fetch('/taiwan.svg');
    const txt = await res.text();
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');

    // IDs: TW-TP (Taipei), TW-TW (Taiwan Province incl. Penghu),
    //       TW-KH (Kaohsiung), TW-FK (Kinmen+Matsu — exclude)
    const paths = [...doc.querySelectorAll('path')]
      .filter(p => p.id !== 'TW-FK')
      .map(p => p.getAttribute('d') || '')
      .filter(Boolean);

    svgPaths = { paths };
  }

  const { paths } = svgPaths;

  // Bounding box extended west to include Penghu (lon≈119.4°E → SVG x≈110)
  // geoViewBox: lon 118.15→122.01 lat 26.38→21.90 → SVG 437×555
  const minX = 110, maxX = 437, minY = 100, maxY = 555;
  const cx = (minX + maxX) / 2;   // 273.5
  const cy = (minY + maxY) / 2;   // 327.5
  const bw = maxX - minX;         // 327
  const bh = maxY - minY;         // 455
  const sc = Math.min(W / bw, H / bh) * 0.92;
  const tx = W / 2 - cx * sc;
  const ty = H / 2 - cy * sc;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(sc, sc);

  // Fill only — no per-path stroke, so Taipei/Kaohsiung seam lines disappear.
  // Shadow creates a soft outer glow at the true coastline.
  ctx.shadowColor = 'rgba(190,190,215,0.65)';
  ctx.shadowBlur  = 14;          // screen-space pixels (not divided by sc)
  ctx.fillStyle   = 'rgba(150,150,175,0.10)';

  paths.forEach(d => {
    try { ctx.fill(new Path2D(d)); } catch (_) {}
  });

  ctx.restore();
}

const twCanvas = document.getElementById('hs-taiwan-canvas');
if (twCanvas) {
  drawTaiwanSvg(twCanvas).catch(() => {});
  window.addEventListener('resize', () => drawTaiwanSvg(twCanvas).catch(() => {}));
}

// ── Recognition map ───────────────────────────────────────────────────────────
function drawMap(canvas, polygons) {
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = canvas.offsetHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const px = W * 0.005, py = H * 0.03;
  const iW = W - px * 2, iH = H - py * 2;
  const xS = lon => px + (lon + 180) / 360 * iW;
  const yS = lat => py + (90 - lat) / 180 * iH;

  ctx.fillStyle = '#07070f';
  ctx.fillRect(0, 0, W, H);

  polygons.forEach(({ ring, id }) => {
    if (id === 10) return;           // hide Antarctica
    const ally = ALLIES.has(id);
    const tw   = id === 158;

    ctx.beginPath();
    let mv = true, prevLon = null;
    for (const [lon, lat] of ring) {
      if (prevLon !== null && Math.abs(lon - prevLon) > 180) mv = true;
      mv ? (ctx.moveTo(xS(lon), yS(lat)), mv = false) : ctx.lineTo(xS(lon), yS(lat));
      prevLon = lon;
    }
    ctx.closePath();

    if (tw) {
      ctx.fillStyle   = 'rgba(58,134,255,0.60)';
      ctx.strokeStyle = 'rgba(58,134,255,0.95)';
      ctx.lineWidth   = 1.5;
    } else if (ally) {
      ctx.fillStyle   = 'rgba(58,134,255,0.25)';
      ctx.strokeStyle = 'rgba(58,134,255,0.60)';
      ctx.lineWidth   = 0.8;
    } else {
      ctx.fillStyle   = 'rgba(14,14,38,0.95)';
      ctx.strokeStyle = 'rgba(42,42,80,0.40)';
      ctx.lineWidth   = 0.35;
    }
    ctx.fill();
    ctx.stroke();
  });

  // Ally dots + flag emoji
  ctx.font = '13px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ALLY_INFO.forEach(({ lon, lat, flag, dot, flagLat }) => {
    const x = xS(lon), y = yS(lat);
    if (dot) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, 'rgba(58,134,255,0.85)');
      g.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#3a86ff'; ctx.fill();
    }
    // Draw flag emoji (use flagLat offset if supplied, else default above dot/centroid)
    const fy = flagLat != null ? yS(flagLat) : (dot ? y - 11 : y - 9);
    ctx.fillText(flag, x, fy);
  });

  const tx = xS(121), ty = yS(23.5);
  const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 12);
  tg.addColorStop(0, 'rgba(58,134,255,0.90)');
  tg.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(tx, ty, 12, 0, Math.PI * 2);
  ctx.fillStyle = tg; ctx.fill();
  ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#3a86ff'; ctx.fill();
}

const mapCanvas = document.getElementById('rec-map');
if (mapCanvas) {
  let polygons = null;
  function renderMap() { if (polygons) drawMap(mapCanvas, polygons); }

  const io = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    getTopoData().then(topo => {
      if (!topo) return;
      polygons = decodeTopo(topo, 'countries');
      renderMap();
      window.addEventListener('resize', renderMap);
    });
  }, { threshold: 0.1 });

  io.observe(mapCanvas);
}

// ── Clickable scroll arrow ────────────────────────────────────────────────────
const scrollArrow = document.querySelector('.hs-scroll');
if (scrollArrow) {
  scrollArrow.addEventListener('click', () => {
    document.querySelector('.hs-map-section')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// ── Scroll-reveal ─────────────────────────────────────────────────────────────
// Observe the *section* (large target, reliable hit) → animate the *inner* container.
// threshold: 0 fires as soon as 1px of the section enters the viewport.
function revealOn(sectionSel, innerSel) {
  const section = document.querySelector(sectionSel);
  const inner   = document.querySelector(innerSel);
  if (!section || !inner) return;
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    inner.classList.add('sr--in');
  }, { threshold: 0, rootMargin: '0px 0px -80px 0px' }).observe(section);
}

revealOn('.hs-map-section', '.hs-map-inner');
revealOn('.hs-nav-section', '.hs-nav-inner');
