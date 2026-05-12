// modules/ui/layout-system.js
export default function initLayoutSystem() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    let packery = null;
    let sortable = null;

    // ----- Pin System (fully integrated) -----
    function initPins() {
        const handlePinClick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            const btn = e.currentTarget;
            const panel = btn.closest('.dashboard-item');
            if (!panel) return;

            const isPinned = btn.classList.contains('pinned');
            if (isPinned) {
                btn.classList.remove('pinned');
                btn.title = "Pin to top";
                grid.appendChild(panel);      // move to bottom
            } else {
                btn.classList.add('pinned');
                btn.title = "Unpin";
                grid.insertBefore(panel, grid.firstChild); // move to top
            }

            // If Packery is active, refresh layout
            if (packery) {
                packery.reloadItems();
                packery.layout();
            }
        };

        const attach = () => {
            const pins = grid.querySelectorAll('.pin-btn');
            pins.forEach(btn => {
                btn.removeEventListener('click', handlePinClick);
                btn.addEventListener('click', handlePinClick);
            });
        };
        attach();
        // Watch for dynamically added modules
        const observer = new MutationObserver(attach);
        observer.observe(grid, { childList: true, subtree: true });
    }

    function destroyPackery() {
        if (packery) {
            packery.destroy();
            packery = null;
            window.packeryInstance = null;
        }
        if (sortable) {
            sortable.destroy();
            sortable = null;
        }
    }

    function initDesktop() {
        destroyPackery();
        grid.style.display = 'block';
        // Reset item inline styles
        const items = grid.querySelectorAll('.dashboard-item');
        items.forEach(item => {
            item.style.position = '';
            item.style.top = '';
            item.style.left = '';
            item.style.width = '';
            item.style.maxWidth = '';
        });

        if (typeof Packery === 'undefined') {
            console.error('Packery not loaded');
            return;
        }
        packery = new Packery(grid, {
            itemSelector: '.dashboard-item',
            gutter: 30,
            columnWidth: 420,
            transitionDuration: '0.2s'
        });
        window.packeryInstance = packery;
        packery.layout();

        if (typeof Sortable !== 'undefined') {
            sortable = new Sortable(grid, {
                animation: 300,
                handle: '.dashboard-item',
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: () => {
                    if (packery) {
                        packery.reloadItems();
                        packery.layout();
                    }
                }
            });
        }
        console.log('Desktop layout (Packery) initialized');
    }

    function initMobile() {
        destroyPackery();
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
        grid.style.alignItems = 'center';
        grid.style.gap = '20px';
        const items = grid.querySelectorAll('.dashboard-item');
        items.forEach(item => {
            item.style.position = 'relative';
            item.style.width = '100%';
            item.style.maxWidth = '100%';
        });
        console.log('Mobile layout (flex column) initialized');
    }

    function updateLayout() {
        if (window.innerWidth > 899) {
            initDesktop();
        } else {
            initMobile();
        }
    }

    // Initial layout
    updateLayout();
    // Always initialise pins (they work in both modes)
    initPins();

    // Re-layout on resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateLayout, 150);
    });
}