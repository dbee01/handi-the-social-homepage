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
    // Give the module enough min-height to prevent overlapping
    content.style.cssText = 'padding: 10px; min-height: 380px;';
    container.appendChild(content);

    // Also ensure the parent dashboard item has sufficient height
    const parentItem = container.closest('.dashboard-item');
    if (parentItem) parentItem.style.minHeight = '450px';

    const settings = loadSettings();
    const contacts = settings.phone?.contacts || [];

    if (contacts.length === 0) {
        content.innerHTML = `
            <div style="text-align:center; padding:30px; color:#ffb000;">
                <i class="fa-solid fa-address-book"></i> No phone contacts
                <div style="font-size:0.8rem; margin-top:10px;">Add in Settings → Friendly Phone</div>
            </div>`;
        return;
    }

    // Responsive grid – larger photos, horizontal stacking
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;">
    `;
    for (const c of contacts) {
        const photoHtml = c.photo
            ? `<img src="${c.photo}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 8px;">`
            : `<div style="width: 80px; height: 80px; border-radius: 50%; background: #1f1f1f; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                <i class="fa-solid fa-user" style="font-size: 2rem;"></i>
               </div>`;
        html += `
            <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 12px; padding: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                ${photoHtml}
                <div style="font-weight: bold; color: #00ffff; font-size: 1rem;">${escapeHtml(c.name)}</div>
                <div style="color: #888; font-size: 0.75rem;">${escapeHtml(c.number)}</div>
                <a href="tel:${c.number}" style="background: #00ff41; color: #000; border: none; border-radius: 40px; padding: 6px 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px;">
                    <i class="fa-solid fa-phone"></i> Call
                </a>
            </div>
        `;
    }
    html += `</div>`;
    content.innerHTML = html;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
}