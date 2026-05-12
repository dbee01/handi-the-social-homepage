// modules/radio/radio.module.js
export default async function initRadio(container) {
    // Preserve pin button
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-radio"></i> RADIO';
    container.appendChild(title);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px;';
    container.appendChild(content);

    // 10 Irish stations – using the exact URLs you provided
    const stations = [
        { name: 'RTÉ Radio 1', url: 'https://25553.live.streamtheworld.com/RTE_1_INT.mp3?tdsdk=rte' },
        { name: 'Today FM', url: 'https://edgex.audioxi.com/TD' },
        { name: 'Newstalk', url: 'https://edgex.audioxi.com/NT' },
        { name: 'RTÉ Lyric FM', url: 'https://29083.live.streamtheworld.com/RTE_LYRIC_FM.mp3?tdsdk=rte' },
        { name: 'RTÉ 2FM', url: 'https://27793.live.streamtheworld.com/RTE_2FM_INT.mp3?tdsdk=rte' },
        { name: 'Cork 96FM', url: 'https://onic.cork.live.stream.broadcasting.news/stream-96fm' },
        { name: 'Dublin FM 104', url: 'https://onic.dublin.live.stream.broadcasting.news/stream-fm104' },
        { name: 'Galway Bay FM', url: 'https://wg.cdn.tibus.net/galwaybay.mp3' },
        { name: 'Classic FM', url: 'https://live-bauerie.sharp-stream.com/CLASSIC' },
        { name: 'Live 95 (Limerick)', url: 'https://onic.cork.live.stream.broadcasting.news/stream-live95' }
    ];

    // Build the station list UI
    content.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div id="stations-list" style="max-height:320px; overflow-y:auto;">
                ${stations.map((s, idx) => `
                    <div class="radio-station" data-index="${idx}" data-url="${s.url}" style="background:#0f0f0f; border:1px solid #333; border-radius:8px; padding:10px 12px; margin-bottom:8px; cursor:pointer; transition:0.2s;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-headphones" style="color:#00ff41; font-size:0.9rem;"></i>
                            <span style="color:#00ffff;">${escapeHtml(s.name)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div id="radio-player-area" style="margin-top:10px; padding:10px; background:#1a1a2e; border-radius:8px;">
                <div id="now-playing-text" style="color:#888; font-size:0.8rem; text-align:center;">Select a station</div>
                <div id="player-error" style="color:#ff8888; font-size:0.7rem; text-align:center; margin-top:5px;"></div>
            </div>
        </div>
    `;

    let currentAudio = null;

    function stopPlayback() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }
    }

    function playStation(url, stationName, divElement) {
        stopPlayback();

        const nowPlayingDiv = document.getElementById('now-playing-text');
        const errorDiv = document.getElementById('player-error');
        if (nowPlayingDiv) nowPlayingDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting to ${stationName}...`;
        if (errorDiv) errorDiv.innerText = '';

        try {
            currentAudio = new Audio();
            // No need to set crossorigin – audio streams are usually allowed
            currentAudio.src = url;
            currentAudio.play().then(() => {
                if (nowPlayingDiv) nowPlayingDiv.innerHTML = `▶️ Now playing: ${stationName}`;
                if (errorDiv) errorDiv.innerText = '';
                // Highlight active station
                document.querySelectorAll('.radio-station').forEach(el => el.style.background = '#0f0f0f');
                if (divElement) divElement.style.background = '#1f3a1f';
            }).catch(err => {
                console.error('Playback error:', err);
                if (errorDiv) errorDiv.innerText = 'Cannot play this stream. Try another station.';
                if (nowPlayingDiv) nowPlayingDiv.innerHTML = 'Playback failed';
            });
            currentAudio.onerror = () => {
                if (errorDiv) errorDiv.innerText = 'Stream unavailable – station may be offline.';
                if (nowPlayingDiv) nowPlayingDiv.innerHTML = 'Stream error';
            };
        } catch (err) {
            console.error(err);
            if (errorDiv) errorDiv.innerText = 'Unable to play stream.';
        }
    }

    // Attach click handlers
    const stationDivs = content.querySelectorAll('.radio-station');
    stationDivs.forEach((div) => {
        div.addEventListener('click', () => {
            const url = div.dataset.url;
            const stationName = div.querySelector('span').innerText;
            playStation(url, stationName, div);
        });
    });

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    // Cleanup on module removal
    return () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
        }
    };
}