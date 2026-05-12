import { loadGallery } from '../../js/core/storage.js';

export default async function initGallery(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-images"></i> GALLERY';
    container.appendChild(title);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px; min-height: 200px;';
    container.appendChild(content);

    try {
        const images = await loadGallery();
        if (!images || images.length === 0) {
            content.innerHTML = `
                <div style="text-align:center; padding:30px; color:#ffb000;">
                    <i class="fa-solid fa-folder-open"></i> No images
                    <div style="font-size:0.8rem; margin-top:10px;">Upload in Settings → Gallery</div>
                </div>`;
            return;
        }
        content.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px,1fr)); gap:10px;">
                ${images.map(img => `
                    <div style="cursor:pointer; border:1px solid #333; border-radius:8px; overflow:hidden;" onclick="window.open('${img.url}','_blank')">
                        <img src="${img.url}" style="width:100%; height:100px; object-fit:cover;">
                        <div style="font-size:0.7rem; padding:4px; text-align:center; color:#aaa;">${escapeHtml(img.name)}</div>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top:10px; text-align:center; font-size:0.7rem; color:#666;">${images.length} images</div>
        `;
    } catch(e) {
        content.innerHTML = `<div style="color:#f33; text-align:center;">Error loading gallery</div>`;
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
}