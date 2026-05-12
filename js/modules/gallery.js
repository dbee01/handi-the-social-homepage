// js/modules/gallery.js
import { loadGallery } from '../core/storage.js';

export async function initGallery(container) {
    // PRESERVE PIN BUTTON (if exists, but we'll rebuild)
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    // Add panel title
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-images"></i> GALLERY';
    container.appendChild(title);

    // Create content area
    const contentDiv = document.createElement('div');
    contentDiv.id = 'gallery-content';
    contentDiv.style.cssText = 'padding: 10px; min-height: 200px;';
    container.appendChild(contentDiv);

    // Show loading state
    contentDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#666;"><i class="fa-solid fa-spinner fa-spin"></i> Loading images...</div>';

    // Load images from storage
    const images = await loadGallery();

    if (!images || images.length === 0) {
        contentDiv.innerHTML = `
            <div style="text-align:center; padding:30px; color:#ffb000;">
                <i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:15px; display:block;"></i>
                No images found
                <div style="font-size:0.8rem; margin-top:10px; color:#666;">
                    Click the <i class="fa-solid fa-gear"></i> Settings button → Gallery → Upload Images
                </div>
            </div>
        `;
        return;
    }

    // Display images as a responsive grid
    contentDiv.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px,1fr)); gap:12px;">
            ${images.map(img => `
                <div style="cursor:pointer; border-radius:8px; overflow:hidden; border:1px solid #1f1f1f; background:#000;" 
                     onclick="window.open('${img.url}', '_blank')">
                    <img src="${img.url}" style="width:100%; height:100px; object-fit:cover; display:block;">
                    <div style="font-size:0.65rem; padding:5px; text-align:center; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${escapeHtml(img.name)}
                    </div>
                </div>
            `).join('')}
        </div>
        <div style="margin-top:15px; text-align:center; font-size:0.7rem; color:#666;">
            ${images.length} image${images.length !== 1 ? 's' : ''} — <i class="fa-solid fa-upload"></i> Add more in Settings
        </div>
    `;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }
}