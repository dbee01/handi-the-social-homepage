// ============================================
// Dashboard Preview & Application
// ============================================

(function() {
    'use strict';
    
    function hhRenderDashboardPreview() {
        const container = document.getElementById('hhDashboardPreview');
        if (!container) return;
        
        const activeModules = hhGetActiveModules();
        
        if (activeModules.length === 0) {
            container.innerHTML = `
                <div class="hh__empty-dashboard">
                    <i class="fa-solid fa-plus-circle"></i>
                    <p>Add modules from the left panel</p>
                    <p style="font-size: 0.75rem; margin-top: 8px;">Drag to reorder, click + to add</p>
                </div>
            `;
            return;
        }
        
        const iconColorMap = {
            blue: 'hh__card-icon-blue',
            green: 'hh__card-icon-green',
            amber: 'hh__card-icon-amber',
            red: 'hh__card-icon-red',
            purple: 'hh__card-icon-purple',
            pink: 'hh__card-icon-pink',
            teal: 'hh__card-icon-teal',
            orange: 'hh__card-icon-orange',
            cyan: 'hh__card-icon-blue'
        };
        
        container.innerHTML = activeModules.map((mod, i) => `
            <div class="hh__module-card" data-type="${mod.id}">
                <i class="fas ${mod.icon} ${iconColorMap[mod.iconColor] || 'hh__card-icon-blue'}"></i>
                <div class="hh__module-card-content">
                    <div class="hh__module-card-title">${mod.name}</div>
                    <div class="hh__module-card-desc">${mod.desc}</div>
                </div>
                <span class="hh__module-card-badge">#${i + 1}</span>
            </div>
        `).join('');
    }
    
    function hhUpdateActiveCount() {
        const countElement = document.getElementById('hhActiveCount');
        if (countElement) {
            const activeCount = hhGetActiveModules().length;
            countElement.textContent = `${activeCount} active module${activeCount !== 1 ? 's' : ''}`;
        }
    }
    
    function hhApplyDashboard() {
        const privacyCheckbox = document.getElementById('hhPrivacyCheckbox');
        if (!privacyCheckbox?.checked) return;
        
        const activeModules = hhGetActiveModules();
        const moduleNames = activeModules.map(m => m.name);
        const orderList = activeModules.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
        
        alert(`✅ Dashboard updated!\n\nActive modules (${activeModules.length}):\n${moduleNames.join(', ') || 'none'}\n\nOrder:\n${orderList}`);
    }
    
    // Set up event listeners
    function hhSetupEventListeners() {
        const confirmBtn = document.getElementById('hhConfirmBtn');
        const privacyCheckbox = document.getElementById('hhPrivacyCheckbox');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', hhApplyDashboard);
        }
        
        if (privacyCheckbox) {
            privacyCheckbox.addEventListener('change', () => {
                if (typeof hhUpdateConfirmButton === 'function') {
                    hhUpdateConfirmButton();
                }
            });
        }
    }
    
    // Make functions globally available
    window.hhRenderDashboardPreview = hhRenderDashboardPreview;
    window.hhUpdateActiveCount = hhUpdateActiveCount;
    window.hhGetActiveModules = hhGetActiveModules;
    
    // Initial render
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            hhRenderDashboardPreview();
            hhUpdateActiveCount();
            hhSetupEventListeners();
        });
    } else {
        hhRenderDashboardPreview();
        hhUpdateActiveCount();
        hhSetupEventListeners();
    }
})();