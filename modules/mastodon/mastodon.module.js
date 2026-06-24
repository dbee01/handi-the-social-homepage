// modules/mastodon/mastodon.module.js – shows exactly 2 posts at a time, scroll for more
import { loadSettings } from "../../js/core/settings.js";

export default async function initMastodon(container) {
  const pinBtn = container.querySelector(".pin-btn");

  // Clear existing content
  container.innerHTML = "";

  // Restore pin button
  if (pinBtn) container.appendChild(pinBtn);

  // Title
  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-brands fa-mastodon"></i> SOCIAL';
  container.appendChild(title);

  // Content wrapper
  const content = document.createElement("div");
  content.className = "mastodon-content";
  container.appendChild(content);

  // Mark module type
  const parentItem = container.closest(".dashboard-item");
  if (parentItem) {
    parentItem.dataset.module = "mastodon";
    parentItem.style.minHeight = "unset";
  }

  // Settings
  const settings = loadSettings();
  const instance = settings.mastodon?.instance || "https://mastodon.ie";
  const limit = settings.mastodon?.limit || 6; // Get more posts than needed (so scrolling works)

  // Loading state
  content.innerHTML = `
        <div class="mastodon-scroll-wrapper" style="display: flex; flex-direction: column; gap: 8px;">
            <div id="mastodon-list" class="mastodon-list" style="padding: 4px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff;"></div>
        </div>
    `;

  const list = content.querySelector("#mastodon-list");

  if (!list) return;

  async function fetchMastodon() {
    try {
      list.innerHTML =
        '<div class="module-loading" style="padding: 20px; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading trending...</div>';

      const url = `${instance}/api/v1/trends/links?limit=${limit}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        list.innerHTML =
          '<div class="module-empty" style="padding: 20px; text-align: center;">No trending links</div>';
        refreshPackery();
        return;
      }

      // Clear loading
      list.innerHTML = "";

      // Add all posts
      for (const item of data) {
        const titleText = item.title || "Untitled";
        const urlLink = item.url || "#";
        const description = item.description || "";
        const provider = item.provider_name || "";
        const image = item.image || "";

        const shortDescription =
          description.length > 150
            ? `${description.substring(0, 150)}...`
            : description;

        const postDiv = document.createElement("div");
        postDiv.className = "mastodon-item";
        postDiv.style.marginBottom = "16px";
        postDiv.style.padding = "16px";
        postDiv.style.background = "#ffffff";
        postDiv.style.border = "1px solid #e2e8f0";
        postDiv.style.borderRadius = "12px";
        postDiv.style.display = "flex";
        postDiv.style.gap = "12px";

        postDiv.innerHTML = `
                    ${image ? `<img class="mastodon-image" src="${image}" alt="" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'">` : '<div style="width: 80px; height: 80px; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-link"></i></div>'}
                    <div class="mastodon-body" style="flex: 1;">
                        <a class="mastodon-title" href="${urlLink}" target="_blank" rel="noopener noreferrer" style="font-weight: 700; color: #0047cc; text-decoration: none; display: block; margin-bottom: 6px;">${escapeHtml(titleText)}</a>
                        ${provider ? `<div class="mastodon-provider" style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px;">${escapeHtml(provider)}</div>` : ""}
                        ${shortDescription ? `<div class="mastodon-desc" style="color: #475569; font-size: 0.85rem;">${escapeHtml(shortDescription)}</div>` : ""}
                    </div>
                `;
        list.appendChild(postDiv);
      }

      refreshPackery();
    } catch (err) {
      console.error("Mastodon module error:", err);
      list.innerHTML = `<div class="module-error" style="padding: 20px; text-align: center;">Failed to load Mastodon. Check instance URL in Settings.</div>`;
      refreshPackery();
    }
  }

  function refreshPackery() {
    if (window.refreshDashboardLayout) {
      window.refreshDashboardLayout();
      return;
    }
    if (!window.packeryInstance) return;
    requestAnimationFrame(() => {
      window.packeryInstance.reloadItems();
      window.packeryInstance.layout();
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(
      /[&<>]/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
        })[m],
    );
  }

  // Initial fetch
  fetchMastodon();

  // Refresh every 15 minutes
  const refreshInterval = setInterval(fetchMastodon, 15 * 60 * 1000);

  // Cleanup
  return () => {
    clearInterval(refreshInterval);
  };
}
