// modules/ui/layout-system.js
import initPinSystem from './pin-system.js';

export default function initLayoutSystem() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;

  // Debug: Log container dimensions
  console.log("Grid Container Width:", grid.offsetWidth, "Height:", grid.offsetHeight);

  // 1. Initialize Packery (Declare here so it's accessible in setTimeout)
  const packery = new Packery(grid, {
    itemSelector: '.dashboard-item',
    gutter: 30,
    columnWidth: 450,
    percentPosition: false,
    stagger: 30,
    getSortData: {
      order: '[data-order] parseInt',
    },
    initLayout: true,
  });

  // 2. Initialize SortableJS
  const SortableLib = window.Sortable || (window.Sortable && window.Sortable.default);
  
  if (!SortableLib) {
    console.error("SortableJS not loaded!");
    return;
  }

  const sortable = new SortableLib(grid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    handle: '.dashboard-item',
    filter: '.pin-btn',
    onEnd: function (evt) {
      // Ensure packery is available here too
      if (packery) packery.layout();
    }
  });

  // 3. Initialize Pin System
  initPinSystem(grid);

  // 4. FORCE RE-LAYOUT AND HEIGHT CALCULATION
  setTimeout(() => {
    if (!packery) {
      console.error("Packery instance not found in timeout!");
      return;
    }

    console.log("Re-calculating Packery layout...");
    packery.layout();
    
    // Calculate the bottom of the lowest item
    const items = packery.getItemElements();
    let maxBottom = 0;
    
    items.forEach(item => {
      const top = parseFloat(item.style.top) || 0;
      const height = item.offsetHeight;
      const bottom = top + height;
      if (bottom > maxBottom) maxBottom = bottom;
    });

    // Set the container height to the bottom of the lowest item + padding
    // This ensures the footer sits right after the content
    grid.style.height = (maxBottom + 40) + 'px';
    
    console.log("Columns calculated:", packery.cols);
    console.log("Container height set to:", grid.style.height);
  }, 500); 
}