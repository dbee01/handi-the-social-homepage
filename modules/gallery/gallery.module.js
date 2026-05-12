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
    content.style.cssText = 'padding: 10px; min-height: 550px;';
    container.appendChild(content);

    // Load images from IndexedDB
    let images = [];
    try {
        images = await loadGallery();
    } catch (e) {
        console.error('Gallery load error:', e);
    }

    if (!images.length) {
        content.innerHTML = `
            <div style="text-align:center; padding:30px; color:#ffb000;">
                <i class="fa-solid fa-folder-open"></i> No images
                <div style="font-size:0.8rem; margin-top:10px;">Upload in Settings → Gallery</div>
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
    slideshowDiv.style.cssText = 'position: relative; margin-bottom: 15px;';

    // Main slide image – increased max-height
    const slideImg = document.createElement('img');
    slideImg.style.cssText = 'width: 100%; height: auto; max-height: 500px; object-fit: contain; background: #000; border-radius: 8px; cursor: pointer;';
    slideshowDiv.appendChild(slideImg);

    // Caption
    const captionDiv = document.createElement('div');
    captionDiv.style.cssText = 'text-align: center; margin-top: 8px; font-size: 0.8rem; color: #aaa;';
    slideshowDiv.appendChild(captionDiv);

    // Control buttons
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = 'display: flex; justify-content: center; gap: 15px; margin: 12px 0;';
    controlsDiv.innerHTML = `
        <button id="galleryPrevBtn" style="background:#1f1f1f; border:none; color:#fff; padding:6px 12px; border-radius:20px; cursor:pointer;">⏮ Prev</button>
        <button id="galleryPlayPauseBtn" style="background:#1f1f1f; border:none; color:#00ff41; padding:6px 12px; border-radius:20px; cursor:pointer;">⏸ Pause</button>
        <button id="galleryNextBtn" style="background:#1f1f1f; border:none; color:#fff; padding:6px 12px; border-radius:20px; cursor:pointer;">Next ⏭</button>
        <button id="galleryWakeLockBtn" style="background:#1f1f1f; border:none; color:#ffb000; padding:6px 12px; border-radius:20px; cursor:pointer;">💤 Stay awake</button>
    `;
    slideshowDiv.appendChild(controlsDiv);

    // Thumbnail row
    const thumbsDiv = document.createElement('div');
    thumbsDiv.style.cssText = 'display: flex; gap: 8px; overflow-x: auto; padding: 8px 0;';
    images.forEach((img, idx) => {
        const thumb = document.createElement('img');
        thumb.src = img.url;
        thumb.style.cssText = 'width: 50px; height: 50px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid transparent;';
        thumb.dataset.index = idx;
        thumb.addEventListener('click', () => goToSlide(idx));
        thumbsDiv.appendChild(thumb);
    });
    slideshowDiv.appendChild(thumbsDiv);
    content.appendChild(slideshowDiv);

    // ----- Lightbox (fullscreen) -----
    const lightbox = document.createElement('div');
    lightbox.id = 'galleryLightbox';
    lightbox.style.cssText = `
        display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95); z-index: 20000;
        justify-content: center; align-items: center; flex-direction: column;
    `;
    const lbImg = document.createElement('img');
    lbImg.style.cssText = 'max-width: 90%; max-height: 80%; object-fit: contain; cursor: pointer;';
    lbImg.addEventListener('click', closeLightbox);
    const lbCaption = document.createElement('div');
    lbCaption.style.cssText = 'color: white; margin-top: 20px; font-size: 1rem;';
    const lbClose = document.createElement('button');
    lbClose.innerHTML = '✖';
    lbClose.style.cssText = 'position: absolute; top: 20px; right: 30px; background: none; border: none; color: white; font-size: 2rem; cursor: pointer;';
    lbClose.addEventListener('click', closeLightbox);
    const lbPrev = document.createElement('button');
    lbPrev.innerHTML = '❮';
    lbPrev.style.cssText = 'position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; color: white; font-size: 3rem; padding: 10px 20px; border-radius: 40px; cursor: pointer;';
    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); prevSlideLightbox(); });
    const lbNext = document.createElement('button');
    lbNext.innerHTML = '❯';
    lbNext.style.cssText = 'position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; color: white; font-size: 3rem; padding: 10px 20px; border-radius: 40px; cursor: pointer;';
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
            thumb.style.borderColor = i === slideIndex ? '#00ff41' : 'transparent';
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
            btn.style.color = '#00ff41';
            requestWakeLock();
        } else {
            stopAutoRotate();
            btn.innerHTML = '▶ Play';
            btn.style.color = '#ffb000';
            releaseWakeLock();
        }
    }

    function toggleWakeLock() {
        if (!wakeLockSupported) return;
        if (wakeLock) {
            releaseWakeLock();
            document.getElementById('galleryWakeLockBtn').innerHTML = '💤 Stay awake';
            document.getElementById('galleryWakeLockBtn').style.color = '#ffb000';
        } else {
            requestWakeLock();
            document.getElementById('galleryWakeLockBtn').innerHTML = '🌙 Screen on';
            document.getElementById('galleryWakeLockBtn').style.color = '#00ff41';
        }
    }

    // Lightbox functions
    let lightboxIndex = 0;
    function openLightbox(index) {
        lightboxIndex = index;
        lbImg.src = images[lightboxIndex].url;
        lbCaption.innerText = images[lightboxIndex].name;
        lightbox.style.display = 'flex';
        if (isPlaying) stopAutoRotate(); // pause auto-rotate while lightbox open
    }
    function closeLightbox() {
        lightbox.style.display = 'none';
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

    // Ensure the parent dashboard item has enough height
    const parentItem = container.closest('.dashboard-item');
    if (parentItem) parentItem.style.minHeight = '600px';

    // Cleanup when module is removed
    return () => {
        stopAutoRotate();
        releaseWakeLock();
        if (lightbox && lightbox.parentNode) lightbox.remove();
    };
}