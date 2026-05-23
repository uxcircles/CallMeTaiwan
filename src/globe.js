// Globe background — TW vs CN compare page
// Scroll: content slides LEFT to reveal Taiwan/China on right side of globe

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
    const id = +g.id;
    const rings = g.type === 'Polygon'      ? g.arcs
                : g.type === 'MultiPolygon' ? g.arcs.flat() : [];
    rings.forEach(r => polys.push({ ring: r.flatMap(decArc), id }));
  });
  return polys;
}

// ── Orthographic projection (returns null for back hemisphere) ────────────────
function ortho(lon, lat, cLon, cLat, R) {
  const d = Math.PI / 180;
  const φ = lat*d, λ = lon*d, φ0 = cLat*d, λ0 = cLon*d;
  const cosC = Math.sin(φ0)*Math.sin(φ) + Math.cos(φ0)*Math.cos(φ)*Math.cos(λ-λ0);
  if (cosC < 0) return null;
  return [
    R * Math.cos(φ) * Math.sin(λ-λ0),
    R * (Math.cos(φ0)*Math.sin(φ) - Math.sin(φ0)*Math.cos(φ)*Math.cos(λ-λ0))
  ];
}

const ease  = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
const lerp  = (a, b, t) => a + (b-a)*t;
const clamp = t => Math.max(0, Math.min(1, t));

const STARS = Array.from({length: 200}, () => ({
  x: Math.random(), y: Math.random(),
  r: Math.random()*1.3+0.3, a: Math.random()*0.65+0.2
}));

// ── Public API ────────────────────────────────────────────────────────────────
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

    // ── Globe animation phases ────────────────────────────────────────────
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

    // ── Scroll-driven layout ──────────────────────────────────────────────
    const vH      = window.innerHeight;
    const scrollY = window.scrollY;
    const mobile  = W < 760;

    // Globe drifts to right side as user scrolls
    const driftFrac = mobile ? 0 : clamp(scrollY / (vH * 0.50));
    const targetX   = lerp(W / 2, W * 0.82, ease(driftFrac));
    if (gx === null) gx = W / 2;
    gx += (targetX - gx) * 0.07;
    const gy = lerp(H * 0.43, H * 0.60, ease(driftFrac));

    // Zoom globe in on scroll to highlight Taiwan/China area
    // (only kicks in after the intro animation has settled)
    if (el > 5.8) {
      R = R * lerp(1, 1.42, ease(driftFrac));
    }

    // Content (title + cards) slides LEFT — both in sync
    // 16vw: enough to reveal globe on right, still leaves left margin
    const slideFrac  = ease(clamp(scrollY / (vH * 0.50)));
    const slideVW    = mobile ? 0 : -slideFrac * 16;
    const slideOpac  = Math.max(0.80, 1 - slideFrac * 0.20);

    const hero = document.querySelector('.globe-hero-content');
    if (hero) {
      hero.style.transform = `translateX(${slideVW}vw)`;
      hero.style.opacity   = String(slideOpac);
    }
    const cc = document.getElementById('compare-content');
    if (cc) {
      cc.style.transform = `translateX(${slideVW}vw)`;
    }

    // ── Draw ─────────────────────────────────────────────────────────────
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Clip canvas to stop at footer top so globe never overlaps footer
    const footerEl  = document.querySelector('footer');
    const footerTop = footerEl ? footerEl.getBoundingClientRect().top : H;
    const clipH     = Math.min(H, Math.max(0, footerTop));
    ctx.beginPath(); ctx.rect(0, 0, W, clipH); ctx.clip();

    ctx.globalAlpha = gA;

    // Stars
    STARS.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    });

    // Atmosphere halo
    const atm = ctx.createRadialGradient(gx,gy,R*0.88,gx,gy,R*1.44);
    atm.addColorStop(0,'rgba(58,134,255,0.28)');
    atm.addColorStop(0.4,'rgba(58,134,255,0.08)');
    atm.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.arc(gx,gy,R*1.44,0,Math.PI*2);
    ctx.fillStyle=atm; ctx.fill();

    // ── Sphere (clipped) ──────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath(); ctx.arc(gx,gy,R,0,Math.PI*2); ctx.clip();

    // Base gradient
    const bg = ctx.createRadialGradient(gx-R*0.22,gy-R*0.22,0,gx,gy,R);
    bg.addColorStop(0,'#0d2040'); bg.addColorStop(0.55,'#071328'); bg.addColorStop(1,'#030810');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Grid lines — very subtle
    ctx.lineWidth = 0.4;
    for (let lon=-180; lon<180; lon+=20) {
      ctx.beginPath(); ctx.strokeStyle='rgba(58,134,255,0.08)';
      let mv=true;
      for (let lat=-88; lat<=88; lat+=2) {
        const p=ortho(lon,lat,cLon,cLat,R); if(!p){mv=true;continue;}
        mv?(ctx.moveTo(gx+p[0],gy-p[1]),mv=false):ctx.lineTo(gx+p[0],gy-p[1]);
      }
      ctx.stroke();
    }
    for (let lat=-80; lat<=80; lat+=20) {
      ctx.beginPath();
      ctx.strokeStyle=lat===0?'rgba(58,134,255,0.18)':'rgba(58,134,255,0.07)';
      let mv=true;
      for (let lon=-180; lon<=180; lon+=2) {
        const p=ortho(lon,lat,cLon,cLat,R); if(!p){mv=true;continue;}
        mv?(ctx.moveTo(gx+p[0],gy-p[1]),mv=false):ctx.lineTo(gx+p[0],gy-p[1]);
      }
      ctx.stroke();
    }

    // Country borders
    if (worldPolygons) {
      const fa = ease(driftFrac); // 0 = top, 1 = scrolled

      function drawRings(ids, lw, stroke, fill) {
        ctx.lineWidth = lw;
        worldPolygons.forEach(({ ring, id }) => {
          if (ids !== null && !ids.includes(id)) return;
          if (ids === null && (id === 156 || id === 158)) return;
          ctx.beginPath();
          let mv = true;
          for (const [lon,lat] of ring) {
            const p=ortho(lon,lat,cLon,cLat,R); if(!p){mv=true;continue;}
            mv?(ctx.moveTo(gx+p[0],gy-p[1]),mv=false):ctx.lineTo(gx+p[0],gy-p[1]);
          }
          if (fill) { ctx.fillStyle = fill; ctx.fill(); }
          ctx.strokeStyle = stroke;
          ctx.stroke();
        });
      }

      // Others — same color, very slight fade on scroll
      drawRings(null, 0.85,
        `rgba(100,165,255,${lerp(0.42, 0.32, fa).toFixed(2)})`);

      // China — blue → red, subtle red fill
      drawRings([156], lerp(0.85, 1.0, fa),
        `rgba(${Math.round(lerp(100,230,fa))},${Math.round(lerp(165,57,fa))},${Math.round(lerp(255,70,fa))},${lerp(0.42,0.88,fa).toFixed(2)})`,
        `rgba(230,57,70,${lerp(0, 0.09, fa).toFixed(2)})`);

      // Taiwan — default blue → vivid blue, subtle blue fill
      drawRings([158], lerp(0.85, 1.0, fa),
        `rgba(${Math.round(lerp(100,58,fa))},${Math.round(lerp(165,134,fa))},255,${lerp(0.42,1.0,fa).toFixed(2)})`,
        `rgba(58,134,255,${lerp(0, 0.13, fa).toFixed(2)})`);
    }

    // Dots appear only after globe zooms in (el 4.0–5.8 = fade in, 5.8+ = settled)
    const dotA = el < 4.0 ? 0 : clamp((el - 4.0) / 1.8);

    // Taiwan dot — small & precise, pulsing glow
    const twP = ortho(121,23.5,cLon,cLat,R);
    if (twP && dotA > 0) {
      const dr    = R * 0.014;
      const pulse = el > 5.8 ? (Math.sin(el*2.5)*0.4+0.6) : dotA;
      const twG   = ctx.createRadialGradient(gx+twP[0],gy-twP[1],0,gx+twP[0],gy-twP[1],dr*5);
      twG.addColorStop(0,`rgba(58,134,255,${(0.70*pulse).toFixed(2)})`);
      twG.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(gx+twP[0],gy-twP[1],dr*5,0,Math.PI*2);
      ctx.fillStyle=twG; ctx.fill();
      ctx.globalAlpha = dotA;
      ctx.beginPath(); ctx.arc(gx+twP[0],gy-twP[1],Math.max(2,dr*0.5),0,Math.PI*2);
      ctx.fillStyle='#3a86ff'; ctx.fill();
      ctx.globalAlpha = 1;

      // Label (appears after globe settles)
      if (el > 6.5) {
        const la = clamp((el-6.5)/1.2);
        ctx.globalAlpha = la;
        ctx.font = `bold ${Math.round(R*0.040)}px 'Space Mono',monospace`;
        ctx.fillStyle = '#3a86ff';
        ctx.fillText('Taiwan', gx+twP[0]+dr*1.5, gy-twP[1]-dr*1.5);
        ctx.globalAlpha = 1;
      }
    }

    // China dot
    const cnP = ortho(104,35,cLon,cLat,R);
    if (cnP && dotA > 0) {
      const dr  = R * 0.011;
      const cnG = ctx.createRadialGradient(gx+cnP[0],gy-cnP[1],0,gx+cnP[0],gy-cnP[1],dr*3.5);
      cnG.addColorStop(0,`rgba(230,57,70,${(0.45*dotA).toFixed(2)})`); cnG.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(gx+cnP[0],gy-cnP[1],dr*3.5,0,Math.PI*2);
      ctx.fillStyle=cnG; ctx.fill();
      ctx.globalAlpha = dotA;
      ctx.beginPath(); ctx.arc(gx+cnP[0],gy-cnP[1],Math.max(2,dr*0.5),0,Math.PI*2);
      ctx.fillStyle='#e63946'; ctx.fill();
      ctx.globalAlpha = 1;

      if (el > 6.5) {
        const la = clamp((el-6.5)/1.2);
        ctx.globalAlpha = la;
        ctx.font = `bold ${Math.round(R*0.035)}px 'Space Mono',monospace`;
        ctx.fillStyle = '#e63946';
        ctx.fillText('China', gx+cnP[0]+dr*1.5, gy-cnP[1]-dr*1.5);
        ctx.globalAlpha = 1;
      }
    }

    // Specular
    const spec = ctx.createRadialGradient(gx-R*0.30,gy-R*0.32,0,gx,gy,R);
    spec.addColorStop(0,'rgba(255,255,255,0.10)');
    spec.addColorStop(0.4,'rgba(255,255,255,0.022)');
    spec.addColorStop(1,'transparent');
    ctx.fillStyle=spec; ctx.fillRect(0,0,W,H);

    ctx.restore(); // sphere clip

    // Rim
    ctx.beginPath(); ctx.arc(gx,gy,R,0,Math.PI*2);
    ctx.strokeStyle='rgba(58,134,255,0.45)'; ctx.lineWidth=1.5; ctx.stroke();

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
  // Reset layout transforms
  const hero = document.querySelector('.globe-hero-content');
  if (hero) { hero.style.transform=''; hero.style.opacity=''; }
  const cc = document.getElementById('compare-content');
  if (cc) { cc.style.transform=''; }
  const canvas = document.getElementById('globe-canvas');
  if (canvas) canvas.style.display = 'none';
  document.querySelector('.globe-stage')?.classList.remove('running');
}
