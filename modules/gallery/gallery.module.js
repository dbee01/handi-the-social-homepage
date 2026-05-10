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

  // Folder selector section
  const folderSelector = document.createElement('div');
  folderSelector.className = 'gallery-folder-selector';
  folderSelector.style.cssText = `
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 15px;
    text-align: center;
  `;
  
  folderSelector.innerHTML = `
    <input type="file" id="galleryFolderInput" webkitdirectory directory multiple style="display: none;">
    <label for="galleryFolderInput" style="display: inline-block; padding: 10px 20px; background: var(--term-green); color: #000; border-radius: var(--radius); cursor: pointer; font-weight: bold;">
      <i class="fa-solid fa-folder-open"></i> Select Image Folder
    </label>
    <div id="galleryStatus" style="margin-top: 10px; color: var(--term-dim); font-size: 0.85rem;">Select a folder to begin</div>
    <div id="galleryStats" style="margin-top: 5px; font-size: 0.75rem; color: var(--term-dim);"></div>
  `;
  galleryContainer.appendChild(folderSelector);

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

  // Lightbox HTML (hidden initially)
  const lightboxHTML = `
    <div id="galleryLightbox" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 10000; backdrop-filter: blur(10px);">
      <button id="lightboxClose" style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 2rem; cursor: pointer; z-index: 10001; padding: 10px; width: 60px; height: 60px; border-radius: 30px; background: rgba(0,0,0,0.5);">
        <i class="fa-solid fa-times"></i>
      </button>
      <button id="lightboxPrev" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: none; border: none; color: white; font-size: 3rem; cursor: pointer; z-index: 10001; padding: 20px; background: rgba(0,0,0,0.5); border-radius: 40px;">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button id="lightboxNext" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: none; border: none; color: white; font-size: 3rem; cursor: pointer; z-index: 10001; padding: 20px; background: rgba(0,0,0,0.5); border-radius: 40px;">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <div id="lightboxContent" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">
        <img id="lightboxImage" style="max-width: 90%; max-height: 85%; object-fit: contain; border-radius: 8px; box-shadow: 0 0 30px rgba(0,0,0,0.5);">
      </div>
      <div id="lightboxCaption" style="position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; color: white; padding: 15px; background: rgba(0,0,0,0.7); margin: 0 20px; border-radius: 8px; font-size: 1rem;">
        <span id="lightboxTitle"></span>
        <span id="lightboxCounter" style="margin-left: 10px; color: var(--term-green);"></span>
      </div>
      <div id="lightboxControls" style="position: absolute; bottom: 100px; left: 0; right: 0; text-align: center; display: flex; gap: 20px; justify-content: center;">
        <button id="lightboxPlayPause" style="background: rgba(0,0,0,0.7); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 1rem;">
          <i class="fa-solid fa-play"></i> Resume Slideshow
        </button>
        <button id="lightboxDownload" style="background: rgba(0,0,0,0.7); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 1rem;">
          <i class="fa-solid fa-download"></i> Download
        </button>
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
  
  // Add wake lock button to controls
  controls.appendChild(wakeLockBtn);
  
  // Gallery state
  let slideIndex = 0;
  let images = [];
  let isPaused = false;
  let SLIDE_INTERVAL = 3000;
  let currentImageObjects = []; // Store original File objects for download
  const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

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
      
      // Request wake lock when slideshow starts/resumes
      const originalStartSlideshow = startSlideshow;
      startSlideshow = function() {
        if (wakeLockEnabled && document.visibilityState === 'visible') {
          requestWakeLock();
        }
        originalStartSlideshow();
      };
      
      // Release wake lock when slideshow pauses
      const originalToggleSlideshow = toggleSlideshow;
      toggleSlideshow = function() {
        if (!isPaused && wakeLockEnabled) {
          releaseWakeLock();
        } else if (isPaused && wakeLockEnabled) {
          requestWakeLock();
        }
        originalToggleSlideshow();
      };
      
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
      // Create slide
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
      
      // Add click to open lightbox
      img.onclick = () => openLightbox(index);
      
      slide.appendChild(img);
      container.appendChild(slide);
      
      // Create dot
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
    
    console.log(`Created ${imageFiles.length} slides and ${imageFiles.length} dots`);
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
    
    // If lightbox is open, update it
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
    
    // If lightbox is open, update it
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
      // Release wake lock when paused
      if (wakeLockEnabled) releaseWakeLock();
    } else {
      btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
      btn.style.color = 'var(--term-green)';
      startSlideshow();
      // Request wake lock when resuming
      if (wakeLockEnabled && document.visibilityState === 'visible') requestWakeLock();
    }
  }

  function updateSpeed() {
    const newSpeed = parseInt(document.getElementById('gallerySlideSpeed').value);
    if (newSpeed >= 500 && newSpeed <= 10000) {
      SLIDE_INTERVAL = newSpeed;
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
    
    // Pause main slideshow
    if (slideshowInterval) {
      clearTimeout(slideshowInterval);
    }
    
    slideIndex = index;
    updateLightboxImage(slideIndex);
    lightbox.style.display = 'flex';
    
    // Update play/pause button in lightbox
    updateLightboxPlayPauseButton();
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Keep screen on while lightbox is open if wake lock is enabled
    if (wakeLockEnabled) requestWakeLock();
  }
  
  function updateLightboxImage(index) {
    if (!images[index]) return;
    
    const imageFile = images[index];
    const imageUrl = URL.createObjectURL(imageFile);
    lightboxImage.src = imageUrl;
    lightboxTitle.textContent = imageFile.name;
    lightboxCounter.textContent = `(${index + 1}/${images.length})`;
    
    // Clean up old URL
    lightboxImage.onload = () => {
      URL.revokeObjectURL(imageUrl);
    };
  }
  
  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
    
    // Resume main slideshow if not paused
    if (!isPaused && images.length > 0) {
      startSlideshow();
    }
    
    // Release wake lock if it was kept for lightbox but slideshow is paused
    if (wakeLockEnabled && isPaused) {
      releaseWakeLock();
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
    updateLightboxPlayPauseButton();
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
    
    // Show temporary feedback
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
    }
  }

  // ========== FOLDER SELECTION ==========
  function handleFolderSelect(event) {
    const files = event.target.files;
    const allFiles = Array.from(files);
    
    // Track extension counts
    const extensionCounts = {
      '.jpg': 0,
      '.jpeg': 0,
      '.png': 0,
      '.gif': 0,
      '.webp': 0,
      'other': 0
    };
    
    // Filter by supported extensions
    const imageFiles = allFiles.filter(file => {
      const fileName = file.name.toLowerCase();
      const fileExtension = '.' + fileName.split('.').pop();
      
      if (SUPPORTED_EXTENSIONS.includes(fileExtension)) {
        extensionCounts[fileExtension]++;
        return true;
      } else {
        extensionCounts['other']++;
        return false;
      }
    });
    
    const totalFiles = allFiles.length;
    const imageCount = imageFiles.length;
    const skippedCount = totalFiles - imageCount;
    
    if (imageCount === 0) {
      document.getElementById('galleryStatus').innerHTML = '❌ No supported images found (.jpg, .jpeg, .png, .gif, .webp)';
      document.getElementById('galleryStats').innerHTML = '';
      return;
    }
    
    images = imageFiles;
    document.getElementById('galleryStatus').innerHTML = `✅ Loaded ${imageCount} images from ${totalFiles} files`;
    
    // Show extension breakdown
    let statsText = '';
    SUPPORTED_EXTENSIONS.forEach(ext => {
      if (extensionCounts[ext] > 0) {
        statsText += `${ext.toUpperCase()}(${extensionCounts[ext]}) `;
      }
    });
    if (skippedCount > 0) {
      statsText += `| Skipped ${skippedCount} unsupported files`;
    }
    document.getElementById('galleryStats').innerHTML = statsText;
    
    // Reset and start slideshow
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
    startSlideshow();
  }

  // ========== EVENT LISTENERS ==========
  document.getElementById('galleryFolderInput').addEventListener('change', handleFolderSelect);
  document.getElementById('galleryPrevBtn').addEventListener('click', () => prevSlide());
  document.getElementById('galleryNextBtn').addEventListener('click', () => nextSlide());
  document.getElementById('galleryPauseBtn').addEventListener('click', () => toggleSlideshow());
  document.getElementById('galleryApplySpeed').addEventListener('click', () => updateSpeed());
  document.getElementById('galleryFullscreenBtn').addEventListener('click', () => {
    if (images.length > 0) {
      openLightbox(slideIndex);
    }
  });
  
  // Lightbox event listeners
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => prevSlide());
  lightboxNext.addEventListener('click', () => nextSlide());
  lightboxPlayPause.addEventListener('click', toggleLightboxSlideshow);
  lightboxDownload.addEventListener('click', downloadCurrentImage);
  
  // Close lightbox when clicking background
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Global keyboard handler
  const keyHandler = (e) => {
    // Check if gallery is visible
    if (!container.isConnected) return;
    
    // Handle lightbox keys first
    handleLightboxKeys(e);
    
    // Only handle gallery keys if lightbox is closed
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
        if (!isPaused && slideshowInterval) {
          clearTimeout(slideshowInterval);
          startSlideshow();
        }
      } else if (e.key === '-') {
        e.preventDefault();
        SLIDE_INTERVAL = Math.min(10000, SLIDE_INTERVAL + 200);
        document.getElementById('gallerySlideSpeed').value = SLIDE_INTERVAL;
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
  
  // Initialize wake lock
  initWakeLock();
  
  // Cleanup on module removal
  return () => {
    document.removeEventListener('keydown', keyHandler);
    if (slideshowInterval) clearTimeout(slideshowInterval);
    
    // Clean up wake lock
    releaseWakeLock();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    // Remove lightbox from DOM
    if (lightbox) {
      lightbox.remove();
    }
    
    // Revoke all object URLs
    if (images) {
      images.forEach(image => {
        if (image.src) URL.revokeObjectURL(image.src);
      });
    }
    
    // Revoke any object URLs from currentImageObjects
    if (currentImageObjects) {
      currentImageObjects.forEach(obj => {
        if (obj.src) URL.revokeObjectURL(obj.src);
      });
    }
    
    console.log('Gallery module cleaned up');
  };
}
