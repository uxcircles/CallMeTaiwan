import { CASES } from './data.js';
import './nav.js';

let curFmt = 'square';

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

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const t = line + words[i] + ' ';
    if (ctx.measureText(t).width > maxW && i > 0) {
      ctx.fillText(line, x, y); line = words[i] + ' '; y += lh;
    } else { line = t; }
  }
  ctx.fillText(line, x, y);
}

function dlCard() {
  const sel = document.getElementById('gcase');
  const c = CASES.find(c => c.id === sel.value);
  const n = document.getElementById('gname').value.trim();
  const cv = document.createElement('canvas');
  const sz = curFmt === 'landscape' ? [1920,1080] : curFmt === 'story' ? [1080,1920] : [1080,1080];
  cv.width = sz[0]; cv.height = sz[1];
  const ctx = cv.getContext('2d');
  const W = sz[0], H = sz[1];
  ctx.fillStyle = '#0d0d1c'; ctx.fillRect(0,0,W,H);
  const g = ctx.createRadialGradient(W*.2,H*.8,0,W*.2,H*.8,W*.6);
  g.addColorStop(0,'rgba(193,18,31,0.13)'); g.addColorStop(1,'transparent');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#c1121f'; ctx.fillRect(0,0,5,H);
  const p = Math.round(W*.07);
  ctx.font = Math.round(W*.08) + 'px serif';
  ctx.fillText(c.flag, p, p + Math.round(W*.09));
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.font = Math.round(W*.017) + 'px monospace';
  ctx.fillText('WOULD THIS MAKE SENSE TO YOU?', p, H*.35);
  ctx.fillStyle = '#e63946';
  ctx.font = 'italic bold ' + Math.round(W*.062) + 'px Georgia,serif';
  ctx.fillText(c.abs, p, H*.44);
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.font = Math.round(W*.02) + 'px monospace';
  ctx.fillText('if not → then why accept ↓', p, H*.52);
  ctx.fillStyle = '#3a86ff';
  ctx.font = 'bold ' + Math.round(W*.047) + 'px Georgia,serif';
  ctx.fillText('"Chinese Taipei"', p, H*.60);
  ctx.fillStyle = 'rgba(58,134,255,0.65)';
  ctx.font = Math.round(W*.014) + 'px monospace';
  ctx.fillText("TAIWAN'S IMPOSED NAME", p, H*.645);
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.font = Math.round(W*.02) + 'px sans-serif';
  wrapText(ctx, c.sh, p, H*.73, W - p*2, Math.round(W*.028));
  if (n) {
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.font = Math.round(W*.016) + 'px monospace';
    ctx.fillText(n, p, H - p - Math.round(W*.027));
  }
  ctx.fillStyle = 'rgba(193,18,31,0.75)';
  ctx.font = Math.round(W*.016) + 'px monospace';
  const ht = '#TaiwanIsTaiwan · callmetaiwan.org';
  ctx.fillText(ht, W - p - ctx.measureText(ht).width, H - p - Math.round(W*.027));
  const lnk = document.createElement('a');
  lnk.download = 'callmetaiwan-' + c.id + '.png';
  lnk.href = cv.toDataURL('image/png');
  lnk.click();
  if (typeof gtag === 'function') {
    gtag('event', 'card_download', {
      card_id: c.id,
      card_format: curFmt
    });
  }
}

window.updCard = updCard;
window.setFmt  = setFmt;
window.dlCard  = dlCard;

popSel();

// Pre-select case if coming from the-name page via goGen()
const saved = sessionStorage.getItem('genCase');
if (saved) {
  const sel = document.getElementById('gcase');
  if (sel) sel.value = saved;
  sessionStorage.removeItem('genCase');
}

updCard();
