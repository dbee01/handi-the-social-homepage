/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/ai/ai.module.js
// Offline AI chat — on-device LLM via transformers.js (ONNX Runtime WASM).
// Runs 100% locally: the runtime, WASM binaries and model are served by this
// app and cached by the service worker, so after first load there is no
// server or internet connection at all (no WebGPU / WebGL requirement).

const CHAT_STORAGE = "handiLlmHistory";
const MODEL_STORAGE = "handiAiModel";

// Models must exist under /models/<id>/ (see scripts/fetch-ai-assets.sh).
const MODELS = [
  {
    id: "SmolLM2-135M-Instruct",
    name: "SmolLM2 135M (fast)",
    size: "~140MB",
    dtype: "int8",
  },
];

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(CHAT_STORAGE)) || []; }
  catch (e) { return []; }
}

function saveHistory(msgs) {
  const trimmed = msgs.slice(-100);
  localStorage.setItem(CHAT_STORAGE, JSON.stringify(trimmed));
}

export default async function initAi(container) {
  const t = window.t || function (k, e) { return e || k; };
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML =
    '<i class="fa-solid fa-brain"></i> ' + t("d_llm", "AI");
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
  if (parentItem) parentItem.dataset.module = "ai";

  let engine = null;
  let chatHistory = loadHistory();
  let selectedModel = MODELS[0].id;
  let isDownloading = false;

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
  }

  function renderProgress(text, pct) {
    content.innerHTML =
      '<div class="llm-progress"><i class="fa-solid fa-download fa-bounce"></i><p>' +
      escapeHtml(text) +
      "</p>" +
      (pct !== undefined
        ? '<div class="llm-progress-bar"><div style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div>'
        : "") +
      "</div>";
  }

  function scrollToBottom() {
    const msgs = content.querySelector("#llmMessages");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function render() {
    const modelOptions = MODELS.map(
      (m) =>
        '<option value="' + m.id + '">' + escapeHtml(m.name + " (" + m.size + ")") + "</option>",
    ).join("");

    content.innerHTML =
      '<div class="llm-controls">' +
      '<select id="llmModel" class="llm-model-select">' +
      modelOptions +
      "</select>" +
      '<button id="llmLoadBtn" class="llm-load-btn">' +
      (engine
        ? t("d_llmLoaded", "Loaded")
        : '<i class="fa-solid fa-download"></i> ' + t("d_llmLoad", "Load")) +
      "</button>" +
      '<button id="llmClearBtn" class="llm-clear-btn" title="' +
      t("d_llmClear", "Clear chat") +
      '">🗑</button>' +
      "</div>" +
      '<div class="llm-messages" id="llmMessages">' +
      (chatHistory.length === 0
        ? '<div class="module-empty"><i class="fa-solid fa-brain"></i><p>' +
          t("d_llmEmpty", "Load the AI and start chatting.") +
          "</p></div>"
        : chatHistory
            .map(
              (m) =>
                '<div class="llm-msg llm-msg-' +
                m.role +
                '"><div class="llm-msg-role">' +
                (m.role === "user" ? t("d_llmYou", "You") : "AI") +
                '</div><div class="llm-msg-text">' +
                escapeHtml(m.content) +
                "</div></div>",
            )
            .join("")) +
      "</div>" +
      '<div class="llm-input-row">' +
      '<input type="text" id="llmInput" class="llm-input" placeholder="' +
      t("d_llmPlaceholder", "Ask something...") +
      '" ' +
      (engine ? "" : "disabled") +
      ">" +
      '<button id="llmSendBtn" class="llm-send-btn" ' +
      (engine ? "" : "disabled") +
      ">" +
      t("d_llmSend", "Send") +
      "</button>" +
      "</div>";

    content.querySelector("#llmLoadBtn").addEventListener("click", loadModel);
    content.querySelector("#llmClearBtn").addEventListener("click", () => {
      chatHistory = [];
      saveHistory(chatHistory);
      if (engine && typeof engine.resetChat === "function") engine.resetChat();
      render();
    });
    content.querySelector("#llmSendBtn").addEventListener("click", send);
    content.querySelector("#llmInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
    scrollToBottom();
  }

  async function loadModel() {
    if (isDownloading) return;
    const sel = content.querySelector("#llmModel");
    if (sel) selectedModel = sel.value;
    if (!selectedModel) return;
    isDownloading = true;
    try {
      const modelDef = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
      renderProgress(t("d_llmStarting", "Starting AI engine…"));

      const { pipeline, env } = await import("/js/vendor/transformers/transformers.js");

      // Offline-only: never contact the Hugging Face Hub.
      env.allowLocalModels = true;
      env.allowRemoteModels = false;
      env.localModelPath = "/models/";
      // The service worker caches model files (cache-first), so transformers.js
      // does not need its own browser-cache layer.
      env.useBrowserCache = false;
      env.backends.onnx.wasm.wasmPaths = "/js/vendor/transformers/onnxruntime-web/";
      env.backends.onnx.wasm.numThreads = 1;

      engine = await pipeline("text-generation", modelDef.id, {
        dtype: modelDef.dtype || "int8",
        device: "wasm",
        progress_callback: (p) => {
          if (p && p.status === "progress") {
            const pct = Math.round((p.progress || 0) * 100);
            renderProgress(t("d_llmDownloading", "Loading") + " " + pct + "%", pct);
          }
        },
      });
      render();
    } catch (e) {
      console.error("AI load error:", e);
      content.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>' +
        escapeHtml(t("d_llmFailed", "Failed to load the AI model.")) +
        "</p>" +
        (String((e && e.message) || e).indexOf("Failed to fetch") !== -1 ||
        String((e && e.message) || e).indexOf("404") !== -1
          ? '<p style="font-size:0.85rem;opacity:0.7;">' +
            escapeHtml(
              t(
                "d_llmAssetsMissing",
                "AI files are missing. Run scripts/fetch-ai-assets.sh once, then reload.",
              ),
            ) +
            "</p>"
          : "") +
        '<button id="llmRetryBtn" class="settings-link-btn">' +
        t("d_retry", "Retry") +
        "</button></div>";
      content.querySelector("#llmRetryBtn").onclick = () => {
        render();
        loadModel();
      };
    } finally {
      isDownloading = false;
    }
  }

  async function send() {
    const input = content.querySelector("#llmInput");
    const text = input.value.trim();
    if (!text || !engine) return;
    input.value = "";
    chatHistory.push({ role: "user", content: text });
    saveHistory(chatHistory);
    render();

    // "Thinking…" bubble while the model generates.
    const msgs = content.querySelector("#llmMessages");
    const thinking = document.createElement("div");
    thinking.className = "llm-msg llm-msg-assistant";
    thinking.innerHTML =
      '<div class="llm-msg-role">AI</div><div class="llm-msg-text">…</div>';
    msgs.appendChild(thinking);
    scrollToBottom();

    try {
      const output = await engine(
        chatHistory.map((m) => ({ role: m.role, content: m.content })),
        { max_new_tokens: 256, do_sample: true, temperature: 0.7, top_p: 0.9 },
      );
      const gen = output && output[0] && output[0].generated_text;
      const last = Array.isArray(gen) ? gen[gen.length - 1] : null;
      let replyText = last && last.content ? last.content : "";
      if (!replyText && gen && typeof gen === "string") replyText = gen;
      replyText = String(replyText).trim();
      if (!replyText) replyText = t("d_llmNoReply", "No reply.");
      chatHistory.push({ role: "assistant", content: replyText });
      saveHistory(chatHistory);
    } catch (e) {
      console.error("AI chat error:", e);
      chatHistory.push({
        role: "assistant",
        content: "[" + t("d_error", "Error") + ": " + ((e && e.message) || e) + "]",
      });
      saveHistory(chatHistory);
    }
    render();
  }

  // Help popup
  helpBtn.addEventListener("click", () => {
    const existing = document.querySelector(".llm-help-popup");
    if (existing) { existing.remove(); return; }
    const popup = document.createElement("div");
    popup.className = "llm-help-popup";
    popup.innerHTML =
      "<p><strong>" + t("d_llmHelpTitle", "Private AI Chat") + "</strong></p>" +
      "<p>" +
      escapeHtml(
        t(
          "d_llmHelpBody",
          "Runs entirely on this device — nothing is sent over the internet, and it keeps working offline. First load downloads the small AI model (~140MB) once; it is then stored on this device.",
        ),
      ) +
      "</p>" +
      '<button class="llm-help-close">' + t("d_llmHelpOk", "Got it") + "</button>";
    popup.querySelector(".llm-help-close").addEventListener("click", () => popup.remove());
    container.appendChild(popup);
  });

  render();
}
