// modules/ui/layout-system.js

export default function initLayoutSystem() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) {
    console.error("❌ Dashboard grid not found!");
    return;
  }

  console.log("🎯 Initializing layout system...");

  let packery = null;
  let isDragging = false;
  
  // Initialize SortableJS for drag & drop
  if (typeof Sortable === 'undefined') {
    console.error("❌ SortableJS not loaded!");
    return;
  }

  console.log("✅ SortableJS found, enabling drag & drop...");
  
  const sortable = new Sortable(grid, {
    animation: 300,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    handle: '.dashboard-item',
    disabled: false,
    
    onStart: function() {
      isDragging = true;
      console.log("🖱️ Drag started");
      // Disable Packery during drag
      if (packery) {
        packery.options.isResizeLayout = false;
      }
    },
    
    onEnd: function() {
      console.log("🖱️ Drag ended");
      isDragging = false;
      
      // Re-enable and update Packery
      if (packery) {
        packery.options.isResizeLayout = true;
        // Force Packery to reload and relayout
        setTimeout(() => {
          packery.reloadItems();
          packery.layout();
        }, 50);
      }
    }
  });

  // Initialize Packery
  const initPackery = () => {
    if (typeof Packery === 'undefined') {
      console.error("❌ Packery not loaded!");
      return;
    }
    
    packery = new Packery(grid, {
      itemSelector: '.dashboard-item',
      gutter: 30,
      columnWidth: 420,
      transitionDuration: '0.2s',
      resize: true
    });
    
    console.log("✅ Packery initialized");
    window.packeryInstance = packery;
    
    // Layout after all images/content loads
    setTimeout(() => {
      packery.layout();
    }, 100);
  };
  
  initPackery();

  // Initialize Pin System
  initPinSystem(grid, packery);
  
  console.log("✅ Layout system initialized");
}

// Pin System
function initPinSystem(grid, packery) {
  console.log("📌 Initializing pin system...");
  
  function setupPinButtons() {
    const allPins = grid.querySelectorAll('.pin-btn');
    console.log(`📌 Found ${allPins.length} pin buttons`);
    
    allPins.forEach(btn => {
      btn.removeEventListener('click', handlePinClick);
      btn.addEventListener('click', handlePinClick);
    });
  }
  
  function handlePinClick(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const btn = e.currentTarget;
    const panel = btn.closest('.dashboard-item');
    
    if (!panel) return;
    
    const isPinned = btn.classList.contains('pinned');
    
    console.log(`📌 Pin clicked, isPinned: ${isPinned}`);
    
    // Toggle pin state
    if (isPinned) {
      btn.classList.remove('pinned');
      btn.title = "Pin to top";
    } else {
      btn.classList.add('pinned');
      btn.title = "Unpin";
    }
    
    // Reorder DOM based on pin states
    const allItems = Array.from(grid.querySelectorAll('.dashboard-item'));
    const pinnedItems = allItems.filter(item => {
      const pinBtn = item.querySelector('.pin-btn');
      return pinBtn && pinBtn.classList.contains('pinned');
    });
    const unpinnedItems = allItems.filter(item => {
      const pinBtn = item.querySelector('.pin-btn');
      return !pinBtn || !pinBtn.classList.contains('pinned');
    });
    
    // New order: pinned first, then unpinned
    const newOrder = [...pinnedItems, ...unpinnedItems];
    
    // Reorder DOM
    newOrder.forEach(item => {
      grid.appendChild(item);
    });
    
    // Update Packery
    if (packery) {
      packery.reloadItems();
      packery.layout();
    }
  }
  
  setupPinButtons();
  
  // Watch for dynamically added items
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        setupPinButtons();
      }
    });
  });
  
  observer.observe(grid, { childList: true, subtree: true });
}