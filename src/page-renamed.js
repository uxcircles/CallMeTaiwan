import './nav.js';

// ── Category filter ──────────────────────────────────────────────────────────
const tabs  = document.querySelectorAll('.tl-tab');
const items = document.querySelectorAll('.tl-item');
const countEl = document.getElementById('tl-count');

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const cat = btn.dataset.cat;
    let visible = 0;
    items.forEach(item => {
      const show = cat === 'all' || item.dataset.cat === cat;
      item.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    if (countEl) countEl.textContent = visible;

    // re-trigger scroll reveal for newly shown items
    requestAnimationFrame(() => observeItems());
  });
});

// ── Scroll-reveal ────────────────────────────────────────────────────────────
function observeItems() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('vis');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.tl-item:not(.hidden):not(.vis)').forEach(el => io.observe(el));
}

observeItems();
