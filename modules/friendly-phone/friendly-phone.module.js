// modules/friendly-phone/friendly-phone.module.js
import { loadSettings } from '../../js/core/settings.js';

export default async function initPhone(container) {

    const pinBtn = container.querySelector('.pin-btn');

    container.innerHTML = '';

    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-phone"></i> FRIENDLY PHONE';

    container.appendChild(title);

    const content = document.createElement('div');
    content.className = 'phone-content';

    container.appendChild(content);

    const parentItem = container.closest('.dashboard-item');

    if (parentItem) {
        parentItem.dataset.module = 'phone';
    }

    const settings = loadSettings();
    const contacts = settings.phone?.contacts || [];

    if (!contacts.length) {

        content.innerHTML = `
            <div class="module-empty">
                <i class="fa-solid fa-address-book"></i>
                No phone contacts
                <div class="module-hint">
                    Add in Settings → Friendly Phone
                </div>
            </div>
        `;

        return;
    }

    content.innerHTML = `
        <div class="phone-grid">

            ${contacts.map(c => `
                <div class="phone-card">

                    ${c.photo
                        ? `<img class="phone-avatar" src="${c.photo}" alt="">`
                        : `<div class="phone-avatar placeholder">
                              <i class="fa-solid fa-user"></i>
                           </div>`
                    }

                    <div class="phone-name">
                        ${escapeHtml(c.name)}
                    </div>

                    <div class="phone-number">
                        ${escapeHtml(c.number)}
                    </div>

                    <a class="phone-call"
                       href="tel:${c.number}">

                        <i class="fa-solid fa-phone"></i>
                        Call
                    </a>

                </div>
            `).join('')}

        </div>
    `;

    function escapeHtml(str) {

        if (!str) return '';

        return str.replace(/[&<>]/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[m]));
    }
}