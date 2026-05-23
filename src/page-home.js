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
let badgeReady = false;

function nextTilt() {
  tiltIdx = (tiltIdx + Math.floor(Math.random() * (TILTS.length - 1)) + 1) % TILTS.length;
  return TILTS[tiltIdx];
}

// Badge entry: JS-controlled so CSS transition owns transform thereafter
if (badgeWrap) {
  setTimeout(() => {
    badgeWrap.style.transform = `rotate(${TILTS[tiltIdx]}deg)`;
    badgeWrap.style.opacity   = '1';
    badgeReady = true;
  }, 900);
}

function applyBadgeStyle(n) {
  const isBlack = n.badgeColor === 'black';
  const strikeCol  = isBlack ? '#2a1a1a' : '#c1121f';
  const imposedCol = isBlack ? '#1a0808' : '#c1121f';
  if (badgeEl)   badgeEl.style.color = imposedCol;
  if (badgeTwEl) badgeTwEl.style.textDecorationColor = strikeCol;
}

function cycleName() {
  const n = NAMES[ni % NAMES.length];
  nameEl.style.opacity = '0';
  ctxEl.style.opacity  = '0';
  if (badgeReady && badgeWrap) badgeWrap.style.opacity = '0';

  setTimeout(() => {
    nameEl.textContent = n.text;
    ctxEl.textContent  = n.ctx;
    nameEl.style.color = n.color;
    document.documentElement.style.setProperty('--cc', n.color);
    nameEl.style.opacity = '1';
    ctxEl.style.opacity  = '1';

    if (badgeEl) badgeEl.textContent = n.text;
    applyBadgeStyle(n);

    if (badgeReady && badgeWrap) {
      badgeWrap.style.transform = `rotate(${nextTilt()}deg)`;
      badgeWrap.style.opacity   = '1';
    }
  }, 350);
  ni++;
}

cycleName();
setInterval(cycleName, 3200);

// ── TopoJSON shared fetch ─────────────────────────────────────────────────────
const ALLIES = new Set([84, 320, 332, 340, 584, 520, 585, 600, 659, 662, 670, 798, 336]);

const TINY_DOTS = [
  { lon:  166.9, lat:  -0.5 },  // Nauru
  { lon:  179.2, lat:  -8.5 },  // Tuvalu
  { lon:  134.6, lat:   7.5 },  // Palau
  { lon:  171.2, lat:   7.1 },  // Marshall Islands
  { lon:  -62.7, lat:  17.3 },  // St Kitts & Nevis
  { lon:  -61.0, lat:  13.9 },  // St Lucia
  { lon:  -61.2, lat:  13.3 },  // St Vincent & Grenadines
  { lon:   12.5, lat:  41.9 },  // Vatican City
];

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

  TINY_DOTS.forEach(({ lon, lat }) => {
    const x = xS(lon), y = yS(lat);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
    g.addColorStop(0, 'rgba(58,134,255,0.85)');
    g.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#3a86ff'; ctx.fill();
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
