/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/layout.js

let sortableInstance = null;

function refreshLayout() {
    if (typeof window === 'undefined') return;
    if (window.packeryInstance) {
        window.packeryInstance.reloadItems();
        window.packeryInstance.layout();
    }
}

if (typeof window !== 'undefined') {
    window.refreshDashboardLayout = refreshLayout;
}

function isTouchscreen() {
    return (('ontouchstart' in window) || 
            (navigator.maxTouchPoints > 0) || 
            (navigator.msMaxTouchPoints > 0));
}

export function initLayout() {
    window.refreshDashboardLayout = refreshLayout;

    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    // Use width only to decide between multi‑column (Packery) or single‑column layout
    const isNarrow = window.innerWidth <= 900;   // renamed from isMobile

    // ========================================
    // NARROW WIDTH – single column, no Packery, no Sortable
    // ========================================
    if (isNarrow) {
        grid.classList.add('mobile-layout');

        if (window.packeryInstance) {
            window.packeryInstance.destroy();
            window.packeryInstance = null;
        }
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
        // Remove inline styles left by Packery
        grid.querySelectorAll('.dashboard-item').forEach(item => {
            item.style.position = '';
            item.style.left = '';
            item.style.top = '';
            item.style.transform = '';
        });
        return;
    }

    // ========================================
    // WIDE WIDTH – multi‑column (Packery) + optionally Sortable (drag‑and‑drop)
    // ========================================
    grid.classList.remove('mobile-layout');

    if (window.packeryInstance) {
        window.packeryInstance.destroy();
    }
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    // Clear old inline styles (clean slate)
    grid.querySelectorAll('.dashboard-item').forEach(item => {
        item.style.width = '';
        item.style.position = '';
        item.style.left = '';
        item.style.top = '';
        item.style.transform = '';
    });

    // -------------------------
    // 1. ALWAYS create Packery (masonry layout)
    // -------------------------
    window.packeryInstance = new Packery(grid, {
        itemSelector: '.dashboard-item',
        gutter: 20,
        percentPosition: false,
        transitionDuration: '0.2s'
    });

    // -------------------------
    // 2. Create Sortable ONLY if the device is NOT a touchscreen
    //    (drag‑and‑drop is awkward on touch devices)
    // -------------------------
    if (!isTouchscreen()) {
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
    }

    // Force layout
    requestAnimationFrame(() => {
        window.packeryInstance.layout();
    });

    if (window.packeryInstance) {
    window.packeryInstance.reloadItems();
    window.packeryInstance.layout();
    }
}

export function refreshDashboardLayout() {
    if (typeof window !== 'undefined' && window.refreshDashboardLayout) {
        window.refreshDashboardLayout();
    }
}

// ========================================
// INIT
// ========================================
window.addEventListener('load', initLayout);

// ========================================
// RESIZE (debounced)
// ========================================
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        initLayout();
    }, 150);
});