// Globe → flat-map morph on scroll — TW vs CN compare page

let raf      = null;
let worldPolygons = null;
let onResize = null;

// ── TopoJSON decoder ──────────────────────────────────────────────────────────
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
    const rings = g.type === 'Polygon'      ? g.arcs
                : g.type === 'MultiPolygon' ? g.arcs.flat() : [];
    rings.forEach(r => polys.push(r.flatMap(decArc)));
  });
  return polys;
}

// ── Projections ───────────────────────────────────────────────────────────────
// Orthographic — unclamped (works for back hemisphere; no null return)
function orthoFull(lon, lat, cLon, cLat, R) {
  const d = Math.PI / 180;
  const φ = lat*d, λ = lon*d, φ0 = cLat*d, λ0 = cLon*d;
  return [
    R * Math.cos(φ) * Math.sin(λ-λ0),
    R * (Math.cos(φ0)*Math.sin(φ) - Math.sin(φ0)*Math.cos(φ)*Math.cos(λ-λ0))
  ];
}
// Same but returns null when point is behind sphere (for dots/highlights)
function orthoVisible(lon, lat, cLon, cLat, R) {
  const d = Math.PI / 180;
  const φ = lat*d, λ = lon*d, φ0 = cLat*d, λ0 = cLon*d;
  const cosC = Math.sin(φ0)*Math.sin(φ) + Math.cos(φ0)*Math.cos(φ)*Math.cos(λ-λ0);
  if (cosC < 0) return null;
  return [R*Math.cos(φ)*Math.sin(λ-λ0),
          R*(Math.cos(φ0)*Math.sin(φ)-Math.sin(φ0)*Math.cos(φ)*Math.cos(λ-λ0))];
}

// Flat (equirectangular) — East Asia framing: 60°E–155°E, 0°N–57°N
const FL0 = 60, FL1 = 155, FLA0 = 0, FLA1 = 57;
function flatProj(lon, lat, W, H) {
  const lR = FL1 - FL0, aR = FLA1 - FLA0;
  const sc = Math.min(W / lR, H / aR) * 0.88;
  const cx = W / 2, cy = H / 2;
  return [
    cx + (lon - (FL0 + FL1)/2) * sc,
    cy - (lat - (FLA0 + FLA1)/2) * sc
  ];
}

// Morphed position: lerps between globe canvas coords and flat map coords
function morphPt(lon, lat, T, cLon, cLat, R, gx, gy, W, H) {
  const [sx, sy] = orthoFull(lon, lat, cLon, cLat, R);
  const [fx, fy] = flatProj(lon, lat, W, H);
  return [lerp(gx + sx, fx, T), lerp(gy - sy, fy, T)];
}

// ── Math helpers ──────────────────────────────────────────────────────────────
const ease  = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
const lerp  = (a, b, t) => a + (b-a)*t;
const clamp = t => Math.max(0, Math.min(1, t));

// Stars (fixed once)
const STARS = Array.from({length: 200}, () => ({
  x: Math.random(), y: Math.random(),
  r: Math.random()*1.3+0.3, a: Math.random()*0.65+0.2
}));

// ── Main ──────────────────────────────────────────────────────────────────────
export function startGlobe() {
  const canvas = document.getElementById('globe-canvas');
  if (!canvas) return;
  if (raf)      cancelAnimationFrame(raf);
  if (onResize) window.removeEventListener('resize', onResize);

  canvas.style.cssText =
    'position:fixed;top:0;left:0;z-index:1;pointer-events:none;display:block;';

  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(window.innerWidth  * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  onResize = resize;
  resize();
  window.addEventListener('resize', resize);
  document.querySelector('.globe-stage')?.classList.add('running');

  let t0 = null, gx = null;

  function frame(ts) {
    if (!t0) t0 = ts;
    const el  = (ts - t0) / 1000;
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.width  / dpr;
    const H   = canvas.height / dpr;
    const maxR = Math.min(W, H) * 0.42;

    // ── Globe animation phases (same as before) ──────────────────────────
    let R, cLon, cLat, gA;
    if (el < 0.7) {
      R = maxR*0.10*ease(el/0.7); cLon=-10; cLat=20; gA=ease(el/0.7);
    } else if (el < 4.0) {
      const p = ease(clamp((el-0.7)/3.3));
      R=lerp(maxR*0.10,maxR*0.80,p); cLon=lerp(-10,121,p); cLat=lerp(20,23.5,p); gA=1;
    } else if (el < 5.8) {
      const p = ease(clamp((el-4.0)/1.8));
      R=lerp(maxR*0.80,maxR*0.92,p); cLon=121; cLat=23.5; gA=1;
    } else {
      R=maxR*0.92+Math.sin(el*0.26)*maxR*0.012;
      cLon=121+Math.sin(el*0.036)*5; cLat=23.5+Math.sin(el*0.021)*2; gA=1;
    }

    // ── Scroll-driven values ─────────────────────────────────────────────
    const vH      = window.innerHeight;
    const scrollY = window.scrollY;
    const mobile  = W < 760;

    // morphT: 0 = globe, 1 = flat map  (starts at 30% scroll, done at 85%)
    const morphT = ease(clamp((scrollY / vH - 0.30) / 0.55));

    // Globe X: drifts right then re-centres for flat map
    const driftFrac = clamp(scrollY / (vH * 0.45));
    const targetX = mobile ? W/2
      : morphT < 0.5
        ? lerp(W/2, W*0.68, ease(driftFrac))
        : lerp(W*0.68, W*0.5, ease((morphT-0.5)*2));
    if (gx === null) gx = W/2;
    gx += (targetX - gx) * 0.07;
    const gy = H / 2;

    // Sphere clip radius: expands to cover full canvas during morph
    // gives a natural "unfolding" feel instead of a flat crossfade
    const maxClipR = Math.hypot(W, H);
    const clipR = morphT < 0.98
      ? R + ease(morphT) * maxClipR * 1.4
      : maxClipR * 2;

    // ── Hero content: slide left + fade ─────────────────────────────────
    const hero = document.querySelector('.globe-hero-content');
    if (hero) {
      const slideFrac = ease(clamp(scrollY / (vH * 0.38)));
      hero.style.transform = mobile ? '' : `translateX(${-slideFrac * 44}vw)`;
      hero.style.opacity   = String(Math.max(0, 1 - slideFrac * 1.15));
    }

    // ── Draw ─────────────────────────────────────────────────────────────
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = gA;

    // Stars (dim as map appears)
    const starA = 1 - morphT * 0.75;
    STARS.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${s.a * starA})`;
      ctx.fill();
    });

    // Atmosphere halo (fades out early)
    if (morphT < 0.55) {
      const a = 1 - morphT/0.55;
      const atm = ctx.createRadialGradient(gx,gy,R*0.88,gx,gy,R*1.45);
      atm.addColorStop(0,`rgba(58,134,255,${0.30*a})`);
      atm.addColorStop(0.4,`rgba(58,134,255,${0.09*a})`);
      atm.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(gx,gy,R*1.45,0,Math.PI*2);
      ctx.fillStyle=atm; ctx.fill();
    }

    // ── Expanding clip: contains globe at start, entire canvas at end ────
    ctx.save();
    ctx.beginPath(); ctx.arc(gx, gy, clipR, 0, Math.PI*2); ctx.clip();

    // Background gradient (sphere → flat map darkness)
    const bgR = lerp(R, maxClipR, ease(morphT));
    const bg = ctx.createRadialGradient(gx-R*0.22,gy-R*0.22,0,gx,gy,bgR);
    bg.addColorStop(0,'#0d2040'); bg.addColorStop(0.55,'#071328'); bg.addColorStop(1,'#030810');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Grid (morphed coordinates)
    ctx.lineWidth = 0.45;
    const lonStep = 20, latStep = 20;
    for (let lon=-180; lon<180; lon+=lonStep) {
      ctx.beginPath(); ctx.strokeStyle='rgba(58,134,255,0.11)';
      let mv=true;
      for (let lat=-80; lat<=80; lat+=2) {
        const [px,py]=morphPt(lon,lat,morphT,cLon,cLat,R,gx,gy,W,H);
        mv?(ctx.moveTo(px,py),mv=false):ctx.lineTo(px,py);
      }
      ctx.stroke();
    }
    for (let lat=-80; lat<=80; lat+=latStep) {
      ctx.beginPath();
      ctx.strokeStyle=lat===0?'rgba(58,134,255,0.20)':'rgba(58,134,255,0.09)';
      let mv=true;
      for (let lon=-180; lon<=180; lon+=2) {
        const [px,py]=morphPt(lon,lat,morphT,cLon,cLat,R,gx,gy,W,H);
        mv?(ctx.moveTo(px,py),mv=false):ctx.lineTo(px,py);
      }
      ctx.stroke();
    }

    // Country borders (morphed — this is the "unfolding" effect)
    if (worldPolygons) {
      ctx.lineWidth=0.9;
      worldPolygons.forEach(ring => {
        ctx.beginPath(); ctx.strokeStyle='rgba(100,165,255,0.50)';
        let mv=true;
        for (const [lon,lat] of ring) {
          const [px,py]=morphPt(lon,lat,morphT,cLon,cLat,R,gx,gy,W,H);
          mv?(ctx.moveTo(px,py),mv=false):ctx.lineTo(px,py);
        }
        ctx.stroke();
      });
    }

    // Taiwan dot (morphs from globe to flat position; small & precise)
    {
      const [twPx,twPy]=morphPt(121,23.5,morphT,cLon,cLat,R,gx,gy,W,H);
      const dr = morphT > 0.5
        ? lerp(R*0.012, Math.min(W,H)*0.025, (morphT-0.5)*2) // grows when flat
        : R * 0.012;
      const pulse = el > 5.8 ? (Math.sin(el*2.5)*0.4+0.6) : clamp((el-4.0)/1.8);
      const twG=ctx.createRadialGradient(twPx,twPy,0,twPx,twPy,dr*5);
      twG.addColorStop(0,`rgba(58,134,255,${0.65*pulse})`);
      twG.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(twPx,twPy,dr*5,0,Math.PI*2);
      ctx.fillStyle=twG; ctx.fill();
      ctx.beginPath(); ctx.arc(twPx,twPy,Math.max(2,dr*0.4),0,Math.PI*2);
      ctx.fillStyle='#3a86ff'; ctx.fill();
    }

    // China dot (morphed)
    {
      const [cnPx,cnPy]=morphPt(104,35,morphT,cLon,cLat,R,gx,gy,W,H);
      const dr=R*0.010;
      const cnG=ctx.createRadialGradient(cnPx,cnPy,0,cnPx,cnPy,dr*3);
      cnG.addColorStop(0,'rgba(230,57,70,0.45)'); cnG.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(cnPx,cnPy,dr*3,0,Math.PI*2);
      ctx.fillStyle=cnG; ctx.fill();
      ctx.beginPath(); ctx.arc(cnPx,cnPy,Math.max(2,dr*0.4),0,Math.PI*2);
      ctx.fillStyle='#e63946'; ctx.fill();
    }

    // Labels — appear when flat map is mostly in view
    if (morphT > 0.65) {
      const la = clamp((morphT - 0.65) / 0.25);
      ctx.globalAlpha = la;
      const fs = Math.round(Math.min(W,H) * 0.020);
      ctx.font = `bold ${fs}px 'Space Mono',monospace`;
      ctx.textBaseline = 'middle';

      const [twLx,twLy] = morphPt(121,23.5,morphT,cLon,cLat,R,gx,gy,W,H);
      ctx.fillStyle='#3a86ff';
      ctx.fillText('🇹🇼 Taiwan', twLx + Math.min(W,H)*0.03, twLy - Math.min(W,H)*0.025);

      const [cnLx,cnLy] = morphPt(104,35,morphT,cLon,cLat,R,gx,gy,W,H);
      ctx.fillStyle='#e63946';
      ctx.fillText('🇨🇳 China', cnLx + Math.min(W,H)*0.022, cnLy);

      // Taiwan Strait distance line
      const [twX2,twY2] = morphPt(121,23.5,morphT,cLon,cLat,R,gx,gy,W,H);
      const [cnX2,cnY2] = morphPt(119.5,30,morphT,cLon,cLat,R,gx,gy,W,H);
      ctx.setLineDash([3,6]);
      ctx.strokeStyle=`rgba(255,255,255,${0.15*la})`;
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(twX2,twY2); ctx.lineTo(cnX2,cnY2); ctx.stroke();
      ctx.setLineDash([]);

      // Distance label
      ctx.font = `${Math.round(fs*0.7)}px 'Space Mono',monospace`;
      ctx.fillStyle=`rgba(255,255,255,${0.35*la})`;
      ctx.textAlign='center';
      ctx.fillText('~180 km', (twX2+cnX2)/2, (twY2+cnY2)/2-7);
      ctx.textAlign='left';
      ctx.globalAlpha = gA; // reset
    }

    // Specular highlight on sphere (fades out during morph)
    if (morphT < 0.4) {
      const sa = 1 - morphT/0.4;
      const spec=ctx.createRadialGradient(gx-R*0.30,gy-R*0.32,0,gx,gy,R);
      spec.addColorStop(0,`rgba(255,255,255,${0.11*sa})`);
      spec.addColorStop(0.4,`rgba(255,255,255,${0.025*sa})`);
      spec.addColorStop(1,'transparent');
      ctx.fillStyle=spec; ctx.fillRect(0,0,W,H);
    }

    ctx.restore(); // expanding clip

    // Sphere rim (fades out)
    if (morphT < 0.6) {
      const ra = 1 - morphT/0.6;
      ctx.beginPath(); ctx.arc(gx,gy,R,0,Math.PI*2);
      ctx.strokeStyle=`rgba(58,134,255,${0.48*ra})`; ctx.lineWidth=1.5; ctx.stroke();
    }

    ctx.restore(); // DPR scale
    raf = requestAnimationFrame(frame);
  }

  if (worldPolygons) {
    raf = requestAnimationFrame(frame);
  } else {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => { worldPolygons = decodeTopo(topo, 'countries'); })
      .catch(() => {})
      .finally(() => { raf = requestAnimationFrame(frame); });
  }
}

export function stopGlobe() {
  if (raf)      { cancelAnimationFrame(raf); raf = null; }
  if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
  const hero = document.querySelector('.globe-hero-content');
  if (hero) { hero.style.transform=''; hero.style.opacity=''; }
  const canvas = document.getElementById('globe-canvas');
  if (canvas) canvas.style.display = 'none';
  document.querySelector('.globe-stage')?.classList.remove('running');
}
