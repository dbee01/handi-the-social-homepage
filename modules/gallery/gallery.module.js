/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/gallery/gallery.module.js
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
    content.className = 'gallery-content';
    container.appendChild(content);

    const parentItem = container.closest('.dashboard-item');
    if (parentItem) parentItem.dataset.module = 'gallery';

    let images = [];
    try {
        images = await loadGallery();
    } catch (err) {
        console.error('Gallery load error:', err);
    }

    if (!images.length) {
        content.innerHTML = `
            <div class="module-empty">
                <i class="fa-solid fa-folder-open"></i>
                <p>No images in gallery.</p>
                <button id="gallerySettingsBtn" class="settings-link-btn">
                    <i class="fa-solid fa-gear"></i> Add Images in Settings
                </button>
            </div>
        `;
        const settingsBtn = content.querySelector('#gallerySettingsBtn');
        if (settingsBtn) settingsBtn.onclick = () => location.href = 'settings.html?args=gallery';
        return;
    }

    let slideIndex = 0;
    let lightboxIndex = 0;
    let slideshowInterval = null;
    let lightboxInterval = null;
    let isPlaying = true;

    const slideSpeed = 5000;
    const lightboxSpeed = 5000;

    // ----- Slideshow UI -----
    const slideshowDiv = document.createElement('div');
    slideshowDiv.className = 'gallery-slideshow';

    const slideImg = document.createElement('img');
    slideImg.className = 'gallery-slide-img';

    const captionDiv = document.createElement('div');
    captionDiv.className = 'gallery-caption';

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'gallery-controls';
    controlsDiv.innerHTML = `
        <div class="gallery-control-group">
            <button id="galleryPrevBtn" class="gallery-btn primary">❮</button>
            <button id="galleryPlayPauseBtn" class="gallery-btn primary">⏸</button>
            <button id="galleryNextBtn" class="gallery-btn primary">❯</button>
        </div>
        <button id="galleryFullscreenBtn" class="gallery-btn secondary">🖥️ Full Screen</button>
    `;

    const thumbsDiv = document.createElement('div');
    thumbsDiv.className = 'gallery-thumbs';
    images.forEach((img, i) => {
        const t = document.createElement('img');
        t.src = img.url;
        t.className = 'gallery-thumb';
        t.onclick = () => goToSlide(i);
        thumbsDiv.appendChild(t);
    });

    slideshowDiv.appendChild(slideImg);
    slideshowDiv.appendChild(captionDiv);
    slideshowDiv.appendChild(controlsDiv);
    slideshowDiv.appendChild(thumbsDiv);
    content.appendChild(slideshowDiv);

    slideImg.onload = () => {
        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    };

    // ----- Lightbox (full‑size overlay) -----
    const lightbox = document.createElement('div');
    lightbox.className = 'gallery-lightbox lightbox';
    const lbImg = document.createElement('img');
    lbImg.className = 'gallery-lightbox-img';
    const lbCaption = document.createElement('div');
    lbCaption.className = 'gallery-lightbox-caption';
    const lbClose = document.createElement('button');
    lbClose.className = 'gallery-lightbox-close';
    lbClose.textContent = '✕';
    const lbPrev = document.createElement('button');
    lbPrev.className = 'gallery-lightbox-prev';
    lbPrev.textContent = '❮';
    const lbNext = document.createElement('button');
    lbNext.className = 'gallery-lightbox-next';
    lbNext.textContent = '❯';
    lightbox.appendChild(lbImg);
    lightbox.appendChild(lbCaption);
    lightbox.appendChild(lbClose);
    lightbox.appendChild(lbPrev);
    lightbox.appendChild(lbNext);
    document.body.appendChild(lightbox);

    // ----- Full Screen Gallery button – opens lightbox on current slide -----
    const fullscreenBtn = controlsDiv.querySelector('#galleryFullscreenBtn');
    fullscreenBtn.addEventListener('click', () => {
        openLightbox(slideIndex);
    });

    // ----- Slideshow & Lightbox logic (unchanged) -----
    function updateSlide() {
        const img = images[slideIndex];
        if (!img) return;
        slideImg.src = img.url;
        captionDiv.textContent = (img.name || '').replace(/\+|\..*/g, ' ');
        [...thumbsDiv.children].forEach((t, i) => t.classList.toggle('active', i === slideIndex));
    }

    function goToSlide(i) {
        slideIndex = (i + images.length) % images.length;
        updateSlide();
        if (lightbox.classList.contains('active')) {
            lightboxIndex = slideIndex;
            updateLightbox();
        }
    }

    function nextSlide() { goToSlide(slideIndex + 1); }
    function prevSlide() { goToSlide(slideIndex - 1); }

    function updateLightbox() {
        const img = images[lightboxIndex];
        if (!img) return;
        lbImg.src = img.url;
        lbCaption.textContent = (img.name || '').replace(/\+|\..*/g, ' ');
    }

    function openLightbox(i) {
        lightboxIndex = i;
        updateLightbox();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        stopAuto();
        startLightboxAuto();
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        stopLightboxAuto();
        if (isPlaying) startAuto();
    }

    function prevLightbox() {
        lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
        slideIndex = lightboxIndex;
        updateLightbox();
        updateSlide();
    }

    function nextLightbox() {
        lightboxIndex = (lightboxIndex + 1) % images.length;
        slideIndex = lightboxIndex;
        updateLightbox();
        updateSlide();
    }

    function startAuto() {
        stopAuto();
        slideshowInterval = setInterval(() => {
            if (isPlaying && !lightbox.classList.contains('active')) nextSlide();
        }, slideSpeed);
    }

    function stopAuto() { clearInterval(slideshowInterval); }
    function startLightboxAuto() {
        stopLightboxAuto();
        lightboxInterval = setInterval(() => {
            if (lightbox.classList.contains('active')) nextLightbox();
        }, lightboxSpeed);
    }
    function stopLightboxAuto() { clearInterval(lightboxInterval); }

    function togglePlay() {
        isPlaying = !isPlaying;
        const btn = controlsDiv.querySelector('#galleryPlayPauseBtn');
        if (isPlaying) {
            btn.textContent = '⏸ Pause';
            startAuto();
        } else {
            btn.textContent = '▶ Play';
            stopAuto();
            stopLightboxAuto();
        }
    }

    // Event listeners
    controlsDiv.querySelector('#galleryPrevBtn').onclick = prevSlide;
    controlsDiv.querySelector('#galleryNextBtn').onclick = nextSlide;
    controlsDiv.querySelector('#galleryPlayPauseBtn').onclick = togglePlay;
    slideImg.onclick = () => openLightbox(slideIndex);
    lbClose.onclick = closeLightbox;
    lbPrev.onclick = prevLightbox;
    lbNext.onclick = nextLightbox;
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevLightbox();
        if (e.key === 'ArrowRight') nextLightbox();
    });

    updateSlide();
    startAuto();

    return () => {
        stopAuto();
        stopLightboxAuto();
        lightbox.remove();
    };
}