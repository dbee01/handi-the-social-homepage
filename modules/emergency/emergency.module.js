import { loadSettings } from '../../js/core/settings.js';

export default async function initEmergency(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> EMERGENCY';
    container.appendChild(title);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px;';
    container.appendChild(content);

    const settings = loadSettings();
    const contacts = settings.emergency?.contacts || [];

    if (contacts.length === 0) {
        content.innerHTML = `
            <div style="text-align:center; padding:30px; color:#ffb000;">
                <i class="fa-solid fa-phone"></i> No emergency contacts
                <div style="font-size:0.8rem; margin-top:10px;">Add in Settings → Emergency</div>
            </div>`;
        return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
    for (const c of contacts) {
        html += `
            <div style="background:#0a0a0a; border:1px solid #333; border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="color:#00ffff; font-weight:bold;">${escapeHtml(c.name)}</div>
                    <div style="color:#888; font-size:0.8rem;">${escapeHtml(c.number)}</div>
                    ${c.relation ? `<div style="color:#00ff41; font-size:0.7rem;">${escapeHtml(c.relation)}</div>` : ''}
                </div>
                <a href="tel:${c.number}" style="background:#ff4444; color:white; border:none; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                    <i class="fa-solid fa-phone"></i>
                </a>
            </div>
        `;
    }
    html += '</div>';
    content.innerHTML = html;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
}