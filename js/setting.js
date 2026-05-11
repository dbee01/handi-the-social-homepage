// Settings Management
(function() {
  console.log('⚙️ Loading settings...');

  // Default enabled modules (only these 5 show by default)
  let moduleStates = {
    gallery: true,
    bus: true,
    'local-player': true,
    emergency: true,
    'friendly-phone': true,
    news: false,
    mastodon: false,
    radio: false
  };

  // Contacts storage
  window.emergencyContacts = [];
  window.phoneContacts = [];

  // Show toast
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

  // Update module visibility
  function updateModuleVisibility() {
    Object.keys(moduleStates).forEach(moduleId => {
      const el = document.getElementById(moduleId);
      if (el) {
        if (moduleStates[moduleId]) {
          el.classList.remove('hidden-module');
        } else {
          el.classList.add('hidden-module');
        }
      }
    });
    if (window.pckry) {
      setTimeout(() => {
        window.pckry.reloadItems();
        window.pckry.layout();
      }, 100);
    }
  }

  // Render contacts
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

  // Load settings
  function loadSettings() {
    const saved = localStorage.getItem('moduleSettings');
    if (saved) {
      const s = JSON.parse(saved);
      if (s.moduleStates) moduleStates = { ...moduleStates, ...s.moduleStates };
      
      // Update toggles
      Object.keys(moduleStates).forEach(id => {
        const toggle = document.querySelector(`.enable-toggle[data-module="${id}"]`);
        if (toggle) {
          if (moduleStates[id]) toggle.classList.add('active');
          else toggle.classList.remove('active');
        }
      });
      updateModuleVisibility();

      // Load all settings
      if (s.gallery) {
        document.getElementById('galleryFolderPath').value = s.gallery.folderPath || '';
        document.getElementById('gallerySpeed').value = s.gallery.speed || 3000;
        document.getElementById('galleryAutoStart').value = s.gallery.autoStart ? 'true' : 'false';
      }
      if (s.bus) {
        document.getElementById('busRouteIds').value = s.bus.routeIds || '';
        document.getElementById('busStopId').value = s.bus.stopId || '';
        document.getElementById('busRefreshInterval').value = s.bus.refreshInterval || 60;
      }
      if (s.musicPlayer) {
        document.getElementById('musicFolderPath').value = s.musicPlayer.musicFolder || '';
        document.getElementById('defaultVolume').value = s.musicPlayer.defaultVolume || 100;
        document.getElementById('defaultShuffle').value = s.musicPlayer.defaultShuffle ? 'true' : 'false';
        document.getElementById('volumeValue').textContent = (s.musicPlayer.defaultVolume || 100) + '%';
      }
      if (s.emergency) {
        window.emergencyContacts = s.emergency.contacts || [];
        document.getElementById('emergencyInterval').value = s.emergency.interval || 5;
        renderEmergencyContacts();
      }
      if (s.friendlyPhone) {
        window.phoneContacts = s.friendlyPhone.contacts || [];
        document.getElementById('autoDialDelay').value = s.friendlyPhone.autoDialDelay || 10;
        renderPhoneContacts();
      }
    }
  }

  // Save settings
  function saveSettings() {
    const settings = {
      moduleStates: moduleStates,
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
        defaultShuffle: document.getElementById('defaultShuffle')?.value === 'true'
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
    localStorage.setItem('moduleSettings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settingsChanged'));
    showToast('Settings saved!');
    closeModal();
  }

  // Modal controls
  const modal = document.getElementById('settingsModal');
  function openModal() { if (modal) { modal.classList.add('active'); loadSettings(); } }
  function closeModal() { if (modal) modal.classList.remove('active'); }

  // Build modal HTML
  function buildModal() {
    const modalHTML = `
      <div id="settingsModal" class="settings-modal">
        <div class="settings-modal-content">
          <div class="settings-header"><h2><i class="fa-solid fa-sliders-h"></i> Module Settings</h2><button class="close-settings" id="closeSettings">&times;</button></div>
          
          <div class="module-section"><div class="module-header"><div class="enable-toggle" data-module="gallery"><div class="toggle-slider"></div></div><h3><i class="fa-solid fa-images"></i> Gallery Module</h3><i class="fa-solid fa-chevron-down"></i></div>
          <div class="module-config"><div class="config-field"><label>Select Image Folder</label><input type="text" id="galleryFolderPath" readonly placeholder="No folder selected"><button class="select-folder-btn" id="selectGalleryFolder"><i class="fa-solid fa-folder-open"></i> Select Folder</button></div>
          <div class="config-field"><label>Slideshow Speed (ms):</label><input type="number" id="gallerySpeed" min="500" max="10000" step="100" value="3000"></div>
          <div class="config-field"><label>Auto-start Slideshow:</label><select id="galleryAutoStart"><option value="true">Yes</option><option value="false">No</option></select></div></div></div>
          
          <div class="module-section"><div class="module-header"><div class="enable-toggle" data-module="bus"><div class="toggle-slider"></div></div><h3><i class="fa-solid fa-bus"></i> Bus Module</h3><i class="fa-solid fa-chevron-down"></i></div>
          <div class="module-config"><div class="config-field"><label>Route IDs (comma-separated):</label><input type="text" id="busRouteIds" placeholder="e.g., 15, 16, 40"></div>
          <div class="config-field"><label>Stop ID:</label><input type="text" id="busStopId" placeholder="e.g., 12345"></div>
          <div class="config-field"><label>Refresh Interval (seconds):</label><input type="number" id="busRefreshInterval" min="30" max="300" value="60"></div></div></div>
          
          <div class="module-section"><div class="module-header"><div class="enable-toggle" data-module="local-player"><div class="toggle-slider"></div></div><h3><i class="fa-solid fa-music"></i> Music Player</h3><i class="fa-solid fa-chevron-down"></i></div>
          <div class="module-config"><div class="config-field"><label>Select Music Folder</label><input type="text" id="musicFolderPath" readonly placeholder="No folder selected"><button class="select-folder-btn" id="selectMusicFolder"><i class="fa-solid fa-folder-open"></i> Select Folder</button></div>
          <div class="config-field"><label>Default Volume (%):</label><input type="range" id="defaultVolume" min="0" max="200" value="100"><span id="volumeValue" style="color:#00ff41;">100%</span></div>
          <div class="config-field"><label>Default Shuffle:</label><select id="defaultShuffle"><option value="false">Off</option><option value="true">On</option></select></div></div></div>
          
          <div class="module-section"><div class="module-header"><div class="enable-toggle" data-module="emergency"><div class="toggle-slider"></div></div><h3><i class="fa-solid fa-triangle-exclamation"></i> Emergency Module</h3><i class="fa-solid fa-chevron-down"></i></div>
          <div class="module-config"><div class="config-field"><label>Emergency Contacts</label><div id="emergencyContactsList" class="contact-list"></div><button class="add-contact-btn" id="addEmergencyContact"><i class="fa-solid fa-plus"></i> Add Emergency Contact</button></div>
          <div class="config-field"><label>Check Interval (minutes):</label><input type="number" id="emergencyInterval" min="1" max="60" value="5"></div></div></div>
          
          <div class="module-section"><div class="module-header"><div class="enable-toggle" data-module="friendly-phone"><div class="toggle-slider"></div></div><h3><i class="fa-solid fa-phone"></i> Friendly Phone</h3><i class="fa-solid fa-chevron-down"></i></div>
          <div class="module-config"><div class="config-field"><label>Phone Contacts</label><div id="phoneContactsList" class="contact-list"></div><button class="add-contact-btn" id="addPhoneContact"><i class="fa-solid fa-plus"></i> Add Contact</button></div>
          <div class="config-field"><label>Auto-dial Warning (seconds):</label><input type="number" id="autoDialDelay" min="5" max="30" value="10"></div></div></div>
          
          <button class="save-settings" id="saveSettings"><i class="fa-solid fa-save"></i> Save All Settings</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  buildModal();
  loadSettings();

  // Event listeners
  document.getElementById('settingsIcon')?.addEventListener('click', openModal);
  document.getElementById('closeSettings')?.addEventListener('click', closeModal);
  document.getElementById('saveSettings')?.addEventListener('click', saveSettings);
  document.getElementById('settingsModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

  // Expand/collapse
  document.querySelectorAll('.module-header').forEach(h => {
    h.onclick = (e) => {
      if (e.target.closest('.enable-toggle')) return;
      const cfg = h.nextElementSibling;
      const icon = h.querySelector('.fa-chevron-down, .fa-chevron-up');
      cfg.classList.toggle('active');
      icon.className = cfg.classList.contains('active') ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
    };
  });

  // Toggle switches
  document.querySelectorAll('.enable-toggle').forEach(t => {
    t.onclick = (e) => {
      e.stopPropagation();
      const moduleId = t.dataset.module;
      if (moduleId) {
        moduleStates[moduleId] = !moduleStates[moduleId];
        if (moduleStates[moduleId]) t.classList.add('active');
        else t.classList.remove('active');
        updateModuleVisibility();
      }
    };
  });

  // Volume display
  const vol = document.getElementById('defaultVolume');
  const volVal = document.getElementById('volumeValue');
  if (vol && volVal) vol.oninput = () => volVal.textContent = vol.value + '%';

  // Folder selection
  async function selectFolder(input) {
    const dir = await window.showDirectoryPicker().catch(() => null);
    if (dir) { input.value = dir.name; showToast(`Selected: ${dir.name}`); }
  }
  document.getElementById('selectGalleryFolder')?.addEventListener('click', () => selectFolder(document.getElementById('galleryFolderPath')));
  document.getElementById('selectMusicFolder')?.addEventListener('click', () => selectFolder(document.getElementById('musicFolderPath')));

  // Add contact modal
  let currentContactType = null, currentPhoto = null;
  const contactModal = document.createElement('div');
  contactModal.innerHTML = `
    <div id="addContactModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:200000;justify-content:center;align-items:center;">
      <div style="background:#1a1a2e;border:2px solid #00ff41;border-radius:12px;padding:25px;max-width:400px;width:90%;">
        <h3 style="color:#00ff41;" id="contactModalTitle">Add Contact</h3>
        <div class="config-field"><label>Name (e.g., Mom, Dad, Sarah)</label><input type="text" id="contactName"></div>
        <div class="config-field"><label>Phone Number (e.g., +353861234567)</label><input type="tel" id="contactNumber"></div>
        <div class="config-field"><label>Choose Photo</label><div class="photo-preview" id="photoPreview"><i class="fa-solid fa-camera"></i></div><input type="file" id="contactPhotoInput" accept="image/*" style="display:none;"></div>
        <div style="display:flex;gap:10px;margin-top:20px;"><button id="cancelContactBtn" style="flex:1;background:#444;color:#fff;border:none;padding:10px;border-radius:6px;">Cancel</button><button id="saveContactBtn" style="flex:1;background:#00ff41;color:#000;border:none;padding:10px;border-radius:6px;font-weight:bold;">Save</button></div>
      </div>
    </div>
  `;
  document.body.appendChild(contactModal);

  function showContactModal(type) {
    currentContactType = type;
    currentPhoto = null;
    document.getElementById('contactName').value = '';
    document.getElementById('contactNumber').value = '';
    document.getElementById('photoPreview').innerHTML = '<i class="fa-solid fa-camera"></i>';
    document.getElementById('addContactModal').style.display = 'flex';
    document.getElementById('contactModalTitle').textContent = type === 'emergency' ? 'Add Emergency Contact' : 'Add Contact';
  }

  function saveContact() {
    const name = document.getElementById('contactName').value.trim();
    const number = document.getElementById('contactNumber').value.trim();
    if (!name || !number) { showToast('Please fill all fields', true); return; }
    const contact = { name, number, photo: currentPhoto };
    if (currentContactType === 'emergency') {
      const relation = prompt('Enter relation (Family, Doctor, etc.):');
      if (relation) contact.relation = relation;
      window.emergencyContacts.push(contact);
      renderEmergencyContacts();
    } else {
      window.phoneContacts.push(contact);
      renderPhoneContacts();
    }
    showToast(`Added ${name}`);
    document.getElementById('addContactModal').style.display = 'none';
  }

  document.getElementById('addEmergencyContact')?.addEventListener('click', () => showContactModal('emergency'));
  document.getElementById('addPhoneContact')?.addEventListener('click', () => showContactModal('phone'));
  document.getElementById('saveContactBtn')?.addEventListener('click', saveContact);
  document.getElementById('cancelContactBtn')?.addEventListener('click', () => document.getElementById('addContactModal').style.display = 'none');
  document.getElementById('contactPhotoInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { currentPhoto = ev.target.result; document.getElementById('photoPreview').innerHTML = `<img src="${currentPhoto}">`; };
      reader.readAsDataURL(file);
    }
  });

  console.log('✅ Settings ready - 5 modules enabled by default');
})();
