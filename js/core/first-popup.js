// Intro popup – one‑time agreement (first visit only)
(function() {
    const POPUP_KEY = 'handiHomepageAgreed';
    if (localStorage.getItem(POPUP_KEY) === 'true') return;

    const overlay = document.getElementById('introPopup');
    const termsBox = document.getElementById('termsCheckbox');
    const privacyBox = document.getElementById('privacyCheckbox');
    const agreeBtn = document.getElementById('agreeBtn');

    if (!overlay || !termsBox || !privacyBox || !agreeBtn) return;

    // Show popup
    overlay.style.display = 'flex';

    function updateAgreeButton() {
        agreeBtn.disabled = !(termsBox.checked && privacyBox.checked);
    }

    termsBox.addEventListener('change', updateAgreeButton);
    privacyBox.addEventListener('change', updateAgreeButton);

    agreeBtn.addEventListener('click', () => {
        if (termsBox.checked && privacyBox.checked) {
            localStorage.setItem(POPUP_KEY, 'true');
            overlay.style.display = 'none';
        }
    });

    // Optional: open terms / privacy in a new tab when links clicked
    const termsLink = document.getElementById('termsLink');
    const privacyLink = document.getElementById('privacyLink');
    if (termsLink) termsLink.href = '#';  // replace with actual URL
    if (privacyLink) privacyLink.href = '#';
})();