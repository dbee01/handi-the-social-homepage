/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// First visit redirect to the dashboard selector
(function() {
    if (localStorage.getItem('handiPopupShown') === 'true') return;
    if (window.location.pathname.includes('/selector.html')) return;
    localStorage.setItem('handiPopupShown', 'true');
    window.location.href = '/selector.html';
})();