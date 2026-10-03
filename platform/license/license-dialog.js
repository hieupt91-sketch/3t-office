/**
 * 3T Office — Hộp "Tài khoản và bản quyền".
 * Trạng thái bản quyền, nhập mã kích hoạt (kiểm checksum ngay khi gõ, không cần mạng), kích hoạt ngoại tuyến,
 * làm mới và gỡ kích hoạt. Chỉ báo trạng thái: hộp này KHÔNG khóa tính năng nào của ứng dụng.
 * Bàn phím: Esc đóng, Tab/Shift+Tab xoay vòng trong hộp, Enter ở ô mã để kích hoạt.
 */

import { captureEditorFocus, restoreEditorFocus, isEditorElement } from "../shell/focus-manager.js";
import { showConfirmDialog } from "../ui-kit/dialogs.js";
import { formatLicenseKeyInput, isLicenseKeyComplete } from "./license-key-format.js";

let _activeDialog = null;

const STATE_LABELS = {
  trial: "Dùng thử",
  trial_expired: "Hết hạn dùng thử",
  active: "Đã kích hoạt",
  active_grace: "Đã kích hoạt",
  check_required: "Đã kích hoạt"
};

async function callApi(name, ...args) {
  const api = typeof window !== "undefined" ? window.pywebview?.api : null;
  if (!api || typeof api[name] !== "function") {
    return { ok: false, error: "no_bridge", message: "Chức năng bản quyền chỉ có trong ứng dụng cài trên máy tính." };
  }
  try {
    const result = await api[name](...args);
    return result && typeof result === "object" ? result : { ok: false, error: "bad_response", message: "Không nhận được phản hồi hợp lệ." };
  } catch {
    return { ok: false, error: "bridge", message: "Không liên lạc được với ứng dụng. Hãy thử lại." };
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function statusBadgeClass(state) {
  if (state === "active") return "is-ok";
  if (state === "trial" || state === "active_grace") return "is-info";
  return "is-warn";
}

function renderStatus(status) {
  if (!status?.ok) {
    return `<p class="vno-license-status-text">${escapeHtml(status?.message || "Không đọc được trạng thái bản quyền.")}</p>`;
  }
  const label = STATE_LABELS[status.state] || "Bản quyền";
  const lines = [];
  if (status.licensed) {
    lines.push("Loại: bản quyền vĩnh viễn, nhận mọi bản cập nhật.");
    if (status.key_hint) lines.push(`Mã kích hoạt kết thúc bằng ${escapeHtml(status.key_hint)}.`);
    if (status.state === "active" && Number.isFinite(status.days_until_check)) {
      lines.push(`Lần xác nhận tiếp theo trong khoảng ${Math.max(0, status.days_until_check)} ngày (cần Internet, không bắt buộc).`);
    }
  } else if (status.state === "trial") {
    lines.push("Bạn đang dùng thử đầy đủ mọi tính năng.");
  }
  return `
    <div class="vno-license-badge ${statusBadgeClass(status.state)}">${escapeHtml(label)}</div>
    <p class="vno-license-status-text">${escapeHtml(status.message || "")}</p>
    ${lines.map((line) => `<p class="vno-license-detail">${line}</p>`).join("")}
  `;
}

export async function showLicenseDialog() {
  if (_activeDialog) return;
  captureEditorFocus();
  const previousActiveElement = document.activeElement;

  const backdrop = document.createElement("div");
  backdrop.className = "vno-license-backdrop";
  backdrop.setAttribute("role", "presentation");
  const dialog = document.createElement("div");
  dialog.className = "vno-license-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "vno-license-title");
  dialog.setAttribute("tabindex", "-1");
  dialog.innerHTML = `
    <header class="vno-license-header">
      <h1 class="vno-license-title" id="vno-license-title">Tài khoản và bản quyền</h1>
    </header>
    <div class="vno-license-body">
      <section class="vno-license-status" id="vno-license-status" aria-live="polite" aria-busy="true">
        <p class="vno-license-status-text">Đang đọc trạng thái bản quyền…</p>
      </section>

      <p class="vno-license-message" id="vno-license-message" role="alert" hidden></p>

      <section class="vno-license-section" id="vno-license-activate-section" hidden>
        <label class="vno-license-label" for="vno-license-key">Mã kích hoạt</label>
        <input class="vno-license-input" id="vno-license-key" type="text" autocomplete="off" spellcheck="false"
               inputmode="text" placeholder="3TO-XXXXX-XXXXX-XXXXX-XXXXX" aria-describedby="vno-license-key-hint">
        <p class="vno-license-hint" id="vno-license-key-hint">Gõ hoặc dán mã bạn nhận khi mua. Ứng dụng kiểm tra lỗi gõ ngay trên máy, không cần mạng.</p>
        <div class="vno-license-actions">
          <button type="button" class="vno-license-btn is-primary" id="vno-license-activate" disabled>Kích hoạt</button>
        </div>
        <details class="vno-license-offline" id="vno-license-offline">
          <summary>Máy này không có Internet? Kích hoạt ngoại tuyến</summary>
          <ol class="vno-license-steps">
            <li>Gửi <strong>mã thiết bị</strong> dưới đây cùng mã kích hoạt của bạn cho bộ phận hỗ trợ 3T.</li>
            <li>Nhận lại <strong>mã kích hoạt ngoại tuyến</strong>, dán vào ô bên dưới rồi nhấn Áp dụng.</li>
          </ol>
          <div class="vno-license-device-row">
            <code class="vno-license-device-code" id="vno-license-device-code" tabindex="0"></code>
            <button type="button" class="vno-license-btn" id="vno-license-copy-device">Sao chép</button>
          </div>
          <label class="vno-license-label" for="vno-license-offline-code">Mã kích hoạt ngoại tuyến</label>
          <textarea class="vno-license-input vno-license-textarea" id="vno-license-offline-code" rows="3" spellcheck="false" autocomplete="off"></textarea>
          <div class="vno-license-actions">
            <button type="button" class="vno-license-btn" id="vno-license-apply-offline">Áp dụng</button>
          </div>
        </details>
      </section>

      <section class="vno-license-section" id="vno-license-manage-section" hidden>
        <div class="vno-license-actions">
          <button type="button" class="vno-license-btn" id="vno-license-refresh">Xác nhận lại bản quyền</button>
          <button type="button" class="vno-license-btn is-danger" id="vno-license-deactivate">Gỡ kích hoạt khỏi máy này</button>
        </div>
        <p class="vno-license-hint">Gỡ kích hoạt giải phóng một chỗ để bạn dùng mã này trên máy khác. Cần Internet.</p>
      </section>
    </div>
    <footer class="vno-license-footer">
      <button type="button" class="vno-license-btn" id="vno-license-close">Đóng</button>
    </footer>
  `;
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  _activeDialog = backdrop;

  const $ = (selector) => dialog.querySelector(selector);
  const statusEl = $("#vno-license-status");
  const activateSection = $("#vno-license-activate-section");
  const manageSection = $("#vno-license-manage-section");
  const keyInput = $("#vno-license-key");
  const keyHint = $("#vno-license-key-hint");
  const activateBtn = $("#vno-license-activate");
  const messageEl = $("#vno-license-message");
  let keyIsValid = false;
  let busy = false;
  let validateTimer = 0;
  let validateSerial = 0;

  const setMessage = (text, kind = "error") => {
    messageEl.hidden = !text;
    messageEl.textContent = text || "";
    messageEl.className = `vno-license-message ${kind === "ok" ? "is-ok" : "is-error"}`;
  };

  const setBusy = (value) => {
    busy = value;
    dialog.setAttribute("aria-busy", value ? "true" : "false");
    for (const button of dialog.querySelectorAll("button")) {
      if (button.id !== "vno-license-close") button.disabled = value || (button.id === "vno-license-activate" && !keyIsValid);
    }
  };

  const applyStatus = (status) => {
    statusEl.setAttribute("aria-busy", "false");
    statusEl.innerHTML = renderStatus(status);
    const licensed = !!(status?.ok && status.licensed);
    activateSection.hidden = licensed;
    manageSection.hidden = !licensed;
    if (status?.device_code) $("#vno-license-device-code").textContent = status.device_code;
  };

  const refreshStatus = async () => applyStatus(await callApi("license_status"));

  const updateKeyValidity = () => {
    const formatted = formatLicenseKeyInput(keyInput.value);
    if (keyInput.value !== formatted) keyInput.value = formatted;
    keyIsValid = false;
    activateBtn.disabled = true;
    clearTimeout(validateTimer);
    if (!isLicenseKeyComplete(formatted)) {
      keyHint.textContent = "Gõ hoặc dán mã bạn nhận khi mua. Ứng dụng kiểm tra lỗi gõ ngay trên máy, không cần mạng.";
      keyInput.removeAttribute("aria-invalid");
      return;
    }
    const serial = ++validateSerial;
    validateTimer = setTimeout(async () => {
      const result = await callApi("license_normalize_key", formatted);
      if (serial !== validateSerial) return;
      keyIsValid = result.valid === true;
      activateBtn.disabled = busy || !keyIsValid;
      keyHint.textContent = keyIsValid ? "Mã hợp lệ. Nhấn Kích hoạt." : "Mã chưa đúng. Hãy kiểm tra lại từng ký tự (dễ nhầm 0 với O, 1 với I).";
      keyInput.setAttribute("aria-invalid", keyIsValid ? "false" : "true");
    }, 120);
  };

  const runOperation = async (name, args, successText) => {
    if (busy) return;
    setMessage("");
    setBusy(true);
    const result = await callApi(name, ...args);
    setBusy(false);
    if (result.ok) {
      applyStatus(result);
      if (result.refresh_error) setMessage("Chưa xác nhận được với máy chủ (có thể đang ngoại tuyến). Bản quyền hiện tại vẫn dùng bình thường.", "ok");
      else if (successText) setMessage(successText, "ok");
    } else {
      setMessage(result.message || "Không thực hiện được. Vui lòng thử lại.");
      if (result.error === "seats_exhausted" && Array.isArray(result.active_devices) && result.active_devices.length) {
        setMessage(`${result.message} Máy đang dùng: ${result.active_devices.join(", ")}.`);
      }
      await refreshStatus();
    }
    keyInput.focus?.();
  };

  keyInput.addEventListener("input", updateKeyValidity);
  keyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && keyIsValid && !busy) {
      event.preventDefault();
      activateBtn.click();
    }
  });
  activateBtn.addEventListener("click", () => runOperation("license_activate", [formatLicenseKeyInput(keyInput.value)], "Đã kích hoạt bản quyền. Cảm ơn bạn đã sử dụng 3T Office."));
  $("#vno-license-apply-offline").addEventListener("click", () => {
    const code = $("#vno-license-offline-code").value.trim();
    if (!code) { setMessage("Hãy dán mã kích hoạt ngoại tuyến vào ô trên."); return; }
    runOperation("license_apply_activation_code", [code], "Đã kích hoạt ngoại tuyến.");
  });
  $("#vno-license-refresh").addEventListener("click", () => runOperation("license_refresh", [], "Đã xác nhận lại bản quyền."));
  $("#vno-license-deactivate").addEventListener("click", async () => {
    const confirmed = await showConfirmDialog({
      title: "Gỡ kích hoạt",
      message: "Gỡ kích hoạt bản quyền khỏi máy này? Bạn có thể kích hoạt lại sau, và chỗ trống được dành cho máy khác.",
      confirmText: "Gỡ kích hoạt",
      cancelText: "Giữ nguyên"
    });
    if (!confirmed) return;
    runOperation("license_deactivate", [], "Đã gỡ kích hoạt khỏi máy này.");
  });
  $("#vno-license-copy-device").addEventListener("click", async () => {
    const code = $("#vno-license-device-code").textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Đã sao chép mã thiết bị.", "ok");
    } catch {
      const range = document.createRange();
      range.selectNodeContents($("#vno-license-device-code"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      setMessage("Hãy nhấn Ctrl+C để sao chép mã thiết bị đang được chọn.", "ok");
    }
  });

  const closeDialog = () => {
    document.removeEventListener("keydown", handleKeyDown, true);
    clearTimeout(validateTimer);
    backdrop.remove();
    _activeDialog = null;
    if (previousActiveElement && isEditorElement(previousActiveElement)) {
      try { previousActiveElement.focus(); } catch { /* element may be gone */ }
    } else {
      restoreEditorFocus();
    }
  };
  $("#vno-license-close").addEventListener("click", closeDialog);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeDialog(); });

  const handleKeyDown = (event) => {
    // A nested confirmation dialog owns the keyboard while it is open.
    if (document.querySelector(".vno-dialog-overlay")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = Array.from(dialog.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", handleKeyDown, true);

  await refreshStatus();
  if (!activateSection.hidden) keyInput.focus();
  else $("#vno-license-close").focus();
}
