import './nav.js';

const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
}, { threshold: 0.12 });
document.querySelectorAll('.era').forEach(el => io.observe(el));
