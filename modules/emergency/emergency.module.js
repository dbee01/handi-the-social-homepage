// modules/emergency/emergency.module.js

export default async function initEmergency(container) {
  if (!container) {
    console.error("Emergency Module: Container not found");
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
  panelTitle.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Emergency Button';
  container.appendChild(panelTitle);

  // Create emergency container
  const emergencyContainer = document.createElement('div');
  emergencyContainer.className = 'emergency-container';
  emergencyContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 20px;
    text-align: center;
  `;

  // Add contact list setup section
  const contactSection = document.createElement('div');
  contactSection.className = 'emergency-contacts';
  contactSection.style.cssText = `
    width: 100%;
    padding: 15px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    margin-bottom: 10px;
  `;

  contactSection.innerHTML = `
    <h3 style="color: var(--term-cyan); margin-bottom: 10px; font-size: 0.9rem;">
      <i class="fa-solid fa-address-book"></i> Emergency Contacts
    </h3>
    <div id="emergency-contacts-list" style="margin-bottom: 10px;">
      <div style="color: var(--term-dim); font-size: 0.8rem;">No contacts saved</div>
    </div>
    <div style="display: flex; gap: 10px; flex-direction: column;">
      <input type="text" id="emergency-contact-name" placeholder="Contact Name" style="padding: 8px; background: #000; border: 1px solid var(--panel-border); color: var(--term-white); border-radius: var(--radius);">
      <input type="tel" id="emergency-contact-phone" placeholder="Phone Number (with country code)" style="padding: 8px; background: #000; border: 1px solid var(--panel-border); color: var(--term-white); border-radius: var(--radius);">
      <button id="add-emergency-contact" style="padding: 8px; background: var(--term-green); color: #000; border: none; border-radius: var(--radius); cursor: pointer; font-weight: bold;">
        <i class="fa-solid fa-plus"></i> Add Contact
      </button>
    </div>
  `;

  emergencyContainer.appendChild(contactSection);

  // Emergency Button
  const emergencyButton = document.createElement('button');
  emergencyButton.className = 'emergency-button';
  emergencyButton.style.cssText = `
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #ff0000, #990000);
    border: 3px solid var(--term-white);
    color: white;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
    animation: emergencyPulse 2s infinite;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
  `;
  
  emergencyButton.innerHTML = `
    <i class="fa-solid fa-bell" style="font-size: 2rem;"></i>
    <span>EMERGENCY</span>
    <span style="font-size: 0.7rem;">Press for Help</span>
  `;
  
  emergencyButton.onmouseenter = () => {
    emergencyButton.style.transform = 'scale(1.05)';
    emergencyButton.style.boxShadow = '0 0 30px rgba(255, 0, 0, 0.8)';
  };
  
  emergencyButton.onmouseleave = () => {
    emergencyButton.style.transform = 'scale(1)';
    emergencyButton.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
  };
  
  emergencyContainer.appendChild(emergencyButton);

  // Status message
  const statusDiv = document.createElement('div');
  statusDiv.className = 'emergency-status';
  statusDiv.style.cssText = `
    margin-top: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    width: 100%;
    font-size: 0.85rem;
    color: var(--term-dim);
  `;
  statusDiv.innerHTML = '<i class="fa-solid fa-info-circle"></i> Emergency contacts ready';
  emergencyContainer.appendChild(statusDiv);

  container.appendChild(emergencyContainer);

  // Load contacts from localStorage
  let emergencyContacts = [];

  function loadContacts() {
    const saved = localStorage.getItem('emergency_contacts');
    if (saved) {
      emergencyContacts = JSON.parse(saved);
      updateContactsList();
    }
  }

  function saveContacts() {
    localStorage.setItem('emergency_contacts', JSON.stringify(emergencyContacts));
    updateContactsList();
  }

  function updateContactsList() {
    const listDiv = document.getElementById('emergency-contacts-list');
    if (emergencyContacts.length === 0) {
      listDiv.innerHTML = '<div style="color: var(--term-dim); font-size: 0.8rem;">No contacts saved</div>';
      return;
    }
    
    listDiv.innerHTML = emergencyContacts.map((contact, index) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px; margin-bottom: 5px; background: rgba(255,255,255,0.05); border-radius: var(--radius);">
        <div style="text-align: left;">
          <strong style="color: var(--term-cyan);">${contact.name}</strong><br>
          <small style="color: var(--term-dim);">${contact.phone}</small>
        </div>
        <button data-index="${index}" class="remove-contact" style="background: rgba(255,0,0,0.3); border: none; color: white; padding: 5px 10px; border-radius: var(--radius); cursor: pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `).join('');
    
    // Add remove event listeners
    document.querySelectorAll('.remove-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.dataset.index);
        emergencyContacts.splice(index, 1);
        saveContacts();
        updateStatus('Contact removed', 'info');
      });
    });
  }

  function updateStatus(message, type = 'info') {
    const colors = {
      info: 'var(--term-dim)',
      success: 'var(--term-green)',
      error: 'var(--term-red)',
      warning: 'var(--term-amber)'
    };
    statusDiv.innerHTML = `<i class="fa-solid fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i> ${message}`;
    statusDiv.style.color = colors[type] || colors.info;
    setTimeout(() => {
      if (statusDiv.innerHTML === `<i class="fa-solid fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i> ${message}`) {
        statusDiv.style.color = 'var(--term-dim)';
        statusDiv.innerHTML = '<i class="fa-solid fa-info-circle"></i> Emergency contacts ready';
      }
    }, 3000);
  }

  function showLocationModal() {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'emergency-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: var(--panel-bg);
      border: 2px solid var(--term-red);
      border-radius: var(--radius);
      padding: 30px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 0 50px rgba(255, 0, 0, 0.3);
    `;
    
    modalContent.innerHTML = `
      <i class="fa-solid fa-location-dot" style="font-size: 3rem; color: var(--term-red); margin-bottom: 20px;"></i>
      <h2 style="color: var(--term-red); margin-bottom: 20px;">Emergency Alert!</h2>
      <p style="margin-bottom: 20px; color: var(--term-white);">Share your location with emergency contacts?</p>
      <p style="margin-bottom: 20px; color: var(--term-dim); font-size: 0.9rem;">
        <i class="fa-solid fa-phone"></i> ${emergencyContacts.length} contacts will be notified
      </p>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="modal-yes" style="padding: 10px 20px; background: var(--term-green); color: #000; border: none; border-radius: var(--radius); cursor: pointer; font-weight: bold;">
          <i class="fa-solid fa-check"></i> Yes, Share Location
        </button>
        <button id="modal-no" style="padding: 10px 20px; background: #333; color: var(--term-white); border: none; border-radius: var(--radius); cursor: pointer;">
          <i class="fa-solid fa-times"></i> Cancel
        </button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    document.getElementById('modal-yes').addEventListener('click', () => {
      modal.remove();
      getLocationAndSendSMS();
    });
    
    document.getElementById('modal-no').addEventListener('click', () => {
      modal.remove();
      updateStatus('Emergency alert cancelled', 'info');
    });
  }

  function getLocationAndSendSMS() {
    if (!navigator.geolocation) {
      updateStatus('Geolocation is not supported by this browser', 'error');
      return;
    }
    
    updateStatus('Getting your location...', 'info');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        sendEmergencySMS(lat, lng);
      },
      (error) => {
        let errorMsg = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location permission denied. Cannot send emergency alert.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location request timed out.';
            break;
          default:
            errorMsg = 'An unknown error occurred.';
        }
        updateStatus(errorMsg, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  async function sendEmergencySMS(lat, lng) {
    if (emergencyContacts.length === 0) {
      updateStatus('No emergency contacts saved! Please add contacts first.', 'error');
      return;
    }
    
    updateStatus('Sending emergency alerts...', 'warning');
    
    // Create OpenStreetMap short link
    const osmLink = `https://www.openstreetmap.org/search?query=${lat}%2C+${lng}&zoom=15#map=15/${lat}/${lng}`;
    const message = `🚨 EMERGENCY ALERT! 🚨\n\nCan you check on me please? I need assistance.\n\n📍 My location: ${osmLink}\n\n📅 Time: ${new Date().toLocaleString()}\n\nPlease respond if you receive this message.`;
    
    // Send SMS to each contact using SMS API (via fetch)
    const results = [];
    
    for (const contact of emergencyContacts) {
      try {
        // Using a free SMS API service (smsapi for demo - you can replace with your preferred service)
        const response = await fetch('https://textbelt.com/text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: contact.phone,
            message: message,
            key: 'textbelt' // Free API key (limited to 1 message per day for demo)
          })
        });
        
        const data = await response.json();
        results.push({
          contact: contact.name,
          success: data.success,
          message: data.success ? 'Sent successfully' : (data.error || 'Failed to send')
        });
        
      } catch (error) {
        console.error(`Failed to send SMS to ${contact.name}:`, error);
        results.push({
          contact: contact.name,
          success: false,
          message: 'Network error'
        });
      }
    }
    
    // Display results
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      updateStatus(`✅ Emergency alerts sent to ${successCount}/${emergencyContacts.length} contacts`, 'success');
      
      // Also log to console for debugging
      console.log('Emergency SMS sent:', results);
      console.log('Location link:', osmLink);
      
      // Show detailed results
      setTimeout(() => {
        let details = results.map(r => `${r.contact}: ${r.success ? '✅' : '❌'} ${r.message}`).join('\n');
        alert(`Emergency Alerts Sent!\n\n${details}\n\nLocation: ${osmLink}`);
      }, 500);
      
    } else {
      updateStatus('❌ Failed to send emergency alerts. Check contacts and try again.', 'error');
      
      // Fallback: Copy to clipboard
      const fallbackMsg = `Unable to send SMS. Please manually contact your emergency contacts.\n\nMessage: ${message}`;
      await navigator.clipboard.writeText(fallbackMsg);
      alert('⚠️ SMS sending failed.\n\nEmergency message has been copied to clipboard.\nPlease paste and send to your contacts manually.');
    }
  }

  // Add contact button handler
  document.getElementById('add-emergency-contact')?.addEventListener('click', () => {
    const nameInput = document.getElementById('emergency-contact-name');
    const phoneInput = document.getElementById('emergency-contact-phone');
    
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    
    if (!name || !phone) {
      updateStatus('Please enter both name and phone number', 'error');
      return;
    }
    
    if (!phone.match(/^[\+\d\s\-\(\)]{8,}$/)) {
      updateStatus('Please enter a valid phone number', 'error');
      return;
    }
    
    emergencyContacts.push({ name, phone });
    saveContacts();
    nameInput.value = '';
    phoneInput.value = '';
    updateStatus(`✅ ${name} added to emergency contacts`, 'success');
  });
  
  // Emergency button handler
  emergencyButton.addEventListener('click', () => {
    if (emergencyContacts.length === 0) {
      updateStatus('⚠️ Please add at least one emergency contact first!', 'warning');
      return;
    }
    showLocationModal();
  });
  
  // Load saved contacts
  loadContacts();
  
  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes emergencyPulse {
      0%, 100% {
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 40px rgba(255, 0, 0, 0.8);
        transform: scale(1.02);
      }
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}