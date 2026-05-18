/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/ui/layout-system.js
function isTouchscreen() {
    return (('ontouchstart' in window) || 
            (navigator.maxTouchPoints > 0) || 
            (navigator.msMaxTouchPoints > 0));
}

export default function initLayoutSystem() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid || window.packeryInstance) return;

    if (window.innerWidth <= 899 || isTouchscreen()) {
        // Mobile or touchscreen: simple column
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
        grid.style.alignItems = 'center';
        grid.style.gap = '20px';
        return;
    }

    if (typeof Packery === 'undefined' || typeof Sortable === 'undefined') {
        console.error('Packery or Sortable not loaded');
        return;
    }

    grid.style.display = 'block';
    const packery = new Packery(grid, {
        itemSelector: '.dashboard-item',
        gutter: 30,
        columnWidth: 420,
        transitionDuration: '0.2s'
    });
    window.packeryInstance = packery;

    new Sortable(grid, {
        animation: 300,
        handle: '.dashboard-item',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: () => {
            packery.reloadItems();
            packery.layout();
        }
    });

    // Update grid height after layout
    packery.on('layoutComplete', () => {
        let maxBottom = 0;
        packery.getItemElements().forEach(item => {
            const rect = item.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            const bottom = rect.bottom - gridRect.top + 40;
            if (bottom > maxBottom) maxBottom = bottom;
        });
        grid.style.height = (maxBottom + 20) + 'px';
    });

    packery.layout();

    // When any dashboard item changes size (e.g., images load), relayout
    if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => {
            packery.layout();
        });
        document.querySelectorAll('.dashboard-item').forEach(item => observer.observe(item));
    }

    // Relayout on window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth <= 899) {
                if (packery) packery.destroy();
                grid.style.display = 'flex';
                grid.style.flexDirection = 'column';
                grid.style.alignItems = 'center';
                grid.style.gap = '20px';
                window.packeryInstance = null;
            } else if (!window.packeryInstance) {
                initLayoutSystem(); // re-initialise if coming from mobile
            } else {
                packery.layout();
            }
        }, 200);
    });
}