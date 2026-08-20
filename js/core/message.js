/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/core/message.js
(function () {
  // Detect browser type
  function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = "unknown";
    let instructions = "";

    if (
      ua.indexOf("Chrome") > -1 &&
      ua.indexOf("Edge") === -1 &&
      ua.indexOf("OPR") === -1
    ) {
      browser = "Chrome";
      instructions =
        "Click the three dots ⋮ → Settings → On startup → Open a specific page → Add a new page → Enter: https://senior.handihomepage.com";
    } else if (ua.indexOf("Firefox") > -1) {
      browser = "Firefox";
      instructions =
        "Click the menu ☰ → Settings → Home → Homepage and new windows → Custom URLs → Enter: https://senior.handihomepage.com";
    } else if (ua.indexOf("Edg") > -1) {
      browser = "Edge";
      instructions =
        "Click the three dots ⋯ → Settings → Start, home, and new tabs → When Edge starts → Open these pages → Add a new page → Enter: https://senior.handihomepage.com";
    } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
      browser = "Safari";
      instructions =
        "Click Safari → Preferences → General → Homepage → Enter: https://senior.handihomepage.com → Set as homepage";
    } else if (ua.indexOf("OPR") > -1 || ua.indexOf("Opera") > -1) {
      browser = "Opera";
      instructions =
        "Click the O menu → Settings → On startup → Open a specific page → Add a new page → Enter: https://senior.handihomepage.com";
    } else if (ua.indexOf("Vivaldi") > -1) {
      browser = "Vivaldi";
      instructions =
        "Click the V menu → Settings → General → Startup → Homepage → Enter: https://senior.handihomepage.com";
    } else if (ua.indexOf("Brave") > -1) {
      browser = "Brave";
      instructions =
        "Click the hamburger menu ☰ → Settings → Get started → On startup → Open a specific page → Add a new page → Enter: https://senior.handihomepage.com";
    }

    return { browser, instructions };
  }

  const browserInfo = getBrowserInfo();

  // Check if install banner has been dismissed
  const bannerDismissed =
    localStorage.getItem("installBannerDismissed") === "true";

  // =========================================================
  // PWA INSTALL BANNER
  // =========================================================
  let deferredPrompt = null;
  let installBannerShown = false;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!bannerDismissed && !installBannerShown) {
      installBannerShown = true;
      showInstallBanner();
    }
  });

  if (!bannerDismissed) {
    // Also check if already installed (display-mode: standalone)
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches;

    if (!isInstalled) {
      installBannerShown = true;
      showInstallBanner();
    }
  }

  function showInstallBanner() {
    // Styling comes from the .notice-box classes (see css/layout.css and
    // each theme's :root --notice-* variables) so it inherits the active
    // theme instead of clashing with it.
    const bannerDiv = document.createElement("div");
    bannerDiv.className = "notice-box notice-box--info";

    const bannerText = document.createElement("span");
    bannerText.className = "notice-box__text";
    bannerText.innerHTML = `
                <strong>📲 Install HandiHomepage on your device</strong>
            `;

    const btnGroup = document.createElement("span");
    btnGroup.className = "notice-box__actions";

    const installBtn = document.createElement("button");
    installBtn.className = "notice-box__btn";
    installBtn.textContent = "📲 Install";

    installBtn.onclick = async function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === "accepted") {
          console.log("User installed the PWA");
        }
        deferredPrompt = null;
      } else {
        // Fallback: show instructions
        const ua = navigator.userAgent;
        let instructions = "";
        if (ua.indexOf("Chrome") > -1 && ua.indexOf("Edge") === -1) {
          instructions = "Chrome: Tap the ⋮ menu → Add to Home screen";
        } else if (ua.indexOf("Firefox") > -1) {
          instructions = "Firefox: Tap the ☰ menu → Install";
        } else if (ua.indexOf("Edg") > -1) {
          instructions = "Edge: Tap the ⋯ menu → Add to phone";
        } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
          instructions = "Safari: Tap the Share icon → Add to Home Screen";
        } else if (ua.indexOf("Samsung") > -1) {
          instructions = "Samsung Internet: Tap the ☰ menu → Add page to";
        } else {
          instructions =
            'Look for "Add to Home Screen" or "Install" in your browser menu';
        }
        installBtn.textContent = "✓ Installed?";
        installBtn.classList.add("notice-box__btn--done");
        bannerText.innerHTML = `
                        <strong>📲 Install HandiHomepage on your device</strong><br>
                        <span class="notice-box__sub">${instructions}</span>
                    `;
      }
    };

    const closeBtn = document.createElement("button");
    closeBtn.className = "notice-box__close";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "Dismiss install banner");

    closeBtn.onclick = function () {
      bannerDiv.remove();
      localStorage.setItem("installBannerDismissed", "true");
    };

    btnGroup.appendChild(installBtn);
    btnGroup.appendChild(closeBtn);
    bannerDiv.appendChild(bannerText);
    bannerDiv.appendChild(btnGroup);

    function addBannerToPage() {
      const header = document.querySelector("header");
      if (header && header.parentNode) {
        // Place below the header, on top of the dashboard wrapper,
        // directly above the rotating messages box.
        header.parentNode.insertBefore(bannerDiv, header.nextSibling);
      } else {
        document.body.insertBefore(bannerDiv, document.body.firstChild);
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", addBannerToPage);
    } else {
      addBannerToPage();
    }
  }

  // =========================================================
  // ROTATING MESSAGE BOX
  // Moved to js/core/module-buttons.js where it is rendered with
  // translated content (d_msg_* keys). This file now only handles
  // the PWA install banner.
  // =========================================================
})();
