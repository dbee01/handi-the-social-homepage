// modules/ui/pin-system.js

export default function initPinSystem() {
  const main = document.querySelector('main');
  if (!main) return;

  const pins = document.querySelectorAll('.pin-btn');

  pins.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const panel = btn.closest('div[id]');
      if (!panel) return;

      const isPinned = btn.classList.contains('pinned');

      if (isPinned) {
        main.appendChild(panel);
        btn.classList.remove('pinned');
        btn.title = "Pin to top";
      } else {
        main.prepend(panel);
        btn.classList.add('pinned');
        btn.title = "Unpin";
      }

      console.log(`Panel ${panel.id} is now ${isPinned ? 'unpinned' : 'pinned'}`);
    });
  });
}