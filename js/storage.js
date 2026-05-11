// js/storage.js - UPDATED VERSION NUMBER

const DB_NAME = 'pleie_storage';
const DB_VERSION = 2;  // Increased from 1 to 2

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
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      // Delete old stores if they exist
      if (database.objectStoreNames.contains('music')) {
        database.deleteObjectStore('music');
      }
      if (database.objectStoreNames.contains('settings')) {
        database.deleteObjectStore('settings');
      }
      // Create fresh stores
      database.createObjectStore('music', { keyPath: 'id', autoIncrement: true });
      database.createObjectStore('settings', { keyPath: 'key' });
    };
  });
}

// Save settings
export function saveSettings(settings) {
  localStorage.setItem('pleie_settings', JSON.stringify(settings));
}

export function loadSettings() {
  const saved = localStorage.getItem('pleie_settings');
  return saved ? JSON.parse(saved) : null;
}

// Clear all music
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

// Save music files directly from File objects
export async function saveMusicFiles(files) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['music'], 'readwrite');
    const store = transaction.objectStore('music');
    
    // Clear existing first
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
        file: file,
        size: file.size
      });
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          console.log(`Saved ${total} music files`);
          resolve();
        }
      };
      
      request.onerror = (e) => {
        console.error('Error saving:', e);
        reject(e);
      };
    });
  });
}

// Load music files
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

// Get storage info
export async function getStorageInfo() {
  await initDB();
  
  return new Promise((resolve) => {
    const transaction = db.transaction(['music'], 'readonly');
    const store = transaction.objectStore('music');
    const request = store.count();
    request.onsuccess = () => resolve({ music: request.result });
    request.onerror = () => resolve({ music: 0 });
  });
}

// For compatibility with existing code
export async function saveGalleryImages() { return; }
export async function loadGalleryImages() { return []; }
export function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}