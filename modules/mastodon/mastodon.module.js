/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/mastodon/mastodon.module.js – Mastodon trending links with server selector
import { loadSettings } from "../../js/core/settings.js";

// Mastodon servers with country flags
const MASTODON_SERVERS = [
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#169b62"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ff883e"/></svg>', name: "mastodon.ie", url: "https://mastodon.ie" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#003399"/><g fill="#ffcc00"><circle cx="15" cy="5" r="1"/><circle cx="20" cy="7" r="1"/><circle cx="22" cy="12" r="1"/><circle cx="20" cy="16" r="1"/><circle cx="15" cy="17" r="1"/><circle cx="10" cy="16" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="10" cy="7" r="1"/></g></svg>', name: "mastodon.social", url: "https://mastodon.social" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#d00"/><rect y="13.34" width="30" height="6.66" fill="#fc0"/></svg>', name: "mastodon.de", url: "https://mastodon.de" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ed2939"/></svg>', name: "mastodon.fr (La Quadrature)", url: "https://mamot.fr" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ed2939"/></svg>', name: "piaille.fr", url: "https://piaille.fr" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="5" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/><rect y="15" width="30" height="5" fill="#c60b1e"/></svg>', name: "mastodon.es (País)", url: "https://mstdn.es" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/></svg>', name: "mastodon.uno", url: "https://mastodon.uno" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="6.67" fill="#ae1c28"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.34" width="30" height="6.66" fill="#21468b"/></svg>', name: "mastodon.nl", url: "https://mastodon.nl" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#dc143c"/></svg>', name: "pol.social", url: "https://mastodon.com.pl" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="12" height="20" fill="#006600"/><rect x="12" width="18" height="20" fill="#f00"/><circle cx="12" cy="10" r="4" fill="#fc0" stroke="#000" stroke-width=".5"/></svg>', name: "masto.pt", url: "https://masto.pt" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#000"/><rect x="10" width="10" height="20" fill="#fae042"/><rect x="20" width="10" height="20" fill="#ed2939"/></svg>', name: "mastodon.be", url: "https://mastodon-belgium.be" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#d52b1e"/><line x1="10" y1="7" x2="20" y2="13" stroke="#fff" stroke-width="3"/><line x1="20" y1="7" x2="10" y2="13" stroke="#fff" stroke-width="3"/></svg>', name: "swiss.social", url: "https://swiss.social" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#006aa7"/><line x1="8" y1="0" x2="8" y2="20" stroke="#fecc00" stroke-width="4"/><line x1="0" y1="8" x2="30" y2="12" stroke="#fecc00" stroke-width="4"/></svg>', name: "mastodon.se", url: "https://mastodonsweden.se" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#ef2b2d"/><line x1="8" y1="0" x2="8" y2="20" stroke="#fff" stroke-width="4"/><line x1="0" y1="8" x2="30" y2="12" stroke="#fff" stroke-width="4"/><line x1="10" y1="0" x2="10" y2="20" stroke="#002868" stroke-width="2"/><line x1="0" y1="9" x2="30" y2="11" stroke="#002868" stroke-width="2"/></svg>', name: "snabelen.no", url: "https://snabelen.no" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" stroke-width="2"/><line x1="15" y1="0" x2="15" y2="20" stroke="#fff" stroke-width="6"/><line x1="0" y1="10" x2="30" y2="10" stroke="#fff" stroke-width="6"/><line x1="15" y1="0" x2="15" y2="20" stroke="#c8102e" stroke-width="3"/><line x1="0" y1="10" x2="30" y2="10" stroke="#c8102e" stroke-width="3"/></svg>', name: "mastodon.org.uk", url: "https://mastodon.org.uk" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="1.54" fill="#b22234"/><rect y="1.54" width="30" height="1.54" fill="#fff"/><rect y="3.08" width="30" height="1.54" fill="#b22234"/><rect y="4.62" width="30" height="1.54" fill="#fff"/><rect y="6.15" width="30" height="1.54" fill="#b22234"/><rect y="7.69" width="30" height="1.54" fill="#fff"/><rect y="9.23" width="30" height="1.54" fill="#b22234"/><rect y="10.77" width="30" height="1.54" fill="#fff"/><rect y="12.31" width="30" height="1.54" fill="#b22234"/><rect y="13.85" width="30" height="1.54" fill="#fff"/><rect y="15.38" width="30" height="1.54" fill="#b22234"/><rect y="16.92" width="30" height="1.54" fill="#fff"/><rect y="18.46" width="30" height="1.54" fill="#b22234"/><rect width="10" height="10.77" fill="#3c3b6e"/></svg>', name: "mastodon.social (US)", url: "https://mastodon.social" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#f00"/><rect x="7.5" width="15" height="20" fill="#fff"/><path d="M15 3l1.5 4.5h5l-4 3 1.5 4.5-4-3-4 3 1.5-4.5-4-3h5z" fill="#f00"/></svg>', name: "mstdn.ca", url: "https://mstdn.ca" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#00008b"/><circle cx="15" cy="10" r="4" fill="#fff"/><circle cx="13" cy="9" r=".8" fill="#00008b"/><circle cx="17" cy="9" r=".8" fill="#00008b"/><circle cx="15" cy="11" r=".6" fill="#00008b"/></svg>', name: "aus.social", url: "https://aus.social" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#00008b"/><circle cx="15" cy="10" r="4" fill="#fff"/><circle cx="13" cy="9" r=".8" fill="#00008b"/><circle cx="17" cy="9" r=".8" fill="#00008b"/><circle cx="15" cy="11" r=".6" fill="#00008b"/></svg>', name: "mastodon.nz", url: "https://mastodon.nz" },
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
    const limit = 20;
    const feedType = settings.social?.feedType || "trending";
    const profileAccount = settings.social?.profile || "";
    const hashtag = settings.social?.hashtag || "";
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
      </div>
      <div class="mastodon-server-list" style="display:flex;flex-direction:column;gap:4px;margin-top:8px;max-height:300px;overflow-y:auto;">
        ${MASTODON_SERVERS.map(function (s, i) {
          return `<div class="mastodon-server-item" data-idx="${i}" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-radius:8px;border:1px solid #e5e7eb;">${s.flag}<span>${escapeHtml(s.name)}</span></div>`;
        }).join("")}
      </div>
    `;
    content.querySelectorAll(".mastodon-server-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var idx = parseInt(el.getAttribute("data-idx"));
        if (idx >= 0 && MASTODON_SERVERS[idx]) {
          saveServer(MASTODON_SERVERS[idx].url);
          fetchMastodon();
        }
      });
    });
  }

  async function fetchMastodon() {
    try {
      content.innerHTML =
        '<div class="module-loading" style="padding: 20px; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> ' +
        t("d_loading", "Loading...") +
        "</div>";
      var url;
            if (feedType === "profile" && profileAccount) {
              // Search for account ID first
              var acct = profileAccount.replace(/^@/, "");
              var lookupUrl = `${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`;
              var lookupRes = await fetch(lookupUrl);
              if (!lookupRes.ok) throw new Error("Profile not found");
              var account = await lookupRes.json();
              url = `${instance}/api/v1/accounts/${account.id}/statuses?limit=${limit}`;
            } else if (feedType === "hashtag" && hashtag) {
              var tag = hashtag.replace(/^#/, "");
              url = `${instance}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=${limit}`;
            } else {
              url = `${instance}/api/v1/trends/links?limit=${limit}`;
            }
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
      const serverName = serverInfo
        ? serverInfo.name
        : instance;
      const serverFlag = serverInfo ? serverInfo.flag : "";
      var headerBar = document.createElement("div");
      headerBar.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;";
      var feedLabel = feedType === "profile" && profileAccount
              ? '<i class="fa-solid fa-user"></i> ' + escapeHtml(profileAccount)
              : feedType === "hashtag" && hashtag
                ? '<i class="fa-solid fa-hashtag"></i> ' + escapeHtml(hashtag.replace(/^#/, ""))
                : '<i class="fa-solid fa-arrow-trend-up"></i> ' + t("d_trending", "Trending");
            headerBar.innerHTML =
              '<small style="opacity:0.7;">' +
              serverFlag + " " + escapeHtml(serverName) + " · " + feedLabel +
              "</small>" +
              '<button id="mastodonChangeServer" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;" title="' +
              t("d_changeServer", "Change server") +
              '"><i class="fa-solid fa-rotate-right"></i> ' +
              t("d_changeServer", "Server") +
              "</button>";
      content.appendChild(headerBar);

      // Build post objects from the fetched data
      var posts = [];
      for (const item of data) {
        var titleText, urlLink, description, provider, image;
        if (feedType === "profile" || feedType === "hashtag") {
          // Status format
          titleText = item.account?.display_name || item.account?.username || "";
          urlLink = item.url || "#";
          var div = document.createElement("div");
          div.innerHTML = item.content || "";
          description = div.textContent || div.innerText || "";
          var rawAcct = item.account?.acct || "";
          provider = rawAcct ? "@" + rawAcct.replace(/^@/, "") : "";
          var media = item.media_attachments && item.media_attachments[0];
          image = media ? media.preview_url || media.url || "" : "";
        } else {
          // Trending links format
          titleText = item.title || t("d_untitled", "Untitled");
          urlLink = item.url || "#";
          description = item.description || "";
          provider = item.provider_name || "";
          image = item.image || "";
        }
        posts.push({
          title: titleText,
          link: urlLink,
          description:
            description.length > 150
              ? description.substring(0, 150) + "..."
              : description,
          provider: provider,
          image: image,
        });
      }

      var currentIndex = 0;

      var carousel = document.createElement("div");
      carousel.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;";

      var leftBtn = document.createElement("button");
      leftBtn.className = "mastodon-scroll-btn";
      leftBtn.textContent = "‹";
      leftBtn.style.cssText =
        "flex-shrink:0;width:40px;height:40px;border-radius:50%;border:1px solid #cbd5e1;" +
        "background:#fff;cursor:pointer;font-size:1.4rem;line-height:1;color:#334155;";
      leftBtn.setAttribute("aria-label", t("d_scrollLeft", "Previous post"));

      var postView = document.createElement("div");
      postView.className = "mastodon-post-view";
      postView.style.cssText = "flex:1;min-width:0;";

      var rightBtn = document.createElement("button");
      rightBtn.className = "mastodon-scroll-btn";
      rightBtn.textContent = "›";
      rightBtn.style.cssText = leftBtn.style.cssText;
      rightBtn.setAttribute("aria-label", t("d_scrollRight", "Next post"));

      carousel.appendChild(leftBtn);
      carousel.appendChild(postView);
      carousel.appendChild(rightBtn);
      content.appendChild(carousel);

      function renderPost() {
        var p = posts[currentIndex];
        if (!p) {
          postView.innerHTML = "";
          return;
        }
        postView.innerHTML = `
          <div class="mastodon-item" style="margin-bottom:0;padding:16px;border-radius:12px;display:flex;flex-direction:column;flex-wrap:nowrap;align-content:center;align-items:center;text-align:center;gap:12px;">
            ${p.image ? `<img class="mastodon-image" src="${p.image}" alt="" style="width:200px;height:auto;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'">` : '<div><i class="fa-solid fa-link"></i></div>'}
            <div class="mastodon-body" style="flex:1;">
              <a class="mastodon-title" href="${p.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.title)}</a>
              ${p.provider ? `<div class="mastodon-provider">${escapeHtml(p.provider)}</div>` : ""}
              ${p.description ? `<div class="mastodon-desc">${escapeHtml(p.description)}</div>` : ""}
            </div>
          </div>
        `;
      }

      function go(dir) {
        if (!posts.length) return;
        currentIndex = (currentIndex + dir + posts.length) % posts.length;
        renderPost();
      }

      leftBtn.addEventListener("click", function () {
        go(-1);
      });
      rightBtn.addEventListener("click", function () {
        go(1);
      });

      renderPost();

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
