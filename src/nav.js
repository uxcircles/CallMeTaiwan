// Shared nav — active state + menu toggle
export function toggleMenu() {
  document.getElementById('nmenu').classList.toggle('open');
}
window.toggleMenu = toggleMenu;

// Highlight the link matching the current URL
const path = window.location.pathname.replace(/\/$/, '') || '/';
document.querySelectorAll('.nav-menu a').forEach(a => {
  const ap = new URL(a.href, location.origin).pathname.replace(/\/$/, '') || '/';
  a.classList.toggle('active', ap === path);
});
