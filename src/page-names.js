import { CASES } from './data.js';
import './nav.js';

// ── Supabase ──────────────────────────────────────────────────────────────────
const SB  = 'https://aeyrdjyowwopkluckjlb.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleXJkanlvd3dvcGtsdWNramxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzA2NjYsImV4cCI6MjA5MzE0NjY2Nn0.SIJQ2ozMfvJKeDR8JwZWMd4ome5QPrUhmtN6gZOnLG4';
const HDR = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };

function sbVote(cardId, choice) {
  fetch(`${SB}/rest/v1/rpc/vote_card`, {
    method: 'POST', headers: HDR,
    body: JSON.stringify({ p_card_id: cardId, p_choice: choice })
  }).catch(() => {});
}

async function sbCounts() {
  try {
    const r = await fetch(`${SB}/rest/v1/card_votes?select=absurd_count,acceptable_count`, { headers: HDR });
    const rows = await r.json();
    const absurd = rows.reduce((s, row) => s + (row.absurd_count  || 0), 0);
    const accept = rows.reduce((s, row) => s + (row.acceptable_count || 0), 0);
    return { absurd, accept };
  } catch (_) { return { absurd: 0, accept: 0 }; }
}

// ── Locale detection → prioritise visitor's country card ─────────────────────
const _AC = {
  UA:'ukraine', GR:'greece',  EE:'estonia', LV:'latvia',  LT:'lithuania',
  PL:'poland',  FI:'finland', NO:'norway',  DK:'denmark', IS:'iceland',
  IE:'ireland', GB:'ireland', DZ:'algeria', MA:'algeria', TN:'algeria',
  VN:'vietnam', IN:'india',   MY:'malaysia',SG:'malaysia',PH:'malaysia',
  ID:'malaysia',MX:'mexico',  AR:'mexico',  BR:'mexico',  CL:'mexico',
  CO:'mexico',  PE:'mexico',  PT:'mexico',  ES:'mexico',
  US:'usa',     CA:'usa',     AU:'usa',     NZ:'usa',
  MN:'mongolia',CN:'mongolia',HK:'mongolia',MO:'mongolia',
  RU:'ukraine', BY:'poland',  TR:'greece',
  FR:'algeria', BE:'algeria', DE:'poland',  AT:'estonia',
  IT:'greece',  SE:'norway',  NL:'denmark', CH:'finland',
  TH:'vietnam', KH:'vietnam', MM:'vietnam',
};
const _AL = {
  uk:'ukraine', el:'greece',  et:'estonia', lv:'latvia',  lt:'lithuania',
  pl:'poland',  fi:'finland', no:'norway',  da:'denmark', is:'iceland',
  ga:'ireland', vi:'vietnam', hi:'india',   ms:'malaysia',id:'malaysia',
  es:'mexico',  pt:'mexico',  ru:'ukraine', tr:'greece',
  fr:'algeria', de:'poland',  it:'greece',  sv:'norway',
  nl:'denmark', mn:'mongolia',zh:'mongolia',ar:'algeria',
};

// Curated 8-card deck — mongolia always last (it's the twist)
const DECK_IDS = ['ireland', 'ukraine', 'india', 'greece', 'vietnam', 'usa', 'algeria', 'mongolia'];

function buildDeck() {
  const front = DECK_IDS.filter(id => id !== 'mongolia');
  const langs  = Array.from(navigator.languages || [navigator.language || '']);
  for (const lang of langs) {
    const [base, region] = lang.split('-');
    const detected =
      (region && _AC[region.toUpperCase()]) ||
      (base   && _AL[base.toLowerCase()]);
    if (detected && detected !== 'mongolia' && front.includes(detected)) {
      front.splice(front.indexOf(detected), 1);
      front.unshift(detected);
      break;
    }
  }
  front.push('mongolia');
  return front.map(id => CASES.find(c => c.id === id)).filter(Boolean);
}

// ── State ─────────────────────────────────────────────────────────────────────
const deck        = buildDeck();
let   idx         = 0;
let   noVotes     = 0;
let   firstRender = true;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const deckEl  = document.getElementById('tnDeck');
const swipeEl = document.getElementById('tnSwipe');
const resultEl = document.getElementById('tnResult');
const btnNo   = document.getElementById('btnNo');
const btnYes  = document.getElementById('btnYes');

// ── Card stack ────────────────────────────────────────────────────────────────
function renderStack() {
  if (!deckEl) return;
  deckEl.innerHTML = '';

  // Build back-to-front so top card is last in DOM (highest z-index)
  const slice = deck.slice(idx, idx + 3);
  for (let i = slice.length - 1; i >= 0; i--) {
    const stackPos = i;           // 0 = top card
    const el = makeCard(slice[i], stackPos);
    deckEl.appendChild(el);
  }

  // Animate newly-promoted top card from dark → bright (skip on first render)
  if (!firstRender) {
    const topEl = [...deckEl.children].find(el => el.style.zIndex === '10');
    if (topEl) {
      topEl.style.filter = 'brightness(0.78)';
      topEl.style.transition = 'filter 0.6s ease';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        topEl.style.filter = 'brightness(1)';
      }));
    }
  }
  firstRender = false;
}

function makeCard(c, stackPos) {
  const el   = document.createElement('div');
  el.className  = 'tn-card';
  el.dataset.id = c.id;

  const scale = 1 - stackPos * 0.04;
  const ty    = stackPos * 14;
  el.style.transform = `scale(${scale}) translateY(${ty}px)`;
  el.style.zIndex    = String(10 - stackPos);

  // Back cards: progressively darker for depth
  if (stackPos === 1) el.style.filter = 'brightness(0.78)';
  if (stackPos === 2) el.style.filter = 'brightness(0.60)';
  if (stackPos > 0)  el.style.pointerEvents = 'none';

  el.innerHTML =
    `<div class="tn-stamp tn-stamp-no">Ridiculous</div>` +
    `<div class="tn-stamp tn-stamp-yes">Acceptable</div>` +
    (c.r === 'special' ? `<div class="tn-special-tag">↩ Logic Reversed</div>` : '') +
    `<div class="tn-card-flag">${c.flag}</div>` +
    `<div class="tn-card-abs">${c.abs}</div>` +
    `<div class="tn-card-meta">${c.real} · ${c.yr}</div>` +
    `<div class="tn-card-sh">${c.sh}</div>` +
    (stackPos === 0 ? `<div class="tn-counter">${idx + 1} / ${deck.length}</div>` : '');

  if (stackPos === 0) attachDrag(el);
  return el;
}

// ── Drag / swipe mechanics ────────────────────────────────────────────────────
let dragging = false, startX = 0, startY = 0, dx = 0;
let topCard  = null;
const THRESHOLD = 80;

function attachDrag(el) {
  el.addEventListener('pointerdown', e => {
    dragging = true;
    startX = e.clientX; startY = e.clientY; dx = 0;
    topCard = el;
    el.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
  });

  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    dx = e.clientX - startX;
    const dy  = (e.clientY - startY) * 0.15;
    const rot = dx * 0.07;
    el.style.transform = `translateX(${dx}px) translateY(${dy}px) rotate(${rot}deg)`;

    const stampNo  = el.querySelector('.tn-stamp-no');
    const stampYes = el.querySelector('.tn-stamp-yes');
    const progress = Math.abs(dx) / THRESHOLD;
    if (dx < -15)     { stampNo.style.opacity  = Math.min(progress, 1); stampYes.style.opacity = 0; }
    else if (dx > 15) { stampYes.style.opacity = Math.min(progress, 1); stampNo.style.opacity  = 0; }
    else              { stampNo.style.opacity  = 0; stampYes.style.opacity = 0; }
  });

  el.addEventListener('pointerup',     () => { if (dragging) commit(); });
  el.addEventListener('pointercancel', () => { dragging = false; if (topCard) springBack(topCard); });
}

function commit() {
  dragging = false;
  if      (dx < -THRESHOLD) flyOut('absurd');
  else if (dx >  THRESHOLD) flyOut('acceptable');
  else                       springBack(topCard);
}

function springBack(el) {
  el.style.transition = 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)';
  el.style.transform  = 'scale(1) translateY(0)';
  el.querySelectorAll('.tn-stamp').forEach(s => s.style.opacity = '0');
}

function flyOut(choice) {
  if (idx >= deck.length) return;
  const dir      = choice === 'absurd' ? -1 : 1;
  const fromDrag = topCard !== null;
  const el       = topCard || deckEl?.lastElementChild;

  topCard = null;
  if (choice === 'absurd') noVotes++;
  sbVote(deck[idx].id, choice);
  idx++;

  // ── The actual fly + back-card slide ────────────────────────────────────────
  const launch = () => {
    if (!el) return;

    // Fly top card off screen
    el.style.transition = 'transform 0.7s ease, opacity 0.65s ease';
    el.style.transform  = `translateX(${dir * window.innerWidth * 1.5}px) rotate(${dir * 28}deg)`;
    el.style.opacity    = '0';

    // Simultaneously slide remaining cards into their new stack positions
    [...deckEl.children]
      .filter(c => c !== el)
      .sort((a, b) => parseInt(b.style.zIndex) - parseInt(a.style.zIndex))
      .forEach((card, i) => {
        const s = 1 - i * 0.04;
        const t = i * 14;
        // The card moving to middle also brightens slightly
        card.style.transition = i === 0
          ? 'transform 0.55s ease'
          : 'transform 0.55s ease, filter 0.55s ease';
        card.style.transform  = `scale(${s}) translateY(${t}px)`;
        if (i > 0) card.style.filter = 'brightness(0.78)';
      });

    setTimeout(() => {
      if (idx >= deck.length) showResult();
      else renderStack();
    }, 600);
  };

  if (!fromDrag && el) {
    // Button / keyboard: flash stamp, then snap card to a slight directional offset
    // via double-rAF (more reliable than getBoundingClientRect for forcing reflow)
    // so the animation starts from the same position as a drag release.
    const stamp = el.querySelector(choice === 'absurd' ? '.tn-stamp-no' : '.tn-stamp-yes');
    if (stamp) stamp.style.opacity = '1';
    el.style.transition = 'none';
    el.style.transform  = `translateX(${dir * 40}px) translateY(-8px) rotate(${dir * 3}deg)`;
    requestAnimationFrame(() => requestAnimationFrame(launch));
  } else {
    launch();
  }
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (idx >= deck.length) return;
  if (e.key === 'ArrowLeft')  flyOut('absurd');
  if (e.key === 'ArrowRight') flyOut('acceptable');
});

// ── Buttons ───────────────────────────────────────────────────────────────────
btnNo?.addEventListener('click',  () => { if (idx < deck.length) flyOut('absurd');     });
btnYes?.addEventListener('click', () => { if (idx < deck.length) flyOut('acceptable'); });

// ── Result ────────────────────────────────────────────────────────────────────
async function showResult() {
  swipeEl.style.display  = 'none';
  resultEl.style.display = 'flex';

  document.getElementById('resNoCount').textContent    = noVotes;
  document.getElementById('resTotalCount').textContent = deck.length;

  const { absurd, accept } = await sbCounts();
  const grand = absurd + accept;
  if (grand >= 100) {
    const el = document.getElementById('resSocial');
    el.textContent = absurd.toLocaleString() + ' others felt the same.';
  }

  if (typeof gtag === 'function') {
    gtag('event', 'swipe_complete', { no_count: noVotes, total: deck.length });
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderStack();
