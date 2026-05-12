<script src="js/dashboard.js"></script>// js/dashboard.js - Runs on index.html only

(function() {
  console.log('Dashboard loading...');
  
  function loadAndApplySettings() {
    var saved = localStorage.getItem('pleie_settings');
    console.log('Settings from localStorage:', saved);
    
    if (!saved) {
      console.log('No settings found, showing default modules');
      showDefaultModules();
      return;
    }
    
    var settings = JSON.parse(saved);
    
    if (settings.enabledModules) {
      // Hide all modules first
      var allModules = ['gallery', 'emergency', 'bus', 'news', 'mastodon', 'radio', 'friendly-phone', 'local-player'];
      allModules.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      
      // Show enabled modules
      for (var id in settings.enabledModules) {
        if (settings.enabledModules[id]) {
          var el = document.getElementById(id);
          if (el) {
            el.style.display = 'block';
            console.log('Enabled:', id);
          }
        }
      }
    } else {
      showDefaultModules();
    }
  }
  
  function showDefaultModules() {
    var defaultModules = ['gallery', 'emergency', 'bus', 'friendly-phone', 'local-player'];
    defaultModules.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'block';
    });
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndApplySettings);
  } else {
    loadAndApplySettings();
  }
})();