// js/pins.js
console.log('pins.js loaded');

(function() {
  console.log('📌 Pin System Initializing...');

  function handlePinClick(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const btn = e.currentTarget;
    const panel = btn.closest('.dashboard-item');
    if (!panel) return;
    
    const isPinned = btn.classList.contains('pinned');
    
    if (isPinned) {
      btn.classList.remove('pinned');
      btn.title = "Pin to top";
    } else {
      btn.classList.add('pinned');
      btn.title = "Unpin";
    }
    
    const grid = document.getElementById('dashboard-grid');
    const allItems = Array.from(grid.querySelectorAll('.dashboard-item'));
    const pinnedItems = allItems.filter(item => {
      const pinBtn = item.querySelector('.pin-btn');
      return pinBtn && pinBtn.classList.contains('pinned');
    });
    const unpinnedItems = allItems.filter(item => {
      const pinBtn = item.querySelector('.pin-btn');
      return !pinBtn || !pinBtn.classList.contains('pinned');
    });
    
    const newOrder = [...pinnedItems, ...unpinnedItems];
    newOrder.forEach(item => grid.appendChild(item));
    
    if (window.packeryInstance) {
      setTimeout(() => {
        window.packeryInstance.reloadItems();
        window.packeryInstance.layout();
      }, 50);
    }
  }

  function initPins() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    
    const pins = grid.querySelectorAll('.pin-btn');
    pins.forEach(btn => {
      btn.removeEventListener('click', handlePinClick);
      btn.addEventListener('click', handlePinClick);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPins);
  } else {
    initPins();
  }
})();