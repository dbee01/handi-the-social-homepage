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

export async function saveMusic(files, onProgress) {
    const database = await initDB();
    await new Promise((resolve, reject) => {
        const tx = database.transaction(['music'], 'readwrite');
        const store = tx.objectStore('music');
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    // Save one file per transaction so several large files can't stall in a
    // single write, and report bytes written after each file.
    const totalBytes = (files || []).reduce(function (sum, file) {
        const f = file.file || file;
        return sum + ((f && f.size) || 0);
    }, 0);
    let doneBytes = 0;
    for (let i = 0; i < (files || []).length; i++) {
        const file = files[i];
        const f = file.file || file;
        await new Promise((resolve, reject) => {
            const tx = database.transaction(['music'], 'readwrite');
            const store = tx.objectStore('music');
            const req = store.add({ name: file.name, type: f.type || file.type || '', file: f });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        doneBytes += (f && f.size) || 0;
        if (onProgress) {
            try { onProgress(doneBytes, totalBytes, file.name || ''); } catch (e) {}
        }
    }
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

export async function saveGallery(images, onProgress) {
    const database = await initDB();
    await new Promise((resolve, reject) => {
        const tx = database.transaction(['gallery'], 'readwrite');
        const store = tx.objectStore('gallery');
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    // Save one image per transaction (several large files must not stall in a
    // single write) and report bytes written after each file.
    const totalBytes = (images || []).reduce(function (sum, img) {
        const f = img.file || img;
        return sum + ((f && f.size) || 0);
    }, 0);
    let doneBytes = 0;
    for (let i = 0; i < (images || []).length; i++) {
        const img = images[i];
        const f = img.file || img;
        await new Promise((resolve, reject) => {
            const tx = database.transaction(['gallery'], 'readwrite');
            const store = tx.objectStore('gallery');
            const req = store.add({ id: i, name: img.name, file: f });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        doneBytes += (f && f.size) || 0;
        if (onProgress) {
            try { onProgress(doneBytes, totalBytes, img.name || ''); } catch (e) {}
        }
    }
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

        // Save podcast files one-by-one in their own transactions. A single
        // transaction holding several large blobs can stall/time out on
        // low-end devices, and per-file commits let us report real progress.
        // onProgress(doneBytes, totalBytes, name) is called after each file.
        export async function saveCastFn(files, onProgress) {
            const database = await initDB();
            await new Promise((resolve, reject) => {
                const tx = database.transaction(['audiopod'], 'readwrite');
                const store = tx.objectStore('audiopod');
                store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            const totalBytes = (files || []).reduce(function (sum, file) {
                const f = file.file || file;
                return sum + ((f && f.size) || 0);
            }, 0);
            let doneBytes = 0;
            for (let i = 0; i < (files || []).length; i++) {
                const file = files[i];
                const f = file.file || file;
                await new Promise((resolve, reject) => {
                    const tx = database.transaction(['audiopod'], 'readwrite');
                    const store = tx.objectStore('audiopod');
                    const req = store.add({
                        name: file.name,
                        type: f.type || file.type || "",
                        file: f,
                    });
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
                doneBytes += (f && f.size) || 0;
                if (onProgress) {
                    try {
                        onProgress(doneBytes, totalBytes, file.name || "");
                    } catch (e) { /* ignore */ }
                }
            }
        }

        // Names/sizes of stored podcasts only — cheap for the Settings list
        // (no Blob URLs created, unlike loadCastFn). Includes the record id so
        // individual files can be deleted.
        export async function listCastFiles() {
            const database = await initDB();
            return new Promise((resolve) => {
                const tx = database.transaction(['audiopod'], 'readonly');
                const store = tx.objectStore('audiopod');
                const req = store.getAll();
                req.onsuccess = () => {
                    resolve((req.result || []).map(function (f) {
                        return {
                            id: f.id,
                            name: f.name || "",
                            type: f.type || "",
                            size: (f.file && f.file.size) || 0,
                        };
                    }));
                };
                req.onerror = () => resolve([]);
            });
        }

        export async function deleteCastFile(id) {
            const database = await initDB();
            return new Promise((resolve, reject) => {
                const tx = database.transaction(['audiopod'], 'readwrite');
                const store = tx.objectStore('audiopod');
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }

        export async function clearCastFiles() {
            const database = await initDB();
            return new Promise((resolve, reject) => {
                const tx = database.transaction(['audiopod'], 'readwrite');
                const store = tx.objectStore('audiopod');
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
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

// Cheap listing (id/name/size only — no Blob URLs) for the Settings list.
export async function listMusicFiles() {
    const database = await initDB();
    return new Promise((resolve) => {
        const tx = database.transaction(['music'], 'readonly');
        const store = tx.objectStore('music');
        const req = store.getAll();
        req.onsuccess = () => {
            resolve((req.result || []).map(function (f) {
                return {
                    id: f.id,
                    name: f.name || "",
                    type: f.type || "",
                    size: (f.file && f.file.size) || 0,
                };
            }));
        };
        req.onerror = () => resolve([]);
    });
}

export async function deleteMusicFile(id) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(['music'], 'readwrite');
        const store = tx.objectStore('music');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function clearMusicFiles() {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(['music'], 'readwrite');
        const store = tx.objectStore('music');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// Cheap listing (id/name/size only — no Blob URLs) for the Settings list.
export async function listGalleryFiles() {
    const database = await initDB();
    return new Promise((resolve) => {
        const tx = database.transaction(['gallery'], 'readonly');
        const store = tx.objectStore('gallery');
        const req = store.getAll();
        req.onsuccess = () => {
            resolve((req.result || []).map(function (f) {
                return {
                    id: f.id,
                    name: f.name || "",
                    type: f.type || "",
                    size: (f.file && f.file.size) || 0,
                };
            }));
        };
        req.onerror = () => resolve([]);
    });
}

export async function deleteGalleryFile(id) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(['gallery'], 'readwrite');
        const store = tx.objectStore('gallery');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}