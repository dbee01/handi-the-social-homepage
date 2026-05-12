// js/modules/music.js
import { loadMusic } from '../core/storage.js';

export async function initMusic(container) {
    const tracks = await loadMusic();
    let currentAudio = null;
    let currentIndex = -1;
    
    container.innerHTML = `
        <div class="panel-title"><i class="fa-solid fa-music"></i> MUSIC PLAYER</div>
        <div id="music-content" style="padding:10px;">
            <div id="now-playing" style="background:#0a0a0a;border-radius:8px;padding:15px;text-align:center;margin-bottom:15px;">
                <div style="color:#00ff41;font-weight:bold;" id="track-name">${tracks.length ? tracks[0].name : 'No tracks'}</div>
                <div style="color:#666;font-size:0.8rem;" id="track-status">${tracks.length ? 'Ready' : 'Add music in Settings'}</div>
            </div>
            <div style="display:flex;justify-content:center;gap:20px;margin-bottom:15px;">
                <button id="play-btn" style="background:#00ff41;border:none;width:50px;height:50px;border-radius:50%;cursor:pointer;">▶</button>
                <button id="next-btn" style="background:#1f1f1f;border:none;width:40px;height:40px;border-radius:50%;cursor:pointer;">⏭</button>
            </div>
            <div id="playlist" style="max-height:150px;overflow-y:auto;">
                ${tracks.map((t, i) => `<div class="track-item" data-index="${i}" style="padding:8px;cursor:pointer;border-bottom:1px solid #222;color:#00ffff;">🎵 ${t.name}</div>`).join('')}
            </div>
        </div>
    `;
    
    function playTrack(index) {
        if (!tracks[index]) return;
        if (currentAudio) currentAudio.pause();
        currentIndex = index;
        const track = tracks[currentIndex];
        document.getElementById('track-name').textContent = track.name;
        currentAudio = new Audio(track.url);
        currentAudio.play();
        document.getElementById('play-btn').innerHTML = '⏸';
        document.getElementById('track-status').textContent = 'Playing';
        currentAudio.onended = () => playTrack((currentIndex + 1) % tracks.length);
    }
    
    document.getElementById('play-btn')?.addEventListener('click', () => {
        if (!currentAudio) playTrack(0);
        else if (currentAudio.paused) currentAudio.play();
        else currentAudio.pause();
    });
    
    document.getElementById('next-btn')?.addEventListener('click', () => playTrack((currentIndex + 1) % tracks.length));
    document.querySelectorAll('.track-item').forEach(el => {
        el.addEventListener('click', () => playTrack(parseInt(el.dataset.index)));
    });
}