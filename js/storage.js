// js/storage.js - IndexedDB storage for large files

const DB_NAME = 'pleie_storage';
const DB_VERSION = 2;
const STORES = {
  IMAGES: 'gallery_images',
  MUSIC: 'music_files',
  SETTINGS: 'settings'
};

let db = null;

// Initialize database
export function initDB() {
  return new Promise((resolve, reject) => {
    if (db && db.version === DB_VERSION) {
      resolve(db);
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Database error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('Database initialized');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      const oldVersion = event.oldVersion;
      
      console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
      
      // Create stores if they don't exist
      if (!database.objectStoreNames.contains(STORES.IMAGES)) {
        database.createObjectStore(STORES.IMAGES, { keyPath: 'id', autoIncrement: true });
      }
      if (!database.objectStoreNames.contains(STORES.MUSIC)) {
        database.createObjectStore(STORES.MUSIC, { keyPath: 'id', autoIncrement: true });
      }
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

// Save settings (small data - still use localStorage for settings)
export function saveSettings(settings) {
  localStorage.setItem('pleie_settings', JSON.stringify(settings));
}

// Load settings
export function loadSettings() {
  const saved = localStorage.getItem('pleie_settings');
  if (saved) {
    return JSON.parse(saved);
  }
  return null;
}

// Save gallery images to IndexedDB
export async function saveGalleryImages(images) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    // Clear existing images first
    const clearRequest = db.transaction([STORES.IMAGES], 'readwrite')
      .objectStore(STORES.IMAGES)
      .clear();
    
    clearRequest.onsuccess = () => {
      if (images.length === 0) {
        resolve();
        return;
      }
      
      // Add new images
      const transaction = db.transaction([STORES.IMAGES], 'readwrite');
      const store = transaction.objectStore(STORES.IMAGES);
      
      let completed = 0;
      images.forEach((image, index) => {
        const request = store.add({
          id: index + 1,
          name: image.name,
          type: image.type,
          data: image.data,
          size: image.size,
          lastModified: image.lastModified
        });
        
        request.onsuccess = () => {
          completed++;
          if (completed === images.length) {
            console.log(`Saved ${images.length} images to IndexedDB`);
            resolve();
          }
        };
        
        request.onerror = (e) => {
          console.error('Error saving image:', e);
          reject(e);
        };
      });
    };
    
    clearRequest.onerror = reject;
  });
}

// Load gallery images from IndexedDB
export async function loadGalleryImages() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.IMAGES], 'readonly');
    const store = transaction.objectStore(STORES.IMAGES);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const images = request.result.map(img => ({
        name: img.name,
        type: img.type,
        data: img.data,
        size: img.size,
        lastModified: img.lastModified,
        file: dataURLtoFile(img.data, img.name)
      }));
      resolve(images);
    };
    
    request.onerror = reject;
  });
}

// Save music files to IndexedDB
export async function saveMusicFiles(files) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    // Clear existing music
    const clearRequest = db.transaction([STORES.MUSIC], 'readwrite')
      .objectStore(STORES.MUSIC)
      .clear();
    
    clearRequest.onsuccess = () => {
      if (files.length === 0) {
        resolve();
        return;
      }
      
      const transaction = db.transaction([STORES.MUSIC], 'readwrite');
      const store = transaction.objectStore(STORES.MUSIC);
      
      let completed = 0;
      files.forEach((file, index) => {
        const request = store.add({
          id: index + 1,
          name: file.name,
          type: file.type,
          data: file.data,
          size: file.size,
          lastModified: file.lastModified
        });
        
        request.onsuccess = () => {
          completed++;
          if (completed === files.length) {
            console.log(`Saved ${files.length} music files to IndexedDB`);
            resolve();
          }
        };
        
        request.onerror = (e) => {
          console.error('Error saving music:', e);
          reject(e);
        };
      });
    };
    
    clearRequest.onerror = reject;
  });
}

// Load music files from IndexedDB
export async function loadMusicFiles() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MUSIC], 'readonly');
    const store = transaction.objectStore(STORES.MUSIC);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const files = request.result.map(music => ({
        name: music.name,
        type: music.type,
        data: music.data,
        size: music.size,
        lastModified: music.lastModified
      }));
      resolve(files);
    };
    
    request.onerror = reject;
  });
}

// Helper: Convert dataURL to File object
function dataURLtoFile(dataURL, filename) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// Helper: Convert File to base64 dataURL
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Delete all gallery images
export async function clearGalleryImages() {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction([STORES.IMAGES], 'readwrite')
      .objectStore(STORES.IMAGES)
      .clear();
    request.onsuccess = () => resolve();
    request.onerror = reject;
  });
}

// Delete all music files
export async function clearMusicFiles() {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction([STORES.MUSIC], 'readwrite')
      .objectStore(STORES.MUSIC)
      .clear();
    request.onsuccess = () => resolve();
    request.onerror = reject;
  });
}

// Get storage info
export async function getStorageInfo() {
  await initDB();
  
  const imagesCount = await new Promise((resolve) => {
    const transaction = db.transaction([STORES.IMAGES], 'readonly');
    const store = transaction.objectStore(STORES.IMAGES);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });
  
  const musicCount = await new Promise((resolve) => {
    const transaction = db.transaction([STORES.MUSIC], 'readonly');
    const store = transaction.objectStore(STORES.MUSIC);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });
  
  return { images: imagesCount, music: musicCount };
}
