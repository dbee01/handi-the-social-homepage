// modules/gallery/gallery.module.js

export default async function initGallery(container) {
  if (!container) {
    console.error("Gallery Module: Container not found");
    return;
  }

  // --- PRESERVE PIN BUTTON ---
  const pinBtn = container.querySelector('.pin-btn');
  container.innerHTML = '';
  if (pinBtn) container.prepend(pinBtn);
  // ---------------------------

  // Add panel title
  const panelTitle = document.createElement('div');
  panelTitle.className = 'panel-title';
  panelTitle.innerHTML = '<i class="fa-solid fa-images"></i> Image Gallery';
  container.appendChild(panelTitle);

  // Create gallery container
  const galleryContainer = document.createElement('div');
  galleryContainer.className = 'gallery-container';
  galleryContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 10px;
    max-height: 600px;
    overflow-y: auto;
  `;

  // Status display (no folder selector)
  const statusDisplay = document.createElement('div');
  statusDisplay.className = 'gallery-status';
  statusDisplay.style.cssText = `
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 15px;
    text-align: center;
    color: var(--term-dim);
  `;
  statusDisplay.innerHTML = `
    <i class="fa-solid fa-info-circle"></i>
    <span id="galleryStatusMsg">Configure gallery in Settings (gear icon)</span>
  `;
  galleryContainer.appendChild(statusDisplay);

  // Speed control section
  const speedControl = document.createElement('div');
  speedControl.className = 'gallery-speed-control';
  speedControl.style.cssText = `
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 10px;
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  `;
  speedControl.innerHTML = `
    <label style="color: var(--term-dim);"><i class="fa-solid fa-clock"></i> Slide Speed:</label>
    <input type="number" id="gallerySlideSpeed" value="3000" min="500" max="10000" step="100" style="padding: 5px; background: #000; border: 1px solid var(--panel-border); color: var(--term-white); border-radius: var(--radius); width: 80px;">
    <button id="galleryApplySpeed" style="padding: 5px 15px; background: var(--panel-bg); border: 1px solid var(--panel-border); color: var(--term-green); border-radius: var(--radius); cursor: pointer;">Apply</button>
  `;
  galleryContainer.appendChild(speedControl);

  // Controls section
  const controls = document.createElement('div');
  controls.className = 'gallery-controls';
  controls.style.cssText = `
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  `;
  controls.innerHTML = `
    <button id="galleryPrevBtn" style="padding: 8px 16px; background: var(--panel-bg); border: 1px solid var(--panel-border); color: var(--term-white); border-radius: var(--radius); cursor: pointer;">
      <i class="fa-solid fa-backward"></i> Previous
    </button>
    <button id="galleryPauseBtn" style="padding: 8px 16px; background: var(--panel-bg); border: 1px solid var(--panel-border); color: var(--term-green); border-radius: var(--radius); cursor: pointer;">
      <i class="fa-solid fa-pause"></i> Pause
    </button>
    <button id="galleryNextBtn" style="padding: 8px 16px; background: var(--panel-bg); border: 1px solid var(--panel-border); color: var(--term-white); border-radius: var(--radius); cursor: pointer;">
      Next <i class="fa-solid fa-forward"></i>
    </button>
    <button id="galleryFullscreenBtn" style="padding: 8px 16px; background: var(--panel-bg); border: 1px solid var(--panel-border); color: var(--term-cyan); border-radius: var(--radius); cursor: pointer;">
      <i class="fa-solid fa-expand"></i> Fullscreen
    </button>
  `;
  galleryContainer.appendChild(controls);

  // Wake lock button container
  const wakeLockContainer = document.createElement('div');
  wakeLockContainer.style.cssText = `
    display: flex;
    justify-content: center;
    margin-top: 5px;
  `;
  galleryContainer.appendChild(wakeLockContainer);

  // Slides container
  const slidesContainer = document.createElement('div');
  slidesContainer.id = 'gallerySlidesContainer';
  slidesContainer.style.cssText = `
    position: relative;
    width: 100%;
    min-height: 400px;
    background: #000;
    border-radius: var(--radius);
    overflow: hidden;
  `;
  galleryContainer.appendChild(slidesContainer);

  // Dots container
  const dotsContainer = document.createElement('div');
  dotsContainer.id = 'galleryDotsContainer';
  dotsContainer.style.cssText = `
    text-align: center;
    margin-top: 10px;
    min-height: 20px;
  `;
  galleryContainer.appendChild(dotsContainer);

  container.appendChild(galleryContainer);

  // Lightbox HTML (true fullscreen version)
  const lightboxHTML = `
    <div id="galleryLightbox" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 10000;">
      <div id="lightboxInner" style="display: flex; flex-direction: column; width: 100%; height: 100%;">
        <div style="position: absolute; top: 0; left: 0; right: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); padding: 20px; z-index: 10001; display: flex; justify-content: space-between; align-items: center;">
          <div id="lightboxTitle" style="color: white; font-size: 1rem; text-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
          <div>
            <button id="lightboxFullscreenToggle" style="background: rgba(0,0,0,0.5); border: none; color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; margin-right: 10px;">
              <i class="fa-solid fa-expand"></i> Fullscreen
            </button>
            <button id="lightboxClose" style="background: rgba(0,0,0,0.5); border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 8px 15px; border-radius: 8px;">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
        <div id="lightboxContent" style="flex: 1; display: flex; justify-content: center; align-items: center; position: relative;">
          <img id="lightboxImage" style="max-width: 90%; max-height: 85%; object-fit: contain; cursor: pointer;">
          <button id="lightboxPrev" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; color: white; font-size: 3rem; cursor: pointer; padding: 20px; border-radius: 40px;">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <button id="lightboxNext" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; color: white; font-size: 3rem; cursor: pointer; padding: 20px; border-radius: 40px;">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 20px; text-align: center;">
          <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 10px;">
            <button id="lightboxPlayPause" style="background: rgba(0,0,0,0.7); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 1rem;">
              <i class="fa-solid fa-play"></i> Resume Slideshow
            </button>
            <button id="lightboxDownload" style="background: rgba(0,0,0,0.7); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 1rem;">
              <i class="fa-solid fa-download"></i> Download
            </button>
          </div>
          <div id="lightboxCounter" style="color: var(--term-green); font-size: 0.9rem;"></div>
        </div>
      </div>
    </div>
  `;
  
  // Add lightbox to body
  document.body.insertAdjacentHTML('beforeend', lightboxHTML);
  
  // Get lightbox elements
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPlayPause = document.getElementById('lightboxPlayPause');
  const lightboxDownload = document.getElementById('lightboxDownload');
  const lightboxFullscreenToggle = document.getElementById('lightboxFullscreenToggle');
  const lightboxInner = document.getElementById('lightboxInner');
  
  // Wake Lock variables
  let wakeLock = null;
  let wakeLockSupported = false;
  let wakeLockEnabled = false;
  let slideshowInterval = null;
  
  // Create wake lock button
  const wakeLockBtn = document.createElement('button');
  wakeLockBtn.id = 'galleryWakeLockBtn';
  wakeLockBtn.style.cssText = `
    padding: 8px 16px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    color: var(--term-cyan);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  `;
  wakeLockBtn.innerHTML = '<i class="fa-solid fa-bed"></i> Keep Screen On';
  wakeLockContainer.appendChild(wakeLockBtn);
  
  // Gallery state
  let slideIndex = 0;
  let images = [];
  let isPaused = false;
  let SLIDE_INTERVAL = 3000;
  let currentImageObjects = [];
  let isFullscreen = false;
  const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // Load settings from localStorage
  function loadGallerySettings() {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.gallery) {
        SLIDE_INTERVAL = settings.gallery.speed || 3000;
        const speedInput = document.getElementById('gallerySlideSpeed');
        if (speedInput) speedInput.value = SLIDE_INTERVAL;
        
        // Auto-start setting
        const autoStart = settings.gallery.autoStart !== false;
        if (autoStart && images.length > 0 && !isPaused && !slideshowInterval) {
          startSlideshow();
        }
      }
    }
  }

  // Save speed to settings
  function saveSpeedToSettings() {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (!settings.gallery) settings.gallery = {};
      settings.gallery.speed = SLIDE_INTERVAL;
      localStorage.setItem('pleie_settings', JSON.stringify(settings));
    }
  }

  // Load images from Settings (called by external event)
  function loadImagesFromSettings(imageFiles) {
    if (!imageFiles || imageFiles.length === 0) {
      const statusMsg = document.getElementById('galleryStatusMsg');
      if (statusMsg) {
        statusMsg.innerHTML = '<i class="fa-solid fa-folder-open"></i> No images loaded. Configure in Settings (gear icon)';
        statusMsg.style.color = 'var(--term-dim)';
      }
      return;
    }
    
    const statusMsg = document.getElementById('galleryStatusMsg');
    if (statusMsg) {
      statusMsg.innerHTML = `<i class="fa-solid fa-check-circle"></i> Loaded ${imageFiles.length} images`;
      statusMsg.style.color = 'var(--term-green)';
    }
    
    images = imageFiles;
    slideIndex = 0;
    isPaused = false;
    const pauseBtn = document.getElementById('galleryPauseBtn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
      pauseBtn.style.color = 'var(--term-green)';
    }
    
    if (slideshowInterval) clearTimeout(slideshowInterval);
    createSlidesAndDots(images);
    updateSlideDisplay();
    
    loadGallerySettings();
  }

  // ========== TRUE FULLSCREEN API ==========
  async function toggleFullscreen(element) {
    if (!isFullscreen) {
      try {
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        }
        isFullscreen = true;
        lightboxFullscreenToggle.innerHTML = '<i class="fa-solid fa-compress"></i> Exit';
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        isFullscreen = false;
        lightboxFullscreenToggle.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
      } catch (err) {
        console.error('Exit fullscreen error:', err);
      }
    }
  }
  
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  document.addEventListener('msfullscreenchange', updateFullscreenButton);
  
  function updateFullscreenButton() {
    const isCurrentlyFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    isFullscreen = !!isCurrentlyFullscreen;
    if (lightboxFullscreenToggle) {
      if (isFullscreen) {
        lightboxFullscreenToggle.innerHTML = '<i class="fa-solid fa-compress"></i> Exit';
      } else {
        lightboxFullscreenToggle.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
      }
    }
  }

  // ========== WAKE LOCK FUNCTIONS ==========
  async function requestWakeLock() {
    if (!wakeLockSupported || !wakeLockEnabled) return;
    
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
      });
      console.log('Wake lock active - screen will stay awake');
    } catch (err) {
      console.error('Wake lock failed:', err);
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      try {
        await wakeLock.release();
        wakeLock = null;
        console.log('Wake lock released');
      } catch (err) {
        console.error('Error releasing wake lock:', err);
      }
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && slideshowInterval && !isPaused && wakeLockEnabled) {
      requestWakeLock();
    } else if (document.visibilityState === 'hidden') {
      releaseWakeLock();
    }
  }

  function toggleWakeLock() {
    wakeLockEnabled = !wakeLockEnabled;
    
    if (wakeLockEnabled) {
      if (slideshowInterval && !isPaused && document.visibilityState === 'visible') {
        requestWakeLock();
      }
      wakeLockBtn.innerHTML = '<i class="fa-solid fa-sun"></i> Screen On';
      wakeLockBtn.style.color = 'var(--term-green)';
      console.log('Wake lock enabled');
    } else {
      releaseWakeLock();
      wakeLockBtn.innerHTML = '<i class="fa-solid fa-bed"></i> Keep Screen On';
      wakeLockBtn.style.color = 'var(--term-cyan)';
      console.log('Wake lock disabled');
    }
  }

  function initWakeLock() {
    wakeLockSupported = 'wakeLock' in navigator;
    
    if (wakeLockSupported) {
      console.log('Screen Wake Lock API supported');
      document.addEventListener('visibilitychange', handleVisibilityChange);
      wakeLockBtn.onclick = toggleWakeLock;
    } else {
      console.log('Screen Wake Lock API not supported - screen may sleep');
      wakeLockBtn.style.opacity = '0.5';
      wakeLockBtn.disabled = true;
      wakeLockBtn.title = 'Wake Lock not supported in this browser';
    }
  }

  // ========== GALLERY FUNCTIONS ==========
  function createSlidesAndDots(imageFiles) {
    const container = slidesContainer;
    const dots = dotsContainer;
    
    container.innerHTML = '';
    dots.innerHTML = '';
    currentImageObjects = imageFiles;
    
    imageFiles.forEach((file, index) => {
      const slide = document.createElement('div');
      slide.className = 'gallery-slide';
      slide.style.cssText = `
        display: none;
        width: 100%;
        height: 400px;
        position: relative;
        cursor: pointer;
      `;
      
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
        cursor: pointer;
      `;
      
      img.onclick = () => openLightbox(index);
      
      slide.appendChild(img);
      container.appendChild(slide);
      
      const dot = document.createElement('span');
      dot.className = 'gallery-dot';
      dot.style.cssText = `
        height: 12px;
        width: 12px;
        margin: 0 5px;
        background-color: #666;
        border-radius: 50%;
        display: inline-block;
        transition: background-color 0.3s ease;
        cursor: pointer;
      `;
      dot.onclick = () => {
        if (slideshowInterval) clearTimeout(slideshowInterval);
        slideIndex = index;
        updateSlideDisplay();
        if (!isPaused) {
          startSlideshow();
        }
      };
      dots.appendChild(dot);
    });
    
    console.log(`Created ${imageFiles.length} slides`);
  }

  function updateSlideDisplay() {
    const slides = document.querySelectorAll('.gallery-slide');
    const dots = document.querySelectorAll('.gallery-dot');
    
    if (slides.length === 0) return;
    
    slides.forEach((slide, idx) => {
      slide.style.display = idx === slideIndex ? 'block' : 'none';
    });
    
    dots.forEach((dot, idx) => {
      if (idx === slideIndex) {
        dot.style.backgroundColor = 'var(--term-green)';
      } else {
        dot.style.backgroundColor = '#666';
      }
    });
  }

  function nextSlide() {
    const slides = document.querySelectorAll('.gallery-slide');
    if (slides.length === 0) return;
    
    if (slideshowInterval) clearTimeout(slideshowInterval);
    slideIndex = (slideIndex + 1) % slides.length;
    updateSlideDisplay();
    
    if (lightbox && lightbox.style.display === 'flex') {
      updateLightboxImage(slideIndex);
    }
    
    if (!isPaused) {
      startSlideshow();
    }
  }

  function prevSlide() {
    const slides = document.querySelectorAll('.gallery-slide');
    if (slides.length === 0) return;
    
    if (slideshowInterval) clearTimeout(slideshowInterval);
    slideIndex = (slideIndex - 1 + slides.length) % slides.length;
    updateSlideDisplay();
    
    if (lightbox && lightbox.style.display === 'flex') {
      updateLightboxImage(slideIndex);
    }
    
    if (!isPaused) {
      startSlideshow();
    }
  }

  function startSlideshow() {
    if (slideshowInterval) clearTimeout(slideshowInterval);
    slideshowInterval = setTimeout(() => {
      nextSlide();
    }, SLIDE_INTERVAL);
  }

  function toggleSlideshow() {
    isPaused = !isPaused;
    const btn = document.getElementById('galleryPauseBtn');
    
    if (isPaused) {
      if (slideshowInterval) clearTimeout(slideshowInterval);
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
      btn.style.color = 'var(--term-amber)';
      if (wakeLockEnabled) releaseWakeLock();
    } else {
      btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
      btn.style.color = 'var(--term-green)';
      startSlideshow();
      if (wakeLockEnabled && document.visibilityState === 'visible') requestWakeLock();
    }
    
    updateLightboxPlayPauseButton();
  }

  function updateSpeed() {
    const newSpeed = parseInt(document.getElementById('gallerySlideSpeed').value);
    if (newSpeed >= 500 && newSpeed <= 10000) {
      SLIDE_INTERVAL = newSpeed;
      saveSpeedToSettings();
      console.log(`Slide speed updated to ${SLIDE_INTERVAL}ms`);
      
      if (!isPaused && slideshowInterval) {
        clearTimeout(slideshowInterval);
        startSlideshow();
      }
    }
  }

  // ========== LIGHTBOX FUNCTIONS ==========
  function openLightbox(index) {
    if (!images.length) return;
    
    if (slideshowInterval) {
      clearTimeout(slideshowInterval);
    }
    
    slideIndex = index;
    updateLightboxImage(slideIndex);
    lightbox.style.display = 'flex';
    updateLightboxPlayPauseButton();
    document.body.style.overflow = 'hidden';
    
    if (wakeLockEnabled) requestWakeLock();
  }
  
  function updateLightboxImage(index) {
    if (!images[index]) return;
    
    const imageFile = images[index];
    const imageUrl = URL.createObjectURL(imageFile);
    lightboxImage.src = imageUrl;
    lightboxTitle.textContent = imageFile.name;
    lightboxCounter.textContent = `${index + 1} / ${images.length}`;
    
    lightboxImage.onload = () => {
      URL.revokeObjectURL(imageUrl);
    };
  }
  
  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
    
    if (!isPaused && images.length > 0) {
      startSlideshow();
    }
    
    if (wakeLockEnabled && isPaused) {
      releaseWakeLock();
    }
    
    if (isFullscreen) {
      toggleFullscreen(lightbox);
    }
  }
  
  function updateLightboxPlayPauseButton() {
    if (isPaused) {
      lightboxPlayPause.innerHTML = '<i class="fa-solid fa-play"></i> Resume Slideshow';
    } else {
      lightboxPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Slideshow';
    }
  }
  
  function toggleLightboxSlideshow() {
    toggleSlideshow();
  }
  
  function downloadCurrentImage() {
    if (!images[slideIndex]) return;
    
    const imageFile = images[slideIndex];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(imageFile);
    link.download = imageFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    const originalText = lightboxDownload.innerHTML;
    lightboxDownload.innerHTML = '<i class="fa-solid fa-check"></i> Downloaded!';
    setTimeout(() => {
      lightboxDownload.innerHTML = originalText;
    }, 2000);
  }

  // ========== KEYBOARD NAVIGATION ==========
  function handleLightboxKeys(e) {
    if (lightbox.style.display !== 'flex') return;
    
    switch(e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        prevSlide();
        break;
      case 'ArrowRight':
        nextSlide();
        break;
      case ' ':
      case 'Space':
        e.preventDefault();
        toggleLightboxSlideshow();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen(lightbox);
        break;
    }
  }

  // ========== EVENT LISTENERS ==========
  document.getElementById('galleryPrevBtn').addEventListener('click', () => prevSlide());
  document.getElementById('galleryNextBtn').addEventListener('click', () => nextSlide());
  document.getElementById('galleryPauseBtn').addEventListener('click', () => toggleSlideshow());
  document.getElementById('galleryApplySpeed').addEventListener('click', () => updateSpeed());
  document.getElementById('galleryFullscreenBtn').addEventListener('click', () => {
    if (images.length > 0) {
      openLightbox(slideIndex);
    }
  });
  
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => prevSlide());
  lightboxNext.addEventListener('click', () => nextSlide());
  lightboxPlayPause.addEventListener('click', toggleLightboxSlideshow);
  lightboxDownload.addEventListener('click', downloadCurrentImage);
  lightboxFullscreenToggle.addEventListener('click', () => toggleFullscreen(lightbox));
  
  lightboxImage.addEventListener('click', () => toggleFullscreen(lightbox));
  
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === lightboxInner) {
      closeLightbox();
    }
  });

  // Listen for settings changes from Settings page
  window.addEventListener('settingsChanged', (event) => {
    if (event.detail && event.detail.gallery && event.detail.gallery.images) {
      loadImagesFromSettings(event.detail.gallery.images);
    }
    loadGallerySettings();
  });

  const keyHandler = (e) => {
    if (!container.isConnected) return;
    handleLightboxKeys(e);
    
    if (lightbox.style.display !== 'flex') {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleSlideshow();
      } else if (e.key === '+') {
        e.preventDefault();
        SLIDE_INTERVAL = Math.max(500, SLIDE_INTERVAL - 200);
        document.getElementById('gallerySlideSpeed').value = SLIDE_INTERVAL;
        saveSpeedToSettings();
        if (!isPaused && slideshowInterval) {
          clearTimeout(slideshowInterval);
          startSlideshow();
        }
      } else if (e.key === '-') {
        e.preventDefault();
        SLIDE_INTERVAL = Math.min(10000, SLIDE_INTERVAL + 200);
        document.getElementById('gallerySlideSpeed').value = SLIDE_INTERVAL;
        saveSpeedToSettings();
        if (!isPaused && slideshowInterval) {
          clearTimeout(slideshowInterval);
          startSlideshow();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (images.length > 0) {
          openLightbox(slideIndex);
        }
      }
    }
  };
  
  document.addEventListener('keydown', keyHandler);
  
  initWakeLock();
  loadGallerySettings();
  
  // Try to load images from existing settings on init
  const saved = localStorage.getItem('pleie_settings');
  if (saved) {
    const settings = JSON.parse(saved);
    if (settings.gallery && settings.gallery.images) {
      loadImagesFromSettings(settings.gallery.images);
    }
  }
  
  // Cleanup
  return () => {
    document.removeEventListener('keydown', keyHandler);
    if (slideshowInterval) clearTimeout(slideshowInterval);
    releaseWakeLock();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (lightbox) lightbox.remove();
    if (images) {
      images.forEach(image => {
        if (image.src) URL.revokeObjectURL(image.src);
      });
    }
    console.log('Gallery module cleaned up');
  };
}
