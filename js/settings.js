// js/settings.js

// DOM Elements
const saveBtn = document.getElementById('saveBtn');
const backBtn = document.getElementById('backBtn');
const busRouteIds = document.getElementById('busRouteIds');
const busStopIds = document.getElementById('busStopIds');
const defaultVolume = document.getElementById('defaultVolume');
const volumeValue = document.getElementById('volumeValue');

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('pleie_settings');
  if (saved) {
    const settings = JSON.parse(saved);
    
    // Load Bus settings
    if (settings.bus) {
      if (busRouteIds) busRouteIds.value = settings.bus.routeIds || '';
      if (busStopIds) busStopIds.value = settings.bus.stopIds || '';
    }
    
    // Load Music settings
    if (settings.music && defaultVolume) {
      defaultVolume.value = settings.music.volume || 70;
      if (volumeValue) volumeValue.textContent = settings.music.volume || 70 + '%';
    }
  }
}

// In settings.js save function
function saveSettings() {
  // Get all toggle states
  var toggles = document.querySelectorAll('.enable-toggle');
  var enabledModules = {};
  
  toggles.forEach(function(toggle) {
    var moduleId = toggle.getAttribute('data-module');
    if (moduleId) {
      enabledModules[moduleId] = toggle.classList.contains('active');
    }
  });
  
  var settings = {
    enabledModules: enabledModules,
    bus: {
      routeIds: document.getElementById('busRouteIds')?.value || '',
      stopIds: document.getElementById('busStopIds')?.value || ''
    },
    savedAt: Date.now()
  };
  
  localStorage.setItem('pleie_settings', JSON.stringify(settings));
  alert('Settings saved!');
}

// Volume slider handler
function setupVolumeSlider() {
  if (defaultVolume && volumeValue) {
    defaultVolume.addEventListener('input', () => {
      volumeValue.textContent = defaultVolume.value + '%';
    });
  }
}

// Expand/collapse sections
function setupExpandCollapse() {
  const headers = document.querySelectorAll('.module-header');
  headers.forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.enable-toggle')) return;
      const config = header.nextElementSibling;
      config.classList.toggle('active');
      const icon = header.querySelector('.fa-chevron-down, .fa-chevron-up');
      if (icon) {
        if (config.classList.contains('active')) {
          icon.className = 'fa-solid fa-chevron-up';
        } else {
          icon.className = 'fa-solid fa-chevron-down';
        }
      }
    });
  });
}

// Toggle switches
function setupToggles() {
  const toggles = document.querySelectorAll('.enable-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle.classList.toggle('active');
    });
  });
}

// RSS Feeds
function setupRssFeeds() {
  const feeds = [
    { name: 'RTÉ News', url: 'https://www.rte.ie/feeds/rss/?index=/news/' },
    { name: 'Munster Express', url: 'https://www.munster-express.ie/feed/' },
    { name: 'The Journal', url: 'https://www.thejournal.ie/feed/' },
    { name: 'Irish Examiner', url: 'https://www.irishexaminer.com/feed/35-top_news.xml' }
  ];
  
  const container = document.getElementById('rssFeedList');
  if (container) {
    feeds.forEach((feed, i) => {
      const div = document.createElement('div');
      div.className = 'feed-item';
      if (i === 0) div.classList.add('selected');
      div.innerHTML = `
        <input type="radio" name="rssFeed" class="feed-radio" ${i === 0 ? 'checked' : ''}>
        <span class="feed-name">${feed.name}</span>
        <span class="feed-domain">${feed.url.split('/')[2]}</span>
      `;
      div.onclick = () => {
        document.querySelectorAll('.feed-item').forEach(item => item.classList.remove('selected'));
        div.classList.add('selected');
        const radio = div.querySelector('.feed-radio');
        if (radio) radio.checked = true;
      };
      container.appendChild(div);
    });
  }
}

// Initialize
function init() {
  loadSettings();
  setupVolumeSlider();
  setupExpandCollapse();
  setupToggles();
  setupRssFeeds();
  
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'index.html');
}

// Start
init();