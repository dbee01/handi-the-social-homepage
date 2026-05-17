// modules/music/music.module.js
import { loadMusic } from '../../js/core/storage.js';

// Helper: remove file extension (e.g., .mp3, .ogg, .wav)
function removeFileExtension(filename) {
    if (!filename) return '';
    return filename.replace(/\.[^/.]+$/, ''); // removes last dot and following characters
}

export default async function initMusic(container) {
    const headerRow = document.createElement('div');
    headerRow.className = 'music-header-row';
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-music"></i> MUSIC PLAYER';
    headerRow.appendChild(title);

    const headerActions = document.createElement('div');
    headerActions.className = 'music-header-actions';
    const lockToggle = document.createElement('button');
    lockToggle.className = 'music-lock-toggle';
    const saved = localStorage.getItem('musicLocked');
    let isLocked = saved !== null ? saved === 'true' : true;

    function updateLockIcon() {
        lockToggle.innerHTML = isLocked
            ? '<i class="fa-solid fa-lock"></i>'
            : '<i class="fa-solidfa-solid fa-lock-open"></i>';
        lockToggle.style.color = isLocked ? '#cc0000' : '#008000';
    }
    updateLockIcon();
    headerActions.appendChild(lockToggle);

    const originalPinBtn = container.querySelector('.pin-btn');
    let pinBtn = null;
    if (originalPinBtn) {
        pinBtn = originalPinBtn.cloneNode(true);
        pinBtn.classList.add('pin-btn-clone');
        originalPinBtn.style.display = 'none';
        headerActions.appendChild(pinBtn);
    }
    headerRow.appendChild(headerActions);
    container.innerHTML = '';
    container.appendChild(headerRow);

    const content = document.createElement('div');
    content.className = 'music-content';
    container.appendChild(content);

    const parentItem = container.closest('.dashboard-item');
    if (parentItem) {
        parentItem.dataset.module = 'music';
        parentItem.style.minHeight = '420px';
    }

    const tracks = await loadMusic();
    if (!tracks.length) {
        content.innerHTML = `
            <div class="module-empty">
                <i class="fa-solid fa-music"></i>
                <p>No music uploaded.</p>
                <button id="musicSettingsBtn" class="settings-link-btn">
                    <i class="fa-solid fa-gear"></i> Add Music in Settings
                </button>
            </div>
        `;
        const settingsBtn = content.querySelector('#musicSettingsBtn');
        if (settingsBtn) settingsBtn.onclick = () => location.href = 'settings.html';
        return;
    }

    let currentAudio = null;
    let currentIndex = -1;
    let isPlaying = false;
    let stopVisualiser = null;

    // --- GLOBAL MUTE (no pause) ---
    function applyGlobalMute(muted) {
        if (currentAudio) currentAudio.muted = muted;
    }
    window.addEventListener('globalMuteToggle', (e) => {
        applyGlobalMute(e.detail.muted);
    });
    const initialMute = localStorage.getItem('globalMute') === 'true';
    applyGlobalMute(initialMute);

    // ---- Build UI ----
    content.innerHTML = `
        <div class="music-now-playing">
            <canvas id="music-synth" class="music-synth"></canvas>
            <div id="music-status" class="music-status">
                <span id="music-track-title">—</span>
                <span class="music-state-text">Ready</span>
            </div>
        </div>
        <div class="music-controls">
            <button id="music-prev">⏮</button>
            <button id="music-playpause" class="primary">▶</button>
            <button id="music-next">⏭</button>
        </div>
        <div class="music-scroll-wrapper">
            <button id="musicScrollUp" class="music-scroll-btn">▲</button>
            <div id="music-playlist" class="music-playlist"></div>
            <button id="musicScrollDown" class="music-scroll-btn">▼</button>
        </div>
    `;

    const synthCanvas = content.querySelector('#music-synth');
    const playlist = content.querySelector('#music-playlist');
    const up = content.querySelector('#musicScrollUp');
    const down = content.querySelector('#musicScrollDown');
    const playPauseBtn = content.querySelector('#music-playpause');
    const trackTitleSpan = content.querySelector('#music-track-title');
    const stateSpan = content.querySelector('.music-state-text');
    const prevBtn = content.querySelector('#music-prev');
    const nextBtn = content.querySelector('#music-next');

    if (synthCanvas) synthCanvas.style.display = 'none';

    // --- Visualiser (unchanged) ---
    function startFakeVisualiser(canvas) {
        if (!canvas) return null;
        canvas.style.display = 'block';
        let animationId = null;
        const ctx = canvas.getContext('2d');
        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        let time = 0;
        function draw() {
            animationId = requestAnimationFrame(draw);
            time += 0.05;
            const width = canvas.width;
            const height = canvas.height;
            if (width === 0 || height === 0) return;
            ctx.clearRect(0, 0, width, height);
            const barCount = 32;
            const barWidth = width / barCount;
            for (let i = 0; i < barCount; i++) {
                const value = (Math.sin(time + i * 0.3) + 1) / 2;
                const noise = Math.random() * 0.3;
                const heightPercent = Math.min(0.9, value * 0.7 + noise);
                const barHeight = height * heightPercent;
                const hue = 200 + (heightPercent * 60);
                ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
                ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
            }
        }
        draw();
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }

    function stopVisualiserAndClear() {
        if (stopVisualiser) { stopVisualiser(); stopVisualiser = null; }
        if (synthCanvas) {
            const ctx = synthCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, synthCanvas.width, synthCanvas.height);
            synthCanvas.style.display = 'none';
        }
    }

    function updateTrackIconsAndActive() {
        document.querySelectorAll('.music-track-item').forEach((item, idx) => {
            const iconSpan = item.querySelector('.music-track-icon');
            const isCurrent = (idx === currentIndex);
            if (isCurrent && isPlaying) {
                iconSpan.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                item.classList.add('active');
            } else if (isCurrent && !isPlaying && currentIndex !== -1) {
                iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
                item.classList.add('active');
            } else {
                iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
                item.classList.remove('active');
            }
        });
        if (isPlaying && currentAudio && currentIndex !== -1 && !isLocked) {
            if (!stopVisualiser) stopVisualiser = startFakeVisualiser(synthCanvas);
        } else {
            stopVisualiserAndClear();
        }
    }

    function stopCurrentAudio(resetIcon = true) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }
        isPlaying = false;
        if (resetIcon) updateTrackIconsAndActive();
        stateSpan.innerText = 'Stopped';
        if (currentIndex === -1) trackTitleSpan.innerText = '—';
    }

    function playTrack(index, autoPlay = true) {
        if (isLocked) {
            stateSpan.innerText = 'Player locked – unlock to play';
            return;
        }
        if (index < 0 || index >= tracks.length) return;
        if (currentAudio && currentIndex === index && autoPlay === false) return;
        if (currentAudio && currentIndex === index && isPlaying) return;
        stopCurrentAudio(false);
        currentIndex = index;
        const track = tracks[currentIndex];
        // Display cleaned name (remove extension)
        const displayName = removeFileExtension(track.name);
        trackTitleSpan.innerText = displayName;
        stateSpan.innerText = 'Playing...';
        playPauseBtn.innerHTML = '⏸';
        currentAudio = new Audio(track.url);
        currentAudio.volume = 0.7;
        currentAudio.muted = localStorage.getItem('globalMute') === 'true';
        if (autoPlay) {
            currentAudio.play().catch(err => {
                console.warn('Play error:', err);
                stateSpan.innerText = 'Error';
                isPlaying = false;
                playPauseBtn.innerHTML = '▶';
                updateTrackIconsAndActive();
            });
            isPlaying = true;
        } else {
            isPlaying = false;
            playPauseBtn.innerHTML = '▶';
            stateSpan.innerText = 'Paused';
        }
        currentAudio.onended = () => playNext();
        currentAudio.onerror = () => {
            stateSpan.innerText = 'Stream error';
            isPlaying = false;
            playPauseBtn.innerHTML = '▶';
            updateTrackIconsAndActive();
        };
        updateTrackIconsAndActive();
    }

    function playNext() {
        if (isLocked) { stateSpan.innerText = 'Player locked – unlock to play'; return; }
        if (tracks.length === 0) return;
        const nextIndex = (currentIndex + 1) % tracks.length;
        playTrack(nextIndex, true);
    }

    function playPrev() {
        if (isLocked) { stateSpan.innerText = 'Player locked – unlock to play'; return; }
        if (tracks.length === 0) return;
        const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
        playTrack(prevIndex, true);
    }

    function togglePlayPause() {
        if (isLocked) { stateSpan.innerText = 'Player locked – unlock to play'; return; }
        if (currentIndex === -1 || !currentAudio) { playTrack(0, true); return; }
        if (isPlaying) {
            currentAudio.pause();
            isPlaying = false;
            playPauseBtn.innerHTML = '▶';
            stateSpan.innerText = 'Paused';
            updateTrackIconsAndActive();
        } else {
            currentAudio.play().catch(err => {
                console.warn('Resume error:', err);
                stateSpan.innerText = 'Error resuming';
            });
            isPlaying = true;
            playPauseBtn.innerHTML = '⏸';
            stateSpan.innerText = 'Playing...';
            updateTrackIconsAndActive();
        }
    }

    function onTrackClick(index) {
        if (isLocked) { stateSpan.innerText = 'Player locked – unlock to play'; return; }
        if (index === currentIndex && currentAudio) {
            if (isPlaying) {
                currentAudio.pause();
                isPlaying = false;
                playPauseBtn.innerHTML = '▶';
                stateSpan.innerText = 'Paused';
                updateTrackIconsAndActive();
            } else {
                currentAudio.play().catch(err => {
                    console.warn('Resume error:', err);
                    stateSpan.innerText = 'Error resuming';
                });
                isPlaying = true;
                playPauseBtn.innerHTML = '⏸';
                stateSpan.innerText = 'Playing...';
                updateTrackIconsAndActive();
            }
        } else {
            playTrack(index, true);
        }
    }

    function applyLockState() {
        if (isLocked) stopCurrentAudio(true);
        const allTrackItems = playlist.querySelectorAll('.music-track-item');
        allTrackItems.forEach(item => {
            if (isLocked) {
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.6';
            } else {
                item.style.pointerEvents = '';
                item.style.opacity = '';
            }
        });
        const controlBtns = [prevBtn, playPauseBtn, nextBtn, up, down];
        controlBtns.forEach(btn => {
            if (btn) {
                if (isLocked) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                } else {
                    btn.disabled = false;
                    btn.style.opacity = '';
                    btn.style.cursor = '';
                }
            }
        });
        if (isLocked) {
            stopVisualiserAndClear();
            if (currentIndex === -1) trackTitleSpan.innerText = '—';
            stateSpan.innerText = 'Locked';
        } else {
            if (currentAudio && isPlaying && currentIndex !== -1) {
                stopVisualiser = startFakeVisualiser(synthCanvas);
                stateSpan.innerText = 'Playing...';
            } else if (currentIndex !== -1 && !isPlaying) {
                stateSpan.innerText = 'Paused';
            } else {
                stateSpan.innerText = 'Ready';
            }
        }
    }

    lockToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        isLocked = !isLocked;
        localStorage.setItem('musicLocked', isLocked);
        updateLockIcon();
        applyLockState();
    });

    tracks.forEach((track, i) => {
        const el = document.createElement('div');
        el.className = 'music-track-item';
        el.dataset.index = i;
        const iconSpan = document.createElement('span');
        iconSpan.className = 'music-track-icon';
        iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
        const nameSpan = document.createElement('span');
        // Remove extension for playlist display
        nameSpan.textContent = escapeHtml(removeFileExtension(track.name));
        el.appendChild(iconSpan);
        el.appendChild(nameSpan);
        el.addEventListener('click', () => onTrackClick(i));
        playlist.appendChild(el);
    });

    updateTrackIconsAndActive();
    up.addEventListener('click', () => playlist.scrollBy({ top: -300, behavior: 'smooth' }));
    down.addEventListener('click', () => playlist.scrollBy({ top: 300, behavior: 'smooth' }));
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', playNext);
    playPauseBtn.addEventListener('click', togglePlayPause);
    applyLockState();

    return () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }
        stopVisualiserAndClear();
    };
}

function escapeHtml(str) {
    return (str || '').replace(/[&<>]/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    }[m]));
}