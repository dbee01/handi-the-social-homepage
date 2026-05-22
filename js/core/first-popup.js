// js/core/first-popup.js - Module Selection Popup (first visit only)
(function() {
    // Use a permanent flag that never gets cleared by settings
    const POPUP_SHOWN_KEY = 'handiPopupShown';
    
    // Check if popup has already been shown
    if (localStorage.getItem(POPUP_SHOWN_KEY) === 'true') {
        return;
    }
    
    // All available modules with correct icon classes
    const allModules = [
        { id: 'gallery', name: 'Gallery', icon: 'fa-images', iconClass: 'fa-solid' },
        { id: 'bus', name: 'Bus Tracker', icon: 'fa-bus', iconClass: 'fa-solid' },
        { id: 'music', name: 'Music Player', icon: 'fa-music', iconClass: 'fa-solid' },
        { id: 'news', name: 'News', icon: 'fa-newspaper', iconClass: 'fa-solid' },
        { id: 'mastodon', name: 'Social Media', icon: 'fa-mastodon', iconClass: 'fa-brands' },
        { id: 'radio', name: 'Radio', icon: 'fa-radio', iconClass: 'fa-solid' },
        { id: 'emergency', name: 'Emergency', icon: 'fa-triangle-exclamation', iconClass: 'fa-solid' },
        { id: 'phone', name: 'Friendly Phone', icon: 'fa-phone', iconClass: 'fa-solid' },
        { id: 'chat', name: 'Chat', icon: 'fa-message', iconClass: 'fa-regular' },
        { id: 'calendar', name: 'Calendar', icon: 'fa-calendar', iconClass: 'fa-regular' }
    ];
    
    let selectedModules = [];
    
    // Create popup
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;';
    
    // Build modules HTML
    let modulesHtml = '';
    allModules.forEach(module => {
        modulesHtml += `
            <div class="module-item" data-id="${module.id}" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <span><i class="${module.iconClass} ${module.icon}" style="color:#0047cc;width:25px;"></i> ${module.name}</span>
                <button class="add-btn" data-id="${module.id}" style="background:#0047cc;color:white;border:none;border-radius:20px;padding:5px 15px;cursor:pointer;">+ Add</button>
            </div>
        `;
    });
    
    popup.innerHTML = `
        <div style="background:white;border-radius:24px;width:90%;max-width:1000px;max-height:90vh;overflow-y:auto;padding:25px;display:flex;flex-direction:column;">
                <h2 style="color:#0047cc;text-align:center;margin-bottom:10px;"><i class="fa-solid fa-hand-peace"></i> Welcome to HandiHomepage</h2>
                <p style="text-align:center;margin-bottom:20px;color:#556d8b;">Choose modules for your dashboard (drag to reorder)</p>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex:1;">
                    <!-- Available Modules -->
                    <div>
                        <h3 style="color:#0047cc;margin-bottom:10px;"><i class="fa-solid fa-list"></i> Available Modules</h3>
                        <div id="availableList" style="background:#f1f5f9;border-radius:16px;padding:15px;min-height:300px;max-height:400px;overflow-y:auto;">
                            <!-- content -->
                        </div>
                    </div>
                    
                    <!-- Selected Modules -->
                    <div>
                        <h3 style="color:#0047cc;margin-bottom:10px;"><i class="fa-solid fa-check-circle"></i> Your Dashboard</h3>
                        <div id="selectedList" style="background:#f1f5f9;border-radius:16px;padding:15px;min-height:300px;max-height:400px;overflow-y:auto;">
                            <div style="text-align:center;padding:40px;color:#64748b;">No modules selected yet.<br>Click + Add to add modules.</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin:20px 0 0 0;padding-top:15px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" id="agreeCheckbox"> I agree to the 
                        <a href="/terms" target="_blank" style="color:#0047cc;">Terms</a> and 
                        <a href="/privacy" target="_blank" style="color:#0047cc;">Privacy Policy</a>
                    </label>
                    
                    <button id="saveBtn" style="background:#0047cc;color:white;border:none;border-radius:40px;padding:12px 24px;font-size:1rem;font-weight:bold;cursor:pointer;min-width:180px;" disabled>Save & Continue</button>
                </div>
            </div>
`;
    
    document.body.appendChild(popup);
    
    const availableList = document.getElementById('availableList');
    const selectedList = document.getElementById('selectedList');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const saveBtn = document.getElementById('saveBtn');
    
    function renderSelected() {
        if (selectedModules.length === 0) {
            selectedList.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;">No modules selected yet.<br>Click + Add to add modules.</div>';
        } else {
            selectedList.innerHTML = '';
            selectedModules.forEach((moduleId, idx) => {
                const module = allModules.find(m => m.id === moduleId);
                const div = document.createElement('div');
                div.setAttribute('data-id', moduleId);
                div.setAttribute('data-index', idx);
                div.style.cssText = 'background:#eaf2ff;border:2px solid #0047cc;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;';
                div.innerHTML = `
                    <span><i class="fa-solid fa-grip-vertical" style="color:#64748b;margin-right:8px;cursor:grab;"></i> <i class="${module.iconClass} ${module.icon}" style="color:#0047cc;"></i> ${module.name}</span>
                    <button class="remove-btn" data-id="${moduleId}" style="background:#cc0000;color:white;border:none;border-radius:20px;padding:5px 15px;cursor:pointer;">✖ Remove</button>
                `;
                selectedList.appendChild(div);
            });
        }
        updateSaveButton();
    }
    
    function renderAvailable() {
        const availableModules = allModules.filter(m => !selectedModules.includes(m.id));
        availableList.innerHTML = '';
        availableModules.forEach(module => {
            const div = document.createElement('div');
            div.style.cssText = 'background:white;border:2px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;';
            div.innerHTML = `
                <span><i class="${module.iconClass} ${module.icon}" style="color:#0047cc;"></i> ${module.name}</span>
                <button class="add-available-btn" data-id="${module.id}" style="background:#0047cc;color:white;border:none;border-radius:20px;padding:5px 15px;cursor:pointer;">+ Add</button>
            `;
            availableList.appendChild(div);
        });
        
        availableList.querySelectorAll('.add-available-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                if (!selectedModules.includes(id)) {
                    selectedModules.push(id);
                    renderAvailable();
                    renderSelected();
                }
            });
        });
    }
    
    function handleRemove(id) {
        selectedModules = selectedModules.filter(m => m !== id);
        renderAvailable();
        renderSelected();
    }
    
    selectedList.addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-btn');
        if (btn) {
            handleRemove(btn.dataset.id);
        }
    });
    
    function updateSaveButton() {
        saveBtn.disabled = !(agreeCheckbox.checked && selectedModules.length > 0);
    }
    
    agreeCheckbox.addEventListener('change', updateSaveButton);
    
    saveBtn.addEventListener('click', () => {
        if (selectedModules.length === 0) return;
        
        // Mark popup as shown (permanent flag)
        localStorage.setItem(POPUP_SHOWN_KEY, 'true');
        
        // Save the selected modules order for reference
        localStorage.setItem('moduleOrder', JSON.stringify(selectedModules));
        
        // Update settings with selected modules
        const settings = JSON.parse(localStorage.getItem('pleie_settings') || '{}');
        if (!settings.enabledModules) settings.enabledModules = {};
        allModules.forEach(module => {
            settings.enabledModules[module.id] = selectedModules.includes(module.id);
        });
        localStorage.setItem('pleie_settings', JSON.stringify(settings));
        
        popup.remove();
        location.reload();
    });
    
    renderAvailable();
    renderSelected();
})();