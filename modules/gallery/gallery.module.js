// modules/gallery/gallery.module.js
import { loadGallery } from '../../js/core/storage.js';

export default async function initGallery(container) {
    // Preserve pin button
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    // Title
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-images"></i> GALLERY';
    container.appendChild(title);

    // Main content area – increased min-height
    const content = document.createElement('div');
    content.className = 'gallery-content';
    container.appendChild(content);

    // Mark parent for styling
    const parentItem = container.closest('.dashboard-item');
    if (parentItem) {
        parentItem.dataset.module = 'gallery';
    }

    // Load images from IndexedDB
    let images = [];
    try {
        images = await loadGallery();
    } catch (e) {
        console.error('Gallery load error:', e);
    }

    if (!images.length) {
        content.innerHTML = `
            <div class="module-empty">
                <i class="fa-solid fa-folder-open"></i> No images
                <div class="module-hint">Upload in Settings → Gallery</div>
            </div>`;
        return;
    }

    // ----- Configuration -----
    let slideIndex = 0;
    let slideshowInterval = null;
    let isPlaying = true;
    let slideSpeed = 5000;
    let wakeLock = null;
    let wakeLockSupported = 'wakeLock' in navigator;

    // ----- Wake lock helpers -----
    async function requestWakeLock() {
        if (!wakeLockSupported || !isPlaying) return;
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => console.log('Wake lock released'));
        } catch (err) { console.warn(err); }
    }
    function releaseWakeLock() {
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isPlaying && !wakeLock) requestWakeLock();
    });

    // ----- Build slideshow UI -----
    const slideshowDiv = document.createElement('div');
    slideshowDiv.className = 'gallery-slideshow';

    // Main slide image – increased max-height
    const slideImg = document.createElement('img');
    slideImg.className = 'gallery-slide-img';
    slideshowDiv.appendChild(slideImg);

    // Caption
    const captionDiv = document.createElement('div');
    captionDiv.className = 'gallery-caption';
    slideshowDiv.appendChild(captionDiv);

    // Control buttons
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'gallery-controls';
    controlsDiv.innerHTML = `
        <button id="galleryPrevBtn" class="gallery-btn">⏮ Prev</button>
        <button id="galleryPlayPauseBtn" class="gallery-btn play">⏸ Pause</button>
        <button id="galleryNextBtn" class="gallery-btn">Next ⏭</button>
        <button id="galleryWakeLockBtn" class="gallery-btn wakelock">💤 Stay awake</button>
    `;
    slideshowDiv.appendChild(controlsDiv);

    // Thumbnail row
    const thumbsDiv = document.createElement('div');
    thumbsDiv.className = 'gallery-thumbs';
    images.forEach((img, idx) => {
        const thumb = document.createElement('img');
        thumb.src = img.url;
        thumb.className = 'gallery-thumb';
        thumb.dataset.index = idx;
        thumb.addEventListener('click', () => goToSlide(idx));
        thumbsDiv.appendChild(thumb);
    });
    slideshowDiv.appendChild(thumbsDiv);
    content.appendChild(slideshowDiv);

    // ----- Lightbox (fullscreen) -----
    const lightbox = document.createElement('div');
    lightbox.id = 'galleryLightbox';
    lightbox.className = 'gallery-lightbox';
    const lbImg = document.createElement('img');
    lbImg.className = 'gallery-lightbox-img';
    lbImg.addEventListener('click', closeLightbox);
    const lbCaption = document.createElement('div');
    lbCaption.className = 'gallery-lightbox-caption';
    const lbClose = document.createElement('button');
    lbClose.innerHTML = '✖';
    lbClose.className = 'gallery-lightbox-close';
    lbClose.addEventListener('click', closeLightbox);
    const lbPrev = document.createElement('button');
    lbPrev.innerHTML = '❮';
    lbPrev.className = 'gallery-lightbox-nav gallery-lightbox-prev';
    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); prevSlideLightbox(); });
    const lbNext = document.createElement('button');
    lbNext.innerHTML = '❯';
    lbNext.className = 'gallery-lightbox-nav gallery-lightbox-next';
    lbNext.addEventListener('click', (e) => { e.stopPropagation(); nextSlideLightbox(); });
    lightbox.appendChild(lbImg);
    lightbox.appendChild(lbCaption);
    lightbox.appendChild(lbClose);
    lightbox.appendChild(lbPrev);
    lightbox.appendChild(lbNext);
    document.body.appendChild(lightbox);

    // ----- Core slideshow functions -----
    function updateSlide() {
        if (!images[slideIndex]) return;
        slideImg.src = images[slideIndex].url;
        captionDiv.innerText = images[slideIndex].name;
        // Update thumbnail active border
        Array.from(thumbsDiv.children).forEach((thumb, i) => {
            thumb.classList.toggle('active', i === slideIndex);
        });
    }

    function goToSlide(index) {
        if (index < 0) index = images.length - 1;
        if (index >= images.length) index = 0;
        slideIndex = index;
        updateSlide();
        resetAutoRotate();
    }

    function nextSlide() { goToSlide(slideIndex + 1); }
    function prevSlide() { goToSlide(slideIndex - 1); }

    function startAutoRotate() {
        if (slideshowInterval) clearInterval(slideshowInterval);
        slideshowInterval = setInterval(() => {
            if (isPlaying) nextSlide();
        }, slideSpeed);
    }

    function stopAutoRotate() {
        if (slideshowInterval) clearInterval(slideshowInterval);
        slideshowInterval = null;
    }

    function resetAutoRotate() {
        if (isPlaying) {
            stopAutoRotate();
            startAutoRotate();
        }
    }

    function togglePlayPause() {
        isPlaying = !isPlaying;
        const btn = document.getElementById('galleryPlayPauseBtn');
        if (isPlaying) {
            startAutoRotate();
            btn.innerHTML = '⏸ Pause';
            btn.classList.add('play');
            requestWakeLock();
        } else {
            stopAutoRotate();
            btn.innerHTML = '▶ Play';
            btn.classList.remove('play');
            releaseWakeLock();
        }
    }

    function toggleWakeLock() {
        if (!wakeLockSupported) return;
        if (wakeLock) {
            releaseWakeLock();
            document.getElementById('galleryWakeLockBtn').innerHTML = '💤 Stay awake';
            document.getElementById('galleryWakeLockBtn').classList.remove('play');
        } else {
            requestWakeLock();
            document.getElementById('galleryWakeLockBtn').innerHTML = '🌙 Screen on';
            document.getElementById('galleryWakeLockBtn').classList.add('play');
        }
    }

    // Lightbox functions
    let lightboxIndex = 0;
    function openLightbox(index) {
        lightboxIndex = index;
        lbImg.src = images[lightboxIndex].url;
        lbCaption.innerText = images[lightboxIndex].name;
        lightbox.classList.add('active');
        if (isPlaying) stopAutoRotate(); // pause auto-rotate while lightbox open
    }
    function closeLightbox() {
        lightbox.classList.remove('active');
        if (isPlaying) startAutoRotate(); // resume
    }
    function prevSlideLightbox() {
        lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
        lbImg.src = images[lightboxIndex].url;
        lbCaption.innerText = images[lightboxIndex].name;
    }
    function nextSlideLightbox() {
        lightboxIndex = (lightboxIndex + 1) % images.length;
        lbImg.src = images[lightboxIndex].url;
        lbCaption.innerText = images[lightboxIndex].name;
    }

    // ----- Attach event listeners -----
    document.getElementById('galleryPrevBtn').addEventListener('click', prevSlide);
    document.getElementById('galleryNextBtn').addEventListener('click', nextSlide);
    document.getElementById('galleryPlayPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('galleryWakeLockBtn').addEventListener('click', toggleWakeLock);
    slideImg.addEventListener('click', () => openLightbox(slideIndex));

    // ----- Initialise -----
    updateSlide();
    startAutoRotate();
    if (wakeLockSupported && isPlaying) requestWakeLock();

    // Cleanup when module is removed
    return () => {
        stopAutoRotate();
        releaseWakeLock();
        if (lightbox && lightbox.parentNode) lightbox.remove();
    };
}