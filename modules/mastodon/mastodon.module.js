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
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.social
      ? window.LANG.modules.social.name
      : "SOCIAL";
  title.innerHTML = '<i class="fa-brands fa-mastodon"></i> ' + name;
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
            <div id="mastodon-list" class="mastodon-list" ></div>
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
        postDiv.style.borderRadius = "12px";
        postDiv.style.display = "flex";
        postDiv.style.flexDirection = "column";
        postDiv.style.flexWrap = "nowrap";
        postDiv.style.alignContent = "center";
        postDiv.style.alignItems = "center";
        postDiv.style.textAlign = "center";
        postDiv.style.gap = "12px";

        postDiv.innerHTML = `
                    ${image ? `<img class="mastodon-image" src="${image}" alt="" style="width: 200px; height: auto; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'">` : '<div ><i class="fa-solid fa-link"></i></div>'}
                    <div class="mastodon-body" style="flex: 1;">
                        <a class="mastodon-title" href="${urlLink}" target="_blank" rel="noopener noreferrer" >${escapeHtml(titleText)}</a>
                        ${provider ? `<div class="mastodon-provider" >${escapeHtml(provider)}</div>` : ""}
                        ${shortDescription ? `<div class="mastodon-desc" >${escapeHtml(shortDescription)}</div>` : ""}
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
