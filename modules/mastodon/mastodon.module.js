// modules/mastodon/mastodon.module.js – Mastodon trending links with server selector
import { loadSettings } from "../../js/core/settings.js";

// Mastodon servers with country flags
const MASTODON_SERVERS = [
  { flag: "🇮🇪", name: "mastodon.ie", url: "https://mastodon.ie" },
  { flag: "🇪🇺", name: "mastodon.social", url: "https://mastodon.social" },
  { flag: "🇩🇪", name: "mastodon.de", url: "https://mastodon.de" },
  { flag: "🇫🇷", name: "mastodon.fr (La Quadrature)", url: "https://mamot.fr" },
  { flag: "🇫🇷", name: "piaille.fr", url: "https://piaille.fr" },
  { flag: "🇪🇸", name: "mastodon.es (País)", url: "https://mstdn.es" },
  { flag: "🇮🇹", name: "mastodon.uno", url: "https://mastodon.uno" },
  { flag: "🇳🇱", name: "mastodon.nl", url: "https://mastodon.nl" },
  { flag: "🇵🇱", name: "pol.social", url: "https://mastodon.com.pl" },
  { flag: "🇵🇹", name: "masto.pt", url: "https://masto.pt" },
  { flag: "🇧🇪", name: "mastodon.be", url: "https://mastodon-belgium.be" },
  { flag: "🇨🇭", name: "swiss.social", url: "https://swiss.social" },
  { flag: "🇸🇪", name: "mastodon.se", url: "https://mastodonsweden.se" },
  { flag: "🇳🇴", name: "snabelen.no", url: "https://snabelen.no" },
  { flag: "🇬🇧", name: "mastodon.org.uk", url: "https://mastodon.org.uk" },
  { flag: "🇺🇸", name: "mastodon.social (US)", url: "https://mastodon.social" },
  { flag: "🇨🇦", name: "mstdn.ca", url: "https://mstdn.ca" },
  { flag: "🇦🇺", name: "aus.social", url: "https://aus.social" },
  { flag: "🇳🇿", name: "mastodon.nz", url: "https://mastodon.nz" },
];

export default async function initMastodon(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.appendChild(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.social
      ? window.LANG.modules.social.name
      : "SOCIAL";
  title.innerHTML = '<i class="fa-brands fa-mastodon"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "mastodon-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) {
    parentItem.dataset.module = "mastodon";
    parentItem.style.minHeight = "unset";
  }

  const STORAGE_KEY = "handiMastodonServer";
  const settings = loadSettings();
  const limit = settings.social?.limit || 3;
  let instance = settings.social?.instance || "";

  if (!instance) {
    try {
      instance = localStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {}
  }

  function saveServer(url) {
    instance = url;
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch (e) {}
  }

  function renderServerSelector() {
    var name =
      window.LANG && window.LANG.modules && window.LANG.modules.social
        ? window.LANG.modules.social.name
        : "SOCIAL";
    content.innerHTML = `
      <div class="module-empty">
        <i class="fa-brands fa-mastodon"></i>
        <p>${t("d_configureSocial", "Configure " + name + " element")}</p>
        <div style="margin-top:12px;">
          <select id="mastodonServerSelect" style="padding:8px 12px;border-radius:8px;border:2px solid #cbd5e1;font-size:1rem;max-width:100%;">
            <option value="">${t("d_selectServer", "Select a Mastodon server")}</option>
            ${MASTODON_SERVERS.map((s, i) => `<option value="${i}">${s.flag} ${s.name}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
    var sel = content.querySelector("#mastodonServerSelect");
    if (sel) {
      sel.addEventListener("change", function () {
        var idx = parseInt(this.value);
        if (idx >= 0 && MASTODON_SERVERS[idx]) {
          saveServer(MASTODON_SERVERS[idx].url);
          fetchMastodon();
        }
      });
    }
  }

  async function fetchMastodon() {
    try {
      content.innerHTML =
        '<div class="module-loading" style="padding: 20px; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> ' +
        t("d_loading", "Loading...") +
        "</div>";
      const url = `${instance}/api/v1/trends/links?limit=${limit}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        content.innerHTML =
          '<div class="module-empty" style="padding: 20px; text-align: center;">' +
          t("d_noData", "No trending links") +
          "</div>";
        refreshPackery();
        return;
      }

      content.innerHTML = "";

      // Header bar with server name and change button (like News)
      const serverInfo = MASTODON_SERVERS.find(function (s) {
        return s.url === instance;
      });
      const serverDisplay = serverInfo
        ? serverInfo.flag + " " + serverInfo.name
        : instance;
      var headerBar = document.createElement("div");
      headerBar.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;";
      headerBar.innerHTML =
        '<small style="opacity:0.7;">' +
        escapeHtml(serverDisplay) +
        "</small>" +
        '<button id="mastodonChangeServer" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;" title="' +
        t("d_changeServer", "Change server") +
        '">🔄 ' +
        t("d_changeServer", "Server") +
        "</button>";
      content.appendChild(headerBar);

      // Posts container
      var postsContainer = document.createElement("div");
      postsContainer.id = "mastodon-posts";
      content.appendChild(postsContainer);

      for (const item of data) {
        const titleText = item.title || t("d_untitled", "Untitled");
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
          ${image ? `<img class="mastodon-image" src="${image}" alt="" style="width:200px;height:auto;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'">` : '<div><i class="fa-solid fa-link"></i></div>'}
          <div class="mastodon-body" style="flex:1;">
            <a class="mastodon-title" href="${urlLink}" target="_blank" rel="noopener noreferrer">${escapeHtml(titleText)}</a>
            ${provider ? `<div class="mastodon-provider">${escapeHtml(provider)}</div>` : ""}
            ${shortDescription ? `<div class="mastodon-desc">${escapeHtml(shortDescription)}</div>` : ""}
          </div>
        `;
        postsContainer.appendChild(postDiv);
      }

      // Hook up the change server button in the header
      var changeBtn = content.querySelector("#mastodonChangeServer");
      if (changeBtn) {
        changeBtn.onclick = function () {
          saveServer("");
          renderServerSelector();
        };
      }

      refreshPackery();
      window.logEvent(2, "mastodon_load", { server: instance, posts: data.length });
    } catch (err) {
      console.error("Mastodon module error:", err);
      window.logEvent(1, "mastodon_error", { server: instance, error: err.message });
      content.innerHTML = `
        <div class="module-empty" style="padding:20px;text-align:center;">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>${t("d_tryAnother", "Failed to load. Try another server.")}</p>
          <button id="mastodonBackBtn" class="settings-link-btn">
            <i class="fa-solid fa-arrow-left"></i> ${t("d_chooseServer", "Choose another server")}
          </button>
        </div>
      `;
      var backBtn = content.querySelector("#mastodonBackBtn");
      if (backBtn) {
        backBtn.onclick = function () {
          saveServer("");
          renderServerSelector();
        };
      }
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
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  if (instance) {
    fetchMastodon();
  } else {
    renderServerSelector();
  }

  const refreshInterval = setInterval(
    () => {
      if (instance) fetchMastodon();
    },
    15 * 60 * 1000,
  );

  return () => clearInterval(refreshInterval);
}
