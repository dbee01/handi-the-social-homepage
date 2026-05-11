// js/storage.js - COMPLETE WORKING VERSION

const DB_NAME = 'pleie_storage';
const DB_VERSION = 3;  // Increased version to force recreation

let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      console.log('Database opened successfully');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      console.log('Creating/upgrading database stores...');
      
      // Create music store
      if (!database.objectStoreNames.contains('music')) {
        database.createObjectStore('music', { keyPath: 'id', autoIncrement: true });
        console.log('Created music store');
      }
      
      // Create gallery store
      if (!database.objectStoreNames.contains('gallery')) {
        database.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
        console.log('Created gallery store');
      }
      
      // Create settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
        console.log('Created settings store');
      }
    };
  });
}

// ============ SETTINGS ============
export function saveSettings(settings) {
  localStorage.setItem('pleie_settings', JSON.stringify(settings));
}

export function loadSettings() {
  const saved = localStorage.getItem('pleie_settings');
  return saved ? JSON.parse(saved) : null;
}

// ============ MUSIC FUNCTIONS ============
export async function saveMusicFiles(files) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['music'], 'readwrite');
    const store = transaction.objectStore('music');
    
    // Clear existing
    store.clear();
    
    let completed = 0;
    const total = files.length;
    
    if (total === 0) {
      resolve();
      return;
    }
    
    files.forEach((file, i) => {
      const request = store.add({
        id: i,
        name: file.name,
        type: file.type,
        file: file.file || file,  // Handle both formats
        size: file.size
      });
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          console.log(`✅ Saved ${total} music files`);
          resolve();
        }
      };
      
      request.onerror = (e) => {
        console.error('Error saving music:', e);
        reject(e);
      };
    });
  });
}

export async function loadMusicFiles() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['music'], 'readonly');
    const store = transaction.objectStore('music');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const files = request.result.map(item => ({
        name: item.name,
        type: item.type,
        file: item.file,
        url: URL.createObjectURL(item.file),
        size: item.size
      }));
      resolve(files);
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function clearMusicFiles() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['music'], 'readwrite');
    const store = transaction.objectStore('music');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============ GALLERY FUNCTIONS ============
export async function saveGalleryImages(images) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['gallery'], 'readwrite');
    const store = transaction.objectStore('gallery');
    
    // Clear existing
    store.clear();
    
    let completed = 0;
    const total = images.length;
    
    if (total === 0) {
      resolve();
      return;
    }
    
    images.forEach((image, i) => {
      const fileToStore = image.blob || image.file || image;
      const request = store.add({
        id: i,
        name: image.name,
        type: image.type,
        file: fileToStore,
        size: image.size
      });
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          console.log(`✅ Saved ${total} gallery images`);
          resolve();
        }
      };
      
      request.onerror = (e) => {
        console.error('Error saving gallery:', e);
        reject(e);
      };
    });
  });
}

export async function loadGalleryImages() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['gallery'], 'readonly');
    const store = transaction.objectStore('gallery');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const images = request.result.map(item => ({
        name: item.name,
        type: item.type,
        file: item.file,
        url: URL.createObjectURL(item.file),
        size: item.size
      }));
      console.log(`✅ Loaded ${images.length} gallery images`);
      resolve(images);
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function clearGalleryImages() {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['gallery'], 'readwrite');
    const store = transaction.objectStore('gallery');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============ STORAGE INFO ============
export async function getStorageInfo() {
  await initDB();
  
  const musicCount = await new Promise((resolve) => {
    try {
      const transaction = db.transaction(['music'], 'readonly');
      const store = transaction.objectStore('music');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    } catch(e) {
      resolve(0);
    }
  });
  
  const galleryCount = await new Promise((resolve) => {
    try {
      const transaction = db.transaction(['gallery'], 'readonly');
      const store = transaction.objectStore('gallery');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    } catch(e) {
      resolve(0);
    }
  });
  
  return { music: musicCount, images: galleryCount };
}

// ============ UTILITY FUNCTIONS ============
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}