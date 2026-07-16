/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/llm/llm.module.js
// Private LLM chat — downloads model to browser, runs entirely client-side via WebGPU.

const CHAT_STORAGE = "handiLlmHistory";
const MODEL_STORAGE = "handiLlmModel";

const MODELS = [
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B (fast)", size: "~600MB" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 3B", size: "~1.5GB" },
  { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi-3 mini", size: "~2GB" },
  { id: "gemma-2-2b-it-q4f16_1-MLC", name: "Gemma 2 2B", size: "~1.3GB" },
];

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(CHAT_STORAGE)) || []; }
  catch (e) { return []; }
}

function saveHistory(msgs) {
  const trimmed = msgs.slice(-100);
  localStorage.setItem(CHAT_STORAGE, JSON.stringify(trimmed));
}

export default async function initLlm(container) {
  const t = window.t || function (k, e) { return e || k; };
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
    title.className = "panel-title";
    title.innerHTML = '<i class="fa-solid fa-brain"></i> ' + t("d_llm", "llm");

    const helpBtn = document.createElement("button");
    helpBtn.className = "llm-help-btn";
    helpBtn.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    helpBtn.title = t("d_help", "Help");
    title.appendChild(helpBtn);
    container.appendChild(title);

  const content = document.createElement("div");
  content.className = "llm-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "llm";

  let engine = null;
  let chatHistory = loadHistory();
  let selectedModel = null;
  let isDownloading = false;

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
  }

  function renderProgress(text) {
    content.innerHTML = `
      <div class="llm-progress">
        <i class="fa-solid fa-download fa-bounce"></i>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }

  function render() {
    content.innerHTML = `
      <div class="llm-controls">
        <select id="llmModel" class="llm-model-select">
          <option value="">${t("d_llmSelect", "Select model...")}</option>
          ${MODELS.map(m => `<option value="${m.id}">${m.name} (${m.size})</option>`).join("")}
        </select>
        <button id="llmLoadBtn" class="llm-load-btn">${engine ? t("d_llmLoaded", "Loaded") : t("d_llmLoad", "Load")}</button>
        <button id="llmClearBtn" class="llm-clear-btn" title="${t("d_llmClear", "Clear chat")}">🗑</button>
      </div>
      <div class="llm-messages" id="llmMessages">
        ${chatHistory.length === 0
          ? `<div class="module-empty"><i class="fa-solid fa-brain"></i><p>${t("d_llmEmpty", "Load a model and start chatting.")}</p></div>`
          : chatHistory.map(m => `
            <div class="llm-msg llm-msg-${m.role}">
              <div class="llm-msg-role">${m.role === "user" ? t("d_llmYou", "You") : "LLM"}</div>
              <div class="llm-msg-text">${escapeHtml(m.content)}</div>
            </div>
          `).join("")}
      </div>
      <div class="llm-input-row">
        <input type="text" id="llmInput" class="llm-input" placeholder="${t("d_llmPlaceholder", "Ask something...")}" ${engine ? "" : "disabled"}>
        <button id="llmSendBtn" class="llm-send-btn" ${engine ? "" : "disabled"}>${t("d_llmSend", "Send")}</button>
      </div>
    `;

    content.querySelector("#llmLoadBtn").addEventListener("click", async () => {
      const modelSel = content.querySelector("#llmModel");
      selectedModel = modelSel.value;
      if (!selectedModel || isDownloading) return;
      isDownloading = true;
      try {
        renderProgress(t("d_llmDownloading", "Downloading model..."));
        const { CreateMLCEngine } = await import(
          "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.78/+esm"
        );
        engine = await CreateMLCEngine(selectedModel, {
          initProgressCallback: (p) => {
                      const pct = Math.round(p.progress * 100);
                      content.innerHTML = `
                        <div class="llm-progress">
                          <i class="fa-solid fa-download fa-bounce"></i>
                          <p>${t("d_llmDownloading", "Loading")} ${pct}%</p>
                          <div class="llm-progress-bar"><div style="width:${pct}%"></div></div>
                        </div>
                      `;
                    },
        });
        render();
      } catch (e) {
        console.error("LLM load error:", e);
        content.innerHTML = `<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>${t("d_llmFailed", "Failed to load model. Requires Chrome/Edge with WebGPU.")}</p><button id="llmRetryBtn" class="settings-link-btn">${t("d_retry", "Retry")}</button></div>`;
        content.querySelector("#llmRetryBtn").onclick = () => render();
      } finally {
        isDownloading = false;
      }
    });

    content.querySelector("#llmClearBtn").addEventListener("click", () => {
      chatHistory = [];
      saveHistory(chatHistory);
      engine?.resetChat();
      render();
    });

    const send = async () => {
      const input = content.querySelector("#llmInput");
      const text = input.value.trim();
      if (!text || !engine) return;
      input.value = "";
      chatHistory.push({ role: "user", content: text });
      saveHistory(chatHistory);
      render();
      const msgs = content.querySelector("#llmMessages");
      if (msgs) msgs.scrollTop = msgs.scrollHeight;

      try {
        const reply = await engine.chat.completions.create({
          messages: chatHistory.map(m => ({ role: m.role, content: m.content })),
        });
        const replyText = reply.choices[0].message.content;
        chatHistory.push({ role: "assistant", content: replyText });
        saveHistory(chatHistory);
        render();
        const msgs2 = content.querySelector("#llmMessages");
        if (msgs2) msgs2.scrollTop = msgs2.scrollHeight;
      } catch (e) {
        chatHistory.push({ role: "assistant", content: `[${t("d_error", "Error")}: ${e.message}]` });
        saveHistory(chatHistory);
        render();
      }
    };

    content.querySelector("#llmSendBtn").addEventListener("click", send);
    content.querySelector("#llmInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
  }

  // Help popup
    helpBtn.addEventListener("click", () => {
      const existing = document.querySelector(".llm-help-popup");
      if (existing) { existing.remove(); return; }
      const popup = document.createElement("div");
      popup.className = "llm-help-popup";
      popup.innerHTML = `
        <p><strong>${t("d_llmHelpTitle", "Private AI Chat")}</strong></p>
        <p>${t("d_llmHelpBody", "Downloads an LLM to your browser. Runs 100% on your device — no data leaves your computer. Requires WebGPU (Chrome/Edge). First load downloads ~600MB-2GB.")}</p>
        <button class="llm-help-close">${t("d_llmHelpOk", "Got it")}</button>
      `;
      popup.querySelector(".llm-help-close").addEventListener("click", () => popup.remove());
      container.appendChild(popup);
    });

    // Check WebGPU support
  if (!navigator.gpu) {
    content.innerHTML = `<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>${t("d_llmNoWebgpu", "WebGPU not available. Requires Chrome 113+ or Edge 113+.")}</p></div>`;
    return;
  }

  render();
}
