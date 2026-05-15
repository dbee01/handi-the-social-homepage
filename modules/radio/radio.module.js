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

    // Build UI: top bar with canvas and now‑playing text
    content.innerHTML = `
        <div class="radio-top-bar">
            <canvas id="radio-synth" class="radio-synth" width="400" height="80"></canvas>
            <div class="radio-now-playing" id="now-playing">No station playing</div>
        </div>
        <div class="radio-scroll-wrapper">
            <button id="radio-up" class="radio-scroll-btn">▲</button>
            <div id="stations-list" class="radio-list"></div>
            <button id="radio-down" class="radio-scroll-btn">▼</button>
        </div>
        <div class="radio-error" id="radio-error"></div>
    `;

    const list = content.querySelector('#stations-list');
    const nowPlaying = content.querySelector('#now-playing');
    const error = content.querySelector('#radio-error');
    const up = content.querySelector('#radio-up');
    const down = content.querySelector('#radio-down');
    const synthCanvas = content.querySelector('#radio-synth');

    // Hide synthesiser initially, add margins
    if (synthCanvas) {
        synthCanvas.style.display = 'none';
        synthCanvas.style.marginTop = '1rem';
        synthCanvas.style.marginBottom = '1rem';
    }

    let currentAudio = null;
    let stopVisualiser = null;
    let activeStationItem = null;
    let activeStationName = null;

    /* =========================
       Fake visualiser (CORS‑safe)
    ========================= */
    function startFakeVisualiser(canvas) {
        if (!canvas) return null;
        canvas.style.display = 'block';
        let animationId = null;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.clientWidth;
        const height = canvas.height = canvas.clientHeight;

        let time = 0;
        function draw() {
            animationId = requestAnimationFrame(draw);
            time += 0.05;
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
        return () => cancelAnimationFrame(animationId);
    }

    function stopVisualiserAndClear() {
        if (stopVisualiser) {
            stopVisualiser();
            stopVisualiser = null;
        }
        if (synthCanvas) {
            const ctx = synthCanvas.getContext('2d');
            ctx.clearRect(0, 0, synthCanvas.width, synthCanvas.height);
            ctx.fillStyle = '#1e1e2f';
            ctx.fillRect(0, 0, synthCanvas.width, synthCanvas.height);
            synthCanvas.style.display = 'none';
        }
    }

    /* =========================
       Stop playback and reset UI
    ========================= */
    function stopPlayback(resetIcon = true) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }
        stopVisualiserAndClear();
        nowPlaying.innerText = 'No station playing';
        error.innerText = '';

        if (resetIcon && activeStationItem) {
            const iconSpan = activeStationItem.querySelector('.station-icon');
            if (iconSpan) {
                iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
            }
            activeStationItem.classList.remove('active-station');
            activeStationItem = null;
            activeStationName = null;
        }
    }

    /* =========================
       Play a station
    ========================= */
    function playStation(url, name, stationItem) {
        if (currentAudio && activeStationName === name) return;

        if (currentAudio) {
            stopPlayback(true);
        }

        nowPlaying.innerText = `Connecting to ${name}...`;
        error.innerText = '';

        try {
            currentAudio = new Audio(url);
            currentAudio.play()
                .then(() => {
                    nowPlaying.innerText = `▶ Now playing: ${name}`;
                    document.querySelectorAll('.radio-station').forEach(item => {
                        const iconSpan = item.querySelector('.station-icon');
                        if (item === stationItem) {
                            iconSpan.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                            item.classList.add('active-station');
                        } else {
                            iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
                            item.classList.remove('active-station');
                        }
                    });
                    activeStationItem = stationItem;
                    activeStationName = name;
                    stopVisualiser = startFakeVisualiser(synthCanvas);
                })
                .catch((err) => {
                    console.warn('Play error:', err);
                    error.innerText = 'Cannot play this station';
                    nowPlaying.innerText = 'Playback failed';
                    stopPlayback(true);
                });

            currentAudio.onerror = () => {
                error.innerText = 'Stream unavailable';
                nowPlaying.innerText = 'Stream error';
                stopPlayback(true);
            };
        } catch (err) {
            console.error(err);
            error.innerText = 'Unable to play stream';
            stopPlayback(true);
        }
    }

    function toggleStation(station) {
        const { url, name } = station;
        const stationDiv = station.element;

        if (activeStationItem === stationDiv && currentAudio && !currentAudio.paused) {
            stopPlayback(true);
        } else {
            playStation(url, name, stationDiv);
        }
    }

    /* =========================
       Create station list – NO HEADPHONES ICON
    ========================= */
    stations.forEach((station) => {
        const stationDiv = document.createElement('div');
        stationDiv.className = 'radio-station';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'station-icon';
        iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';

        const nameSpan = document.createElement('span');
        // Removed the headphones icon – just the station name
        nameSpan.textContent = station.name;

        stationDiv.appendChild(iconSpan);
        stationDiv.appendChild(nameSpan);

        stationDiv.stationData = { url: station.url, name: station.name, element: stationDiv };
        stationDiv.addEventListener('click', () => toggleStation(stationDiv.stationData));

        list.appendChild(stationDiv);
    });

    /* =========================
       Scroll buttons
    ========================= */
    up.addEventListener('click', () => list.scrollBy({ top: -300, behavior: 'smooth' }));
    down.addEventListener('click', () => list.scrollBy({ top: 300, behavior: 'smooth' }));

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