/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/storage.js
const DB_NAME = 'pleie_storage_v2';
const DB_VERSION = 2;

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
                    if (!database.objectStoreNames.contains('audiopod')) {
                        database.createObjectStore('audiopod', { keyPath: 'id', autoIncrement: true });
                    }
                };
    });
}

export async function saveMusic(files) {
    const database = await initDB();
    await new Promise((resolve, reject) => {
        const tx = database.transaction(['music'], 'readwrite');
        const store = tx.objectStore('music');
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    return new Promise((resolve, reject) => {
        const tx = database.transaction(['music'], 'readwrite');
        const store = tx.objectStore('music');
        files.forEach((file) => {
            const req = store.add({ name: file.name, type: file.type, file: file.file || file });
            req.onerror = () => reject(req.error);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

let _musicBlobUrls = [];

export async function loadMusic() {
    // Revoke previously created blob URLs to avoid memory leaks on constrained devices
    _musicBlobUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
    _musicBlobUrls = [];

    const database = await initDB();
    return new Promise((resolve) => {
        const tx = database.transaction(['music'], 'readonly');
        const store = tx.objectStore('music');
        const req = store.getAll();
        req.onsuccess = () => {
            const files = req.result.map(f => {
                var u = URL.createObjectURL(f.file);
                _musicBlobUrls.push(u);
                return {
                    name: f.name,
                    file: f.file,
                    url: u
                };
            });
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
            store.add({ id: i, name: img.name, file: img.file || img });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

let _galleryBlobUrls = [];

export async function loadGallery() {
    _galleryBlobUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
    _galleryBlobUrls = [];

    const database = await initDB();
    return new Promise((resolve) => {
        const tx = database.transaction(['gallery'], 'readonly');
        const store = tx.objectStore('gallery');
        const req = store.getAll();
        req.onsuccess = () => {
            const images = req.result.map(img => {
                var u = URL.createObjectURL(img.file);
                _galleryBlobUrls.push(u);
                return {
                    name: img.name,
                    file: img.file,
                    url: u
                };
            });
            resolve(images);
        };
        req.onerror = () => resolve([]);
            });
        }

        export async function saveCastFn(files) {
            const database = await initDB();
            // Clear first in a separate transaction
            await new Promise((resolve, reject) => {
                const tx = database.transaction(['audiopod'], 'readwrite');
                const store = tx.objectStore('audiopod');
                store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            // Then add in a fresh transaction
            return new Promise((resolve, reject) => {
                const tx = database.transaction(['audiopod'], 'readwrite');
                const store = tx.objectStore('audiopod');
                let added = 0;
                files.forEach((file) => {
                    const req = store.add({ name: file.name, type: file.type, file: file.file || file });
                    req.onerror = () => reject(req.error);
                });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }

let _castBlobUrls = [];

        export async function loadCastFn() {
            _castBlobUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
            _castBlobUrls = [];

            const database = await initDB();
            return new Promise((resolve) => {
                const tx = database.transaction(['audiopod'], 'readonly');
                const store = tx.objectStore('audiopod');
                const req = store.getAll();
                req.onsuccess = () => {
                    const files = req.result.map(f => {
                        var u = URL.createObjectURL(f.file);
                        _castBlobUrls.push(u);
                        return {
                            name: f.name,
                            file: f.file,
                            url: u
                        };
                    });
                    resolve(files);
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