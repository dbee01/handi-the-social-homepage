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

  // Contacts section
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
      <div style="text-align: center; color: var(--term-dim); padding: 20px;">
        <i class="fa-solid fa-user-plus"></i><br>
        Add contacts below
      </div>
    </div>
  `;
  phoneContainer.appendChild(contactsSection);

  // Add contact form
  const addContactForm = document.createElement('div');
  addContactForm.className = 'add-contact-form';
  addContactForm.style.cssText = `
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 15px;
  `;

  addContactForm.innerHTML = `
    <h3 style="color: var(--term-green); margin-bottom: 15px; font-size: 1rem;">
      <i class="fa-solid fa-plus-circle"></i> Add Contact
    </h3>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <input type="text" id="contact-name" placeholder="Name (e.g., Mom, Dad, Sarah)" style="padding: 10px; background: #000; border: 1px solid var(--panel-border); color: var(--term-white); border-radius: var(--radius);">
      <input type="tel" id="contact-phone" placeholder="Phone Number (e.g., +353861234567)" style="padding: 10px; background: #000; border: 1px solid var(--panel-border); color: var(--term-white); border-radius: var(--radius);">
      <div style="display: flex; gap: 10px;">
        <label for="contact-image" style="flex: 1; padding: 10px; background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: var(--radius); cursor: pointer; text-align: center;">
          <i class="fa-solid fa-image"></i> Choose Photo
        </label>
        <input type="file" id="contact-image" accept="image/*" style="display: none;">
        <button id="save-contact" style="padding: 10px 20px; background: var(--term-green); color: #000; border: none; border-radius: var(--radius); cursor: pointer; font-weight: bold;">
          <i class="fa-solid fa-save"></i> Save
        </button>
      </div>
      <div id="image-preview" style="text-align: center; margin-top: 10px;"></div>
    </div>
  `;
  phoneContainer.appendChild(addContactForm);

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

  // State
  let contacts = [];
  let currentImageData = null;

  // Load contacts from localStorage
  function loadContacts() {
    const saved = localStorage.getItem('friendly_phone_contacts');
    if (saved) {
      contacts = JSON.parse(saved);
      renderContacts();
    }
  }

  // Save contacts to localStorage
  function saveContacts() {
    localStorage.setItem('friendly_phone_contacts', JSON.stringify(contacts));
    renderContacts();
  }

  // Render contacts grid
  function renderContacts() {
    const grid = document.getElementById('contacts-grid');
    if (!grid) return;

    if (contacts.length === 0) {
      grid.innerHTML = `
        <div style="text-align: center; color: var(--term-dim); padding: 20px; grid-column: 1/-1;">
          <i class="fa-solid fa-user-plus fa-2x"></i>
          <p style="margin-top: 10px;">No contacts yet. Add your loved ones above!</p>
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
          ${contact.imageData ? 
            `<img src="${contact.imageData}" alt="${contact.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
            `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a1a, #0a0a0a);">
              <i class="fa-solid fa-user" style="font-size: 2rem; color: var(--term-dim);"></i>
             </div>`
          }
        </div>
        <div style="font-weight: bold; color: var(--term-cyan); margin-bottom: 5px;">${contact.name}</div>
        <div style="font-size: 0.7rem; color: var(--term-dim);">${formatPhoneNumber(contact.phone)}</div>
        <div style="margin-top: 10px;">
          <button class="delete-contact" data-index="${index}" style="
            background: rgba(255, 0, 0, 0.3);
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: var(--radius);
            cursor: pointer;
            font-size: 0.7rem;
          ">
            <i class="fa-solid fa-trash"></i> Remove
          </button>
        </div>
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.contact-card').forEach(card => {
      const index = parseInt(card.dataset.index);
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking delete button
        if (e.target.closest('.delete-contact')) return;
        makeCall(index);
      });
    });

    // Add delete handlers
    document.querySelectorAll('.delete-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        deleteContact(index);
      });
    });
  }

  // Format phone number for display
  function formatPhoneNumber(phone) {
    if (phone.length > 10) {
      return phone.slice(0, 4) + '...' + phone.slice(-4);
    }
    return phone;
  }

  // Make a call
  function makeCall(index) {
    const contact = contacts[index];
    if (!contact) return;

    const statusDiv = document.querySelector('.call-status');
    if (!statusDiv) return;

    // Check if telephony is supported
    if (!window.location.protocol === 'tel:' && !navigator.userAgent.match(/(iPhone|iPad|Android)/i)) {
      statusDiv.style.display = 'block';
      statusDiv.innerHTML = `
        <i class="fa-solid fa-exclamation-triangle" style="color: var(--term-red);"></i>
        Calling only works on mobile devices or with tel: protocol support.
        <br><small>Number: ${contact.phone}</small>
      `;
      statusDiv.style.color = 'var(--term-red)';
      
      // Fallback: show number to copy
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
      return;
    }

    // Show calling status
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `
      <i class="fa-solid fa-phone" style="color: var(--term-green); animation: pulse 1s infinite;"></i>
      Calling ${contact.name} (${contact.phone})...
      <br><small>Click allow if prompted</small>
    `;
    statusDiv.style.color = 'var(--term-green)';

    // Attempt to make the call
    try {
      window.location.href = `tel:${contact.phone}`;
      
      // Reset status after 3 seconds
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

  // Delete contact
  function deleteContact(index) {
    if (confirm(`Remove ${contacts[index].name} from your contacts?`)) {
      contacts.splice(index, 1);
      saveContacts();
      showStatus(`${contacts[index]?.name || 'Contact'} removed`, 'info');
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

  // Handle image selection
  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(event) {
        currentImageData = event.target.result;
        const preview = document.getElementById('image-preview');
        if (preview) {
          preview.innerHTML = `
            <div style="display: inline-block;">
              <img src="${currentImageData}" alt="Preview" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--term-green);">
              <div style="font-size: 0.7rem; color: var(--term-green); margin-top: 5px;">Photo selected</div>
            </div>
          `;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Save new contact
  function saveNewContact() {
    const nameInput = document.getElementById('contact-name');
    const phoneInput = document.getElementById('contact-phone');
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name || !phone) {
      showStatus('Please enter both name and phone number', 'error');
      return;
    }

    // Validate phone number (basic)
    const phoneRegex = /^[\+\d][\d\s\-\(\)]{7,}$/;
    if (!phoneRegex.test(phone)) {
      showStatus('Please enter a valid phone number (include country code, e.g., +353...)', 'error');
      return;
    }

    // Check for duplicate
    if (contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      showStatus(`A contact named "${name}" already exists`, 'error');
      return;
    }

    contacts.push({
      name: name,
      phone: phone,
      imageData: currentImageData || null
    });

    saveContacts();
    
    // Clear form
    nameInput.value = '';
    phoneInput.value = '';
    currentImageData = null;
    const preview = document.getElementById('image-preview');
    if (preview) preview.innerHTML = '';
    const fileInput = document.getElementById('contact-image');
    if (fileInput) fileInput.value = '';
    
    showStatus(`${name} added to your contacts!`, 'success');
  }

  // Event listeners
  document.getElementById('contact-image')?.addEventListener('change', handleImageSelect);
  document.getElementById('save-contact')?.addEventListener('click', saveNewContact);

  // Load contacts on init
  loadContacts();

  // Add hover effects to contact cards via CSS
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
    
    @keyframes phonePulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }
    
    .fa-phone {
      animation: phonePulse 1s infinite;
    }
  `;
  document.head.appendChild(style);
}