import './nav.js';

const eras = [...document.querySelectorAll('.era')];

// Fade-in: add .vis once when era enters viewport
const fadeObs = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
}, { threshold: 0.12 });
eras.forEach(el => fadeObs.observe(el));

// Active dot: whichever era's centre is closest to the viewport middle
function updateActive() {
  const mid = window.innerHeight / 2;
  let closest = null, minDist = Infinity;
  eras.forEach(el => {
    const r = el.getBoundingClientRect();
    const dist = Math.abs(r.top + r.height / 2 - mid);
    if (dist < minDist) { minDist = dist; closest = el; }
  });
  eras.forEach(el => el.classList.toggle('era-active', el === closest));
}

window.addEventListener('scroll', updateActive, { passive: true });
updateActive();

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
