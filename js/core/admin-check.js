// js/admin-check.js - Check if user has premium access
const USER_ACCESS = {
    isPremium: false,  // Set based on your auth system
    isAdmin: false,    // Set based on your auth system
    userId: null
};

async function checkUserAccess() {
    try {
        // Replace with your actual auth endpoint
        const response = await fetch('/api/user/status');
        const data = await response.json();
        
        USER_ACCESS.isPremium = data.isPremium || false;
        USER_ACCESS.isAdmin = data.isAdmin || false;
        USER_ACCESS.userId = data.userId;
        
        return USER_ACCESS.isPremium || USER_ACCESS.isAdmin;
    } catch (error) {
        console.log('Auth check failed, using localStorage fallback');
        
        // Fallback for testing
        USER_ACCESS.isPremium = localStorage.getItem('user_is_premium') === 'true';
        USER_ACCESS.isAdmin = localStorage.getItem('user_is_admin') === 'true';
        USER_ACCESS.userId = localStorage.getItem('user_id') || 'test_user';
        
        return USER_ACCESS.isPremium || USER_ACCESS.isAdmin;
    }
}

function hasWebRTCAccess() {
    return USER_ACCESS.isPremium || USER_ACCESS.isAdmin;
}

// For testing: Set premium access (remove in production)
function setTestPremiumAccess(enabled) {
    USER_ACCESS.isPremium = enabled;
    localStorage.setItem('user_is_premium', enabled);
    if (enabled) {
        document.dispatchEvent(new CustomEvent('webrtc-access-granted'));
    }
}