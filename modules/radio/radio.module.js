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

    /* =========================
       UI
    ========================= */

    content.innerHTML = `
        <div class="radio-top-bar">

            <div class="radio-player-area">
                <div class="radio-now-playing" id="now-playing">
                    Select a station
                </div>
            </div>

            <button class="radio-stop-btn" id="radio-stop">
                ⏹ OFF
            </button>

        </div>

        <div class="radio-scroll-wrapper">

            <button id="radio-up" class="radio-scroll-btn">▲</button>

            <div id="stations-list" class="radio-list"></div>

            <button id="radio-down" class="radio-scroll-btn">▼</button>

        </div>

        <div class="radio-error" id="radio-error"></div>
    `;

    /* =========================
       ELEMENTS (SAFE)
    ========================= */

    const list = content.querySelector('#stations-list');
    const nowPlaying = content.querySelector('#now-playing');
    const error = content.querySelector('#radio-error');
    const stopBtn = content.querySelector('#radio-stop');
    const up = content.querySelector('#radio-up');
    const down = content.querySelector('#radio-down');

    /* =========================
       STATE
    ========================= */

    let currentAudio = null;

    /* =========================
       RENDER STATIONS
    ========================= */

    stations.forEach((station) => {
        const el = document.createElement('div');
        el.className = 'radio-station';

        el.innerHTML = `
            <i class="fa-solid fa-headphones"></i>
            <span>${station.name}</span>
        `;

        el.addEventListener('click', () => {
            playStation(station.url, station.name, el);
        });

        list.appendChild(el);
    });

    /* =========================
       SCROLL
    ========================= */

    up.addEventListener('click', () => {
        list.scrollBy({ top: -300, behavior: 'smooth' });
    });

    down.addEventListener('click', () => {
        list.scrollBy({ top: 300, behavior: 'smooth' });
    });

    /* =========================
       STOP RADIO
    ========================= */

    function stopPlayback() {

        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }

        if (nowPlaying) nowPlaying.innerText = 'Radio OFF';
        if (error) error.innerText = '';

        document.querySelectorAll('.radio-station')
            .forEach(s => s.classList.remove('active'));
    }

    stopBtn.addEventListener('click', stopPlayback);

    /* =========================
       PLAY STATION
    ========================= */

    function playStation(url, name, el) {

        stopPlayback();

        if (nowPlaying) {
            nowPlaying.innerText = `Connecting to ${name}...`;
        }

        if (error) error.innerText = '';

        try {
            currentAudio = new Audio(url);

            currentAudio.play()
                .then(() => {

                    if (nowPlaying) {
                        nowPlaying.innerText = `▶ Now playing: ${name}`;
                    }

                    document.querySelectorAll('.radio-station')
                        .forEach(s => s.classList.remove('active'));

                    el.classList.add('active');
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

    /* =========================
       CLEANUP
    ========================= */

    return () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }
    };
}