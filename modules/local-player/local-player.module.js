// modules/music/music.module.js
import { loadMusic } from '../../js/core/storage.js';

export default async function initMusic(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-music"></i> MUSIC PLAYER';
    container.appendChild(title);

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
        content.innerHTML = `<div class="module-empty">No music uploaded.</div>`;
        return;
    }

    let currentAudio = null;
    let currentIndex = -1;          // ← FIX: no track selected initially
    let isPlaying = false;
    let stopVisualiser = null;

    /* =========================
       Build UI – no inline width/height on canvas
    ========================= */
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

    // Hide canvas initially
    if (synthCanvas) {
        synthCanvas.style.display = 'none';
    }

    /* =========================
       Fake visualiser (unchanged)
    ========================= */
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
        if (stopVisualiser) {
            stopVisualiser();
            stopVisualiser = null;
        }
        if (synthCanvas) {
            const ctx = synthCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, synthCanvas.width, synthCanvas.height);
            synthCanvas.style.display = 'none';
        }
    }

    /* =========================
       Helper to update track icons & active state (no active when index = -1)
    ========================= */
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

        if (isPlaying && currentAudio && currentIndex !== -1) {
            if (!stopVisualiser) stopVisualiser = startFakeVisualiser(synthCanvas);
        } else {
            stopVisualiserAndClear();
        }
    }

    /* =========================
       Core playback functions (handle -1 initial index)
    ========================= */
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
        if (index < 0 || index >= tracks.length) return;

        if (currentAudio && currentIndex === index && autoPlay === false) return;
        if (currentAudio && currentIndex === index && isPlaying) return;

        stopCurrentAudio(false);

        currentIndex = index;
        const track = tracks[currentIndex];
        trackTitleSpan.innerText = track.name;
        stateSpan.innerText = 'Playing...';
        playPauseBtn.innerHTML = '⏸';

        currentAudio = new Audio(track.url);
        currentAudio.volume = 0.7;

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
        if (tracks.length === 0) return;
        const nextIndex = (currentIndex + 1) % tracks.length;
        playTrack(nextIndex, true);
    }

    function playPrev() {
        if (tracks.length === 0) return;
        const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
        playTrack(prevIndex, true);
    }

    function togglePlayPause() {
        if (currentIndex === -1 || !currentAudio) {
            playTrack(0, true);
            return;
        }
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

    /* =========================
       Render playlist (no active class on first track initially)
    ========================= */
    tracks.forEach((track, i) => {
        const el = document.createElement('div');
        el.className = 'music-track-item';
        el.dataset.index = i;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'music-track-icon';
        iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = escapeHtml(track.name);

        el.appendChild(iconSpan);
        el.appendChild(nameSpan);
        el.addEventListener('click', () => onTrackClick(i));
        playlist.appendChild(el);
    });

    // No active track shown initially
    updateTrackIconsAndActive();

    /* =========================
       Scroll buttons
    ========================= */
    up.addEventListener('click', () => playlist.scrollBy({ top: -300, behavior: 'smooth' }));
    down.addEventListener('click', () => playlist.scrollBy({ top: 300, behavior: 'smooth' }));

    /* =========================
       Control buttons
    ========================= */
    content.querySelector('#music-prev').addEventListener('click', playPrev);
    content.querySelector('#music-next').addEventListener('click', playNext);
    playPauseBtn.addEventListener('click', togglePlayPause);

    /* =========================
       Cleanup
    ========================= */
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