
export default async function initEnergy(gridEl, carbonValEl, carbonMsgEl) {
  
  // Helper to preserve pin in any element
  const preservePin = (el) => {
    if (!el) return;
    const pin = el.querySelector('.pin-btn');
    el.innerHTML = '';
    if (pin) el.prepend(pin);
  };

  // Apply preservation to all three elements
  preservePin(gridEl);
  preservePin(carbonValEl);
  preservePin(carbonMsgEl);

  try {
    const response = await fetch('http://localhost:3001/api/energy');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Energy Data:", data);

    const currentValue = data?.data?.[0]?.current_load || "N/A"; 
    
    if (gridEl) {
      // Ensure the pin is still there before setting innerHTML
      const pin = gridEl.querySelector('.pin-btn');
      gridEl.innerHTML = `<div class="val">${currentValue}</div>`;
      if (pin) gridEl.prepend(pin);
    }
    
    if (carbonValEl) {
      const pin = carbonValEl.querySelector('.pin-btn');
      carbonValEl.textContent = currentValue;
      if (pin) carbonValEl.prepend(pin);
    }
    
    if (carbonMsgEl) {
      const pin = carbonMsgEl.querySelector('.pin-btn');
      carbonMsgEl.textContent = "Data loaded successfully.";
      carbonMsgEl.style.color = "#22c55e";
      if (pin) carbonMsgEl.prepend(pin);
    }
    
  } catch (error) {
    console.error("Energy fetch failed:", error);
    
    if (carbonMsgEl) {
      const pin = carbonMsgEl.querySelector('.pin-btn');
      carbonMsgEl.textContent = "Error loading data.";
      carbonMsgEl.style.color = "#ef4444";
      if (pin) carbonMsgEl.prepend(pin);
    }
  }
}