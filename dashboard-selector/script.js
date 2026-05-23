(function() {
    // --- NAMESPACE safe DOM elements ---
    const overlay = document.getElementById('hhSelectorOverlay');
    const openBtn = document.getElementById('hhOpenSelectorBtn');
    const confirmBtn = document.getElementById('hhConfirmSelectionBtn');
    const privacyCheckbox = document.getElementById('hhPrivacyCheckbox');
    const moduleContainer = document.getElementById('hhModuleContainer');

    // --- Module data ---
    let modules = [
        { id: 'gallery', name: 'Gallery', description: 'Photos & memories', colorKey: 1, added: true },
        { id: 'bus-tracker', name: 'Bus Tracker', description: 'Live transit times', colorKey: 2, added: true },
        { id: 'music-player', name: 'Music Player', description: 'Your playlists', colorKey: 3, added: true },
        { id: 'news', name: 'News', description: 'Top headlines', colorKey: 4, added: true }
    ];

    // Drag-drop state
    let dragSourceIndex = null;
    let touchActive = false;

    // Color mapping for numbered badges
    const colorMap = {
        1: 'hh__badge-color-1',
        2: 'hh__badge-color-2',
        3: 'hh__badge-color-3',
        4: 'hh__badge-color-4',
        5: 'hh__badge-color-5',
        6: 'hh__badge-color-6',
        7: 'hh__badge-color-7',
        8: 'hh__badge-color-8'
    };

    // Render the module list based on current order & added status
    function renderModules() {
        if (!moduleContainer) return;
        moduleContainer.innerHTML = '';

        modules.forEach((mod, idx) => {
            const positionNumber = idx + 1;
            const colorClass = colorMap[positionNumber] || 'hh__badge-color-1';

            const moduleDiv = document.createElement('div');
            moduleDiv.className = 'hh__module-item';
            moduleDiv.setAttribute('draggable', 'true');
            moduleDiv.setAttribute('data-id', mod.id);
            moduleDiv.setAttribute('data-index', idx);

            // Drag events for desktop
            moduleDiv.addEventListener('dragstart', handleDragStart);
            moduleDiv.addEventListener('dragover', handleDragOver);
            moduleDiv.addEventListener('drop', handleDrop);

            // Touch events for mobile drag reorder
            moduleDiv.addEventListener('touchstart', handleTouchStart, { passive: false });
            moduleDiv.addEventListener('touchmove', handleTouchMove, { passive: false });
            moduleDiv.addEventListener('touchend', handleTouchEnd);

            // Numbered badge
            const badgeSpan = document.createElement('div');
            badgeSpan.className = `hh__number-badge ${colorClass}`;
            badgeSpan.innerText = positionNumber;

            // Info area
            const infoDiv = document.createElement('div');
            infoDiv.className = 'hh__module-info';
            const nameSpan = document.createElement('div');
            nameSpan.className = 'hh__module-name';
            nameSpan.innerText = mod.name;
            const descSpan = document.createElement('div');
            descSpan.className = 'hh__module-desc';
            descSpan.innerText = mod.description;
            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(descSpan);

            // Add/Remove button
            const actionBtn = document.createElement('button');
            actionBtn.className = 'hh__add-btn';
            if (mod.added) {
                actionBtn.innerHTML = '✔ Added';
                actionBtn.style.borderColor = '#10B981';
                actionBtn.style.color = '#0b6e41';
            } else {
                actionBtn.innerHTML = '+ Add';
                actionBtn.style.borderColor = '#3B82F6';
                actionBtn.style.color = '#1f2a3e';
            }
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                mod.added = !mod.added;
                renderModules();
                updateConfirmButtonState();
            });

            // Drag handle icon
            const dragIcon = document.createElement('div');
            dragIcon.className = 'hh__drag-icon';
            dragIcon.innerText = '⋮⋮';

            moduleDiv.appendChild(badgeSpan);
            moduleDiv.appendChild(infoDiv);
            moduleDiv.appendChild(actionBtn);
            moduleDiv.appendChild(dragIcon);
            moduleContainer.appendChild(moduleDiv);
        });
        updateConfirmButtonState();
    }

    // Desktop drag handlers
    function handleDragStart(e) {
        const target = e.target.closest('.hh__module-item');
        if (!target) return;
        const idx = target.getAttribute('data-index');
        if (idx !== null) dragSourceIndex = parseInt(idx, 10);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', idx);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetItem = e.target.closest('.hh__module-item');
        if (!targetItem) return;
        const targetIndex = parseInt(targetItem.getAttribute('data-index'), 10);
        if (dragSourceIndex !== null && dragSourceIndex !== targetIndex && !isNaN(targetIndex)) {
            reorderModules(dragSourceIndex, targetIndex);
        }
        dragSourceIndex = null;
    }

    // Mobile touch reorder
    let touchStartIndex = null;
    let touchStartY = 0;

    function handleTouchStart(e) {
        const item = e.target.closest('.hh__module-item');
        if (!item) return;
        e.preventDefault();
        touchActive = true;
        touchStartIndex = parseInt(item.getAttribute('data-index'), 10);
        touchStartY = e.touches[0].clientY;
        dragSourceIndex = touchStartIndex;
        item.style.opacity = '0.5';
    }

    function handleTouchMove(e) {
        if (!touchActive || dragSourceIndex === null) return;
        e.preventDefault();
        const currentY = e.touches[0].clientY;
        const elementsAtPoint = document.elementsFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        
        for (let el of elementsAtPoint) {
            const targetItem = el.closest('.hh__module-item');
            if (targetItem) {
                const targetIdx = parseInt(targetItem.getAttribute('data-index'), 10);
                if (!isNaN(targetIdx) && targetIdx !== dragSourceIndex) {
                    reorderModules(dragSourceIndex, targetIdx);
                    dragSourceIndex = targetIdx;
                    touchStartY = currentY;
                    break;
                }
            }
        }
    }

    function handleTouchEnd(e) {
        if (touchActive) {
            const item = document.querySelector(`.hh__module-item[data-index='${dragSourceIndex}']`);
            if (item) item.style.opacity = '';
            touchActive = false;
            dragSourceIndex = null;
            touchStartIndex = null;
        }
    }

    // Reorder modules array and re-render
    function reorderModules(fromIdx, toIdx) {
        if (fromIdx === toIdx) return;
        const newModules = [...modules];
        const [moved] = newModules.splice(fromIdx, 1);
        newModules.splice(toIdx, 0, moved);
        modules = newModules;
        renderModules();
    }

    // Update confirm button state based on privacy checkbox
    function updateConfirmButtonState() {
        const isPrivacyChecked = privacyCheckbox.checked;
        if (isPrivacyChecked) {
            confirmBtn.classList.remove('hh__disabled');
        } else {
            confirmBtn.classList.add('hh__disabled');
        }
    }

    // Apply selection and close popup
    function applyDashboardSelection() {
        if (!privacyCheckbox.checked) return;
        const selectedModules = modules.filter(m => m.added).map(m => m.name);
        const orderList = modules.filter(m => m.added).map((m, i) => `${i + 1}. ${m.name}`).join('\n');
        alert(`✅ Dashboard updated!\nActive modules (${selectedModules.length}): ${selectedModules.join(', ') || 'none'}\n\nOrder:\n${orderList}`);
        closePopup();
    }

    function openPopup() {
        overlay.classList.remove('hh__hidden');
        renderModules();
        privacyCheckbox.checked = false;
        updateConfirmButtonState();
    }

    function closePopup() {
        overlay.classList.add('hh__hidden');
    }

    // Event listeners
    if (openBtn) openBtn.addEventListener('click', openPopup);
    if (confirmBtn) confirmBtn.addEventListener('click', applyDashboardSelection);
    if (privacyCheckbox) privacyCheckbox.addEventListener('change', updateConfirmButtonState);
    
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePopup();
        });
    }

    // Prevent default drag image
    window.addEventListener('dragstart', (e) => {
        if (!e.target.closest('.hh__module-item')) return;
        const img = new Image();
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
        e.dataTransfer.setDragImage(img, 0, 0);
    });

    // Initial render
    renderModules();
    updateConfirmButtonState();
})();