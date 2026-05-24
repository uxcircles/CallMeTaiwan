import './nav.js';

// Scroll-reveal for .fu elements
const fuObs = new IntersectionObserver(es => {
  es.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('vis');
      e.target.querySelectorAll('.bfill').forEach(b => b.style.width = b.dataset.w + '%');
      e.target.querySelectorAll('.ftw').forEach(b => b.style.width = b.dataset.w + '%');
      e.target.querySelectorAll('.fcn').forEach(b => b.style.width = b.dataset.w + '%');
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fu').forEach(el => fuObs.observe(el));

// Go Deeper section — staggered card reveal
const gdSection = document.getElementById('gd-section');
if (gdSection) {
  const gdCards = [...gdSection.querySelectorAll('.gd-card.sr')];
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    gdSection.classList.add('sr--in');
    gdCards.forEach((card, i) => setTimeout(() => card.classList.add('sr--in'), i * 130));
  }, { threshold: 0.1 }).observe(gdSection);
}

function drawGDP() {
  const canvas = document.getElementById('gdpc');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width * dpr;
  canvas.height = 155 * dpr;
  canvas.style.width  = rect.width + 'px';
  canvas.style.height = '155px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = 155;
  const pad = { t: 8, r: 18, b: 26, l: 46 };
  const iW  = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const yrs = [1990,1993,1996,1999,2002,2005,2008,2011,2014,2017,2020,2023];
  const tw  = [8150,11000,13700,13800,14200,16200,17800,21400,22600,25000,28300,35000];
  const cn  = [340,540,730,890,1100,1750,3400,5600,7700,8800,10500,12700];
  const mx  = 37000;
  const xS  = i => pad.l + (i / (yrs.length - 1)) * iW;
  const yS  = v => pad.t + iH - (v / mx) * iH;
  ctx.strokeStyle = '#242448'; ctx.lineWidth = 1;
  [0,10000,20000,30000].forEach(v => {
    const y = yS(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = '#8888aa';
    ctx.font = "8px 'Space Mono',monospace";
    ctx.textAlign = 'right';
    ctx.fillText('$' + (v/1000) + 'K', pad.l - 3, y + 3);
  });
  yrs.filter((_,i) => i % 2 === 0).forEach((yr, j) => {
    ctx.fillStyle = '#8888aa';
    ctx.font = "8px 'Space Mono',monospace";
    ctx.textAlign = 'center';
    ctx.fillText(yr, xS(j*2), H - 5);
  });
  function drawLine(data, col) {
    ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    data.forEach((v,i) => i === 0 ? ctx.moveTo(xS(i),yS(v)) : ctx.lineTo(xS(i),yS(v)));
    ctx.stroke();
    data.forEach((v,i) => {
      ctx.beginPath(); ctx.arc(xS(i),yS(v),3,0,Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
    });
  }
  drawLine(cn, '#e63946');
  drawLine(tw, '#3a86ff');
}

setTimeout(drawGDP, 150);
window.addEventListener('resize', drawGDP);
