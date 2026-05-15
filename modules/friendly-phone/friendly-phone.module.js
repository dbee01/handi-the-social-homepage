// modules/friendly-phone/friendly-phone.module.js
import { loadSettings } from '../../js/core/settings.js';

export default async function initPhone(container) {
    const pinBtn = container.querySelector('.pin-btn');

    container.innerHTML = '';

    // Action buttons wrapper
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'phone-actions';

    const lockToggle = document.createElement('button');
    lockToggle.className = 'phone-lock-toggle';

    // Load saved lock state – default to LOCKED (true)
    const saved = localStorage.getItem('phoneLocked');
    let isLocked = saved !== null ? saved === 'true' : true;  // default locked

    function updateLockIcon() {
        lockToggle.innerHTML = isLocked
            ? '<i class="fa-solid fa-lock"></i>'
            : '<i class="fa-solid fa-lock-open"></i>';
        lockToggle.style.color = isLocked ? '#cc0000' : '#008000';
    }
    updateLockIcon();

    lockToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        isLocked = !isLocked;
        localStorage.setItem('phoneLocked', isLocked);
        updateLockIcon();
        applyLockState();
    });

    actionsDiv.appendChild(lockToggle);
    if (pinBtn) actionsDiv.appendChild(pinBtn);
    container.appendChild(actionsDiv);

    // Title
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-phone"></i> FRIENDLY PHONE';
    container.appendChild(title);

    const content = document.createElement('div');
    content.className = 'phone-content';
    container.appendChild(content);

    const parentItem = container.closest('.dashboard-item');
    if (parentItem) parentItem.dataset.module = 'phone';

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
                    <div class="phone-name">${escapeHtml(c.name)}</div>
                    <div class="phone-number">${escapeHtml(c.number)}</div>
                    <a class="phone-call" href="tel:${c.number}">
                        <i class="fa-solid fa-phone"></i>
                        Call
                    </a>
                </div>
            `).join('')}
        </div>
    `;

    function applyLockState() {
        const allCallLinks = content.querySelectorAll('.phone-call');
        if (isLocked) {
            allCallLinks.forEach(link => {
                link.classList.add('locked');
                link.addEventListener('click', preventCall);
            });
        } else {
            allCallLinks.forEach(link => {
                link.classList.remove('locked');
                link.removeEventListener('click', preventCall);
            });
        }
    }

    function preventCall(e) {
        e.preventDefault();
    }

    applyLockState();

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[m]));
    }
}