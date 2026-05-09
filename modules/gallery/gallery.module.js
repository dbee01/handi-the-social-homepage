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

  // Gallery state
  let slideIndex = 0;
  let slideshowInterval = null;
  let images = [];
  let isPaused = false;
  let SLIDE_INTERVAL = 3000;
  const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // Helper functions
  function createSlidesAndDots(imageFiles) {
    const container = slidesContainer;
    const dots = dotsContainer;
    
    container.innerHTML = '';
    dots.innerHTML = '';
    
    imageFiles.forEach((file, index) => {
      // Create slide
      const slide = document.createElement('div');
      slide.className = 'gallery-slide';
      slide.style.cssText = `
        display: none;
        width: 100%;
        height: 400px;
        position: relative;
      `;
      
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = `Image ${index + 1}`;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
      `;
      
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
      console.log(`Slide speed updated to ${SLIDE_INTERVAL}ms`);
      
      if (!isPaused && slideshowInterval) {
        clearTimeout(slideshowInterval);
        startSlideshow();
      }
    }
  }

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

  // Event listeners
  document.getElementById('galleryFolderInput').addEventListener('change', handleFolderSelect);
  document.getElementById('galleryPrevBtn').addEventListener('click', () => prevSlide());
  document.getElementById('galleryNextBtn').addEventListener('click', () => nextSlide());
  document.getElementById('galleryPauseBtn').addEventListener('click', () => toggleSlideshow());
  document.getElementById('galleryApplySpeed').addEventListener('click', () => updateSpeed());

  // Keyboard navigation
  const keyHandler = (e) => {
    // Check if gallery is visible
    if (!container.isConnected) return;
    
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
    }
  };
  
  document.addEventListener('keydown', keyHandler);
  
  // Cleanup on module removal
  return () => {
    document.removeEventListener('keydown', keyHandler);
    if (slideshowInterval) clearTimeout(slideshowInterval);
  };
}