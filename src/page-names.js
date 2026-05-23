import { CASES } from './data.js';
import './nav.js';

let curMod = null;

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
  if (curMod) sessionStorage.setItem('genCase', curMod.id);
  closeMod();
  window.location.href = '/make-a-card';
}

window.filt     = filt;
window.openMod  = openMod;
window.closeMov = closeMov;
window.closeMod = closeMod;
window.goGen    = goGen;

renderCases();
