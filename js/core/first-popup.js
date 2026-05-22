// js/core/first-popup.js - Module Selection Popup
(function() {
    const POPUP_KEY = 'handiHomepageModulesSelected';
    const MODULE_ORDER_KEY = 'handiModuleOrder';
    
    // All available modules
    const allModules = {
        gallery: { name: 'Gallery', icon: 'fa-images', defaultOrder: 1 },
        bus: { name: 'Bus Tracker', icon: 'fa-bus', defaultOrder: 2 },
        music: { name: 'Music Player', icon: 'fa-music', defaultOrder: 3 },
        news: { name: 'News', icon: 'fa-newspaper', defaultOrder: 4 },
        mastodon: { name: 'Social Media', icon: 'fa-mastodon', defaultOrder: 5 },
        radio: { name: 'Radio', icon: 'fa-radio', defaultOrder: 6 },
        emergency: { name: 'Emergency', icon: 'fa-triangle-exclamation', defaultOrder: 7 },
        phone: { name: 'Friendly Phone', icon: 'fa-phone', defaultOrder: 8 },
        chat: { name: 'Chat', icon: 'fa-message', defaultOrder: 9 },
        calendar: { name: 'Calendar', icon: 'fa-calendar', defaultOrder: 10 }
    };
    
    // Helper functions
    function loadSettings() {
        const saved = localStorage.getItem('pleie_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch(e) { console.error(e); }
        }
        return { enabledModules: {} };
    }
    
    function saveSettings(settings) {
        localStorage.setItem('pleie_settings', JSON.stringify(settings));
        // Dispatch event for other modules to react
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
    }
    
    // Apply module order to dashboard grid
    function applyModuleOrder() {
        const savedOrder = localStorage.getItem(MODULE_ORDER_KEY);
        if (!savedOrder) return false;
        
        const moduleOrder = JSON.parse(savedOrder);
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return false;
        
        // Get current modules in grid
        const modulesInGrid = Array.from(grid.children).filter(el => el.classList && el.classList.contains('dashboard-item'));
        
        // Reorder based on saved order
        moduleOrder.forEach((moduleId, idx) => {
            const moduleElement = modulesInGrid.find(el => el.id === moduleId);
            if (moduleElement) {
                grid.appendChild(moduleElement); // Appends to end in order
            }
        });
        
        // Update enabledModules in settings
        const settings = loadSettings();
        if (!settings.enabledModules) settings.enabledModules = {};
        
        // Enable selected modules, disable others
        Object.keys(allModules).forEach(moduleId => {
            settings.enabledModules[moduleId] = moduleOrder.includes(moduleId);
        });
        saveSettings(settings);
        
        // Refresh layout after modules are ready
        setTimeout(() => {
            if (window.refreshDashboardLayout) window.refreshDashboardLayout();
        }, 200);
        
        return true;
    }
    
    // Check if user has already selected modules
    if (localStorage.getItem(POPUP_KEY) === 'true') {
        // Apply saved module order after page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => applyModuleOrder());
        } else {
            applyModuleOrder();
        }
        return;
    }
    
    // Create popup HTML (simplified version that works)
    const popupHTML = `
        <div id="moduleSelectionPopup" class="module-selection-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 100000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 28px; max-width: 90%; width: 800px; max-height: 85vh; overflow-y: auto; border: 3px solid #0047cc;">
                <div style="background: #0047cc; color: white; font-size: 1.6rem; font-weight: bold; padding: 1rem; text-align: center; border-radius: 28px 28px 0 0;">
                    <i class="fa-solid fa-hand-peace"></i> Welcome to HandiHomepage
                </div>
                <div style="padding: 1.5rem;">
                    <p style="text-align: center; margin-bottom: 1.5rem;">Choose the modules you want to see on your dashboard. Your first choice will appear at the top!</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div>
                            <h3 style="color: #0047cc; margin-bottom: 0.5rem;">Available Modules</h3>
                            <div id="availableModulesList" style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 10px; min-height: 300px; max-height: 400px; overflow-y: auto;"></div>
                        </div>
                        <div>
                            <h3 style="color: #0047cc; margin-bottom: 0.5rem;">Your Dashboard (in order)</h3>
                            <div id="selectedModulesList" style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 10px; min-height: 300px; max-height: 400px; overflow-y: auto;"></div>
                        </div>
                    </div>

                    <div style="margin: 1.5rem 0;">
                        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <input type="checkbox" id="termsCheckbox"> I agree to the <a href="/terms" id="termsLink" style="color: #0047cc;">Terms and Conditions</a>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="privacyCheckbox"> I agree to the <a href="/privacy" id="privacyLink" style="color: #0047cc;">Privacy Policy</a>
                        </label>
                    </div>
                    
                    <div style="text-align: center;">
                        <button id="saveModulesBtn" style="background: #0047cc; color: white; border: none; border-radius: 48px; padding: 12px 32px; font-size: 1.2rem; font-weight: bold; cursor: pointer; min-width: 200px;" disabled>Save & Continue</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add popup to body
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    const overlay = document.getElementById('moduleSelectionPopup');
    const termsBox = document.getElementById('termsCheckbox');
    const privacyBox = document.getElementById('privacyCheckbox');
    const saveBtn = document.getElementById('saveModulesBtn');
    const availableList = document.getElementById('availableModulesList');
    const selectedList = document.getElementById('selectedModulesList');
    
    if (!overlay || !termsBox || !privacyBox || !saveBtn) return;
    
    let selectedModules = [];
    
    // Update save button state
    function updateSaveButton() {
        saveBtn.disabled = !(termsBox.checked && privacyBox.checked && selectedModules.length > 0);
    }
    
    // Render both lists
    function renderLists() {
        // Render available modules (not selected)
        const availableModules = Object.keys(allModules).filter(m => !selectedModules.includes(m));
        availableList.innerHTML = '';
        availableModules.forEach(moduleId => {
            const module = allModules[moduleId];
            const div = document.createElement('div');
            div.style.cssText = 'background: white; border: 2px solid #cbd5e1; border-radius: 12px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;';
            div.innerHTML = `
                <span><i class="fa-solid ${module.icon}"></i> ${module.name}</span>
                <button class="add-module-btn" style="background: #0047cc; color: white; border: none; border-radius: 20px; padding: 4px 12px; cursor: pointer;">+ Add</button>
            `;
            div.querySelector('.add-module-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                addModule(moduleId);
            });
            div.addEventListener('click', () => addModule(moduleId));
            availableList.appendChild(div);
        });
        
        // Render selected modules (in order)
        selectedList.innerHTML = '';
        if (selectedModules.length === 0) {
            selectedList.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">No modules selected yet. Add from the left column.</div>';
        } else {
            selectedModules.forEach((moduleId, index) => {
                const module = allModules[moduleId];
                const div = document.createElement('div');
                div.style.cssText = 'background: #eaf2ff; border: 2px solid #0047cc; border-radius: 12px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;';
                div.innerHTML = `
                    <span><i class="fa-solid fa-grip-vertical" style="cursor: grab; margin-right: 8px;"></i> <i class="fa-solid ${module.icon}"></i> ${module.name}</span>
                    <button class="remove-module-btn" style="background: #cc0000; color: white; border: none; border-radius: 20px; padding: 4px 12px; cursor: pointer;">✖ Remove</button>
                `;
                div.querySelector('.remove-module-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeModule(moduleId);
                });
                selectedList.appendChild(div);
            });
        }
    }
    
    function addModule(moduleId) {
        if (!selectedModules.includes(moduleId)) {
            selectedModules.push(moduleId);
            renderLists();
            updateSaveButton();
        }
    }
    
    function removeModule(moduleId) {
        selectedModules = selectedModules.filter(m => m !== moduleId);
        renderLists();
        updateSaveButton();
    }
    
    termsBox.addEventListener('change', updateSaveButton);
    privacyBox.addEventListener('change', updateSaveButton);
    
    saveBtn.addEventListener('click', () => {
        if (termsBox.checked && privacyBox.checked && selectedModules.length > 0) {
            // Save selected modules order to localStorage
            localStorage.setItem(POPUP_KEY, 'true');
            localStorage.setItem(MODULE_ORDER_KEY, JSON.stringify(selectedModules));
            
            // Update settings
            const settings = loadSettings();
            if (!settings.enabledModules) settings.enabledModules = {};
            Object.keys(allModules).forEach(moduleId => {
                settings.enabledModules[moduleId] = selectedModules.includes(moduleId);
            });
            saveSettings(settings);
            
            // Remove popup
            overlay.remove();
            
            // Reload page to apply changes
            location.reload();
        }
    });
    
    const termsLink = document.getElementById('termsLink');
    const privacyLink = document.getElementById('privacyLink');
    if (termsLink) termsLink.href = 'https://handihomepage.com/terms';
    if (privacyLink) privacyLink.href = 'https://handihomepage.com/privacy';
    
    renderLists();
})();