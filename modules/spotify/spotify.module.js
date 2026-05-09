// modules/spotify/spotify.module.js

export default async function initSpotify(container) {
  if (!container) {
    console.error("Spotify Module: Container not found");
    return;
  }

  // --- PRESERVE PIN BUTTON ---
  const pinBtn = container.querySelector('.pin-btn');
  container.innerHTML = '';
  if (pinBtn) container.prepend(pinBtn);
  // ---------------------------

  // Add panel title
  const panelTitle = document.createElement('div');
  panelTitle.className = 'panel-title';
  panelTitle.innerHTML = '<i class="fa-brands fa-spotify"></i> Spotify Player';
  container.appendChild(panelTitle);

  // Create Spotify player container
  const spotifyContainer = document.createElement('div');
  spotifyContainer.className = 'spotify-container';
  spotifyContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 15px;
    padding: 10px;
    width: 100%;
  `;

  // Add playlist selection dropdown
  const playlistSelect = document.createElement('select');
  playlistSelect.className = 'spotify-playlist-select';
  playlistSelect.style.cssText = `
    width: 100%;
    padding: 10px;
    background: #000;
    color: var(--term-green);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    font-family: var(--font-retro);
    cursor: pointer;
    margin-bottom: 10px;
  `;

  const playlists = [
    { name: "Today's Top Hits", id: "37i9dQZF1DXcBWIGoYBM5M" },
    { name: "Rock Classics", id: "37i9dQZF1DX0XUfTFmNBRM" },
    { name: "Rap Caviar", id: "37i9dQZF1DX0XUsuxWHRQd" },
    { name: "Peaceful Piano", id: "37i9dQZF1DX4sWSpwq3LiO" },
    { name: "Electronic Sunrise", id: "37i9dQZF1DX6xOPeSOGjv9" },
    { name: "Jazz Vibes", id: "37i9dQZF1DXbITWG1ZJKYt" },
    { name: "Indie Pop", id: "37i9dQZF1DX37bXS7EGI3f" },
    { name: "COUNTRYWISE", id: "37i9dQZF1DX1lVhptIYRda" }
  ];

  playlists.forEach(playlist => {
    const option = document.createElement('option');
    option.value = playlist.id;
    option.textContent = playlist.name;
    playlistSelect.appendChild(option);
  });

  spotifyContainer.appendChild(playlistSelect);

  // Create iframe container
  const iframeWrapper = document.createElement('div');
  iframeWrapper.className = 'spotify-iframe-wrapper';
  iframeWrapper.style.cssText = `
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
  `;

  // Create initial iframe
  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-testid', 'embed-iframe');
  iframe.style.borderRadius = '12px';
  iframe.src = 'https://open.spotify.com/embed/playlist/2fasUuEdDUOeWL4E8A2aIx?utm_source=generator';
  iframe.width = '100%';
  iframe.height = '152';
  iframe.frameBorder = '0';
  iframe.allowFullscreen = true;
  iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  iframe.loading = 'lazy';
  
  iframeWrapper.appendChild(iframe);
  spotifyContainer.appendChild(iframeWrapper);

  // Add now playing info
  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'spotify-now-playing';
  nowPlaying.style.cssText = `
    margin-top: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    width: 100%;
    text-align: center;
    font-size: 0.85rem;
  `;
  nowPlaying.innerHTML = `
    <i class="fa-brands fa-spotify" style="color: #1DB954; margin-right: 8px;"></i>
    <span style="color: var(--term-dim);">Select a playlist to start listening</span>
  `;
  spotifyContainer.appendChild(nowPlaying);

  container.appendChild(spotifyContainer);

  // Handle playlist change
  playlistSelect.addEventListener('change', (e) => {
    const playlistId = e.target.value;
    const selectedPlaylist = playlists.find(p => p.id === playlistId);
    
    // Update iframe src
    iframe.src = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`;
    
    // Update now playing info
    nowPlaying.innerHTML = `
      <i class="fa-brands fa-spotify" style="color: #1DB954; margin-right: 8px;"></i>
      <span style="color: var(--term-cyan);">Now Playing: ${selectedPlaylist.name}</span>
      <br>
      <small style="color: var(--term-dim);">🎵 Enjoy your music</small>
    `;
    
    console.log(`🎵 Playlist changed to: ${selectedPlaylist.name}`);
  });

  // Add hover effect for playlist selector
  playlistSelect.addEventListener('mouseenter', () => {
    playlistSelect.style.borderColor = 'var(--term-green)';
  });
  
  playlistSelect.addEventListener('mouseleave', () => {
    playlistSelect.style.borderColor = 'var(--panel-border)';
  });
}