import './nav.js';
import { startGlobe } from './globe.js';

function scrollToCompare() {
  const card = document.querySelector('#compare-content .cmp-card');
  if (!card) return;
  const navH = document.querySelector('nav')?.offsetHeight || 58;
  const target = window.scrollY + card.getBoundingClientRect().top - navH - 16;
  window.scrollTo({ top: target, behavior: 'smooth' });
}

window.scrollToCompare = scrollToCompare;

setTimeout(startGlobe, 80);
