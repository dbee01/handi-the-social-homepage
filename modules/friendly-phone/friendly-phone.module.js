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
    content.style.cssText = 'padding: 10px;';
    container.appendChild(content);

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

    let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
    for (const c of contacts) {
        const photoHtml = c.photo ? `<img src="${c.photo}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : '<i class="fa-solid fa-user" style="font-size:1.2rem;"></i>';
        html += `
            <div style="background:#0a0a0a; border:1px solid #333; border-radius:8px; padding:12px; display:flex; align-items:center; gap:12px;">
                <div class="contact-photo" style="width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
                    ${photoHtml}
                </div>
                <div style="flex:1;">
                    <div style="color:#00ffff; font-weight:bold;">${escapeHtml(c.name)}</div>
                    <div style="color:#888; font-size:0.7rem;">${escapeHtml(c.number)}</div>
                </div>
                <a href="tel:${c.number}" style="background:#00ff41; color:#000; border:none; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; text-decoration:none;">
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