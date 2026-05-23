// ============================================
// Module Data (All 8 Dashboard Modules)
// ============================================

const HH_MODULES_DATA = [
    { id: 'gallery', name: 'Gallery', desc: 'Photos & memories', icon: 'fa-images', iconColor: 'blue', added: true },
    { id: 'bus-tracker', name: 'Bus Tracker', desc: 'Live transit times', icon: 'fa-bus', iconColor: 'green', added: true },
    { id: 'music-player', name: 'Music Player', desc: 'Your playlists', icon: 'fa-music', iconColor: 'purple', added: true },
    { id: 'news', name: 'News', desc: 'Top headlines', icon: 'fa-newspaper', iconColor: 'red', added: true },
    { id: 'weather', name: 'Weather', desc: 'Forecast & radar', icon: 'fa-cloud-sun', iconColor: 'cyan', added: false },
    { id: 'calendar', name: 'Calendar', desc: 'Events & reminders', icon: 'fa-calendar-alt', iconColor: 'orange', added: false },
    { id: 'tasks', name: 'Tasks', desc: 'To-do list', icon: 'fa-check-square', iconColor: 'teal', added: false },
    { id: 'notes', name: 'Notes', desc: 'Quick notes', icon: 'fa-sticky-note', iconColor: 'pink', added: false }
];

let hhModules = [...HH_MODULES_DATA];
let hhDragSourceIndex = null;

const hhColorMap = {
    1: 'hh__badge-1', 2: 'hh__badge-2', 3: 'hh__badge-3', 4: 'hh__badge-4',
    5: 'hh__badge-5', 6: 'hh__badge-6', 7: 'hh__badge-7', 8: 'hh__badge-8'
};

function hhRenderModuleSelector() {
    const container = document.getElementById('hhModuleContainer');
    if (!container) return;
    container.innerHTML = '';

    hhModules.forEach((mod, idx) => {
        const div = document.createElement('div');
        div.className = 'hh__module-item';
        div.setAttribute('data-index', idx);
        div.setAttribute('draggable', 'true');

        // Drag events
        div.addEventListener('dragstart', (e) => {
            hhDragSourceIndex = idx;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', idx);
        });
        
        div.addEventListener('dragover', (e) => e.preventDefault());
        
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('.hh__module-item');
            if (!targetItem) return;
            const targetIdx = parseInt(targetItem.getAttribute('data-index'));
            if (hhDragSourceIndex !== null && targetIdx !== undefined && hhDragSourceIndex !== targetIdx) {
                const newModules = [...hhModules];
                const [moved] = newModules.splice(hhDragSourceIndex, 1);
                newModules.splice(targetIdx, 0, moved);
                hhModules = newModules;
                hhRenderModuleSelector();
                if (typeof hhRenderDashboardPreview === 'function') hhRenderDashboardPreview();
                if (typeof hhUpdateActiveCount === 'function') hhUpdateActiveCount();
            }
            hhDragSourceIndex = null;
        });

        // Number badge
        const badge = document.createElement('div');
        badge.className = `hh__number-badge ${hhColorMap[idx + 1] || 'hh__badge-1'}`;
        badge.innerText = idx + 1;

        // Info
        const info = document.createElement('div');
        info.className = 'hh__module-info';
        info.innerHTML = `
            <div class="hh__module-name">${mod.name}</div>
            <div class="hh__module-desc">${mod.desc}</div>
        `;

        // Add/Remove button
        const btn = document.createElement('button');
        btn.className = 'hh__add-btn';
        btn.innerHTML = mod.added ? '✔ Added' : '+ Add';
        if (mod.added) {
            btn.style.borderColor = '#10B981';
            btn.style.color = '#0b6e41';
        }
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            mod.added = !mod.added;
            hhRenderModuleSelector();
            if (typeof hhRenderDashboardPreview === 'function') hhRenderDashboardPreview();
            if (typeof hhUpdateActiveCount === 'function') hhUpdateActiveCount();
            if (typeof hhUpdateConfirmButton === 'function') hhUpdateConfirmButton();
        });

        const dragIcon = document.createElement('div');
        dragIcon.className = 'hh__drag-icon';
        dragIcon.innerText = '⋮⋮';

        div.appendChild(badge);
        div.appendChild(info);
        div.appendChild(btn);
        div.appendChild(dragIcon);
        container.appendChild(div);
    });
}

function hhGetActiveModules() {
    return hhModules.filter(m => m.added);
}

function hhUpdateConfirmButton() {
    const privacyCheckbox = document.getElementById('hhPrivacyCheckbox');
    const confirmBtn = document.getElementById('hhConfirmBtn');
    if (privacyCheckbox && confirmBtn) {
        if (privacyCheckbox.checked) {
            confirmBtn.classList.remove('hh__disabled');
        } else {
            confirmBtn.classList.add('hh__disabled');
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        hhRenderModuleSelector();
        hhUpdateConfirmButton();
    });
} else {
    hhRenderModuleSelector();
    hhUpdateConfirmButton();
}

// Fix drag image
window.addEventListener('dragstart', (e) => {
    if (e.target.closest('.hh__module-item')) {
        const img = new Image();
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
        e.dataTransfer.setDragImage(img, 0, 0);
    }
});