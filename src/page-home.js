import './nav.js';

// ── Name cycling ──────────────────────────────────────────────────────────────
const NAMES = [
  { text: '"Chinese Taipei"',              ctx: 'Olympics & international sports · not chosen · 1981', color: '#e63946', badgeColor: 'red'   },
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

// Badge imposed name syncs with left-side cycling

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
  if (badgeEl) badgeEl.style.opacity = '0';

  setTimeout(() => {
    nameEl.textContent = n.text;
    ctxEl.textContent  = n.ctx;
    nameEl.style.color = n.color;
    document.documentElement.style.setProperty('--cc', n.color);
    nameEl.style.opacity = '1';
    ctxEl.style.opacity  = '1';
    if (badgeEl) {
      badgeEl.textContent = n.text.replace(/"/g, '');
      badgeEl.style.opacity = '1';
    }
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

  // Fill pass — blue, consistent with globe colour. Shadow = outer glow.
  ctx.shadowColor = 'rgba(58,134,255,0.30)';
  ctx.shadowBlur  = 18;
  ctx.fillStyle   = 'rgba(58,134,255,0.18)';
  paths.forEach(d => { try { ctx.fill(new Path2D(d)); } catch (_) {} });

  // Stroke pass — coastline outline, no shadow so seam lines stay invisible.
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = 'rgba(58,134,255,0.65)';
  ctx.lineWidth   = 1.5 / sc;
  paths.forEach(d => { try { ctx.stroke(new Path2D(d)); } catch (_) {} });

  ctx.restore();
}

const twCanvas = document.getElementById('hs-taiwan-canvas');
if (twCanvas) {
  drawTaiwanSvg(twCanvas).catch(() => {});
  window.addEventListener('resize', () => drawTaiwanSvg(twCanvas).catch(() => {}));
}

// ── Rotating globe ────────────────────────────────────────────────────────────
let globeLon = 120;   // start centred on Taiwan
let globeLat = 20;    // slight northern tilt
let globeDragging = false;
let globeDragX = 0, globeDragY = 0, globeDragLon = 0, globeDragLat = 0;

function drawGlobe(canvas, polygons, lon0, lat0) {
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.width  / dpr;
  const H   = canvas.height / dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // reset + apply DPR scale

  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) / 2 - 4;
  const φ0 = lat0 * Math.PI / 180;
  const λ0 = lon0 * Math.PI / 180;

  function project(lon, lat) {
    const φ  = lat * Math.PI / 180;
    const λ  = lon * Math.PI / 180;
    const dλ = λ - λ0;
    const cosφ = Math.cos(φ), sinφ = Math.sin(φ);
    const cosφ0 = Math.cos(φ0), sinφ0 = Math.sin(φ0);
    return {
      x: cx + R * cosφ * Math.sin(dλ),
      y: cy - R * (cosφ0 * sinφ - sinφ0 * cosφ * Math.cos(dλ)),
      z: sinφ0 * sinφ + cosφ0 * cosφ * Math.cos(dλ),   // > 0 = front hemisphere
    };
  }

  ctx.clearRect(0, 0, W, H);

  // Atmosphere glow
  const atm = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.18);
  atm.addColorStop(0,   'rgba(58,134,255,0.00)');
  atm.addColorStop(0.5, 'rgba(58,134,255,0.08)');
  atm.addColorStop(1,   'rgba(58,134,255,0.00)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
  ctx.fillStyle = atm; ctx.fill();

  // Clip everything inside the globe circle
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

  // Ocean
  ctx.fillStyle = '#07070f';
  ctx.fillRect(0, 0, W, H);

  // Graticule — lon lines every 30°, lat lines every 30°
  ctx.strokeStyle = 'rgba(42,42,80,0.45)';
  ctx.lineWidth   = 0.4;
  for (let lon = -180; lon < 180; lon += 30) {
    ctx.beginPath();
    let first = true;
    for (let lat = -90; lat <= 90; lat += 2) {
      const p = project(lon, lat);
      if (p.z > 0) { first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); first = false; }
      else first = true;
    }
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    let first = true;
    for (let lon = -180; lon <= 180; lon += 2) {
      const p = project(lon, lat);
      if (p.z > 0) { first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); first = false; }
      else first = true;
    }
    ctx.stroke();
  }

  // Countries
  polygons.forEach(({ ring, id }) => {
    if (id === 10) return;   // Antarctica
    const ally = ALLIES.has(id);
    const tw   = id === 158;

    // Skip rings entirely on the back hemisphere.
    const pts = ring.map(([lon, lat]) => project(lon, lat));
    if (!pts.some(p => p.z > 0)) return;

    // Sutherland-Hodgman clip to the visible hemisphere (z > 0).
    // Tag limb-crossing points so we can arc along the globe rim between
    // consecutive limb points instead of drawing a chord through the interior.
    const cl = [];
    const n  = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if (a.z > 0) {
        cl.push({ x: a.x, y: a.y, onLimb: false });
        if (b.z <= 0) {
          const t = a.z / (a.z - b.z);
          cl.push({ x: a.x + t*(b.x-a.x), y: a.y + t*(b.y-a.y), onLimb: true });
        }
      } else if (b.z > 0) {
        const t = a.z / (a.z - b.z);
        cl.push({ x: a.x + t*(b.x-a.x), y: a.y + t*(b.y-a.y), onLimb: true });
      }
    }
    if (cl.length < 3) return;

    // Draw the shorter arc along the globe rim between two limb crossing points.
    function limbArc(p1, p2) {
      const a1 = Math.atan2(p1.y - cy, p1.x - cx);
      const a2 = Math.atan2(p2.y - cy, p2.x - cx);
      let da = a2 - a1;
      if (da >  Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      ctx.arc(cx, cy, R, a1, a2, da < 0);
    }

    ctx.beginPath();
    ctx.moveTo(cl[0].x, cl[0].y);
    for (let i = 1; i < cl.length; i++) {
      const p = cl[i - 1], c = cl[i];
      if (p.onLimb && c.onLimb) limbArc(p, c);
      else ctx.lineTo(c.x, c.y);
    }
    // Closing edge (last → first): arc along the rim if both are limb points.
    if (cl[cl.length - 1].onLimb && cl[0].onLimb) limbArc(cl[cl.length - 1], cl[0]);
    ctx.closePath();

    if (tw) {
      ctx.fillStyle = 'rgba(58,134,255,0.70)'; ctx.strokeStyle = 'rgba(58,134,255,1.00)'; ctx.lineWidth = 1.5;
    } else if (ally) {
      ctx.fillStyle = 'rgba(58,134,255,0.28)'; ctx.strokeStyle = 'rgba(58,134,255,0.65)'; ctx.lineWidth = 0.8;
    } else {
      ctx.fillStyle = 'rgba(20,20,50,0.95)';   ctx.strokeStyle = 'rgba(42,42,80,0.50)';   ctx.lineWidth = 0.3;
    }
    ctx.fill(); ctx.stroke();
  });

  // Glow dots for tiny island allies — darker blue, distinct from Taiwan
  ALLY_INFO.forEach(({ lon, lat, dot }) => {
    if (!dot) return;
    const p = project(lon, lat);
    if (p.z <= 0) return;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
    g.addColorStop(0, 'rgba(58,134,255,0.40)'); g.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(58,134,255,0.65)'; ctx.fill();
  });

  ctx.restore();   // remove clip

  // Globe rim
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(58,134,255,0.20)'; ctx.lineWidth = 1.5; ctx.stroke();
}

const globeCanvas = document.getElementById('rec-map');
if (globeCanvas) {
  let polygons = null;

  function tick() {
    // Sync canvas pixel size to its CSS size
    const dpr = window.devicePixelRatio || 1;
    const cw  = globeCanvas.offsetWidth  * dpr;
    const ch  = globeCanvas.offsetHeight * dpr;
    if (globeCanvas.width !== cw || globeCanvas.height !== ch) {
      globeCanvas.width  = cw;
      globeCanvas.height = ch;
    }
    if (!globeDragging) globeLon = (globeLon + 0.12) % 360;
    if (polygons) drawGlobe(globeCanvas, polygons, globeLon, globeLat);
    requestAnimationFrame(tick);
  }

  // Mouse drag
  globeCanvas.addEventListener('mousedown', e => {
    globeDragging = true;
    globeDragX = e.clientX; globeDragY = e.clientY;
    globeDragLon = globeLon; globeDragLat = globeLat;
  });
  window.addEventListener('mousemove', e => {
    if (!globeDragging) return;
    globeLon = globeDragLon - (e.clientX - globeDragX) * 0.35;
    globeLat = Math.max(-70, Math.min(70, globeDragLat + (e.clientY - globeDragY) * 0.25));
  });
  window.addEventListener('mouseup', () => { globeDragging = false; });

  // Touch drag
  globeCanvas.addEventListener('touchstart', e => {
    globeDragging = true;
    globeDragX = e.touches[0].clientX; globeDragY = e.touches[0].clientY;
    globeDragLon = globeLon; globeDragLat = globeLat;
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (!globeDragging) return;
    globeLon = globeDragLon - (e.touches[0].clientX - globeDragX) * 0.35;
    globeLat = Math.max(-70, Math.min(70, globeDragLat + (e.touches[0].clientY - globeDragY) * 0.25));
  }, { passive: true });
  window.addEventListener('touchend', () => { globeDragging = false; });

  // Lazy-start: begin animating when the canvas enters the viewport
  new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    getTopoData().then(topo => {
      if (!topo) return;
      polygons = decodeTopo(topo, 'countries');
      tick();
    });
  }, { threshold: 0.1 }).observe(globeCanvas);
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

revealOn('.hs-analogy-section', '.hs-analogy-inner');
revealOn('.hs-map-section', '.hs-map-inner');
revealOn('.hs-stakes-section', '.hs-stakes-inner');
revealOn('.hs-nav-section', '.hs-nav-inner');

// Stakes counter animation
function animateCount(el, target, suffix, delay, duration = 1200) {
  setTimeout(() => {
    const start = performance.now();
    const tick = now => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, delay);
}

// Map section counter (12 countries)
const mapSection = document.querySelector('.hs-map-section');
if (mapSection) {
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    const el = mapSection.querySelector('.hs-map-n[data-count]');
    if (el) animateCount(el, +el.dataset.count, '', 0, 1000);
  }, { threshold: 0, rootMargin: '0px 0px -80px 0px' }).observe(mapSection);
}

const stakesSection = document.querySelector('.hs-stakes-section');
if (stakesSection) {
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    stakesSection.querySelectorAll('.hs-stake-n[data-count]').forEach((el, i) => {
      animateCount(el, +el.dataset.count, el.dataset.suffix || '', i * 160);
    });
  }, { threshold: 0, rootMargin: '0px 0px -80px 0px' }).observe(stakesSection);
}
