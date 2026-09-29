/** Shared update notification and Help controls for Writer, Sheet, and Slides. */

import { showAlertDialog, showConfirmDialog } from "../ui-kit/dialogs.js";

let activeApp = null;
let eventBound = false;
const notifiedVersions = new WeakMap();
let bridgeRetryPending = false;

function getBridge() {
  return typeof window !== "undefined" ? window.pywebview?.api : null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function updateHelpSection(app) {
  const panel = app?.helpPanel;
  const root = panel?.root;
  if (!root || !root.querySelector || !root.querySelector(".vno-help-body")) return null;
  let section = root.querySelector("[data-vno-update-section]");
  if (!section) {
    section = document.createElement("section");
    section.className = "vno-help-update-section";
    section.setAttribute("data-vno-update-section", "1");
    section.setAttribute("aria-label", "Cập nhật VN Office");
    section.innerHTML = `
      <div class="vno-help-update-heading">Cập nhật VN Office</div>
      <p data-vno-update-version>Đang đọc phiên bản…</p>
      <p data-vno-update-status role="status" aria-live="polite">Có thể kiểm tra bản cập nhật khi kết nối được nguồn nội bộ.</p>
      <button type="button" class="vno-btn" data-vno-update-check>Kiểm tra cập nhật</button>
    `;
    root.insertBefore(section, root.querySelector(".vno-help-body"));
    section.querySelector("[data-vno-update-check]").addEventListener("click", async () => {
      const button = section.querySelector("[data-vno-update-check]");
      const status = section.querySelector("[data-vno-update-status]");
      const bridge = getBridge();
      if (!bridge?.check_for_updates) {
        status.textContent = "Cầu nối cập nhật chưa sẵn sàng. Hãy thử lại sau.";
        return;
      }
      button.disabled = true;
      status.textContent = "Đang kiểm tra bản cập nhật…";
      try {
        const result = await bridge.check_for_updates();
        if (!result?.queued) status.textContent = "Đang kiểm tra hoặc nguồn cập nhật chưa được cấu hình.";
      } catch {
        status.textContent = "Không thể bắt đầu kiểm tra. VN Office vẫn dùng bình thường.";
      } finally {
        button.disabled = false;
      }
    });
  }
  return section;
}

function setHelpState(state) {
  const section = updateHelpSection(activeApp);
  if (!section) return;
  const version = section.querySelector("[data-vno-update-version]");
  const status = section.querySelector("[data-vno-update-status]");
  const checkButton = section.querySelector("[data-vno-update-check]");
  if (version) version.textContent = `Phiên bản hiện tại: ${state.current_version || "không xác định"}`;
  if (!status) return;
  if (state.ready && state.available_version) {
    const count = Number(state.changed_files || 0);
    const bytes = Number(state.bytes_downloaded || 0);
    status.textContent = `Đã tải bản ${state.available_version}: ${count} tệp thay đổi, ${bytes.toLocaleString("vi-VN")} byte. Khởi động lại để áp dụng.`;
  } else if (state.status === "disabled") {
    status.textContent = "Nguồn cập nhật chưa được cấu hình trên máy này.";
  } else if (state.status === "checking") {
    status.textContent = "Đang kiểm tra bản cập nhật…";
  } else if (state.status === "up-to-date") {
    status.textContent = "VN Office đang ở phiên bản mới nhất của kênh này.";
  } else if (state.status === "unavailable") {
    status.textContent = "Chưa kiểm tra được nguồn cập nhật. VN Office vẫn dùng bình thường.";
  } else if (state.status === "update-ready") {
    status.textContent = `Có bản cập nhật ${state.available_version}.`;
  } else {
    status.textContent = "Có thể kiểm tra bản cập nhật khi kết nối được nguồn nội bộ.";
  }
  if (checkButton) checkButton.disabled = state.status === "checking";
}

function showReleaseNotes(state) {
  const notes = String(state.release_notes || "").trim();
  const safeNotes = escapeHtml(notes).replace(/\r?\n/g, "<br>");
  return showAlertDialog({
    title: `Có gì mới trong VN Office ${state.available_version || ""}`.trim(),
    message: safeNotes || "Bản cập nhật này không có ghi chú phát hành.",
    type: "info"
  });
}

export async function restartWithSaveCheck(app, api = getBridge()) {
  const adapter = app?.adapter;
  if (adapter?.isDirty === true) {
    const shouldSave = await showConfirmDialog({
      title: "Lưu tài liệu trước khi khởi động lại?",
      message: "Tài liệu đang có thay đổi chưa lưu. Hãy lưu trước khi VN Office đóng để áp dụng bản cập nhật.",
      confirmText: "Lưu tài liệu",
      cancelText: "Hủy khởi động lại"
    });
    if (!shouldSave) return false;
    if (typeof adapter.save !== "function") {
      await showAlertDialog({ title: "Không thể lưu tài liệu", message: "Ứng dụng hiện tại chưa cung cấp thao tác lưu. Bản cập nhật chưa được áp dụng.", type: "error" });
      return false;
    }
    try {
      const saved = await adapter.save();
      if (saved !== true || adapter.isDirty === true) return false;
    } catch {
      return false;
    }
  }
  if (!api?.request_update_restart) return false;
  const result = await api.request_update_restart();
  if (!result?.started) {
    await showAlertDialog({
      title: "Chưa thể khởi động lại để cập nhật",
      message: escapeHtml(result?.error || "VN Office chưa chuẩn bị xong bản cập nhật."),
      type: "warning"
    });
    return false;
  }
  return true;
}

export function renderUpdateNotification(app, state, api = getBridge()) {
  if (!state?.ready || !state.available_version || !app?.shell?.showNotification) return null;
  if (notifiedVersions.get(app.shell) === state.available_version) return app.shell.activeNotificationBar || null;
  notifiedVersions.set(app.shell, state.available_version);
  const version = state.available_version;
  return app.shell.showNotification({
    type: "info",
    message: `Có bản cập nhật VN Office ${version}. Khởi động lại để áp dụng.`,
    dismissible: true,
    actions: [
      {
        label: "Khởi động lại ngay",
        ariaLabel: `Lưu tài liệu và khởi động lại để cài VN Office ${version}`,
        onClick: () => restartWithSaveCheck(app, api)
      },
      { label: "Để sau", ariaLabel: "Để cài bản cập nhật sau", onClick: () => app.shell.clearNotification() },
      { label: "Xem thay đổi", ariaLabel: `Xem ghi chú VN Office ${version}`, onClick: () => showReleaseNotes(state) }
    ]
  });
}

function handleUpdateState(event) {
  const state = event?.detail || {};
  setHelpState(state);
  renderUpdateNotification(activeApp, state);
}

export async function connectUpdaterUi(app) {
  activeApp = app || null;
  if (typeof window === "undefined") return false;
  updateHelpSection(activeApp);
  if (!eventBound) {
    window.addEventListener("vno-office-update-state", handleUpdateState);
    eventBound = true;
  }
  const bridge = getBridge();
  if (!bridge?.get_update_status) {
    setHelpState({ current_version: "không xác định", status: "unavailable" });
    if (!bridgeRetryPending) {
      bridgeRetryPending = true;
      window.addEventListener("pywebviewready", () => {
        bridgeRetryPending = false;
        connectUpdaterUi(activeApp);
      }, { once: true });
      // The bridge-ready event may have fired while app.init() was still awaiting startup.
      window.setTimeout?.(() => {
        if (getBridge()?.get_update_status) {
          bridgeRetryPending = false;
          connectUpdaterUi(activeApp);
        }
      }, 250);
    }
    return false;
  }
  try {
    const state = await bridge.get_update_status();
    setHelpState(state || {});
    renderUpdateNotification(activeApp, state, bridge);
    if (bridge.start_update_checks) await bridge.start_update_checks();
    return true;
  } catch {
    setHelpState({ current_version: "đang chạy", status: "unavailable" });
    return false;
  }
}
