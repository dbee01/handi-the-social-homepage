// Settings Management - Controls which modules are visible
(function() {
  console.log('⚙️ Initializing Settings...');

  // DEFAULT: Only these 5 modules are enabled (visible)
  // All others start hidden
  let enabledModules = {
    gallery: true,      // Visible by default
    bus: true,          // Visible by default  
    'local-player': true, // Visible by default
    emergency: true,    // Visible by default
    'friendly-phone': true, // Visible by default
    news: false,        // Hidden by default
    mastodon: false,    // Hidden by default
    radio: false        // Hidden by default
  };

  // Contacts storage
  window.emergencyContacts = [];
  window.phoneContacts = [];

  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 80px; right: 20px;
      background: ${isError ? '#ff4444' : '#00ff41'};
      color: ${isError ? '#fff' : '#000'};
      padding: 12px 20px; border-radius: 8px; z-index: 100001;
      font-family: monospace;
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Show/hide modules based on enabledModules
  function updateModuleVisibility() {
    Object.keys(enabledModules).forEach(moduleId => {
      const element = document.getElementById(moduleId);
      if (element) {
        if (enabledModules[moduleId]) {
          element.classList.add('visible');
          element.style.display = 'block';
        } else {
          element.classList.remove('visible');
          element.style.display = 'none';
        }
      }
    });
    
    // Refresh Packery layout
    if (window.pckry) {
      setTimeout(() => {
        window.pckry.reloadItems();
        window.pckry.layout();
      }, 100);
    }
    
    console.log('Module visibility updated:', enabledModules);
  }

  // Render emergency contacts
  function renderEmergencyContacts() {
    const container = document.getElementById('emergencyContactsList');
    if (!container) return;
    if (window.emergencyContacts.length === 0) {
      container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No contacts saved</div>';
      return;
    }
    container.innerHTML = window.emergencyContacts.map((c, i) => `
      <div class="contact-item">
        <div class="contact-photo">${c.photo ? `<img src="${c.photo}">` : '<i class="fa-solid fa-user"></i>'}</div>
        <div class="contact-info">
          <strong>${escapeHtml(c.name)}</strong>
          <small>${escapeHtml(c.number)}</small>
          ${c.relation ? `<small style="color:#00ff41;">${escapeHtml(c.relation)}</small>` : ''}
        </div>
        <div class="contact-actions"><button onclick="window.removeEmergencyContact(${i})"><i class="fa-solid fa-trash"></i></button></div>
      </div>
    `).join('');
  }

  // Render phone contacts
  function renderPhoneContacts() {
    const container = document.getElementById('phoneContactsList');
    if (!container) return;
    if (window.phoneContacts.length === 0) {
      container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No contacts saved</div>';
      return;
    }
    container.innerHTML = window.phoneContacts.map((c, i) => `
      <div class="contact-item">
        <div class="contact-photo">${c.photo ? `<img src="${c.photo}">` : '<i class="fa-solid fa-user"></i>'}</div>
        <div class="contact-info"><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.number)}</small></div>
        <div class="contact-actions"><button onclick="window.removePhoneContact(${i})"><i class="fa-solid fa-trash"></i></button></div>
      </div>
    `).join('');
  }

  window.removeEmergencyContact = (i) => {
    if (confirm('Remove this contact?')) {
      window.emergencyContacts.splice(i, 1);
      renderEmergencyContacts();
      showToast('Contact removed');
    }
  };

  window.removePhoneContact = (i) => {
    if (confirm('Remove this contact?')) {
      window.phoneContacts.splice(i, 1);
      renderPhoneContacts();
      showToast('Contact removed');
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  // Load settings from localStorage
  function loadSettings() {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.enabledModules) {
        enabledModules = { ...enabledModules, ...data.enabledModules };
      }
      
      // Update toggle switches UI
      Object.keys(enabledModules).forEach(moduleId => {
        const toggle = document.querySelector(`.enable-toggle[data-module="${moduleId}"]`);
        if (toggle) {
          if (enabledModules[moduleId]) {
            toggle.classList.add('active');
          } else {
            toggle.classList.remove('active');
          }
        }
      });
      
      // Apply visibility
      updateModuleVisibility();
      
      // Load gallery settings
      if (data.gallery) {
        const folderInput = document.getElementById('galleryFolderPath');
        if (folderInput) folderInput.value = data.gallery.folderPath || '';
        const speedInput = document.getElementById('gallerySpeed');
        if (speedInput) speedInput.value = data.gallery.speed || 3000;
        const autoStart = document.getElementById('galleryAutoStart');
        if (autoStart) autoStart.value = data.gallery.autoStart ? 'true' : 'false';
      }
      
      // Load bus settings
      if (data.bus) {
        const routeInput = document.getElementById('busRouteIds');
        if (routeInput) routeInput.value = data.bus.routeIds || '';
        const stopInput = document.getElementById('busStopId');
        if (stopInput) stopInput.value = data.bus.stopId || '';
        const intervalInput = document.getElementById('busRefreshInterval');
        if (intervalInput) intervalInput.value = data.bus.refreshInterval || 60;
      }
      
      // Load music player settings
      if (data.musicPlayer) {
        const folderInput = document.getElementById('musicFolderPath');
        if (folderInput) folderInput.value = data.musicPlayer.musicFolder || '';
        const volumeInput = document.getElementById('defaultVolume');
        if (volumeInput) volumeInput.value = data.musicPlayer.defaultVolume || 100;
        const volumeSpan = document.getElementById('volumeValue');
        if (volumeSpan) volumeSpan.textContent = (data.musicPlayer.defaultVolume || 100) + '%';
        const shuffleSelect = document.getElementById('defaultShuffle');
        if (shuffleSelect) shuffleSelect.value = data.musicPlayer.defaultShuffle ? 'true' : 'false';
      }
      
      // Load emergency settings
      if (data.emergency) {
        window.emergencyContacts = data.emergency.contacts || [];
        const intervalInput = document.getElementById('emergencyInterval');
        if (intervalInput) intervalInput.value = data.emergency.interval || 5;
        renderEmergencyContacts();
      }
      
      // Load friendly phone settings
      if (data.friendlyPhone) {
        window.phoneContacts = data.friendlyPhone.contacts || [];
        const delayInput = document.getElementById('autoDialDelay');
        if (delayInput) delayInput.value = data.friendlyPhone.autoDialDelay || 10;
        renderPhoneContacts();
      }
    } else {
      // First time - set defaults and save
      saveSettings();
      updateModuleVisibility();
    }
  }

// In settings.js - make sure your saveSettings function looks like this:

function saveSettings() {
  const settings = {
    enabledModules: enabledModules,
    gallery: {
      folderPath: document.getElementById('galleryFolderPath')?.value || '',
      speed: parseInt(document.getElementById('gallerySpeed')?.value) || 3000,
      autoStart: document.getElementById('galleryAutoStart')?.value === 'true'
    },
    bus: {
      routeIds: document.getElementById('busRouteIds')?.value || '',
      stopId: document.getElementById('busStopId')?.value || '',
      refreshInterval: parseInt(document.getElementById('busRefreshInterval')?.value) || 60
    },
    musicPlayer: {
      musicFolder: document.getElementById('musicFolderPath')?.value || '',
      defaultVolume: parseInt(document.getElementById('defaultVolume')?.value) || 100,
      defaultShuffle: document.getElementById('defaultShuffle')?.value === 'true',
      musicFiles: window.musicFiles || []  // Make sure music files are saved
    },
    emergency: {
      contacts: window.emergencyContacts,
      interval: parseInt(document.getElementById('emergencyInterval')?.value) || 5
    },
    friendlyPhone: {
      contacts: window.phoneContacts,
      autoDialDelay: parseInt(document.getElementById('autoDialDelay')?.value) || 10
    }
  };
  
  localStorage.setItem('pleie_settings', JSON.stringify(settings));
  
  // DISPATCH THE EVENT - THIS IS KEY
  if (typeof window.dispatchEvent === 'function') {
    const event = new CustomEvent('settingsChanged', { detail: settings });
    window.dispatchEvent(event);
    console.log('✅ settingsChanged event dispatched');
  }
  
  showToast('✅ Settings saved!');
  closeModal();
}

  // Modal controls
  function openModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.add('active');
      loadSettings(); // Refresh data when opening
    }
  }
  
  function closeModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('active');
  }

  // Build the Settings Modal HTML
  function buildModal() {
    const modalHTML = `
      <div id="settingsModal" class="settings-modal">
        <div class="settings-modal-content">
          <div class="settings-header">
            <h2><i class="fa-solid fa-sliders-h"></i> Module Settings</h2>
            <button class="close-settings" id="closeSettingsBtn">&times;</button>
          </div>
          
          <!-- Gallery Module -->
          <div class="module-section">
            <div class="module-header">
              <div class="enable-toggle" data-module="gallery"><div class="toggle-slider"></div></div>
              <h3><i class="fa-solid fa-images"></i> Gallery Module</h3>
              <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="module-config">
              <div class="config-field">
                <label><i class="fa-solid fa-folder"></i> Image Folder</label>
                <input type="text" id="galleryFolderPath" readonly placeholder="No folder selected">
                <button class="select-folder-btn" id="selectGalleryFolderBtn"><i class="fa-solid fa-folder-open"></i> Select Folder</button>
              </div>
              <div class="config-field">
                <label><i class="fa-solid fa-clock"></i> Slideshow Speed (ms):</label>
                <input type="number" id="gallerySpeed" min="500" max="10000" step="100" value="3000">
              </div>
              <div class="config-field">
                <label><i class="fa-solid fa-check-circle"></i> Auto-start Slideshow:</label>
                <select id="galleryAutoStart"><option value="true">Yes</option><option value="false">No</option></select>
              </div>
            </div>
          </div>
          
          <!-- Bus Module -->
          <div class="module-section">
            <div class="module-header">
              <div class="enable-toggle" data-module="bus"><div class="toggle-slider"></div></div>
              <h3><i class="fa-solid fa-bus"></i> Bus Module</h3>
              <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="module-config">
              <div class="config-field">
                <label><i class="fa-solid fa-route"></i> Route IDs (comma-separated):</label>
                <input type="text" id="busRouteIds" placeholder="e.g., 15, 16, 40">
              </div>
              <div class="config-field">
                <label><i class="fa-solid fa-map-marker-alt"></i> Stop ID:</label>
                <input type="text" id="busStopId" placeholder="e.g., 12345">
              </div>
              <div class="config-field">
                <label><i class="fa-solid fa-clock"></i> Refresh Interval (seconds):</label>
                <input type="number" id="busRefreshInterval" min="30" max="300" value="60">
              </div>
            </div>
          </div>
          
          <!-- Music Player Module -->
          <div class="module-section">
            <div class="module-header">
              <div class="enable-toggle" data-module="local-player"><div class="toggle-slider"></div></div>
              <h3><i class="fa-solid fa-music"></i> Music Player</h3>
              <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="module-config">
              <div class="config-field">
                <label><i class="fa-solid fa-folder"></i> Music Folder</label>
                <input type="text" id="musicFolderPath" readonly placeholder="No folder selected">
                <button class="select-folder-btn" id="selectMusicFolderBtn"><i class="fa-solid fa-folder-open"></i> Select Folder</button>
              </div>
              <div class="config-field">
                <label><i class="fa-solid fa-volume-up"></i> Default Volume (%):</label>
                <input type="range" id="defaultVolume" min="0" max="200" value="100">
                <span id="volumeValue" style="color:#00ff41;">100%</span>
              </div>
              <div class="config-field">
                <label><i class="fa-solid fa-shuffle"></i> Default Shuffle:</label>
                <select id="defaultShuffle"><option value="false">Off</option><option value="true">On</option></select>
              </div>
            </div>
          </div>
          
          <!-- Emergency Module -->
          <div class="module-section">
            <div class="module-header">
              <div class="enable-toggle" data-module="emergency"><div class="toggle-slider"></div></div>
              <h3><i class="fa-solid fa-triangle-exclamation"></i> Emergency Module</h3>
              <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="module-config">
              <div class="config-field">
                <label><i class="fa-solid fa-phone"></i> Emergency Contacts</label>
                <div id="emergencyContactsList" class="contact-list"></div>
                <button class="add-contact-btn" id="addEmergencyContactBtn"><i class="fa-solid fa-plus"></i> Add Emergency Contact</button>
              </div>
              <div class="config-field">
                <label><i class="fa-solid fa-clock"></i> Check Interval (minutes):</label>
                <input type="number" id="emergencyInterval" min="1" max="60" value="5">
              </div>
            </div>
          </div>
          
          <!-- Friendly Phone Module -->
          <div class="module-section">
            <div class="module-header">
              <div class="enable-toggle" data-module="friendly-phone"><div class="toggle-slider"></div></div>
              <h3><i class="fa-solid fa-phone"></i> Friendly Phone</h3>
              <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="module-config">
              <div class="config-field">
                <label><i class="fa-solid fa-address-book"></i> Phone Contacts</label>
                <div id="phoneContactsList" class="contact-list"></div>
                <button class="add-contact-btn" id="addPhoneContactBtn"><i class="fa-solid fa-plus"></i> Add Contact</button>
              </div>
              <div class="config-field">
                <label><i class="fa-solid fa-clock"></i> Auto-dial Warning (seconds):</label>
                <input type="number" id="autoDialDelay" min="5" max="30" value="10">
              </div>
            </div>
          </div>
          
          <button class="save-settings" id="saveSettingsBtn"><i class="fa-solid fa-save"></i> Save All Settings</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Initialize everything
  buildModal();
  loadSettings();

  // Event Listeners
  const settingsIcon = document.getElementById('settingsIcon');
  if (settingsIcon) settingsIcon.onclick = openModal;
  
  const closeBtn = document.getElementById('closeSettingsBtn');
  if (closeBtn) closeBtn.onclick = closeModal;
  
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) saveBtn.onclick = saveSettings;
  
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  }

  // Expand/collapse sections
  document.querySelectorAll('.module-header').forEach(header => {
    header.onclick = (e) => {
      if (e.target.closest('.enable-toggle')) return;
      const config = header.nextElementSibling;
      const icon = header.querySelector('.fa-chevron-down, .fa-chevron-up');
      config.classList.toggle('active');
      if (icon) {
        icon.className = config.classList.contains('active') ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
      }
    };
  });

  // Toggle switches
  document.querySelectorAll('.enable-toggle').forEach(toggle => {
    toggle.onclick = (e) => {
      e.stopPropagation();
      const moduleId = toggle.getAttribute('data-module');
      if (moduleId) {
        enabledModules[moduleId] = !enabledModules[moduleId];
        if (enabledModules[moduleId]) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
        updateModuleVisibility();
      }
    };
  });

  // Volume slider display
  const volSlider = document.getElementById('defaultVolume');
  const volSpan = document.getElementById('volumeValue');
  if (volSlider && volSpan) {
    volSlider.oninput = () => { volSpan.textContent = volSlider.value + '%'; };
  }

  // Folder selection
  async function selectFolder(inputElement) {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker();
        inputElement.value = dirHandle.name;
        showToast(`✅ Selected: ${dirHandle.name}`);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.directory = true;
        await new Promise((resolve) => {
          input.onchange = () => {
            if (input.files.length > 0) {
              const path = input.files[0].webkitRelativePath.split('/')[0];
              inputElement.value = path;
              showToast(`✅ Selected: ${path}`);
            }
            resolve();
          };
          input.click();
        });
      }
    } catch (err) {
      showToast('Folder selection cancelled', true);
    }
  }

  const galleryFolderBtn = document.getElementById('selectGalleryFolderBtn');
  if (galleryFolderBtn) {
    galleryFolderBtn.onclick = () => selectFolder(document.getElementById('galleryFolderPath'));
  }
  
  const musicFolderBtn = document.getElementById('selectMusicFolderBtn');
  if (musicFolderBtn) {
    musicFolderBtn.onclick = () => selectFolder(document.getElementById('musicFolderPath'));
  }

  // Add contact modals
  let currentContactType = null;
  let currentPhotoData = null;

  function buildContactModal() {
    const contactModalHTML = `
      <div id="addContactModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:200000;justify-content:center;align-items:center;">
        <div style="background:#1a1a2e;border:2px solid #00ff41;border-radius:12px;padding:25px;max-width:400px;width:90%;">
          <h3 style="color:#00ff41;margin-top:0;" id="contactModalTitle">Add Contact</h3>
          <div class="config-field">
            <label>Name (e.g., Mom, Dad, Sarah)</label>
            <input type="text" id="contactName" placeholder="Enter contact name">
          </div>
          <div class="config-field">
            <label>Phone Number (e.g., +353861234567)</label>
            <input type="tel" id="contactNumber" placeholder="+353861234567">
          </div>
          <div class="config-field">
            <label>Choose Photo</label>
            <div class="photo-preview" id="photoPreview"><i class="fa-solid fa-camera"></i></div>
            <input type="file" id="contactPhotoInput" accept="image/*" style="display:none;">
            <small style="color:#888;">Click camera to add photo</small>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button id="cancelContactBtn" style="flex:1;background:#444;color:#fff;border:none;padding:10px;border-radius:6px;">Cancel</button>
            <button id="saveContactBtn" style="flex:1;background:#00ff41;color:#000;border:none;padding:10px;border-radius:6px;font-weight:bold;">Save</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', contactModalHTML);
  }
  buildContactModal();

  function showContactModal(type) {
    currentContactType = type;
    currentPhotoData = null;
    document.getElementById('contactName').value = '';
    document.getElementById('contactNumber').value = '';
    document.getElementById('photoPreview').innerHTML = '<i class="fa-solid fa-camera"></i>';
    document.getElementById('addContactModal').style.display = 'flex';
    document.getElementById('contactModalTitle').textContent = type === 'emergency' ? 'Add Emergency Contact' : 'Add Contact';
  }

  function saveContact() {
    const name = document.getElementById('contactName').value.trim();
    const number = document.getElementById('contactNumber').value.trim();
    if (!name || !number) {
      showToast('Please fill all fields', true);
      return;
    }
    const contact = { name, number, photo: currentPhotoData };
    if (currentContactType === 'emergency') {
      const relation = prompt('Enter relation (Family, Doctor, etc.):');
      if (relation) contact.relation = relation;
      window.emergencyContacts.push(contact);
      renderEmergencyContacts();
      showToast(`✅ Added ${name} to emergency contacts`);
    } else {
      window.phoneContacts.push(contact);
      renderPhoneContacts();
      showToast(`✅ Added ${name} to contacts`);
    }
    document.getElementById('addContactModal').style.display = 'none';
  }

  const addEmergencyBtn = document.getElementById('addEmergencyContactBtn');
  if (addEmergencyBtn) addEmergencyBtn.onclick = () => showContactModal('emergency');
  
  const addPhoneBtn = document.getElementById('addPhoneContactBtn');
  if (addPhoneBtn) addPhoneBtn.onclick = () => showContactModal('phone');
  
  const saveContactBtn = document.getElementById('saveContactBtn');
  if (saveContactBtn) saveContactBtn.onclick = saveContact;
  
  const cancelContactBtn = document.getElementById('cancelContactBtn');
  if (cancelContactBtn) cancelContactBtn.onclick = () => document.getElementById('addContactModal').style.display = 'none';
  
  const photoInput = document.getElementById('contactPhotoInput');
  if (photoInput) {
    photoInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          currentPhotoData = event.target.result;
          document.getElementById('photoPreview').innerHTML = `<img src="${currentPhotoData}">`;
        };
        reader.readAsDataURL(file);
      }
    };
  }

  console.log('✅ Settings ready - Modules visible: Gallery, Bus, Music Player, Emergency, Friendly Phone');
  console.log('💡 Click the gear icon to configure modules');
})();

