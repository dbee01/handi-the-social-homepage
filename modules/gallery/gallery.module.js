// modules/gallery/gallery.module.js

// TO (correct path - go up 2 levels from modules/gallery/ to root, then into js/)
import { loadGalleryImages } from '../../js/storage.js';

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

  // Status display
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
    <i class="fa-solid fa-spinner fa-spin"></i>
    <span id="galleryStatusMsg">Loading images from storage...</span>
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

  // Gallery state
  let slideIndex = 0;
  let images = [];
  let isPaused = false;
  let slideshowInterval = null;
  let SLIDE_INTERVAL = 3000;

  // Load images from IndexedDB
  async function loadImagesFromStorage() {
    const statusMsg = document.getElementById('galleryStatusMsg');
    try {
      const storedImages = await loadGalleryImages();
      
      if (storedImages && storedImages.length > 0) {
        images = storedImages.map(img => img.file);
        
        if (statusMsg) {
          statusMsg.innerHTML = `<i class="fa-solid fa-check-circle"></i> Loaded ${images.length} images`;
          statusMsg.style.color = 'var(--term-green)';
        }
        
        // Reset slideshow state
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
        
        // Load speed from settings
        loadGallerySettings();
        
        // Start slideshow if there are images
        if (images.length > 0 && !isPaused) {
          startSlideshow();
        }
      } else {
        if (statusMsg) {
          statusMsg.innerHTML = '<i class="fa-solid fa-folder-open"></i> No images found. Click gear icon → Gallery Module → Select Folder → Save Settings';
          statusMsg.style.color = 'var(--term-dim)';
        }
      }
    } catch (error) {
      console.error('Error loading images:', error);
      if (statusMsg) {
        statusMsg.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> Error loading images from storage';
        statusMsg.style.color = 'var(--term-red)';
      }
    }
  }

  // Load settings from localStorage
  function loadGallerySettings() {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.gallery) {
        SLIDE_INTERVAL = settings.gallery.speed || 3000;
        const speedInput = document.getElementById('gallerySlideSpeed');
        if (speedInput) speedInput.value = SLIDE_INTERVAL;
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

  function createSlidesAndDots(imageFiles) {
    const container = slidesContainer;
    const dots = dotsContainer;
    
    container.innerHTML = '';
    dots.innerHTML = '';
    
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
      const url = URL.createObjectURL(file);
      img.src = url;
      img.alt = file.name;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
        cursor: pointer;
      `;
      
      img.onclick = () => openLightbox(index);
      img.onload = () => URL.revokeObjectURL(url);
      
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
    } else {
      btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
      btn.style.color = 'var(--term-green)';
      startSlideshow();
    }
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

  // Lightbox functions
  let lightbox = null;
  
  function createLightbox() {
    const lightboxHTML = `
      <div id="galleryLightbox" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 10000;">
        <div id="lightboxInner" style="display: flex; flex-direction: column; width: 100%; height: 100%;">
          <div style="position: absolute; top: 0; left: 0; right: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); padding: 20px; z-index: 10001; display: flex; justify-content: space-between; align-items: center;">
            <div id="lightboxTitle" style="color: white; font-size: 1rem;"></div>
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
            <div id="lightboxCounter" style="color: var(--term-green); font-size: 0.9rem;"></div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
    lightbox = document.getElementById('galleryLightbox');
    
    document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev')?.addEventListener('click', () => prevSlide());
    document.getElementById('lightboxNext')?.addEventListener('click', () => nextSlide());
  }

  function openLightbox(index) {
    if (!images.length || !lightbox) return;
    
    if (slideshowInterval) clearTimeout(slideshowInterval);
    slideIndex = index;
    updateLightboxImage(slideIndex);
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  
  function updateLightboxImage(index) {
    if (!images[index] || !lightbox) return;
    
    const imageFile = images[index];
    const imageUrl = URL.createObjectURL(imageFile);
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxCounter = document.getElementById('lightboxCounter');
    
    if (lightboxImage) lightboxImage.src = imageUrl;
    if (lightboxTitle) lightboxTitle.textContent = imageFile.name;
    if (lightboxCounter) lightboxCounter.textContent = `${index + 1} / ${images.length}`;
    
    lightboxImage.onload = () => URL.revokeObjectURL(imageUrl);
  }
  
  function closeLightbox() {
    if (lightbox) lightbox.style.display = 'none';
    document.body.style.overflow = '';
    if (!isPaused && images.length > 0) {
      startSlideshow();
    }
  }

  // Event listeners
  document.getElementById('galleryPrevBtn')?.addEventListener('click', () => prevSlide());
  document.getElementById('galleryNextBtn')?.addEventListener('click', () => nextSlide());
  document.getElementById('galleryPauseBtn')?.addEventListener('click', () => toggleSlideshow());
  document.getElementById('galleryApplySpeed')?.addEventListener('click', () => updateSpeed());
  document.getElementById('galleryFullscreenBtn')?.addEventListener('click', () => {
    if (images.length > 0) {
      openLightbox(slideIndex);
    }
  });

  // Keyboard navigation
  const keyHandler = (e) => {
    if (!container.isConnected) return;
    
    if (lightbox && lightbox.style.display === 'flex') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    } else {
      if (e.key === 'ArrowRight') nextSlide();
      else if (e.key === 'ArrowLeft') prevSlide();
      else if (e.key === ' ') {
        e.preventDefault();
        toggleSlideshow();
      }
    }
  };
  
  document.addEventListener('keydown', keyHandler);
  
  // Create lightbox and load images
  createLightbox();
  await loadImagesFromStorage();
  
  // Listen for settings changes
  window.addEventListener('settingsChanged', () => {
    loadImagesFromStorage();
  });
  
  // Cleanup
  return () => {
    document.removeEventListener('keydown', keyHandler);
    if (slideshowInterval) clearTimeout(slideshowInterval);
    if (lightbox) lightbox.remove();
  };
}