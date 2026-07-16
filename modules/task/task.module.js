/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/task/task.module.js
// Task management with labels, subtasks, undo delete, and sound effects.

const STORAGE_KEY = "handiTasks";
const LABEL_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
}

export default async function initTask(container) {
  const t = window.t || function (k, e) { return e || k; };
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-solid fa-list-check"></i> ' + t("d_tasks", "tasks");
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "task-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "task";

  let tasks = loadTasks();
  let undoTask = null;
  let undoTimeout = null;

  // ── Undo toast ──────────────────────────────────────────────────────────
  function showUndo(task) {
    const toast = document.createElement("div");
    toast.className = "task-undo-toast";
    toast.innerHTML = `
      <span>${t("d_taskDeleted", "Task deleted")}</span>
      <button class="task-undo-btn">${t("d_undo", "Undo")}</button>
    `;
    toast.querySelector(".task-undo-btn").addEventListener("click", () => {
      tasks.push(task);
      saveTasks(tasks);
      renderTasks();
      clearTimeout(undoTimeout);
      undoTask = null;
      toast.remove();
    });
    content.appendChild(toast);
    undoTimeout = setTimeout(() => {
      toast.remove();
      undoTask = null;
    }, 5000);
  }

  // ── Render ──────────────────────────────────────────────────────────────
  function renderTasks() {
    const scrollTop = content.scrollTop;
    content.innerHTML = `
      <div class="task-create">
        <input type="text" id="taskTitle" class="task-input" placeholder="${t("d_taskTitle", "Task title")}">
        <input type="text" id="taskDesc" class="task-input task-input-sm" placeholder="${t("d_taskDesc", "Description (optional)")}">
        <div class="task-label-row">
          <select id="taskLabelColor" class="task-label-select">
            <option value="">${t("d_noLabel", "No label")}</option>
            ${LABEL_COLORS.map(c => `<option value="${c}" style="background:${c};color:#fff;">●</option>`).join("")}
          </select>
          <input type="text" id="taskLabelText" class="task-input task-input-sm" placeholder="${t("d_labelName", "Label name")}">
        </div>
        <div class="task-subtasks" id="taskSubtasks"></div>
        <button id="taskAddSubtask" class="task-add-subtask">+ ${t("d_addSubtask", "Add subtask")}</button>
        <button id="taskCreateBtn" class="task-create-btn">${t("d_addTask", "Add Task")}</button>
      </div>
      <div class="task-list" id="taskList"></div>
    `;
    content.scrollTop = scrollTop;

    // Subtask management
    const subtaskContainer = content.querySelector("#taskSubtasks");
    const subtasks = [];

    function renderSubtaskInputs() {
      subtaskContainer.innerHTML = subtasks.map((s, i) => `
        <div class="task-subtask-row">
          <input type="text" class="task-input task-input-sm" value="${escapeHtml(s)}" data-subtask="${i}" placeholder="${t("d_subtask", "Subtask")}">
          <button class="task-subtask-remove" data-subtask-remove="${i}">✖</button>
        </div>
      `).join("");
      subtaskContainer.querySelectorAll("[data-subtask]").forEach(inp => {
        inp.addEventListener("input", () => {
          subtasks[inp.dataset.subtask] = inp.value;
        });
      });
      subtaskContainer.querySelectorAll("[data-subtask-remove]").forEach(btn => {
        btn.addEventListener("click", () => {
          subtasks.splice(btn.dataset.subtaskRemove, 1);
          renderSubtaskInputs();
        });
      });
    }

    content.querySelector("#taskAddSubtask").addEventListener("click", () => {
      subtasks.push("");
      renderSubtaskInputs();
    });

    // Create task
    content.querySelector("#taskCreateBtn").addEventListener("click", () => {
      const titleInput = content.querySelector("#taskTitle");
      const descInput = content.querySelector("#taskDesc");
      const labelColor = content.querySelector("#taskLabelColor").value;
      const labelText = content.querySelector("#taskLabelText").value.trim();
      const titleVal = titleInput.value.trim();
      if (!titleVal) return;

      tasks.unshift({
        id: Date.now(),
        title: titleVal,
        desc: descInput.value.trim(),
        label: labelText ? { text: labelText, color: labelColor || "#64748b" } : null,
        subtasks: subtasks.filter(s => s.trim()).map(s => ({ text: s, done: false })),
        done: false,
        created: new Date().toISOString(),
      });
      saveTasks(tasks);
      renderTasks();
    });

    // Task list
    const list = content.querySelector("#taskList");
    list.innerHTML = tasks.length === 0
      ? `<div class="module-empty"><i class="fa-solid fa-list-check"></i><p>${t("d_noTasks", "No tasks yet")}</p></div>`
      : tasks.map((task, i) => `
        <div class="task-card ${task.done ? "task-done" : ""}">
          <div class="task-card-header">
            <input type="checkbox" class="task-checkbox" data-idx="${i}" ${task.done ? "checked" : ""}>
            <div class="task-card-title">${escapeHtml(task.title)}</div>
            <button class="task-remove" data-idx="${i}" title="${t("d_delete", "Delete")}">✖</button>
          </div>
          ${task.desc ? `<div class="task-card-desc">${escapeHtml(task.desc)}</div>` : ""}
          ${task.label ? `<span class="task-label" style="background:${task.label.color}">${escapeHtml(task.label.text)}</span>` : ""}
          ${task.subtasks && task.subtasks.length ? `
            <div class="task-subtask-list">
              ${task.subtasks.map((st, si) => `
                <label class="task-subtask-item">
                  <input type="checkbox" class="task-subcheck" data-idx="${i}" data-si="${si}" ${st.done ? "checked" : ""}>
                  <span>${escapeHtml(st.text)}</span>
                </label>
              `).join("")}
            </div>
          ` : ""}
        </div>
      `).join("");

    // Checkbox handler — complete task = delete with undo
    list.querySelectorAll(".task-checkbox").forEach(cb => {
      cb.addEventListener("change", () => {
        const removed = tasks.splice(cb.dataset.idx, 1)[0];
        saveTasks(tasks);
        beep();
        showUndo(removed);
        renderTasks();
      });
    });
    list.querySelectorAll(".task-subcheck").forEach(cb => {
      cb.addEventListener("change", () => {
        tasks[cb.dataset.idx].subtasks[cb.dataset.si].done = cb.checked;
        saveTasks(tasks);
      });
    });

    // Remove handlers
    list.querySelectorAll(".task-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const removed = tasks.splice(btn.dataset.idx, 1)[0];
        saveTasks(tasks);
        beep();
        showUndo(removed);
        renderTasks();
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
  }

  renderTasks();
}
