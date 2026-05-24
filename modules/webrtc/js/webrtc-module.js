// modules/webrtc/webrtc.module.js
export default function initWebRTC(container) {
    if (!container) return;
    
    // Create the WebRTC widget structure
    container.innerHTML = `
        <div class="webrtc-module">
            <div class="webrtc-placeholder" id="webrtcWidgetContainer">
                <div class="module-loading">
                    <i class="fa-solid fa-spinner fa-pulse"></i>
                    <p>Loading calls...</p>
                </div>
            </div>
        </div>
    `;
    
    // Check if webrtc-integration.js is already loaded
    if (window.initWebRTCWidget) {
        window.initWebRTCWidget('webrtcWidgetContainer');
    } else {
        // Load the WebRTC integration script dynamically
        const script = document.createElement('script');
        script.src = '/js/core/webrtc-integration.js';
        script.onload = () => {
            if (window.initWebRTCWidget) {
                window.initWebRTCWidget('webrtcWidgetContainer');
            }
        };
        script.onerror = () => {
            const container = document.getElementById('webrtcWidgetContainer');
            if (container) {
                container.innerHTML = `
                    <div class="webrtc-error" style="text-align: center; padding: 30px;">
                        <i class="fa-solid fa-exclamation-triangle" style="font-size: 2rem; color: #ef4444;"></i>
                        <p style="margin-top: 10px;">Failed to load calling service</p>
                        <button onclick="location.reload()" style="background: #3B82F6; color: white; border: none; padding: 8px 20px; border-radius: 20px; margin-top: 10px; cursor: pointer;">Retry</button>
                    </div>
                `;
            }
        };
        document.head.appendChild(script);
    }
}