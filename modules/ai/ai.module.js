/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/ai/ai.module.js

export default function initAI(btn) {
  if (!btn) {
    console.error("AI Module: Button not found");
    return;
  }

  // Preserve pin if it exists (though AI button usually just has text)
  const pin = btn.querySelector('.pin-btn');
  if (pin) {
    // If the pin is inside the button, we don't clear it, just attach listener
  }

  btn.addEventListener('click', () => {
    alert(`Lumo AI is initializing...
(This is a placeholder for your AI integration)`);
  });
}