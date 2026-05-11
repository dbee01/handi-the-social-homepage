// Refresh Warning - Prevents accidental page refresh
(function() {
  let enabled = true;
  let confirmed = false;
  
  if (sessionStorage.getItem('refreshWarningsOff') === 'true') enabled = false;

  function showWarning() {
    if (!enabled || confirmed) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:200000;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = `
      <div style="background:#1a1a2e;border:2px solid #ffaa00;border-radius:12px;padding:25px;max-width:350px;text-align:center;">
        <div style="font-size:3rem;color:#ffaa00;">⚠️</div>
        <div style="font-size:1.3rem;color:#ffaa00;margin:10px 0;">Refresh Page?</div>
        <div style="background:rgba(255,68,68,0.1);border-left:3px solid #ff4444;padding:10px;margin:15px 0;color:#ff8888;text-align:left;font-size:0.9rem;">
          <i class="fa-solid fa-database"></i> Playing media will stop<br>
          <i class="fa-solid fa-image"></i> Slideshow position will reset
        </div>
        <div style="margin:10px 0;text-align:left;">
          <label style="color:#888;"><input type="checkbox" id="dontWarnAgain"> Don't show again this session</label>
        </div>
        <div style="display:flex;gap:10px;margin-top:15px;">
          <button id="stayBtn" style="background:#00ff41;color:#000;padding:10px 20px;border:none;border-radius:6px;cursor:pointer;">Stay</button>
          <button id="refreshBtn" style="background:#ff4444;color:#fff;padding:10px 20px;border:none;border-radius:6px;cursor:pointer;">Refresh</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('stayBtn').onclick = () => modal.remove();
    document.getElementById('refreshBtn').onclick = () => {
      if (document.getElementById('dontWarnAgain').checked) {
        enabled = false;
        sessionStorage.setItem('refreshWarningsOff', 'true');
      }
      confirmed = true;
      modal.remove();
      window.location.reload();
    };
  }

  // Intercept F5, Ctrl+R, Cmd+R
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r')) {
      e.preventDefault();
      showWarning();
    }
  });
  
  // Intercept browser refresh button
  window.addEventListener('beforeunload', (e) => {
    if (enabled && !confirmed) {
      e.preventDefault();
      e.returnValue = '';
      showWarning();
      return '';
    }
  });
})();
