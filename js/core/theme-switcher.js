/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/theme-switcher.js

export function initThemeSwitcher() {
    const STORAGE_KEY = 'app-theme';
    const ELDERLY_CSS = 'css/elderly.css';

    // Get saved theme or default to 'elderly'
    function getSavedTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'elderly';
    }

    // Apply theme by loading/removing elderly CSS
    function applyTheme(theme) {
        const link = document.getElementById('theme-stylesheet');

        if (theme === 'elderly') {
            // Load elderly theme
            if (!link) {
                const newLink = document.createElement('link');
                newLink.id = 'theme-stylesheet';
                newLink.rel = 'stylesheet';
                newLink.href = ELDERLY_CSS;
                // Insert after main.css
                const mainCss = document.querySelector('link[href="css/main.css"]');
                if (mainCss && mainCss.nextSibling) {
                    mainCss.parentNode.insertBefore(newLink, mainCss.nextSibling);
                } else {
                    document.head.appendChild(newLink);
                }
            } else {
                link.disabled = false;
            }
            document.documentElement.dataset.theme = 'elderly';
        } else {
            // Remove elderly theme
            if (link) {
                link.disabled = true;
            }
            document.documentElement.dataset.theme = 'dark';
        }

        localStorage.setItem(STORAGE_KEY, theme);
    }

    // Toggle between themes
    function toggleTheme() {
        const current = getSavedTheme();
        const newTheme = current === 'elderly' ? 'dark' : 'elderly';
        applyTheme(newTheme);
        updateButtonText(newTheme);
        return newTheme;
    }

    // Update button text
    function updateButtonText(theme) {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.innerHTML = theme === 'elderly' ? '🌙 Dark' : '👁️ Elderly';
        }
    }

    // Add theme toggle button to header
    function addThemeToggle() {
        const header = document.querySelector('header');
        if (!header) {
            console.warn('Header not found for theme toggle');
            return;
        }

        // Check if already exists
        if (document.getElementById('themeToggle')) return;

        const themeBtn = document.createElement('button');
        themeBtn.id = 'themeToggle';
        themeBtn.className = 'theme-toggle';
        themeBtn.title = 'Toggle theme (Elderly/Dark)';
        const savedTheme = getSavedTheme();
        themeBtn.innerHTML = savedTheme === 'elderly' ? '🌙 Dark' : '👁️ Elderly';
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });

        header.appendChild(themeBtn);
    }

    // Initialize theme on page load
    function init() {
        const savedTheme = getSavedTheme();
        applyTheme(savedTheme);
        addThemeToggle();
    }

    // Wait for DOM if needed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        toggleTheme,
        getSavedTheme,
        applyTheme
    };
}

