// ============================================
// Search Functionality (European privacy-friendly)
// ============================================

(function() {
    'use strict';
    
    const searchInput = document.getElementById('hhSearchInput');
    const searchEngine = document.getElementById('hhSearchEngine');
    const searchEngineLogo = document.getElementById('hhSearchEngineLogo');
    const searchButton = document.getElementById('hhSearchButton');

    if (!searchInput || !searchEngine || !searchEngineLogo) {
        console.warn("Search elements not found");
        return;
    }

    const logoMap = {
        startpage: { emoji: '🔒', color: '#4A90E2' },
        qwant: { emoji: '🐦', color: '#5C9EFF' },
        ecosia: { emoji: '🌳', color: '#4CAF50' },
        mojeek: { emoji: '🔍', color: '#FF6B35' }
    };

    function updateSearchLogo(value) {
        const engine = logoMap[value] || logoMap.startpage;
        searchEngineLogo.style.backgroundColor = engine.color;
        searchEngineLogo.style.color = 'white';
        searchEngineLogo.style.textAlign = 'center';
        searchEngineLogo.style.lineHeight = '28px';
        searchEngineLogo.textContent = engine.emoji;
    }

    updateSearchLogo(searchEngine.value);
    searchEngine.addEventListener('change', () => updateSearchLogo(searchEngine.value));

    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        const engine = searchEngine.value;
        const searchUrls = {
            startpage: `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`,
            qwant: `https://www.qwant.com/?q=${encodeURIComponent(query)}`,
            ecosia: `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`,
            mojeek: `https://www.mojeek.com/search?q=${encodeURIComponent(query)}`
        };

        window.open(searchUrls[engine] || searchUrls.startpage, '_blank');
        searchInput.value = '';
    }

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
})();