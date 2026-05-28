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

    dedupeYears();
    // re-trigger scroll reveal for newly shown items
    requestAnimationFrame(() => observeItems());
  });
});

// ── Year deduplication ───────────────────────────────────────────────────────
// Show the year label only when it changes; hide repeats (visibility:hidden
// so the grid column keeps its width).
function dedupeYears() {
  let lastYear = null;
  document.querySelectorAll('.tl-item:not(.hidden)').forEach(item => {
    const yrEl = item.querySelector('.tl-yr');
    if (!yrEl) return;
    const yr = yrEl.textContent.trim();
    yrEl.classList.toggle('tl-yr--dup', yr === lastYear);
    if (yr !== lastYear) lastYear = yr;
  });
}

dedupeYears();

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
