// Globe background animation — TW vs CN compare page
// Uses orthographic projection + world-atlas TopoJSON from CDN

let raf = null;
let worldPolygons = null;   // cached after first fetch

// ── Minimal TopoJSON decoder ──────────────────────────────────────────────────
function decodeTopo(topo, name) {
  const { scale: s, translate: t } = topo.transform;
  function decArc(i) {
    const rev = i < 0;
    const src = topo.arcs[rev ? ~i : i];
    let x = 0, y = 0;
    const pts = src.map(([dx, dy]) => [(x += dx) * s[0] + t[0], (y += dy) * s[1] + t[1]]);
    return rev ? pts.slice().reverse() : pts;
  }
  const polys = [];
  topo.objects[name].geometries.forEach(g => {
    const rings = g.type === 'Polygon'      ? g.arcs
                : g.type === 'MultiPolygon' ? g.arcs.flat()
                : [];
    rings.forEach(ring => polys.push(ring.flatMap(decArc)));
  });
  return polys;
}

// ── Orthographic projection ───────────────────────────────────────────────────
// Returns [x, y] relative to sphere centre, or null if point is behind sphere
function ortho(lon, lat, cLon, cLat, R) {
  const d = Math.PI / 180;
  const φ = lat * d, λ = lon * d, φ0 = cLat * d, λ0 = cLon * d;
  const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ - λ0);
  if (cosC < 0) return null;
  return [
    R * Math.cos(φ) * Math.sin(λ - λ0),
    R * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ - λ0))
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ease  = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = t => Math.max(0, Math.min(1, t));

// ── Stars (generated once per module load) ───────────────────────────────────
const STARS = Array.from({ length: 220 }, () => ({
  x: Math.random(), y: Math.random(),
  r: Math.random() * 1.4 + 0.3,
  a: Math.random() * 0.7 + 0.2
}));

// ── Public API ────────────────────────────────────────────────────────────────
export function startGlobe() {
  const canvas  = document.getElementById('globe-canvas');
  const content = document.getElementById('compare-content');
  if (!canvas) return;

  // Cancel any previous loop
  if (raf) cancelAnimationFrame(raf);

  // Reset content visibility for re-entry
  content?.classList.remove('globe-visible');

  const ctx = canvas.getContext('2d');
  let t0 = null;
  let contentShown = false;

  // ── Canvas sizing ──────────────────────────────────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.offsetWidth;
    const h = canvas.parentElement.offsetHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  canvas.parentElement.classList.add('running');

  // ── Animation loop ─────────────────────────────────────────────────────────
  function frame(ts) {
    if (!t0) t0 = ts;
    const el  = (ts - t0) / 1000;          // seconds elapsed
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.width  / dpr;
    const H   = canvas.height / dpr;

    // Globe is centred in the *viewport* portion of the canvas
    const vH   = Math.min(H, window.innerHeight / dpr);
    const cx   = W / 2;
    const cy   = vH / 2;
    const maxR = Math.min(W * 0.40, vH * 0.40);

    // ── Animation phases ───────────────────────────────────────────────────
    // 0.0 – 0.7s  : fade-in, globe tiny
    // 0.7 – 4.0s  : rotate & grow toward Taiwan (121°E, 23.5°N)
    // 4.0 – 5.8s  : zoom in (overshoot)
    // 5.8 – 7.8s  : settle back → fade globe → reveal content
    // 7.8s+       : background idle with gentle drift

    let R, cLon, cLat, gA;

    if (el < 0.7) {
      const p = el / 0.7;
      R = maxR * 0.12 * ease(p);
      cLon = -10; cLat = 20;
      gA = ease(p);

    } else if (el < 4.0) {
      const p = ease(clamp((el - 0.7) / 3.3));
      R    = lerp(maxR * 0.12, maxR * 0.70, p);
      cLon = lerp(-10, 121, p);
      cLat = lerp(20, 23.5, p);
      gA   = 1;

    } else if (el < 5.8) {
      const p = ease(clamp((el - 4.0) / 1.8));
      R    = lerp(maxR * 0.70, maxR * 1.10, p);
      cLon = 121; cLat = 23.5; gA = 1;

    } else if (el < 7.8) {
      const p = ease(clamp((el - 5.8) / 2.0));
      R    = lerp(maxR * 1.10, maxR * 0.72, p);
      cLon = 121; cLat = 23.5;
      gA   = lerp(1, 0.40, p);
      if (!contentShown && p > 0.28) {
        contentShown = true;
        content?.classList.add('globe-visible');
      }

    } else {
      // Idle background — slow breathing + gentle drift
      R    = maxR * 0.72 + Math.sin(el * 0.28) * maxR * 0.012;
      cLon = 121 + Math.sin(el * 0.038) * 7;
      cLat = 23.5 + Math.sin(el * 0.022) * 2.5;
      gA   = 0.40;
      if (!contentShown) { contentShown = true; content?.classList.add('globe-visible'); }
    }

    // ── Render ─────────────────────────────────────────────────────────────
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = gA;

    // Stars (spread over full canvas height so they look good on scroll)
    STARS.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    });

    // Outer atmosphere halo
    const atm = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.42);
    atm.addColorStop(0,   'rgba(58,134,255,0.32)');
    atm.addColorStop(0.4, 'rgba(58,134,255,0.10)');
    atm.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.42, 0, Math.PI * 2);
    ctx.fillStyle = atm;
    ctx.fill();

    // ── Sphere clip ────────────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // Sphere base gradient (slightly lighter near top-left)
    const bg = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.22, 0, cx, cy, R);
    bg.addColorStop(0,    '#0d2040');
    bg.addColorStop(0.55, '#071328');
    bg.addColorStop(1,    '#030810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Latitude / longitude grid
    ctx.lineWidth = 0.5;
    for (let lon = -180; lon < 180; lon += 20) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(58,134,255,0.12)';
      let mv = true;
      for (let lat = -88; lat <= 88; lat += 2) {
        const p = ortho(lon, lat, cLon, cLat, R);
        if (!p) { mv = true; continue; }
        mv ? (ctx.moveTo(cx + p[0], cy - p[1]), mv = false) : ctx.lineTo(cx + p[0], cy - p[1]);
      }
      ctx.stroke();
    }
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath();
      ctx.strokeStyle = lat === 0 ? 'rgba(58,134,255,0.22)' : 'rgba(58,134,255,0.11)';
      let mv = true;
      for (let lon = -180; lon <= 180; lon += 2) {
        const p = ortho(lon, lat, cLon, cLat, R);
        if (!p) { mv = true; continue; }
        mv ? (ctx.moveTo(cx + p[0], cy - p[1]), mv = false) : ctx.lineTo(cx + p[0], cy - p[1]);
      }
      ctx.stroke();
    }

    // Country borders from TopoJSON
    if (worldPolygons) {
      ctx.lineWidth = 0.9;
      worldPolygons.forEach(ring => {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(100,165,255,0.50)';
        let mv = true;
        for (const [lon, lat] of ring) {
          const p = ortho(lon, lat, cLon, cLat, R);
          if (!p) { mv = true; continue; }
          mv ? (ctx.moveTo(cx + p[0], cy - p[1]), mv = false) : ctx.lineTo(cx + p[0], cy - p[1]);
        }
        ctx.stroke();
      });
    }

    // Taiwan dot — pulsing glow
    const twP = ortho(121, 23.5, cLon, cLat, R);
    if (twP) {
      const dr = R * 0.027;
      const pulse = el > 7.8
        ? (Math.sin(el * 2.6) * 0.5 + 0.5)   // idle pulse
        : clamp((el - 4.0) / 1.8);             // grow-in during zoom
      const twG = ctx.createRadialGradient(cx + twP[0], cy - twP[1], 0,
                                           cx + twP[0], cy - twP[1], dr * 5.5);
      twG.addColorStop(0, `rgba(58,134,255,${0.65 * pulse})`);
      twG.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx + twP[0], cy - twP[1], dr * 5.5, 0, Math.PI * 2);
      ctx.fillStyle = twG; ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + twP[0], cy - twP[1], dr, 0, Math.PI * 2);
      ctx.fillStyle = '#3a86ff'; ctx.fill();
    }

    // China dot
    const cnP = ortho(104, 35, cLon, cLat, R);
    if (cnP) {
      const dr  = R * 0.019;
      const cnG = ctx.createRadialGradient(cx + cnP[0], cy - cnP[1], 0,
                                           cx + cnP[0], cy - cnP[1], dr * 3.5);
      cnG.addColorStop(0, 'rgba(230,57,70,0.45)');
      cnG.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx + cnP[0], cy - cnP[1], dr * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = cnG; ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + cnP[0], cy - cnP[1], dr, 0, Math.PI * 2);
      ctx.fillStyle = '#e63946'; ctx.fill();
    }

    // Specular highlight (top-left)
    const spec = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.32, 0, cx, cy, R);
    spec.addColorStop(0,   'rgba(255,255,255,0.12)');
    spec.addColorStop(0.4, 'rgba(255,255,255,0.025)');
    spec.addColorStop(1,   'transparent');
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, W, H);

    ctx.restore(); // end sphere clip

    // Rim glow
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(58,134,255,0.48)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.restore(); // end DPR scale

    raf = requestAnimationFrame(frame);
  }

  // ── Load world atlas (cached across startGlobe() calls) ───────────────────
  if (worldPolygons) {
    raf = requestAnimationFrame(frame);
  } else {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => { worldPolygons = decodeTopo(topo, 'countries'); })
      .catch(() => {}) // globe still draws without borders
      .finally(() => { raf = requestAnimationFrame(frame); });
  }
}

export function stopGlobe() {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  const stage = document.querySelector('.globe-stage');
  if (stage) stage.classList.remove('running');
}
