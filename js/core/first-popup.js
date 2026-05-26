/*
 * Copyright (c) 2026 Handi Homepage
 * First visit popup – redirects to the new dashboard selector.
 */
(function() {
    // Already shown or currently on the selector page? Avoid infinite loop.
    if (localStorage.getItem('handiPopupShown') === 'true') return;
    if (window.location.pathname.includes('/dashboard-selector/')) return;

    // Mark as shown immediately so it won't trigger again after redirect.
    localStorage.setItem('handiPopupShown', 'true');

    // Redirect to the standalone dashboard selector.
    // The selector will save the user's choices and should redirect back to this page.
    window.location.href = '/dashboard-selector/index.html';
})();