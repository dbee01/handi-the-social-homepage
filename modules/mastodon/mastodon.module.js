// modules/mastodon/mastodon.module.js
import { loadSettings } from '../../js/core/settings.js';

export default async function initMastodon(container) {
    const pinBtn = container.querySelector('.pin-btn');

    // Clear existing content
    container.innerHTML = '';

    // Restore pin button
    if (pinBtn) container.appendChild(pinBtn);

    // Title
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-brands fa-mastodon"></i> MASTODON';
    container.appendChild(title);

    // Content wrapper
    const content = document.createElement('div');
    content.className = 'mastodon-content';
    container.appendChild(content);

    // Mark module type
    const parentItem = container.closest('.dashboard-item');
    if (parentItem) {
        parentItem.dataset.module = 'mastodon';
        parentItem.style.minHeight = 'unset'; // allow compact height
    }

    // Settings
    const settings = loadSettings();
    const instance = settings.mastodon?.instance || 'https://mastodon.ie';
    const limit = settings.mastodon?.limit || 5;

    // Loading state
    content.innerHTML = `
        <div class="module-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading trending...
        </div>
    `;

    function refreshPackery() {
        if (!window.packeryInstance) return;

        requestAnimationFrame(() => {
            window.packeryInstance.reloadItems();
            window.packeryInstance.layout();
        });
    }

    try {
        const url = `${instance}/api/v1/trends/links?limit=${limit}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!Array.isArray(data) || !data.length) {
            content.innerHTML = `
                <div class="module-empty">
                    No trending links
                </div>
            `;
            refreshPackery();
            return;
        }

        const html = data.map(item => {
            const titleText = item.title || 'Untitled';
            const urlLink = item.url || '#';
            const description = item.description || '';
            const provider = item.provider_name || '';
            const image = item.image || '';

            const shortDescription =
                description.length > 80
                    ? `${description.substring(0, 80)}...`
                    : description;

            return `
                <div class="mastodon-item">

                    ${
                        image
                            ? `
                        <img
                            class="mastodon-image"
                            src="${image}"
                            alt=""
                            loading="lazy"
                        >
                    `
                            : `
                        <div class="mastodon-image placeholder">
                            <i class="fa-solid fa-link"></i>
                        </div>
                    `
                    }

                    <div class="mastodon-body">

                        <a class="mastodon-title"
                           href="${urlLink}"
                           target="_blank"
                           rel="noopener noreferrer">
                            ${escapeHtml(titleText)}
                        </a>

                        ${
                            provider
                                ? `
                            <div class="mastodon-provider">
                                ${escapeHtml(provider)}
                            </div>
                        `
                                : ''
                        }

                        ${
                            shortDescription
                                ? `
                            <div class="mastodon-desc">
                                ${escapeHtml(shortDescription)}
                            </div>
                        `
                                : ''
                        }

                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = html;

        // Re-layout after images load
        const images = content.querySelectorAll('img');
        images.forEach(img => {
            if (!img.complete) {
                img.addEventListener('load', refreshPackery, { once: true });
                img.addEventListener('error', refreshPackery, { once: true });
            }
        });

        refreshPackery();
    } catch (err) {
        console.error('Mastodon module error:', err);

        content.innerHTML = `
            <div class="module-error">
                Failed to load Mastodon.
                Check instance URL in Settings.
            </div>
        `;

        refreshPackery();
    }

    function escapeHtml(str) {
        if (!str) return '';

        return String(str).replace(/[&<>]/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[m]));
    }
}