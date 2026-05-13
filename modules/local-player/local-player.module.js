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
        content.innerHTML = `
            <div class="module-empty">
                No music uploaded.
            </div>
        `;
        return;
    }

    let currentAudio = null;
    let currentIndex = 0;
    let isPlaying = false;

    /* =========================
       UI
    ========================= */

    content.innerHTML = `
        <div class="music-now-playing">
            <div id="music-track-title" class="music-title">
                ${escapeHtml(tracks[0].name)}
            </div>
            <div id="music-status" class="music-status">
                Ready
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

    const playlist = content.querySelector('#music-playlist');
    const up = content.querySelector('#musicScrollUp');
    const down = content.querySelector('#musicScrollDown');

    /* =========================
       RENDER TRACKS
    ========================= */

    tracks.forEach((t, i) => {
        const el = document.createElement('div');
        el.className = 'music-track-item';
        el.dataset.index = i;
        el.innerHTML = `🎵 ${escapeHtml(t.name)}`;

        el.addEventListener('click', () => playTrack(i));

        playlist.appendChild(el);
    });

    /* =========================
       SCROLL BUTTONS
    ========================= */

    up.addEventListener('click', () => {
        playlist.scrollBy({ top: -300, behavior: 'smooth' });
    });

    down.addEventListener('click', () => {
        playlist.scrollBy({ top: 300, behavior: 'smooth' });
    });

    /* =========================
       AUDIO CORE
    ========================= */

    function playTrack(index) {

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentIndex = index;
        const track = tracks[currentIndex];

        content.querySelector('#music-track-title').innerText = track.name;
        content.querySelector('#music-status').innerText = 'Playing...';

        document.querySelectorAll('.music-track-item')
            .forEach(t => t.classList.remove('active'));

        const active = playlist.querySelector(`[data-index="${index}"]`);
        if (active) active.classList.add('active');

        currentAudio = new Audio(track.url);
        currentAudio.volume = 0.7;
        currentAudio.play();

        isPlaying = true;

        content.querySelector('#music-playpause').innerHTML = '⏸';

        currentAudio.onended = playNext;

        currentAudio.onerror = () => {
            content.querySelector('#music-status').innerText = 'Error playing';
            isPlaying = false;
            content.querySelector('#music-playpause').innerHTML = '▶';
        };
    }

    function playNext() {
        playTrack((currentIndex + 1) % tracks.length);
    }

    function playPrev() {
        playTrack((currentIndex - 1 + tracks.length) % tracks.length);
    }

    function togglePlay() {

        const btn = content.querySelector('#music-playpause');

        if (!currentAudio) {
            playTrack(0);
            return;
        }

        if (isPlaying) {
            currentAudio.pause();
            isPlaying = false;
            btn.innerHTML = '▶';
            content.querySelector('#music-status').innerText = 'Paused';
        } else {
            currentAudio.play();
            isPlaying = true;
            btn.innerHTML = '⏸';
            content.querySelector('#music-status').innerText = 'Playing...';
        }
    }

    /* =========================
       EVENTS
    ========================= */

    content.querySelector('#music-prev').addEventListener('click', playPrev);
    content.querySelector('#music-next').addEventListener('click', playNext);
    content.querySelector('#music-playpause').addEventListener('click', togglePlay);

    /* =========================
       CLEANUP
    ========================= */

    return () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
        }
    };
}

function escapeHtml(str) {
    return (str || '').replace(/[&<>]/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    }[m]));
}