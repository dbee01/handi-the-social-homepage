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
    content.style.cssText = 'padding: 10px;';
    container.appendChild(content);

    const tracks = await loadMusic();
    console.log('Music tracks loaded:', tracks.length);

    if (!tracks.length) {
        content.innerHTML = '<div style="text-align:center;padding:40px;color:#ffb000;">No music uploaded. Go to Settings → Music Player → Upload Music Files.</div>';
        return;
    }

    let currentAudio = null;
    let currentIndex = 0;
    let isPlaying = false;

    // Create UI
    content.innerHTML = `
        <div id="music-now-playing" style="background:#0a0a0a;border-radius:8px;padding:12px;margin-bottom:15px;text-align:center;border:1px solid #00ff41;">
            <div id="music-track-title" style="color:#00ff41;font-weight:bold;">${escapeHtml(tracks[0].name)}</div>
            <div id="music-status" style="color:#666;font-size:0.7rem;">Ready</div>
        </div>
        <div style="display:flex;justify-content:center;gap:20px;margin-bottom:15px;">
            <button id="music-prev" style="background:#1f1f1f;border:none;width:45px;height:45px;border-radius:50%;color:#00ffff;cursor:pointer;">⏮</button>
            <button id="music-playpause" style="background:#00ff41;border:none;width:55px;height:55px;border-radius:50%;color:#000;cursor:pointer;">▶</button>
            <button id="music-next" style="background:#1f1f1f;border:none;width:45px;height:45px;border-radius:50%;color:#00ffff;cursor:pointer;">⏭</button>
        </div>
        <div id="music-playlist" style="max-height:150px;overflow-y:auto;">
            ${tracks.map((t, i) => `<div class="music-track-item" data-index="${i}" style="padding:8px;cursor:pointer;border-bottom:1px solid #222;color:#00ffff;">🎵 ${escapeHtml(t.name)}</div>`).join('')}
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
        if (tracks.length === 0) return;
        const next = (currentIndex + 1) % tracks.length;
        playTrack(next);
    }

    function playPrev() {
        if (tracks.length === 0) return;
        const prev = (currentIndex - 1 + tracks.length) % tracks.length;
        playTrack(prev);
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
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
}