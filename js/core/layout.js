// js/core/layout.js

let sortableInstance = null;

export function initLayout() {

    const grid = document.getElementById('dashboard-grid');

    if (!grid) return;

    const isMobile = window.innerWidth <= 900;

    // ========================================
    // MOBILE
    // ========================================

    if (isMobile) {

        grid.classList.add('mobile-layout');

        if (window.packeryInstance) {
            window.packeryInstance.destroy();
            window.packeryInstance = null;
        }

        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }

        // CRITICAL:
        // remove inline styles Packery added
        grid.querySelectorAll('.dashboard-item').forEach(item => {

            item.style.position = '';
            item.style.left = '';
            item.style.top = '';
            item.style.transform = '';
        });

        return;
    }

    // ========================================
    // DESKTOP
    // ========================================

    grid.classList.remove('mobile-layout');

    if (window.packeryInstance) {
        window.packeryInstance.destroy();
    }

    if (sortableInstance) {
        sortableInstance.destroy();
    }

    // CRITICAL:
    // clear ALL old inline styles
    grid.querySelectorAll('.dashboard-item').forEach(item => {

        item.style.width = '';
        item.style.position = '';
        item.style.left = '';
        item.style.top = '';
        item.style.transform = '';
    });

    // ========================================
    // PACKERY
    // ========================================

    window.packeryInstance = new Packery(grid, {

        itemSelector: '.dashboard-item',

        gutter: 20,

        percentPosition: false,

        transitionDuration: '0.2s'
    });

    // ========================================
    // SORTABLE
    // ========================================

    sortableInstance = new Sortable(grid, {

        animation: 200,

        handle: '.dashboard-item',

        draggable: '.dashboard-item',

        onEnd: () => {

            window.packeryInstance.reloadItems();

            requestAnimationFrame(() => {
                window.packeryInstance.layout();
            });
        }
    });

    // Force layout after render
    requestAnimationFrame(() => {
        window.packeryInstance.layout();
    });
}

// ========================================
// INIT
// ========================================

window.addEventListener('load', initLayout);

// ========================================
// RESIZE
// ========================================

let resizeTimer;

window.addEventListener('resize', () => {

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {

        initLayout();

    }, 150);
});
