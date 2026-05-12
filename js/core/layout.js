// js/core/layout.js
export function initLayout() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    
    if (window.innerWidth <= 800) {
        grid.classList.add('mobile-layout');
        return;
    }
    
    grid.classList.remove('mobile-layout');
    
    if (window.packery) window.packery.destroy();
    
    window.packery = new Packery(grid, {
        itemSelector: '.dashboard-item',
        gutter: 30,
        columnWidth: 420,
        transitionDuration: '0.2s'
    });
    
    new Sortable(grid, {
        animation: 300,
        handle: '.dashboard-item',
        onEnd: () => window.packery?.layout()
    });
}