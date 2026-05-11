// Pin Feature
(function() {
  function savePins() {
    const pinned = Array.from(document.querySelectorAll('.dashboard-item.pinned:not(.hidden-module)')).map(i => i.id);
    localStorage.setItem('pinnedItems', JSON.stringify(pinned));
  }

  function loadPins() {
    const saved = localStorage.getItem('pinnedItems');
    if (saved) {
      JSON.parse(saved).forEach(id => {
        const item = document.getElementById(id);
        if (item && !item.classList.contains('hidden-module')) {
          item.classList.add('pinned');
          const btn = item.querySelector('.pin-btn');
          if (btn) {
            btn.style.color = '#00ff41';
            btn.style.transform = 'rotate(45deg)';
          }
        }
      });
    }
  }

  function movePinsToTop() {
    const grid = document.getElementById('dashboard-grid');
    const visible = Array.from(grid.children).filter(c => !c.classList.contains('hidden-module'));
    const pinned = visible.filter(i => i.classList.contains('pinned'));
    const unpinned = visible.filter(i => !i.classList.contains('pinned'));
    pinned.forEach(i => grid.appendChild(i));
    unpinned.forEach(i => grid.appendChild(i));
    if (window.pckry) { window.pckry.reloadItems(); window.pckry.layout(); }
  }

  function initPins() {
    document.querySelectorAll('.pin-btn').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.onclick = (e) => {
        e.stopPropagation();
        const item = newBtn.closest('.dashboard-item');
        if (item.classList.contains('pinned')) {
          item.classList.remove('pinned');
          newBtn.style.color = '';
          newBtn.style.transform = '';
        } else {
          item.classList.add('pinned');
          newBtn.style.color = '#00ff41';
          newBtn.style.transform = 'rotate(45deg)';
        }
        movePinsToTop();
        savePins();
      };
    });
  }

  window.addEventListener('settingsChanged', () => setTimeout(movePinsToTop, 100));
  loadPins();
  initPins();
  setTimeout(movePinsToTop, 100);
})();
