// modules/ui/pin-system.js

export default function initPinSystem(gridContainer, packeryInstance) {
  if (!gridContainer) {
    console.error("Pin System: Container not found");
    return;
  }

  function refreshPins() {
    const pins = gridContainer.querySelectorAll('.pin-btn');
    pins.forEach(btn => {
      // Remove old listener to prevent duplicates
      btn.removeEventListener('click', handlePinClick);
      btn.addEventListener('click', handlePinClick);
    });
  }

  function handlePinClick(e) {
    e.stopPropagation();
    
    const btn = e.currentTarget;
    const panel = btn.closest('.dashboard-item');
    if (!panel) return;

    const isPinned = btn.classList.contains('pinned');
    const allItems = Array.from(gridContainer.querySelectorAll('.dashboard-item'));

    if (isPinned) {
      // Unpin: move to end
      btn.classList.remove('pinned');
      btn.title = "Pin to top";
      
      // Move to end while preserving relative order of other items
      const currentIndex = allItems.indexOf(panel);
      if (currentIndex !== -1) {
        // Remove from current position and append
        gridContainer.removeChild(panel);
        gridContainer.appendChild(panel);
      }
    } else {
      // Pin: move to top
      btn.classList.add('pinned');
      btn.title = "Unpin";
      
      // Move to beginning
      const currentIndex = allItems.indexOf(panel);
      if (currentIndex !== -1) {
        gridContainer.removeChild(panel);
        gridContainer.insertBefore(panel, allItems[0]);
      }
    }

    // Force multiple layouts to ensure Packery recalculates correctly
    if (packeryInstance && packeryInstance.layout) {
      // First layout
      packeryInstance.layout();
      
      // Second layout after DOM settles
      setTimeout(() => {
        if (packeryInstance && packeryInstance.layout) {
          packeryInstance.layout();
        }
      }, 50);
      
      // Third layout for any lingering issues
      setTimeout(() => {
        if (packeryInstance && packeryInstance.layout) {
          packeryInstance.layout();
        }
      }, 150);
    }
  }

  // Initial setup
  refreshPins();

  // Watch for dynamically added items (if any)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        refreshPins();
      }
    });
  });

  observer.observe(gridContainer, { childList: true, subtree: true });

  return {
    refresh: refreshPins
  };
}