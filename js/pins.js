// js/pins.js

(function () {

    const grid = document.getElementById('dashboard-grid');

    if (!grid) {
        console.error('Pins: dashboard-grid not found');
        return;
    }

    function refreshLayout() {

        if (!window.packeryInstance) return;

        // force Packery to rebuild item order
        window.packeryInstance.reloadItems();

        // small delay prevents stale transforms
        requestAnimationFrame(() => {
            window.packeryInstance.layout();
        });
    }

    function moveItemToTop(panel) {

        // Move BEFORE first unpinned item
        const firstUnpinned = [...grid.children]
            .find(el => !el.classList.contains('is-pinned'));

        if (firstUnpinned) {
            grid.insertBefore(panel, firstUnpinned);
        } else {
            grid.prepend(panel);
        }
    }

    function moveItemToBottom(panel) {
        grid.appendChild(panel);
    }

    grid.addEventListener('click', (e) => {

        const btn = e.target.closest('.pin-btn');

        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const panel = btn.closest('.dashboard-item');

        if (!panel) return;

        const isPinned = panel.classList.contains('is-pinned');

        // =========================
        // UNPIN
        // =========================

        if (isPinned) {

            panel.classList.remove('is-pinned');

            btn.classList.remove('pinned');

            btn.title = 'Pin to top';

            moveItemToBottom(panel);

        }

        // =========================
        // PIN
        // =========================

        else {

            panel.classList.add('is-pinned');

            btn.classList.add('pinned');

            btn.title = 'Unpin';

            moveItemToTop(panel);
        }

        refreshLayout();
    });

})();