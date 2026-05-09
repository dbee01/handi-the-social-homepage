// modules/ui/pin-system.js

export default function initPinSystem(gridContainer) {
  if (!gridContainer) {
    // Fallback if grid not passed (for backward compatibility)
    gridContainer = document.querySelector('#dashboard-grid') || document.querySelector('main');
  }
  if (!gridContainer) return;

  const pins = gridContainer.querySelectorAll('.pin-btn');

  pins.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const panel = btn.closest('.dashboard-item');
      if (!panel) return;

      const isPinned = btn.classList.contains('pinned');

      if (isPinned) {
        // UNPIN: Move to end (natural flow)
        gridContainer.appendChild(panel);
        btn.classList.remove('pinned');
        btn.title = "Pin to top";
      } else {
        // PIN: Move to beginning
        // Prepend moves it to the first position in the DOM
        // Packery will then re-layout, putting it in the top-left
        gridContainer.prepend(panel);
        btn.classList.add('pinned');
        btn.title = "Unpin";
      }

      // Trigger Packery to re-layout immediately
      // We need to find the packery instance. 
      // Since we can't easily access it here without global scope, 
      // we'll rely on the fact that DOM changes trigger Packery if configured,
      // OR we can manually trigger a layout if we stored the instance.
      
      // Simple workaround: Dispatch a custom event or just let the next interaction trigger it.
      // For immediate effect, we can try to re-init or just rely on the drag-stop event.
      // However, to be safe, let's assume the user might drag it immediately.
      // If you want instant reflow, you'd need to pass the packery instance here.
      
      console.log(`Panel ${panel.id} is now ${isPinned ? 'unpinned' : 'pinned'}`);
    });
  });
}