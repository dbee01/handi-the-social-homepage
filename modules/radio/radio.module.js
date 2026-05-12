export default async function initRadio(container) {
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

    const stations = [
        { name: 'RTÉ 2FM', url: 'https://www.rte.ie/radio2fm/' },
        { name: 'RTÉ Radio 1', url: 'https://www.rte.ie/radio1/' },
        { name: 'Today FM', url: 'https://www.todayfm.com/player' },
        { name: 'Newstalk', url: 'https://www.newstalk.com/player' }
    ];

    content.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            ${stations.map(s => `
                <div class="radio-station" data-url="${s.url}" style="background:#0f0f0f; border:1px solid #333; border-radius:8px; padding:12px; cursor:pointer; transition:0.2s;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i class="fa-solid fa-play" style="color:#00ff41;"></i>
                        <span style="color:#00ffff;">${s.name}</span>
                    </div>
                </div>
            `).join('')}
            <div id="radio-player" style="margin-top:10px;"></div>
        </div>
    `;

    content.querySelectorAll('.radio-station').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            const playerDiv = document.getElementById('radio-player');
            // Open in new tab (simple solution to avoid CORS/embedding issues)
            window.open(url, '_blank');
            playerDiv.innerHTML = `<div style="color:#00ff41; text-align:center;">▶️ Playing ${btn.innerText.trim()} in new tab</div>`;
        });
    });
}