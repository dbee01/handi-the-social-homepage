// modules/local-player/local-player.module.js
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
                Go to Settings → Music Player → Upload Music Files.
            </div>
        `;

        return;
    }

    let currentAudio = null;
    let currentIndex = 0;
    let isPlaying = false;

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

            <button id="music-prev" class="music-btn">⏮</button>

            <button id="music-playpause" class="music-btn primary">▶</button>

            <button id="music-next" class="music-btn">⏭</button>

        </div>

        <div id="music-playlist" class="music-playlist">

            ${tracks.map((t, i) => `
                <div class="music-track-item" data-index="${i}">
                    🎵 ${escapeHtml(t.name)}
                </div>
            `).join('')}

        </div>
    `;

    function playTrack(index) {

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentIndex = index;

        const track = tracks[currentIndex];

        document.getElementById('music-track-title').innerText = track.name;

        document.getElementById('music-status').innerText = 'Playing...';

        currentAudio = new Audio(track.url);

        currentAudio.volume = 0.7;

        currentAudio.play();

        isPlaying = true;

        document.getElementById('music-playpause').innerHTML = '⏸';

        currentAudio.onended = () => playNext();

        currentAudio.onerror = () => {

            document.getElementById('music-status').innerText = 'Error playing';

            isPlaying = false;

            document.getElementById('music-playpause').innerHTML = '▶';
        };
    }

    function playNext() {
        playTrack((currentIndex + 1) % tracks.length);
    }

    function playPrev() {
        playTrack((currentIndex - 1 + tracks.length) % tracks.length);
    }

    function togglePlay() {

        if (!currentAudio) {
            playTrack(0);
            return;
        }

        if (isPlaying) {

            currentAudio.pause();

            isPlaying = false;

            document.getElementById('music-playpause').innerHTML = '▶';

            document.getElementById('music-status').innerText = 'Paused';

        } else {

            currentAudio.play();

            isPlaying = true;

            document.getElementById('music-playpause').innerHTML = '⏸';

            document.getElementById('music-status').innerText = 'Playing...';
        }
    }

    document.getElementById('music-prev').addEventListener('click', playPrev);
    document.getElementById('music-next').addEventListener('click', playNext);
    document.getElementById('music-playpause').addEventListener('click', togglePlay);

    document.querySelectorAll('.music-track-item').forEach(el => {
        el.addEventListener('click', () => playTrack(parseInt(el.dataset.index)));
    });

    function escapeHtml(str) {
        return (str || '').replace(/[&<>]/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[m]));
    }
}