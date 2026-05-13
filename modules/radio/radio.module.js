// modules/radio/radio.module.js

export default async function initRadio(container) {

    const pinBtn = container.querySelector('.pin-btn');

    container.innerHTML = '';

    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-radio"></i> RADIO';

    container.appendChild(title);

    const content = document.createElement('div');
    content.className = 'radio-content';

    container.appendChild(content);

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

    content.innerHTML = `
        <div class="radio-wrapper">

            <div id="stations-list" class="radio-list">

                ${stations.map((s, idx) => `
                    <div class="radio-station"
                         data-index="${idx}"
                         data-url="${s.url}">

                        <i class="fa-solid fa-headphones"></i>

                        <span>${escapeHtml(s.name)}</span>

                    </div>
                `).join('')}

            </div>

            <div class="radio-player-area">

                <div id="now-playing-text" class="radio-now-playing">
                    Select a station
                </div>

                <div id="player-error" class="radio-error"></div>

            </div>

        </div>
    `;

    let currentAudio = null;

    function stopPlayback() {

        if (!currentAudio) return;

        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
    }

    function playStation(url, stationName, el) {

        stopPlayback();

        const nowPlaying = document.getElementById('now-playing-text');
        const error = document.getElementById('player-error');

        if (nowPlaying) {
            nowPlaying.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Connecting to ${stationName}...
            `;
        }

        if (error) error.innerText = '';

        try {

            currentAudio = new Audio(url);

            currentAudio.play()

                .then(() => {

                    if (nowPlaying) {
                        nowPlaying.innerHTML = `▶ Now playing: ${stationName}`;
                    }

                    if (error) error.innerText = '';

                    document.querySelectorAll('.radio-station')
                        .forEach(s => s.classList.remove('active'));

                    if (el) el.classList.add('active');
                })

                .catch(() => {

                    if (error) error.innerText = 'Cannot play this station';

                    if (nowPlaying) nowPlaying.innerText = 'Playback failed';
                });

            currentAudio.onerror = () => {

                if (error) error.innerText = 'Stream unavailable';

                if (nowPlaying) nowPlaying.innerText = 'Stream error';
            };

        } catch (err) {

            console.error(err);

            if (error) error.innerText = 'Unable to play stream';
        }
    }

    content.querySelectorAll('.radio-station').forEach(el => {

        el.addEventListener('click', () => {

            playStation(
                el.dataset.url,
                el.querySelector('span').innerText,
                el
            );
        });
    });

    function escapeHtml(str) {

        if (!str) return '';

        return str.replace(/[&<>]/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[m]));
    }

    return () => {

        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
        }
    };
}