// First visit redirect to the dashboard selector
(function() {
    if (localStorage.getItem('handiPopupShown') === 'true') return;
    if (window.location.pathname.includes('/selector.html')) return;
    localStorage.setItem('handiPopupShown', 'true');
    window.location.href = '/selector.html';
})();