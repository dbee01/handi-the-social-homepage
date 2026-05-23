// ============================================
// Popup Controller (namespaced)
// ============================================

(function() {
    'use strict';
    
    const overlay = document.getElementById('hhSelectorOverlay');
    const openBtn = document.getElementById('hhOpenSelectorBtn');
    const confirmBtn = document.getElementById('hhConfirmBtn');
    const privacyCheckbox = document.getElementById('hhPrivacyCheckbox');
    
    if (!overlay || !openBtn || !confirmBtn || !privacyCheckbox) {
        console.warn("HH: Popup elements not found");
        return;
    }
    
    function updateConfirmButtonState() {
        if (privacyCheckbox.checked) {
            confirmBtn.classList.remove('hh__disabled');
        } else {
            confirmBtn.classList.add('hh__disabled');
        }
    }
    
    function openPopup() {
        overlay.classList.remove('hh__hidden');
        if (window.hhModules) {
            window.hhModules.render('hhModuleContainer', updateConfirmButtonState);
        }
        privacyCheckbox.checked = false;
        updateConfirmButtonState();
    }
    
    function closePopup() {
        overlay.classList.add('hh__hidden');
    }
    
    function applyDashboardSelection() {
        if (!privacyCheckbox.checked) return;
        
        if (window.hhModules) {
            const selectedModules = window.hhModules.getSelected();
            const names = selectedModules.map(m => m.name);
            const orderList = selectedModules.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
            alert(`✅ Dashboard updated!\nActive modules (${names.length}): ${names.join(', ') || 'none'}\n\nOrder:\n${orderList}`);
        }
        closePopup();
    }
    
    openBtn.addEventListener('click', openPopup);
    confirmBtn.addEventListener('click', applyDashboardSelection);
    privacyCheckbox.addEventListener('change', updateConfirmButtonState);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
    });
    
    // Prevent default drag image
    window.addEventListener('dragstart', (e) => {
        if (!e.target.closest('.hh__module-item')) return;
        const img = new Image();
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
        e.dataTransfer.setDragImage(img, 0, 0);
    });
})();