// modules/friendly-phone/friendly-phone.module.js

export default async function initFriendlyPhone(container) {
  if (!container) {
    console.error("Friendly Phone Module: Container not found");
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
  panelTitle.innerHTML = '<i class="fa-solid fa-phone-volume"></i> Friendly Phone';
  container.appendChild(panelTitle);

  // Create friendly phone container
  const phoneContainer = document.createElement('div');
  phoneContainer.className = 'friendly-phone-container';
  phoneContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 15px;
    max-height: 550px;
    overflow-y: auto;
  `;

  // Contacts section (read-only from Settings)
  const contactsSection = document.createElement('div');
  contactsSection.className = 'contacts-section';
  contactsSection.style.cssText = `
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 15px;
  `;

  contactsSection.innerHTML = `
    <h3 style="color: var(--term-cyan); margin-bottom: 15px; font-size: 1rem;">
      <i class="fa-solid fa-address-card"></i> My Loved Ones
    </h3>
    <div id="contacts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px;">
      <div style="text-align: center; color: var(--term-dim); padding: 20px; grid-column: 1/-1;">
        <i class="fa-solid fa-user-plus fa-2x"></i>
        <p style="margin-top: 10px;">No contacts added yet</p>
        <p style="font-size: 0.8rem; margin-top: 5px;">
          <i class="fa-solid fa-gear"></i> Add contacts in Settings (gear icon)
        </p>
      </div>
    </div>
  `;
  phoneContainer.appendChild(contactsSection);

  // Info message about Settings
  const settingsInfo = document.createElement('div');
  settingsInfo.className = 'settings-info';
  settingsInfo.style.cssText = `
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 12px;
    text-align: center;
    color: var(--term-dim);
    font-size: 0.8rem;
  `;
  settingsInfo.innerHTML = `
    <i class="fa-solid fa-info-circle"></i> 
    Manage your contacts in the <strong>Settings</strong> menu (gear icon bottom-right)
  `;
  phoneContainer.appendChild(settingsInfo);

  // Calling status
  const callStatus = document.createElement('div');
  callStatus.className = 'call-status';
  callStatus.style.cssText = `
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 10px;
    text-align: center;
    font-size: 0.85rem;
    color: var(--term-dim);
    display: none;
  `;
  phoneContainer.appendChild(callStatus);

  container.appendChild(phoneContainer);

  // State - load contacts from Settings
  let contacts = [];

  // Load contacts from Settings (global storage)
  function loadContacts() {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.friendlyPhone && settings.friendlyPhone.contacts) {
        contacts = settings.friendlyPhone.contacts;
      } else {
        contacts = [];
      }
      renderContacts();
    } else {
      renderContacts();
    }
  }

  // Render contacts grid (read-only)
  function renderContacts() {
    const grid = document.getElementById('contacts-grid');
    if (!grid) return;

    if (contacts.length === 0) {
      grid.innerHTML = `
        <div style="text-align: center; color: var(--term-dim); padding: 20px; grid-column: 1/-1;">
          <i class="fa-solid fa-user-plus fa-2x"></i>
          <p style="margin-top: 10px;">No contacts added yet</p>
          <p style="font-size: 0.8rem; margin-top: 5px;">
            <i class="fa-solid fa-gear"></i> Add contacts in Settings (gear icon)
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = contacts.map((contact, index) => `
      <div class="contact-card" data-index="${index}" style="
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid var(--panel-border);
        border-radius: var(--radius);
        padding: 15px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto 10px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid var(--term-green);
          background: #000;
        ">
          ${contact.photo ? 
            `<img src="${contact.photo}" alt="${escapeHtml(contact.name)}" style="width: 100%; height: 100%; object-fit: cover;">` :
            `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a1a, #0a0a0a);">
              <i class="fa-solid fa-user" style="font-size: 2rem; color: var(--term-dim);"></i>
             </div>`
          }
        </div>
        <div style="font-weight: bold; color: var(--term-cyan); margin-bottom: 5px;">${escapeHtml(contact.name)}</div>
        <div style="font-size: 0.7rem; color: var(--term-dim);">${formatPhoneNumber(contact.number || contact.phone)}</div>
      </div>
    `).join('');

    // Add click handlers for calling
    document.querySelectorAll('.contact-card').forEach(card => {
      const index = parseInt(card.dataset.index);
      card.addEventListener('click', () => makeCall(index));
    });
  }

  // Format phone number for display
  function formatPhoneNumber(phone) {
    if (!phone) return 'No number';
    if (phone.length > 10) {
      return phone.slice(0, 4) + '...' + phone.slice(-4);
    }
    return phone;
  }

  // Make a call
  function makeCall(index) {
    const contact = contacts[index];
    if (!contact) return;

    const phoneNumber = contact.number || contact.phone;
    if (!phoneNumber) {
      showStatus(`No phone number for ${contact.name}`, 'error');
      return;
    }

    const statusDiv = document.querySelector('.call-status');
    if (!statusDiv) return;

    // Check if telephony is supported
    if (!navigator.userAgent.match(/(iPhone|iPad|Android)/i)) {
      statusDiv.style.display = 'block';
      statusDiv.innerHTML = `
        <i class="fa-solid fa-exclamation-triangle" style="color: var(--term-red);"></i>
        Calling only works on mobile devices or with tel: protocol support.
        <br><small>Number: ${phoneNumber}</small>
      `;
      statusDiv.style.color = 'var(--term-red)';
      
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
      return;
    }

    // Show calling status
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `
      <i class="fa-solid fa-phone" style="color: var(--term-green); animation: pulse 1s infinite;"></i>
      Calling ${contact.name} (${phoneNumber})...
      <br><small>Click allow if prompted</small>
    `;
    statusDiv.style.color = 'var(--term-green)';

    // Attempt to make the call
    try {
      window.location.href = `tel:${phoneNumber}`;
      
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    } catch (error) {
      statusDiv.innerHTML = `
        <i class="fa-solid fa-exclamation-triangle" style="color: var(--term-red);"></i>
        Unable to make call. Please check the phone number.
      `;
      statusDiv.style.color = 'var(--term-red)';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  }

  // Show status message
  function showStatus(message, type = 'info') {
    const statusDiv = document.querySelector('.call-status');
    if (!statusDiv) return;
    
    const colors = {
      info: 'var(--term-dim)',
      success: 'var(--term-green)',
      error: 'var(--term-red)'
    };
    
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `<i class="fa-solid fa-info-circle"></i> ${message}`;
    statusDiv.style.color = colors[type] || colors.info;
    
    setTimeout(() => {
      if (statusDiv.innerHTML === `<i class="fa-solid fa-info-circle"></i> ${message}`) {
        statusDiv.style.display = 'none';
      }
    }, 2000);
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // Listen for settings changes
  window.addEventListener('settingsChanged', () => {
    loadContacts();
  });

  // Load contacts on init
  loadContacts();

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    .contact-card:hover {
      transform: translateY(-5px);
      border-color: var(--term-green) !important;
      box-shadow: 0 5px 20px rgba(0, 255, 65, 0.2);
    }
    
    .contact-card:active {
      transform: translateY(0);
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }
    
    .fa-phone {
      animation: pulse 1s infinite;
    }
  `;
  document.head.appendChild(style);
}
