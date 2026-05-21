import { CASES } from './data.js';

let curMod = null;
let curFmt = 'square';

function toggleMenu() {
  document.getElementById('nmenu').classList.toggle('open');
}

function show(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-menu a').forEach(a => {
    a.classList.toggle('active', a.dataset.p === id);
  });
  window.scrollTo(0, 0);
  const menu = document.getElementById('nmenu');
  if (menu) menu.classList.remove('open');
  setTimeout(() => {
    document.querySelectorAll('#' + id + ' .fu').forEach(el => {
      const io = new IntersectionObserver(es => {
        es.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('vis');
            e.target.querySelectorAll('.bfill').forEach(b => b.style.width = b.dataset.w + '%');
            e.target.querySelectorAll('.ftw').forEach(b => b.style.width = b.dataset.w + '%');
            e.target.querySelectorAll('.fcn').forEach(b => b.style.width = b.dataset.w + '%');
          }
        });
      }, { threshold: 0.1 });
      io.observe(el);
    });
    if (id === 'history') obsEras();
    if (id === 'data') setTimeout(drawGDP, 150);
  }, 60);
  return false;
}

function obsEras() {
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.era').forEach(el => io.observe(el));
}

function renderCases(filter) {
  if (!filter) filter = 'all';
  const g = document.getElementById('cgrid');
  if (!g) return;
  g.innerHTML = '';
  const list = filter === 'all' ? CASES : CASES.filter(c => c.r === filter);
  list.forEach(c => {
    const d = document.createElement('div');
    d.className = c.r === 'special' ? 'ccard ccard-special' : 'ccard';
    const badge = c.r === 'special' ? '<div class="ccard-special-label">&#8617; Logic Reversed</div>' : '';
    d.innerHTML = badge +
      '<span class="cf">' + c.flag + '</span>' +
      '<div class="ca">' + c.abs + '</div>' +
      '<div class="cr"><strong>' + c.real + '</strong> &rarr; claimed by ' + c.cl + '</div>' +
      '<div class="cdiv"></div>' +
      '<div class="cc">' + c.sh + '</div>' +
      '<div class="cfoot"><span class="ctag">' + c.cl + '</span><span class="cyr">' + c.yr + '</span></div>';
    d.onclick = () => openMod(c);
    g.appendChild(d);
  });
}

function filt(r, btn) {
  document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCases(r);
}

function openMod(c) {
  curMod = c;
  document.getElementById('mf').textContent = c.flag;
  document.getElementById('ma').textContent = c.abs;
  document.getElementById('mr').textContent = c.real + ' → ' + c.cl + ' · ' + c.yr;
  document.getElementById('mb').innerHTML = c.full;
  document.getElementById('mc').innerHTML =
    '<div class="ml">The parallel</div>' +
    '<div class="mt">✗ ' + c.cmp.t + '</div>' +
    '<div class="mu">✓ ' + c.cmp.u + '</div>';
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMov(e) {
  if (e.target === document.getElementById('modal')) closeMod();
}

function closeMod() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
}

function goGen() {
  if (curMod) {
    document.getElementById('gcase').value = curMod.id;
    updCard();
  }
  closeMod();
  show('generator');
}

function popSel() {
  const s = document.getElementById('gcase');
  if (!s) return;
  CASES.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.flag + ' ' + c.abs + ' — ' + c.real;
    s.appendChild(o);
  });
}

function updCard() {
  const sel = document.getElementById('gcase');
  if (!sel) return;
  const c = CASES.find(c => c.id === sel.value);
  const n = document.getElementById('gname').value.trim();
  if (!c) return;
  document.getElementById('sc-fl').textContent = c.flag;
  document.getElementById('sc-abs').textContent = c.abs;
  document.getElementById('sc-ctx').textContent = c.sh;
  document.getElementById('sc-nm').textContent = n;
}

function setFmt(fmt, btn) {
  curFmt = fmt;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const card = document.getElementById('scard');
  card.classList.remove('landscape', 'story');
  if (fmt !== 'square') card.classList.add(fmt);
}

function dlCard() {
  const sel = document.getElementById('gcase');
  const c = CASES.find(c => c.id === sel.value);
  const n = document.getElementById('gname').value.trim();
  const cv = document.createElement('canvas');
  const sz = curFmt === 'landscape' ? [1920, 1080] : curFmt === 'story' ? [1080, 1920] : [1080, 1080];
  cv.width = sz[0];
  cv.height = sz[1];
  const ctx = cv.getContext('2d');
  const W = sz[0], H = sz[1];
  ctx.fillStyle = '#0d0d1c';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.2, H * 0.8, 0, W * 0.2, H * 0.8, W * 0.6);
  g.addColorStop(0, 'rgba(193,18,31,0.13)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#c1121f';
  ctx.fillRect(0, 0, 5, H);
  const p = Math.round(W * 0.07);
  ctx.font = Math.round(W * 0.08) + 'px serif';
  ctx.fillText(c.flag, p, p + Math.round(W * 0.09));
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = Math.round(W * 0.017) + 'px monospace';
  ctx.fillText('WOULD THIS MAKE SENSE TO YOU?', p, H * 0.35);
  ctx.fillStyle = '#e63946';
  ctx.font = 'italic bold ' + Math.round(W * 0.062) + 'px Georgia,serif';
  ctx.fillText(c.abs, p, H * 0.44);
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  ctx.font = Math.round(W * 0.02) + 'px monospace';
  ctx.fillText('if not → then why accept ↓', p, H * 0.52);
  ctx.fillStyle = '#3a86ff';
  ctx.font = 'bold ' + Math.round(W * 0.047) + 'px Georgia,serif';
  ctx.fillText('"Chinese Taipei"', p, H * 0.60);
  ctx.fillStyle = 'rgba(58,134,255,0.42)';
  ctx.font = Math.round(W * 0.014) + 'px monospace';
  ctx.fillText("TAIWAN'S IMPOSED NAME", p, H * 0.645);
  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.font = Math.round(W * 0.02) + 'px sans-serif';
  wrapText(ctx, c.sh, p, H * 0.73, W - p * 2, Math.round(W * 0.028));
  if (n) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = Math.round(W * 0.016) + 'px monospace';
    ctx.fillText(n, p, H - p - Math.round(W * 0.027));
  }
  ctx.fillStyle = 'rgba(193,18,31,0.6)';
  ctx.font = Math.round(W * 0.016) + 'px monospace';
  const ht = 'callmetaiwan.org';
  const htw = ctx.measureText(ht).width;
  ctx.fillText(ht, W - p - htw, H - p - Math.round(W * 0.027));
  const lnk = document.createElement('a');
  lnk.download = 'callmetaiwan-' + c.id + '.png';
  lnk.href = cv.toDataURL('image/png');
  lnk.click();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const t = line + words[i] + ' ';
    if (ctx.measureText(t).width > maxW && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lh;
    } else {
      line = t;
    }
  }
  ctx.fillText(line, x, y);
}

function drawGDP() {
  const canvas = document.getElementById('gdpc');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 155 * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '155px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = 155;
  const pad = { t: 8, r: 18, b: 26, l: 46 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const yrs = [1990, 1993, 1996, 1999, 2002, 2005, 2008, 2011, 2014, 2017, 2020, 2023];
  const tw  = [8150, 11000, 13700, 13800, 14200, 16200, 17800, 21400, 22600, 25000, 28300, 35000];
  const cn  = [340, 540, 730, 890, 1100, 1750, 3400, 5600, 7700, 8800, 10500, 12700];
  const mx = 37000;
  const xS = i => pad.l + (i / (yrs.length - 1)) * iW;
  const yS = v => pad.t + iH - (v / mx) * iH;
  ctx.strokeStyle = '#242448';
  ctx.lineWidth = 1;
  [0, 10000, 20000, 30000].forEach(v => {
    const y = yS(v);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = '#8888aa';
    ctx.font = "8px 'Space Mono',monospace";
    ctx.textAlign = 'right';
    ctx.fillText('$' + (v / 1000) + 'K', pad.l - 3, y + 3);
  });
  yrs.filter((_, i) => i % 2 === 0).forEach((yr, j) => {
    const i = j * 2;
    ctx.fillStyle = '#8888aa';
    ctx.font = "8px 'Space Mono',monospace";
    ctx.textAlign = 'center';
    ctx.fillText(yr, xS(i), H - 5);
  });
  function drawLine(data, col) {
    ctx.beginPath();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    data.forEach((v, i) => { if (i === 0) ctx.moveTo(xS(i), yS(v)); else ctx.lineTo(xS(i), yS(v)); });
    ctx.stroke();
    data.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(xS(i), yS(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    });
  }
  drawLine(cn, '#e63946');
  drawLine(tw, '#3a86ff');
}

window.addEventListener('resize', () => {
  if (document.getElementById('data').classList.contains('active')) drawGDP();
});

// Expose functions called from inline HTML event handlers
window.show = show;
window.toggleMenu = toggleMenu;
window.filt = filt;
window.openMod = openMod;
window.closeMov = closeMov;
window.closeMod = closeMod;
window.goGen = goGen;
window.updCard = updCard;
window.setFmt = setFmt;
window.dlCard = dlCard;

// Init
renderCases();
popSel();
updCard();
