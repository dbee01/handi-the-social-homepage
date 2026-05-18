/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/storage.js
const DB_NAME = 'pleie_storage';
const DB_VERSION = 2; // Incremented version

let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        if (db && db.version === DB_VERSION) {
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
            if (!database.objectStoreNames.contains('music')) {
                database.createObjectStore('music', { keyPath: 'id', autoIncrement: true });
            }
            if (!database.objectStoreNames.contains('gallery')) {
                database.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

export async function saveMusic(files) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(['music'], 'readwrite');
        const store = tx.objectStore('music');
        store.clear();
        files.forEach((file, i) => {
            store.add({ id: i, name: file.name, type: file.type, file: file.file || file });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadMusic() {
    const database = await initDB();
    return new Promise((resolve) => {
        const tx = database.transaction(['music'], 'readonly');
        const store = tx.objectStore('music');
        const req = store.getAll();
        req.onsuccess = () => {
            const files = req.result.map(f => ({
                name: f.name,
                file: f.file,
                url: URL.createObjectURL(f.file)
            }));
            resolve(files);
        };
        req.onerror = () => resolve([]);
    });
}

export async function saveGallery(images) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(['gallery'], 'readwrite');
        const store = tx.objectStore('gallery');
        store.clear();
        images.forEach((img, i) => {
            store.add({ id: i, name: img.name, file: img.file });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadGallery() {
    const database = await initDB();
    return new Promise((resolve) => {
        const tx = database.transaction(['gallery'], 'readonly');
        const store = tx.objectStore('gallery');
        const req = store.getAll();
        req.onsuccess = () => {
            const images = req.result.map(img => ({
                name: img.name,
                file: img.file,
                url: URL.createObjectURL(img.file)
            }));
            resolve(images);
        };
        req.onerror = () => resolve([]);
    });
}

export async function clearMusic() {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(['music'], 'readwrite');
        const store = tx.objectStore('music');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function clearGallery() {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(['gallery'], 'readwrite');
        const store = tx.objectStore('gallery');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}